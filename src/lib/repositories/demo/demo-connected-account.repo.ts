import { IConnectedAccountRepository } from '../types';
import { ConnectedAccount, SyncProgressState } from '../../../types';
import { demoConnectedAccounts } from '../../demo-data';

const STORAGE_KEY = 'recallly_demo_connected_accounts_v1';

export class DemoConnectedAccountRepository implements IConnectedAccountRepository {
  private getItems(): ConnectedAccount[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [...demoConnectedAccounts];
  }

  private saveItems(items: ConnectedAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  async getAll(): Promise<ConnectedAccount[]> {
    return this.getItems();
  }

  async getSyncStatus(): Promise<SyncProgressState> {
    return {
      isSyncing: false,
      stage: 'idle',
      processedCount: 2847,
      totalCount: 2847,
      message: 'All bookmarks up to date',
    };
  }

  async updateConnection(provider: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount> {
    const items = this.getItems();
    const index = items.findIndex((a) => a.provider === provider);
    if (index === -1) {
      const newAccount: ConnectedAccount = {
        id: `conn_${provider}`,
        user_id: 'user_faruk',
        provider: provider as any,
        username: updates.username || '',
        displayName: updates.displayName || provider,
        avatarUrl: updates.avatarUrl || '',
        connected: Boolean(updates.connected),
        sync_status: updates.sync_status || 'idle',
      };
      items.push(newAccount);
      this.saveItems(items);
      return newAccount;
    }

    items[index] = { ...items[index], ...updates };
    this.saveItems(items);
    return items[index];
  }
}
