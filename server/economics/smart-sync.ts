import { economicsAdmin, CreditService } from './credit-service';
import { ProviderBudgetService } from './provider-budget';
import { syncLiveX } from '../sources/x-live';
import { importConfig } from './config';

export class SmartSyncService {
  static async run() {
    if (process.env.X_SYNC_ENABLED === 'false') return { synced: 0, skipped: 0 };
    const db = economicsAdmin();
    const limit = Math.max(1, Math.min(20, Number(process.env.X_SMART_SYNC_DAILY_BATCH_SIZE) || 3));
    const dueBefore = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: accounts, error } = await db.from('connected_accounts').select('id,user_id,last_successful_sync_at,last_sync_at,next_sync_at,reauthorization_required,sync_status')
      .eq('provider', 'twitter').eq('reauthorization_required', false).neq('sync_status', 'syncing')
      .or(`last_successful_sync_at.is.null,last_successful_sync_at.lt.${dueBefore}`)
      .order('last_successful_sync_at', { ascending: true, nullsFirst: true }).limit(1000);
    if (error) throw error;
    let synced = 0, skipped = 0;
    for (const account of accounts || []) {
      if (synced >= limit) break;
      if (account.next_sync_at && new Date(account.next_sync_at).getTime() > Date.now()) { skipped++; continue; }
      const [sub, profile] = await Promise.all([
        db.from('subscriptions').select('plan,status,current_period_end').eq('user_id', account.user_id).maybeSingle(),
        db.from('profiles').select('last_active_at').eq('user_id', account.user_id).maybeSingle(),
      ]);
      if (sub.error || profile.error) throw sub.error || profile.error;
      const validPro = sub.data?.plan === 'pro' && (sub.data.status === 'active' || sub.data.status === 'past_due') &&
        Boolean(sub.data.current_period_end && new Date(sub.data.current_period_end).getTime() > Date.now());
      if (!validPro) { skipped++; continue; }
      await CreditService.ensureMonthlyAllowance(account.user_id);
      if (await CreditService.balance(account.user_id) <= 0) { skipped++; continue; }
      const activeAgeDays = profile.data?.last_active_at ? (Date.now() - new Date(profile.data.last_active_at).getTime()) / 86400000 : 365;
      const baseHours = activeAgeDays <= 7 ? 24 : activeAgeDays <= 30 ? 168 : 720;
      const { data: recent, error: recentError } = await db.from('provider_usage_events').select('imported_items,resources_read')
        .eq('provider', 'x').eq('user_id', account.user_id).order('occurred_at', { ascending: false }).limit(3);
      if (recentError) throw recentError;
      const zeroYield = recent?.length === 3 && recent.every(row => row.resources_read > 0 && row.imported_items === 0);
      const intervalHours = Math.max(baseHours, zeroYield ? 72 : 0);
      const last = account.last_successful_sync_at || account.last_sync_at;
      if (last && Date.now() - new Date(last).getTime() < intervalHours * 3600000) { skipped++; continue; }
      const budget = await ProviderBudgetService.canPerformOperation(account.user_id, importConfig().x.incrementalPageSize, 'automatic');
      if (!budget.allowed) break;
      await syncLiveX(account.user_id, { automatic: true });
      synced++;
    }
    return { synced, skipped };
  }
}
