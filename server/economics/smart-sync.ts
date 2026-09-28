import { economicsAdmin } from './credit-service';
import { ProviderBudgetService } from './provider-budget';
import { syncLiveX } from '../sources/x-live';
import { importConfig } from './config';
import { hasActiveProEntitlement, type LiveSubscription } from '../billing/live-entitlement';
import { isXAutoSyncRolloutEligible, xAutoSyncControls } from '../config/scheduled-sync';

type SyncAccount = {
  id: string;
  user_id: string;
  access_token_encrypted?: string | null;
  provider_user_id?: string | null;
  initial_import_completed_at?: string | null;
  last_successful_sync_at?: string | null;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  reauthorization_required?: boolean | null;
  sync_status?: string | null;
  last_error_code?: string | null;
};

type SyncResult = {
  success: boolean;
  statusCode?: number;
  addedCount: number;
  discoveredCount: number;
  requestCount?: number;
  queuedCount?: number;
};

export type SmartSyncDependencies = {
  listAccounts: (limit: number) => Promise<SyncAccount[]>;
  subscriptionFor: (userId: string) => Promise<LiveSubscription | null>;
  lastActiveAt: (userId: string) => Promise<string | null>;
  recentUsage: (userId: string) => Promise<Array<{ imported_items: number; resources_read: number }>>;
  budgetPreflight: (userId: string, expectedResources: number) => Promise<{ allowed: boolean }>;
  sync: (userId: string, options: { automatic: true; limit: number; maxPages: number }) => Promise<SyncResult>;
  updateAccount: (accountId: string, updates: Record<string, unknown>) => Promise<void>;
  now: () => Date;
};

function defaultDependencies(controls: ReturnType<typeof xAutoSyncControls>): SmartSyncDependencies {
  const db = economicsAdmin();
  return {
    async listAccounts(limit) {
      const accountColumns = 'id,user_id,access_token_encrypted,provider_user_id,initial_import_completed_at,last_successful_sync_at,last_sync_at,next_sync_at,reauthorization_required,sync_status,last_error_code';
      const baseQuery = () => db.from('connected_accounts')
        .select(accountColumns)
        .eq('provider', 'twitter').eq('reauthorization_required', false)
        .not('access_token_encrypted', 'is', null).not('provider_user_id', 'is', null)
        .not('initial_import_completed_at', 'is', null);
      if (controls.mode === 'controlled') {
        const { data, error } = await baseQuery().eq('user_id', controls.controlledOwnerId!)
          .order('last_successful_sync_at', { ascending: true, nullsFirst: true }).limit(1);
        if (error) throw error;
        return data || [];
      }

      // Filter by authoritative Pro rows before scanning connected accounts.
      // This prevents a prefix of Free/disconnected accounts from starving due
      // Pro work. The cap is deliberately bounded for a serverless invocation.
      const maxEligibleScan = 5_000;
      const { count, error: countError } = await db.from('subscriptions')
        .select('user_id', { count: 'exact', head: true }).eq('plan', 'pro');
      if (countError) throw countError;
      const pageCount = Math.max(1, Math.ceil((count || 0) / maxEligibleScan));
      const utcDay = Math.floor(Date.now() / 86_400_000);
      const page = utcDay % pageCount;
      const start = page * maxEligibleScan;
      const { data: subscriptionRows, error: subscriptionError } = await db.from('subscriptions')
        .select('user_id,plan,status,current_period_end,trial_end,cancel_at_period_end')
        .eq('plan', 'pro').order('user_id').range(start, start + maxEligibleScan - 1);
      if (subscriptionError) throw subscriptionError;
      const subscriptions = (subscriptionRows || []) as Array<LiveSubscription & { user_id: string }>;
      const eligibleIds = subscriptions.filter(row => hasActiveProEntitlement(row)).map(row => row.user_id);
      const candidates: SyncAccount[] = [];
      for (let offset = 0; offset < eligibleIds.length; offset += 100) {
        const { data, error } = await baseQuery().in('user_id', eligibleIds.slice(offset, offset + 100));
        if (error) throw error;
        candidates.push(...(data || []));
      }
      return candidates.sort((left, right) => {
        const a = left.last_successful_sync_at ? new Date(left.last_successful_sync_at).getTime() : 0;
        const b = right.last_successful_sync_at ? new Date(right.last_successful_sync_at).getTime() : 0;
        return a - b;
      }).slice(0, limit);
    },
    async subscriptionFor(userId) {
      const { data, error } = await db.from('subscriptions')
        .select('plan,status,current_period_end,trial_end,cancel_at_period_end').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async lastActiveAt(userId) {
      const { data, error } = await db.from('profiles').select('last_active_at').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data?.last_active_at || null;
    },
    async recentUsage(userId) {
      const { data, error } = await db.from('provider_usage_events').select('imported_items,resources_read')
        .eq('provider', 'x').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(3);
      if (error) throw error;
      return data || [];
    },
    budgetPreflight: (userId, expectedResources) => ProviderBudgetService.canPerformOperation(userId, expectedResources, 'automatic'),
    sync: (userId, options) => syncLiveX(userId, options),
    async updateAccount(accountId, updates) {
      const { error } = await db.from('connected_accounts').update(updates).eq('id', accountId);
      if (error) throw error;
    },
    now: () => new Date(),
  };
}

export function automaticSyncIntervalHours(lastActiveAt: string | null, recent: Array<{ imported_items: number; resources_read: number }>, now: Date) {
  const ageDays = lastActiveAt ? (now.getTime() - new Date(lastActiveAt).getTime()) / 86_400_000 : 365;
  const activityInterval = ageDays <= 7 ? 24 : ageDays <= 30 ? 168 : 720;
  const repeatedZeroYield = recent.length === 3 && recent.every(row => row.resources_read > 0 && row.imported_items === 0);
  return Math.max(activityInterval, repeatedZeroYield ? 72 : 0);
}

export function isAutomaticSyncDue(account: SyncAccount, intervalHours: number, now: Date) {
  if (account.next_sync_at && new Date(account.next_sync_at).getTime() > now.getTime()) return false;
  if (account.sync_status === 'syncing' && account.last_sync_at &&
      now.getTime() - new Date(account.last_sync_at).getTime() < 5 * 60_000) return false;
  const timestamps = [account.last_successful_sync_at, account.last_sync_at]
    .filter(Boolean).map(value => new Date(value!).getTime()).filter(Number.isFinite);
  const last = timestamps.length ? Math.max(...timestamps) : null;
  return last === null || now.getTime() - last >= intervalHours * 3_600_000;
}

export class SmartSyncService {
  static async run(dependencies?: Partial<SmartSyncDependencies>) {
    const controls = xAutoSyncControls();
    const result = {
      rolloutMode: controls.mode,
      candidates: 0, eligible: 0, attempted: 0, synced: 0, failed: 0,
      skippedFree: 0, skippedNotDue: 0, skippedNoConnection: 0, skippedRollout: 0,
      skippedBudget: 0, skippedInitialImport: 0, skippedProviderBlocked: 0, xRequests: 0, resourcesRead: 0,
      newBookmarks: 0, duplicates: 0, queuedEnrichments: 0, reauthorizationRequired: 0,
    };
    if (!controls.enabled) return result;

    const deps = dependencies ? dependencies as SmartSyncDependencies : defaultDependencies(controls);
    const scanLimit = Math.min(1000, Math.max(100, controls.batchSize * 20));
    const accounts = await deps.listAccounts(scanLimit);
    result.candidates = accounts.length;
    for (const account of accounts) {
      if (result.attempted >= controls.batchSize) break;
      if (!isXAutoSyncRolloutEligible(account.user_id)) { result.skippedRollout++; continue; }
      if (!account.access_token_encrypted || !account.provider_user_id || account.reauthorization_required) {
        result.skippedNoConnection++; continue;
      }
      if (!account.initial_import_completed_at) { result.skippedInitialImport++; continue; }
      if (account.last_error_code === 'x_payment_required') { result.skippedProviderBlocked++; continue; }
      try {
        const subscription = await deps.subscriptionFor(account.user_id);
        if (!hasActiveProEntitlement(subscription, deps.now())) { result.skippedFree++; continue; }
        const [lastActive, recent] = await Promise.all([deps.lastActiveAt(account.user_id), deps.recentUsage(account.user_id)]);
        const intervalHours = automaticSyncIntervalHours(lastActive, recent, deps.now());
        if (!isAutomaticSyncDue(account, intervalHours, deps.now())) { result.skippedNotDue++; continue; }
        const expectedResources = importConfig().x.incrementalPageSize;
        const budget = await deps.budgetPreflight(account.user_id, expectedResources);
        if (!budget.allowed) { result.skippedBudget++; continue; }
        result.eligible++;
        result.attempted++;
        const syncResult = await deps.sync(account.user_id, {
          automatic: true,
          limit: expectedResources * controls.maxPagesPerSync,
          maxPages: controls.maxPagesPerSync,
        });
        result.xRequests += syncResult.requestCount || 0;
        result.resourcesRead += syncResult.discoveredCount || 0;
        result.newBookmarks += syncResult.addedCount || 0;
        result.duplicates += Math.max(0, (syncResult.discoveredCount || 0) - (syncResult.addedCount || 0));
        result.queuedEnrichments += syncResult.queuedCount || 0;
        if (!syncResult.success) {
          result.failed++;
          if (syncResult.statusCode === 401 || syncResult.statusCode === 403 || syncResult.statusCode === 409)
            result.reauthorizationRequired++;
          continue;
        }
        result.synced++;
        const nextHours = syncResult.discoveredCount > 0 && syncResult.addedCount === 0 ? Math.max(intervalHours, 72) : intervalHours;
        await deps.updateAccount(account.id, { next_sync_at: new Date(deps.now().getTime() + nextHours * 3_600_000).toISOString() });
      } catch (error) {
        result.failed++;
        console.warn(JSON.stringify({ event: 'x_auto_sync_user_failed', userId: account.user_id,
          kind: error && typeof error === 'object' && 'name' in error ? String(error.name) : 'unknown' }));
      }
    }
    console.info(JSON.stringify({ event: 'x_auto_sync_run', ...result }));
    return result;
  }
}
