import { IConnectedAccountRepository } from '../types';
import { ConnectedAccount, SyncProgressState } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapConnectedAccountSafeToAccount } from './mappers';

/**
 * SupabaseConnectedAccountRepository
 *
 * TOKEN SECURITY GUARANTEE:
 * Client-side queries NEVER select access_token_encrypted or refresh_token_encrypted.
 * Instead, queries are strictly constrained to the `connected_accounts_safe` view or safe non-token columns.
 * All token refresh and OAuth exchange operations are isolated to server-side endpoints.
 */
export class SupabaseConnectedAccountRepository implements IConnectedAccountRepository {
  async getAll(): Promise<ConnectedAccount[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    // Query through the safe projection (encrypted tokens strictly excluded)
    const { data, error } = await supabase
      .from('connected_accounts_safe')
      .select('*');

    if (error || !data) {
      console.error('Supabase connected_accounts error:', error);
      return [];
    }

    return data.map((row) => mapConnectedAccountSafeToAccount(row));
  }

  async getSyncStatus(): Promise<SyncProgressState> {
    const supabase = getSupabase();
    const fallback: SyncProgressState = {
      isSyncing: false,
      stage: 'idle',
      processedCount: 0,
      totalCount: 0,
      message: 'Idle',
    };

    if (!supabase) return fallback;

    const { data: latestJob } = await (supabase as any)
      .from('sync_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestJob) return fallback;

    const isSyncing = latestJob.status === 'running' || latestJob.status === 'processing';

    return {
      isSyncing,
      stage: isSyncing ? 'fetching' : 'idle',
      processedCount: latestJob.items_processed || 0,
      totalCount: latestJob.items_discovered || 0,
      message: latestJob.error_message || (isSyncing ? 'Syncing...' : 'Completed'),
    };
  }

  async updateConnection(provider: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const dbUpdates: Record<string, any> = {
      user_id: userId,
      provider,
      username: updates.username || null,
      sync_status: updates.sync_status || 'idle',
      metadata: {
        account_label: updates.displayName,
        avatar_url: updates.avatarUrl,
      },
    };

    const { data, error } = await (supabase as any)
      .from('connected_accounts')
      .upsert(dbUpdates, { onConflict: 'user_id,provider' })
      .select('id, user_id, provider, provider_user_id, username, sync_status, last_sync_at, last_successful_sync_at, metadata, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update connected account: ${error?.message}`);
    }

    return mapConnectedAccountSafeToAccount(data as any);
  }
}
