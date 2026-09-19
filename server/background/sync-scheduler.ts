import { store } from '../store';
import { xSyncEngine } from '../sources/x-sync-engine';
import { EntitlementService } from '../billing/entitlement-service';
import { getPlanConfig } from '../../src/config/plans';
import { jobQueue } from './job-queue';

export class SyncScheduler {
  private static instance: SyncScheduler;

  private constructor() {}

  public static getInstance(): SyncScheduler {
    if (!SyncScheduler.instance) {
      SyncScheduler.instance = new SyncScheduler();
    }
    return SyncScheduler.instance;
  }

  /**
   * Evaluates connected accounts and enqueues due sync jobs
   */
  public async evaluateDueAccounts(now = new Date()): Promise<number> {
    const accounts = store.getConnectedAccounts();
    let enqueuedCount = 0;

    for (const acc of accounts) {
      if (!acc.connected || acc.reauthorization_required) {
        continue;
      }

      if (acc.sync_status === 'syncing') {
        continue;
      }

      const isDue = !acc.next_sync_at || new Date(acc.next_sync_at) <= now;
      if (isDue) {
        // Enqueue background sync job
        await jobQueue.enqueue({
          userId: acc.user_id || 'user_default',
          type: 'x_sync',
          priority: 10,
          metadata: {
            accountId: acc.id,
            provider: acc.provider,
            username: acc.username,
            trigger: 'scheduled',
          },
        });
        enqueuedCount++;
      }
    }

    return enqueuedCount;
  }

  /**
   * Executes an x_sync job when claimed by a worker
   */
  public async executeSyncJob(
    userId: string,
    metadata: Record<string, any>
  ): Promise<{ success: boolean; addedCount: number; error?: string }> {
    const account = store.getConnectedAccounts().find(
      a => a.provider === (metadata.provider || 'twitter') && a.connected
    );

    if (!account) {
      return { success: false, addedCount: 0, error: 'No active connected account found.' };
    }

    if (account.reauthorization_required) {
      return {
        success: false,
        addedCount: 0,
        error: 'Reauthorization required. Skipping scheduled sync.',
      };
    }

    // Set account syncing status
    store.updateConnectedAccount(account.provider, {
      sync_status: 'syncing',
      errorMessage: undefined,
    });

    try {
      const syncResult = await xSyncEngine.syncBookmarks(userId);

      if (!syncResult.success) {
        const isReauth = syncResult.error?.toLowerCase().includes('reconnect') ||
                         syncResult.error?.toLowerCase().includes('reauthorization');

        store.updateConnectedAccount(account.provider, {
          sync_status: 'error',
          errorMessage: syncResult.error,
          reauthorization_required: isReauth ? true : undefined,
        });

        return {
          success: false,
          addedCount: 0,
          error: syncResult.error,
        };
      }

      // Compute next scheduled sync time based on user's entitlement
      const entitlements = await EntitlementService.getUserEntitlements(userId);
      const planConfig = getPlanConfig(entitlements.plan);
      const intervalHours = planConfig.limits.syncIntervalHours || 24;

      const nextSyncAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();

      store.updateConnectedAccount(account.provider, {
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
        last_successful_sync: new Date().toISOString(),
        next_sync_at: nextSyncAt,
        errorMessage: undefined,
        reauthorization_required: false,
      });

      console.info(
        `[SyncScheduler] Sync completed for user ${userId}. Added: ${syncResult.addedCount}. Next sync at: ${nextSyncAt}`
      );

      return {
        success: true,
        addedCount: syncResult.addedCount,
      };
    } catch (err: any) {
      console.error('[SyncScheduler] Unexpected sync error:', err);
      store.updateConnectedAccount(account.provider, {
        sync_status: 'error',
        errorMessage: err.message || 'Sync failed',
      });
      return {
        success: false,
        addedCount: 0,
        error: err.message,
      };
    }
  }
}

export const syncScheduler = SyncScheduler.getInstance();
