/**
 * Recallly Centralized Plan & Pricing Configuration
 * Single source of truth for plans, limits, features, and commercial prices.
 * Do not scatter plan limits or Stripe Price IDs across components.
 */

export type PlanId = 'free' | 'pro';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface PlanLimits {
  bookmarkLimit: number | null; // null = unlimited
  monthlyAskLimit: number | null;
  monthlyEnrichmentLimit: number | null;
  syncAccountLimit: number;
  syncIntervalHours: number; // e.g. 24 for Free, 2 for Pro
}

export interface PlanFeatures {
  semanticSearch: boolean;
  digests: boolean;
  advancedInsights: boolean;
  rediscovery: boolean;
  priorityProcessing: boolean;
  exportData: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  prices: {
    monthly: {
      amount: number; // in USD
      formatted: string;
      priceIdEnvVar: string;
      defaultPriceId: string;
    };
    yearly: {
      amount: number; // Display placeholder until the commercial price is configured.
      monthlyEquivalent: number;
      formatted: string;
      priceIdEnvVar: string;
      defaultPriceId: string;
    };
  };
  limits: PlanLimits;
  features: PlanFeatures;
  marketingHighlights: string[];
}

const displayPrice = () => ({ amount: 0, formatted: 'See checkout' });

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Experience personal recall',
    description: 'Connect X and import bookmarks with complimentary credits.',
    prices: {
      monthly: {
        amount: 0,
        formatted: '$0',
        priceIdEnvVar: '',
        defaultPriceId: '',
      },
      yearly: {
        amount: 0,
        monthlyEquivalent: 0,
        formatted: '$0',
        priceIdEnvVar: '',
        defaultPriceId: '',
      },
    },
    limits: {
      bookmarkLimit: null, // Import Credits now govern new external knowledge.
      monthlyAskLimit: 10,
      monthlyEnrichmentLimit: 25,
      syncAccountLimit: 1,
      syncIntervalHours: 24, // Manual sync on Free; no automatic schedule.
    },
    features: {
      semanticSearch: false, // Lexical search with high quality ranking
      digests: false, // Read-only for historical digests, generation requires Pro
      advancedInsights: false, // Basic stats & top topics only
      rediscovery: true, // Basic rediscovery candidates
      priorityProcessing: false,
      exportData: true,
    },
    marketingHighlights: [
      'Import new bookmarks with Import Credits',
      '10 Ask Recallly AI questions / month',
      '25 AI-enriched bookmarks with key takeaways',
      'Fast lexical search & topic categorization',
      '1 connected X account',
      'Full JSON data export anytime',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Your complete knowledge brain',
    description: 'Unlimited bookmarks, hybrid vector search, weekly digests, and advanced insights.',
    badge: 'Most Popular',
    prices: {
      monthly: {
        amount: displayPrice().amount,
        formatted: displayPrice().formatted,
        priceIdEnvVar: 'STRIPE_PRO_MONTHLY_PRICE_ID',
        defaultPriceId: '',
      },
      yearly: {
        amount: displayPrice().amount,
        monthlyEquivalent: 0,
        formatted: displayPrice().formatted,
        priceIdEnvVar: 'STRIPE_PRO_YEARLY_PRICE_ID',
        defaultPriceId: '',
      },
    },
    limits: {
      bookmarkLimit: null, // Unlimited
      monthlyAskLimit: 500, // Generous AI allowance
      monthlyEnrichmentLimit: null, // Unlimited
      syncAccountLimit: 5,
      syncIntervalHours: 2, // Pro: high-frequency automatic background sync every 2 hours
    },
    features: {
      semanticSearch: true, // Dense vector embeddings + RRF hybrid search
      digests: true, // Personalized weekly intelligence digests
      advancedInsights: true, // Deep topic connections, knowledge decay, serendipity
      rediscovery: true, // Smart contextual rediscovery engine
      priorityProcessing: true,
      exportData: true,
    },
    marketingHighlights: [
      'Automatic Smart Sync with included monthly imports',
      '500 Ask Recallly conversational AI queries / month',
      'Unlimited AI summaries & keyword tagging',
      'Hybrid semantic vector search (RRF)',
      'Automated weekly intelligence digests',
      'Deep knowledge graph & emerging interest insights',
      'Priority background processing pipeline',
    ],
  },
};

export const DEFAULT_TRIAL_DAYS = 7;

export function getPlanConfig(planId: PlanId): PlanDefinition {
  return PLANS[planId] || PLANS.free;
}

export function getPriceIdForPlan(planId: PlanId, interval: BillingInterval): string {
  const plan = getPlanConfig(planId);
  if (planId === 'free') return '';

  if (interval === 'yearly') {
    return process.env.STRIPE_PRO_YEARLY_PRICE_ID || plan.prices.yearly.defaultPriceId;
  }
  return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || plan.prices.monthly.defaultPriceId;
}

export function mapPriceIdToPlan(priceId: string): { plan: PlanId; interval: BillingInterval } | null {
  const proMonthlyId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID || PLANS.pro.prices.monthly.defaultPriceId;
  const proYearlyId = process.env.STRIPE_PRO_YEARLY_PRICE_ID || PLANS.pro.prices.yearly.defaultPriceId;

  if (priceId === proMonthlyId || priceId === PLANS.pro.prices.monthly.defaultPriceId) {
    return { plan: 'pro', interval: 'monthly' };
  }
  if (priceId === proYearlyId || priceId === PLANS.pro.prices.yearly.defaultPriceId) {
    return { plan: 'pro', interval: 'yearly' };
  }
  return null;
}
