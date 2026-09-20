import Stripe from 'stripe';
import { economicsAdmin, CreditService } from './credit-service';
import { importConfig, isImportPackKey } from './config';
import { recordImportEvent } from './analytics';

function client() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Billing is temporarily unavailable.');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export class LiveStripeService {
  static async checkout(userId: string, email: string | undefined, origin: string, body: Record<string, unknown>) {
    const stripe = client();
    const db = economicsAdmin();
    const { data: sub, error } = await db.from('subscriptions').select('provider_customer_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const customer = sub?.provider_customer_id || (await stripe.customers.create({ email, metadata: { recallly_user_id: userId } })).id;
    if (!sub?.provider_customer_id) {
      const { error: saveError } = await db.from('subscriptions').upsert({ user_id: userId, provider: 'stripe', provider_customer_id: customer }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
    }
    let price: string;
    let mode: 'payment'|'subscription';
    let metadata: Record<string,string> = { recallly_user_id: userId };
    if (isImportPackKey(body.pack)) {
      const pack = importConfig().packs[body.pack];
      if (!pack.priceId || pack.credits <= 0) throw new Error('This Import Credit pack is not configured.');
      price = pack.priceId; mode = 'payment'; metadata.pack = body.pack;
    } else if (body.plan === 'pro' && (body.interval === 'monthly' || body.interval === 'yearly')) {
      price = body.interval === 'monthly' ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '' : process.env.STRIPE_PRO_YEARLY_PRICE_ID || '';
      if (!price) throw new Error('Pro Checkout is not configured.');
      mode = 'subscription'; metadata.interval = body.interval;
    } else throw new Error('Invalid billing product.');
    const session = await stripe.checkout.sessions.create({
      customer, mode, line_items: [{ price, quantity: 1 }], client_reference_id: userId, metadata,
      subscription_data: mode === 'subscription' ? { metadata: { recallly_user_id: userId } } : undefined,
      success_url: `${origin}/settings?tab=billing&checkout=success`,
      cancel_url: `${origin}/settings?tab=billing&checkout=cancel`,
    });
    if (!session.url) throw new Error('Checkout could not start.');
    return { url: session.url, sessionId: session.id };
  }

  static async portal(userId: string, origin: string) {
    const { data, error } = await economicsAdmin().from('subscriptions').select('provider_customer_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data?.provider_customer_id) throw new Error('No billing account found.');
    const session = await client().billingPortal.sessions.create({ customer: data.provider_customer_id, return_url: `${origin}/settings?tab=billing` });
    return { url: session.url };
  }

  static async webhook(raw: Buffer, signature: string) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook secret is not configured.');
    const stripe = client();
    const event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const db = economicsAdmin();
    const { data: seen, error: seenError } = await db.from('billing_events').select('status').eq('provider_event_id', event.id).maybeSingle();
    if (seenError) throw seenError;
    if (seen?.status === 'processed') return { received: true };
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment' && session.payment_status === 'paid') {
          const userId = session.client_reference_id;
          const packKey = session.metadata?.pack;
          if (!userId || !isImportPackKey(packKey) || session.metadata?.recallly_user_id !== userId) throw new Error('Invalid credit Checkout metadata.');
          const pack = importConfig().packs[packKey];
          const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
          if (!pack.priceId || !pack.credits || lines.data.length !== 1 || lines.data[0].price?.id !== pack.priceId || lines.data[0].quantity !== 1)
            throw new Error('Credit Checkout product mismatch.');
          await CreditService.grant(userId, pack.credits, 'purchase', `stripe:checkout:${session.id}`, session.id);
          const { error: purchaseError } = await db.from('import_pack_purchases').upsert({
            stripe_session_id: session.id, user_id: userId, pack_key: packKey, credits: pack.credits,
            amount_total_minor: session.amount_total || 0, currency: session.currency || 'unknown',
          }, { onConflict: 'stripe_session_id' });
          if (purchaseError) throw purchaseError;
          await recordImportEvent(userId, 'import_pack_purchased', { pack: packKey, credits: pack.credits });
        }
      } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.recallly_user_id;
        if (!userId) throw new Error('Subscription missing owner.');
        const priceId = sub.items.data[0]?.price?.id;
        const validPrice = priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID;
        if (!validPrice) throw new Error('Unknown Pro price.');
        const period = sub.items.data[0]?.current_period_start;
        const end = sub.items.data[0]?.current_period_end;
        const { error } = await db.from('subscriptions').upsert({ user_id: userId, provider: 'stripe',
          provider_customer_id: String(sub.customer), provider_subscription_id: sub.id, provider_price_id: priceId,
          plan: sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due' ? 'pro' : 'free',
          status: sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due' ? sub.status : 'canceled',
          billing_interval: priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID ? 'yearly' : 'monthly',
          current_period_start: period ? new Date(period*1000).toISOString() : null,
          current_period_end: end ? new Date(end*1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end }, { onConflict: 'user_id' });
        if (error) throw error;
        if (sub.status === 'active' || sub.status === 'trialing') await CreditService.ensureMonthlyAllowance(userId);
      } else if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice;
        const parent: any = invoice.parent;
        const subscriptionId = parent?.subscription_details?.subscription || (invoice as any).subscription;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(String(subscriptionId));
          const userId = sub.metadata?.recallly_user_id;
          if (!userId) throw new Error('Subscription missing owner.');
          if (sub.status === 'active') await CreditService.ensureMonthlyAllowance(userId);
        }
      } else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as Stripe.Invoice;
        const parent: any = invoice.parent;
        const subscriptionId = parent?.subscription_details?.subscription || (invoice as any).subscription;
        if (subscriptionId) {
          const { error } = await db.from('subscriptions').update({ status: 'past_due' })
            .eq('provider_subscription_id', String(subscriptionId));
          if (error) throw error;
        }
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge;
        const sessions = await stripe.checkout.sessions.list({ payment_intent: String(charge.payment_intent), limit: 1 });
        const userId = sessions.data[0]?.client_reference_id;
        const { error } = await db.from('credit_refund_reviews').upsert({ stripe_event_id: event.id,
          stripe_object_id: charge.id, user_id: userId || null, status: 'pending' }, { onConflict: 'stripe_event_id' });
        if (error) throw error;
      }
      const { error } = await db.from('billing_events').upsert({ provider_event_id: event.id, type: event.type,
        status: 'processed', payload: { id: event.id, type: event.type } }, { onConflict: 'provider_event_id' });
      if (error) throw error;
      return { received: true };
    } catch (error) {
      await db.from('billing_events').upsert({ provider_event_id: event.id, type: event.type,
        status: 'failed', payload: { id: event.id, type: event.type }, error: error instanceof Error ? error.message : 'unknown' }, { onConflict: 'provider_event_id' });
      throw error;
    }
  }
}
