import { createClient } from '@supabase/supabase-js';
import { importConfig } from './config';

export function economicsAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Credit service unavailable.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class CreditService {
  static async balance(userId: string) {
    const { data, error } = await economicsAdmin().from('credit_balances').select('available_credits').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data?.available_credits ?? 0;
  }

  static async grant(userId: string, quantity: number, source: 'signup'|'migration'|'monthly'|'trial'|'purchase'|'support'|'refund', key: string, referenceId?: string) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Invalid credit quantity.');
    const { data, error } = await economicsAdmin().rpc('grant_import_credits', {
      p_user_id: userId, p_quantity: quantity, p_source: source, p_key: key,
      p_reference_id: referenceId || null, p_expires_at: null,
    });
    if (error) throw error;
    return data as number;
  }

  static async refundCredits(userId: string, quantity: number, correctionId: string) {
    return this.grant(userId, quantity, 'refund', `refund:${userId}:${correctionId}`, correctionId);
  }

  static async ensureInitialGrant(userId: string) {
    const config = importConfig();
    const { data: legacy, error } = await economicsAdmin().from('import_legacy_users').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const isExistingUser = Boolean(legacy);
    const quantity = isExistingUser ? config.migrationCredits : config.signupCredits;
    if (quantity > 0) await this.grant(userId, quantity, isExistingUser ? 'migration' : 'signup', `initial:${userId}:v1`);
    return this.balance(userId);
  }

  static async ensureMonthlyAllowance(userId: string) {
    const { data: sub, error } = await economicsAdmin().from('subscriptions')
      .select('provider_subscription_id,plan,status,current_period_start,current_period_end').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!sub?.provider_subscription_id || sub.plan !== 'pro' || !sub.current_period_end ||
        new Date(sub.current_period_end).getTime() <= Date.now()) return;
    const config = importConfig();
    if (sub.status === 'trialing') {
      if (config.trialCredits > 0)
        await this.grant(userId, config.trialCredits, 'trial', `trial:${sub.provider_subscription_id}:credits`, sub.provider_subscription_id);
      return;
    }
    if (sub.status !== 'active' || config.proMonthlyCredits <= 0) return;
    // UTC calendar month is the allowance period for both monthly and yearly subscriptions.
    const month = new Date().toISOString().slice(0, 7);
    await this.grant(userId, config.proMonthlyCredits, 'monthly',
      `subscription:${sub.provider_subscription_id}:${month}:credits`, sub.provider_subscription_id);
  }

  static async importX(userId: string, externalId: string, row: Record<string, unknown>, jobId: string) {
    const { data, error } = await economicsAdmin().rpc('import_x_saved_item', {
      p_user_id: userId, p_external_id: externalId, p_row: row, p_sync_job_id: jobId,
    });
    if (error) throw error;
    return (data as Array<{ imported: boolean; charged: boolean; item_id: string }>)[0];
  }

  // X bookmark imports are included with the plan. Credit balances remain an
  // independent generic commercial mechanism and are never spent by X sync.
  static async importXUnmetered(userId: string, externalId: string, row: Record<string, unknown>, jobId: string) {
    const { data, error } = await economicsAdmin().rpc('import_x_saved_item_unmetered', {
      p_user_id: userId, p_external_id: externalId, p_row: row, p_sync_job_id: jobId,
    });
    if (error) throw error;
    return (data as Array<{ imported: boolean; item_id: string }>)[0];
  }

  static async markXUnavailable(userId: string, externalId: string, status: 'unavailable'|'deleted'|'restricted'|'unknown') {
    const { error } = await economicsAdmin().rpc('mark_x_content_unavailable', {
      p_user_id: userId, p_external_id: externalId, p_status: status,
    });
    if (error) throw error;
  }

  static async wallet(userId: string) {
    const db = economicsAdmin();
    const [balance, grants, ledger] = await Promise.all([
      this.balance(userId),
      db.from('credit_grants').select('source,remaining_quantity,expires_at').eq('user_id', userId).gt('remaining_quantity', 0),
      db.from('credit_ledger').select('type,quantity,balance_delta,source,reference_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);
    if (grants.error || ledger.error) throw grants.error || ledger.error;
    const nextMonth = new Date(); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1); nextMonth.setUTCHours(0,0,0,0);
    return { availableCredits: balance,
      nextMonthlyAllowanceAt: nextMonth.toISOString(),
      includedCredits: (grants.data || []).filter(g => g.source !== 'purchase').reduce((n,g) => n+g.remaining_quantity,0),
      monthlyCredits: (grants.data || []).filter(g => g.source === 'monthly').reduce((n,g) => n+g.remaining_quantity,0),
      purchasedCredits: (grants.data || []).filter(g => g.source === 'purchase').reduce((n,g) => n+g.remaining_quantity,0),
      transactions: ledger.data || [] };
  }
}
