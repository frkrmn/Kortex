/**
 * Recallly Stripe Billing Service
 * Handles Checkout sessions, Customer Portal, and Stripe Webhook lifecycle.
 *
 * Designed with lazy SDK initialization to avoid crashing when STRIPE_SECRET_KEY is absent,
 * with deterministic demo-mode fallbacks for local and sandbox environments.
 */

import Stripe from 'stripe';
import { store } from '../store';
import {
  PlanId,
  BillingInterval,
  DEFAULT_TRIAL_DAYS,
  getPriceIdForPlan,
  mapPriceIdToPlan,
  PLANS,
} from './plans';
import { EntitlementService } from './entitlement-service';
import { Subscription } from '../../src/types';

export class StripeService {
  private static stripeClient: Stripe | null = null;

  public static getClient(): Stripe | null {
    if (!this.stripeClient) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (apiKey && apiKey.trim() !== '') {
        try {
          this.stripeClient = new Stripe(apiKey, {
            apiVersion: '2025-02-24.acacia' as any,
            appInfo: {
              name: 'Recallly',
              version: '1.0.0',
            },
          });
        } catch (err) {
          console.warn('[StripeService] Failed to initialize Stripe client:', err);
        }
      }
    }
    return this.stripeClient;
  }

  public static isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== '');
  }

  /**
   * Creates a secure Stripe Checkout Session for subscription upgrade.
   */
  public static async createCheckoutSession(params: {
    userId: string;
    userEmail?: string;
    plan: PlanId;
    interval: BillingInterval;
    origin: string;
  }): Promise<{ url: string; sessionId?: string; isMock?: boolean }> {
    const { userId, userEmail, plan, interval, origin } = params;

    // Validate plan
    if (plan !== 'pro') {
      throw new Error('Only Pro subscriptions can be purchased through Checkout.');
    }

    const currentSub = store.getSubscription(userId);
    const stripe = this.getClient();

    // If Stripe is not configured or running in pure demo mode, provide instant simulated upgrade
    if (!stripe) {
      console.log(`[StripeService] Stripe not configured. Providing simulated checkout redirect for ${userId}.`);
      // Update store subscription directly in mock/demo mode
      store.updateSubscription({
        status: 'active',
        plan: 'pro',
        interval,
        has_used_trial: true,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: false,
      });
      await EntitlementService.handleUpgradeToPro(userId);

      return {
        url: `${origin}/settings?tab=billing&checkout=success&simulated=true`,
        sessionId: `cs_sim_${Date.now()}`,
        isMock: true,
      };
    }

    // Resolve Price ID
    const priceId = getPriceIdForPlan(plan, interval);

    // Retrieve or create Stripe Customer
    let customerId = currentSub.customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || 'user@example.com',
        metadata: {
          recallly_user_id: userId,
        },
      });
      customerId = customer.id;
      store.updateSubscription({ customer_id: customerId });
    }

    // Determine trial applicability: offer trial only if never used
    const isEligibleForTrial = !currentSub.has_used_trial && currentSub.status !== 'active';
    const trialDays = isEligibleForTrial
      ? parseInt(process.env.TRIAL_DAYS || String(DEFAULT_TRIAL_DAYS), 10)
      : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          recallly_user_id: userId,
          plan,
          interval,
        },
      },
      metadata: {
        recallly_user_id: userId,
        plan,
        interval,
      },
      client_reference_id: userId,
      success_url: `${origin}/settings?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?tab=billing&checkout=cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Failed to generate Stripe checkout URL.');
    }

    return { url: session.url, sessionId: session.id, isMock: false };
  }

  /**
   * Creates a Stripe Customer Billing Portal session for managing billing details,
   * payment methods, intervals, or cancellations.
   */
  public static async createPortalSession(params: {
    userId: string;
    origin: string;
  }): Promise<{ url: string; isMock?: boolean }> {
    const { userId, origin } = params;
    const sub = store.getSubscription(userId);
    const stripe = this.getClient();

    if (!stripe || !sub.customer_id) {
      console.log(`[StripeService] Stripe portal requested in demo mode for ${userId}.`);
      return {
        url: `${origin}/settings?tab=billing&portal=simulated`,
        isMock: true,
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.customer_id,
      return_url: `${origin}/settings?tab=billing`,
    });

    return { url: session.url, isMock: false };
  }

  /**
   * Authoritative Stripe Webhook Handler.
   * Enforces webhook signature verification, event idempotency, and state synchronization.
   */
  public static async handleWebhook(
    rawBody: Buffer | string,
    signature: string
  ): Promise<{ received: boolean; processed: boolean; eventType?: string }> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = this.getClient();

    if (!stripe || !webhookSecret) {
      throw new Error('Stripe webhook handling requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('[StripeService] Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // 1. Check idempotency
    const existing = store.getBillingEvent(event.id);
    if (existing && existing.status === 'processed') {
      console.log(`[StripeService] Idempotent webhook ignored: ${event.id} (${event.type})`);
      return { received: true, processed: true, eventType: event.type };
    }

    // 2. Record event in processing status
    store.recordBillingEvent({
      provider_event_id: event.id,
      type: event.type,
      status: 'processing',
      payload: event.data.object,
    });

    try {
      console.log(`[StripeService] Processing Stripe webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id || session.metadata?.recallly_user_id || 'user_default';
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          store.updateSubscription({
            user_id: userId,
            customer_id: customerId,
            subscription_id: subscriptionId,
            status: 'active',
            plan: 'pro',
            has_used_trial: true,
            cancel_at_period_end: false,
          });

          await EntitlementService.handleUpgradeToPro(userId);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;
          const userId = sub.metadata?.recallly_user_id || 'user_default';

          const priceId = sub.items.data[0]?.price?.id || '';
          const planInfo = mapPriceIdToPlan(priceId);

          const status = sub.status as any;
          const subObj = sub as any;
          const currentPeriodStart = subObj.current_period_start
            ? new Date(subObj.current_period_start * 1000).toISOString()
            : new Date().toISOString();
          const currentPeriodEnd = subObj.current_period_end
            ? new Date(subObj.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const cancelAtPeriodEnd = sub.cancel_at_period_end;

          const trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : undefined;
          const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined;

          store.updateSubscription({
            user_id: userId,
            customer_id: customerId,
            subscription_id: sub.id,
            price_id: priceId,
            status,
            plan: planInfo?.plan || (status === 'active' || status === 'trialing' ? 'pro' : 'free'),
            interval: planInfo?.interval || 'monthly',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            trial_start: trialStart,
            trial_end: trialEnd,
            has_used_trial: Boolean(trialStart || trialEnd || sub.status === 'active'),
          });

          if (status === 'active' || status === 'trialing') {
            await EntitlementService.handleUpgradeToPro(userId);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const userId = sub.metadata?.recallly_user_id || 'user_default';

          store.updateSubscription({
            status: 'canceled',
            plan: 'free',
            cancel_at_period_end: false,
          });

          await EntitlementService.handleDowngradeToFree(userId);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const subId = invoice.subscription as string;
          if (subId) {
            store.updateSubscription({
              status: 'active',
              plan: 'pro',
            });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          console.warn(`[StripeService] Payment failed for invoice ${invoice.id}`);
          store.updateSubscription({
            status: 'past_due',
          });
          break;
        }

        default:
          console.log(`[StripeService] Unhandled event type: ${event.type}`);
          break;
      }

      // 3. Mark processed
      store.recordBillingEvent({
        provider_event_id: event.id,
        type: event.type,
        status: 'processed',
      });

      return { received: true, processed: true, eventType: event.type };
    } catch (err: any) {
      console.error(`[StripeService] Error executing handler for ${event.type}:`, err);
      store.recordBillingEvent({
        provider_event_id: event.id,
        type: event.type,
        status: 'failed',
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Helper for testing or manually toggling subscription states in development and demo environments.
   */
  public static setMockSubscriptionState(
    plan: PlanId,
    status: Subscription['status'] = 'active',
    interval: BillingInterval = 'monthly'
  ): Subscription {
    const isPro = plan === 'pro';
    const sub = store.updateSubscription({
      plan,
      status,
      interval,
      cancel_at_period_end: false,
      trial_days_left: status === 'trialing' ? 7 : 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      price_monthly: isPro ? PLANS.pro.prices.monthly.amount : 0,
      price_yearly: isPro ? PLANS.pro.prices.yearly.amount : 0,
    });

    if (isPro && (status === 'active' || status === 'trialing')) {
      EntitlementService.handleUpgradeToPro('user_default');
    }

    return sub;
  }
}
