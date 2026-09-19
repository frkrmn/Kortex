/**
 * Recallly Entitlement Service
 * Single source of truth for authorization, plan limits, feature access,
 * and server-authoritative usage metering.
 *
 * Core rule: Product features MUST query EntitlementService instead of inspecting Stripe directly.
 * Stripe -> Billing Service -> Subscription State -> Entitlement Service -> Product Features
 */

import { store } from '../store';
import { PlanId, PlanFeatures, PlanLimits, PLANS, getPlanConfig } from './plans';
import { EntitlementData, Subscription, UsageMetric, UsageEventRecord } from '../../src/types';
import { enrichmentPipeline } from '../ai/enrichment-pipeline';

export class EntitlementError extends Error {
  public statusCode: number;
  public code: string;
  public upgradeRequired: boolean;
  public details?: any;

  constructor(message: string, code = 'FEATURE_LOCKED', statusCode = 403, details?: any) {
    super(message);
    this.name = 'EntitlementError';
    this.statusCode = statusCode;
    this.code = code;
    this.upgradeRequired = true;
    this.details = details;
  }
}

export class EntitlementService {
  /**
   * Resolves effective plan and entitlement state for a user.
   */
  public static async getUserEntitlements(userId: string = 'user_default'): Promise<EntitlementData> {
    return this.getForUser(userId);
  }

  public static async getForUser(userId: string = 'user_default'): Promise<EntitlementData> {
    const sub: Subscription = store.getSubscription(userId);

    // Evaluate effective plan based on subscription status and period
    const now = new Date();
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const isWithinPeriod = periodEnd ? now <= periodEnd : false;

    let effectivePlan: PlanId = 'free';
    let isPro = false;

    // Status mapping:
    // When sub.plan === 'pro':
    //   'active' -> Pro
    //   'trialing' -> Pro (if within trial/period)
    //   'past_due' -> Pro (with payment warning, grace period)
    //   'canceled' / 'unpaid' / 'incomplete_expired' -> Free (or Pro if cancel_at_period_end is true and still within period)
    // When sub.plan === 'free':
    //   Always Free
    if (sub.plan === 'pro') {
      if (sub.status === 'active') {
        effectivePlan = 'pro';
        isPro = true;
      } else if (sub.status === 'trialing') {
        if (isWithinPeriod || (sub.trial_days_left && sub.trial_days_left > 0)) {
          effectivePlan = 'pro';
          isPro = true;
        } else {
          effectivePlan = 'free';
          isPro = false;
        }
      } else if (sub.status === 'past_due') {
        // Past due provides a grace period where Pro entitlements remain temporarily active
        effectivePlan = 'pro';
        isPro = true;
      } else if (sub.cancel_at_period_end && isWithinPeriod) {
        // User cancelled but billing period has not elapsed yet
        effectivePlan = 'pro';
        isPro = true;
      } else {
        effectivePlan = 'free';
        isPro = false;
      }
    } else {
      effectivePlan = 'free';
      isPro = false;
    }

    const planConfig = getPlanConfig(effectivePlan);

    // Calculate current billing period start ISO (default to 30 days ago or current_period_start)
    const periodStartIso = sub.current_period_start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Calculate current consumption
    const allBookmarks = store.getBookmarks(userId);
    const bookmarksCount = allBookmarks.length;

    const monthlyAskCount = store.countUsage(userId, 'ask', periodStartIso);
    const monthlyEnrichmentCount = store.countUsage(userId, 'enrichment', periodStartIso);

    const connectedAccounts = store.getConnectedAccounts();
    const connectedAccountsCount = connectedAccounts.filter(a => a.connected).length;

    // Calculate remaining limits
    const remainingBookmarks = planConfig.limits.bookmarkLimit === null
      ? null
      : Math.max(0, planConfig.limits.bookmarkLimit - bookmarksCount);

    const remainingAsk = planConfig.limits.monthlyAskLimit === null
      ? null
      : Math.max(0, planConfig.limits.monthlyAskLimit - monthlyAskCount);

    const remainingEnrichment = planConfig.limits.monthlyEnrichmentLimit === null
      ? null
      : Math.max(0, planConfig.limits.monthlyEnrichmentLimit - monthlyEnrichmentCount);

    // Calculate trial days left if currently trialing
    let trialDaysLeft = sub.trial_days_left;
    if (sub.status === 'trialing' && sub.current_period_end) {
      const diffMs = new Date(sub.current_period_end).getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      plan: effectivePlan,
      status: sub.status,
      isPro,
      interval: sub.interval || 'monthly',
      limits: {
        bookmarks: planConfig.limits.bookmarkLimit,
        monthlyAsk: planConfig.limits.monthlyAskLimit,
        monthlyEnrichment: planConfig.limits.monthlyEnrichmentLimit,
        syncAccounts: planConfig.limits.syncAccountLimit,
      },
      usage: {
        bookmarksCount,
        monthlyAskCount,
        monthlyEnrichmentCount,
        connectedAccountsCount,
      },
      remaining: {
        bookmarks: remainingBookmarks,
        monthlyAsk: remainingAsk,
        monthlyEnrichment: remainingEnrichment,
      },
      features: { ...planConfig.features },
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialDaysLeft,
    };
  }

  /**
   * Fast check if a specific feature is enabled for the user.
   */
  public static async canUseFeature(userId: string, feature: keyof PlanFeatures): Promise<boolean> {
    const entitlements = await this.getForUser(userId);
    return Boolean(entitlements.features[feature]);
  }

  /**
   * Checks remaining quota for metered capabilities.
   */
  public static async getRemainingUsage(
    userId: string,
    metric: 'ask' | 'enrichment' | 'bookmarks'
  ): Promise<number | null> {
    const entitlements = await this.getForUser(userId);
    if (metric === 'ask') return entitlements.remaining.monthlyAsk;
    if (metric === 'enrichment') return entitlements.remaining.monthlyEnrichment;
    if (metric === 'bookmarks') return entitlements.remaining.bookmarks;
    return null;
  }

  /**
   * Server assertion for feature flags. Throws EntitlementError if not allowed.
   */
  public static async assertEntitlement(userId: string, feature: keyof PlanFeatures): Promise<void> {
    const allowed = await this.canUseFeature(userId, feature);
    if (!allowed) {
      const featureNames: Record<keyof PlanFeatures, string> = {
        semanticSearch: 'Semantic vector search (RRF)',
        digests: 'AI Weekly Digest generation',
        advancedInsights: 'Deep knowledge graph & connection insights',
        rediscovery: 'Smart Rediscovery engine',
        priorityProcessing: 'Priority background queue',
        exportData: 'Complete data export',
      };
      throw new EntitlementError(
        `The feature "${featureNames[feature] || feature}" requires an active Recallly Pro subscription.`,
        'FEATURE_LOCKED',
        403,
        { feature, requiredPlan: 'pro' }
      );
    }
  }

  /**
   * Server assertion for metered usage. Throws EntitlementError if quota is exhausted.
   */
  public static async assertUsageAvailable(
    userId: string,
    metric: 'ask' | 'enrichment' | 'bookmarks',
    cost: number = 1
  ): Promise<void> {
    const remaining = await this.getRemainingUsage(userId, metric);
    if (remaining !== null && remaining < cost) {
      const metricNames: Record<string, string> = {
        ask: 'Ask Recallly monthly question limit',
        enrichment: 'monthly AI enrichment limit',
        bookmarks: 'bookmark storage capacity',
      };
      throw new EntitlementError(
        `You have reached your ${metricNames[metric] || metric}. Upgrade to Pro for unlimited access.`,
        'USAGE_LIMIT_EXCEEDED',
        402,
        { metric, remaining, cost, requiredPlan: 'pro' }
      );
    }
  }

  /**
   * Atomic check-and-consume operation (Section 21 USAGE LIMIT RACE prevention):
   * Synchronously verifies available quota and reserves the usage event in a single step,
   * preventing simultaneous requests from reading the same stale counter and over-consuming.
   */
  public static async assertAndConsumeUsage(
    userId: string,
    metric: 'ask' | 'enrichment' | 'bookmarks',
    cost: number = 1,
    metadata?: Record<string, any>
  ): Promise<UsageEventRecord | null> {
    const remaining = await this.getRemainingUsage(userId, metric);
    if (remaining !== null && remaining < cost) {
      const metricNames: Record<string, string> = {
        ask: 'Ask Recallly monthly question limit',
        enrichment: 'monthly AI enrichment limit',
        bookmarks: 'bookmark storage capacity',
      };
      throw new EntitlementError(
        `You have reached your ${metricNames[metric] || metric}. Upgrade to Pro for unlimited access.`,
        'USAGE_LIMIT_EXCEEDED',
        402,
        { metric, remaining, cost, requiredPlan: 'pro' }
      );
    }

    if (metric === 'ask' || metric === 'enrichment') {
      return this.recordUsage(userId, metric, cost, metadata);
    }
    return null;
  }

  /**
   * Authoritative metering: records usage in the event-based usage log.
   */
  public static recordUsage(
    userId: string,
    metric: UsageMetric,
    quantity: number = 1,
    metadata?: Record<string, any>
  ): UsageEventRecord {
    const currentPeriodKey = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
    return store.addUsageEvent({
      user_id: userId,
      metric,
      quantity,
      metadata: metadata || {},
      billing_period_key: currentPeriodKey,
    });
  }

  /**
   * Triggered when a user upgrades to Pro.
   * Scans for any pending bookmarks that were not enriched due to free limits
   * and queues background enrichment without blocking.
   */
  public static async handleUpgradeToPro(userId: string = 'user_default'): Promise<{ backfilledCount: number }> {
    console.log(`[EntitlementService] User ${userId} upgraded to Pro. Checking for unenriched bookmarks...`);
    const bookmarks = store.getBookmarks(userId);
    const unenriched = bookmarks.filter(
      b => b.enrichment_status === 'not_processed' || b.enrichment_status === 'failed' || !b.ai_summary
    );

    if (unenriched.length > 0) {
      console.log(`[EntitlementService] Found ${unenriched.length} unenriched bookmarks. Scheduling batch enrichment.`);
      // Run enrichment in background without blocking caller
      setTimeout(async () => {
        try {
          const ids = unenriched.slice(0, 20).map(b => b.id);
          for (const id of ids) {
            await enrichmentPipeline.enrichBookmark(id, { userId, isDemo: false, forceRefresh: false });
          }
        } catch (err) {
          console.warn('[EntitlementService] Background upgrade backfill notice:', err);
        }
      }, 500);
    }

    return { backfilledCount: unenriched.length };
  }

  /**
   * Safe downgrade handler:
   * STRICT GUARANTEE: Never deletes bookmarks, embeddings, summaries, collections, or digests.
   * All historical data remains fully readable. Only future actions apply Free limits.
   */
  public static async handleDowngradeToFree(userId: string = 'user_default'): Promise<void> {
    console.log(`[EntitlementService] User ${userId} transitioned to Free plan. All existing data is safely preserved.`);
  }
}
