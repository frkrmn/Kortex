import {
  Bookmark,
  Collection,
  Topic,
  Digest,
  DigestSettings,
  ChatThread,
  ChatMessage,
  Subscription,
  ConnectedAccount,
  UserProfile,
  InsightsData,
  SyncProgressState,
} from '../types';

export const api = {
  // Profile
  async getProfile(): Promise<UserProfile> {
    const res = await fetch('/api/user/profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Connected Accounts & X Integration
  async getConnectedAccounts(): Promise<ConnectedAccount[]> {
    const res = await fetch('/api/connected-accounts');
    if (!res.ok) throw new Error('Failed to fetch connected accounts');
    return res.json();
  },

  async getXAuthUrl(userId = 'user_default'): Promise<{
    url: string | null;
    state: string;
    configured: boolean;
    redirectUri: string;
    instructions?: string;
  }> {
    const res = await fetch(`/api/integrations/x/auth-url?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch X authorization URL');
    return res.json();
  },

  async getXStatus(): Promise<{
    connected: boolean;
    username: string;
    displayName: string;
    avatarUrl: string;
    last_sync_at?: string;
    last_successful_sync?: string;
    sync_status: 'idle' | 'syncing' | 'error';
    configured: boolean;
    redirectUri: string;
  }> {
    const res = await fetch('/api/integrations/x/status');
    if (!res.ok) throw new Error('Failed to fetch X connection status');
    return res.json();
  },

  async connectX(username = 'faruk'): Promise<ConnectedAccount> {
    const res = await fetch('/api/sources/x/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error('Failed to connect X account');
    return res.json();
  },

  async testConnectX(username = 'faruk', displayName = 'Faruk'): Promise<{ success: boolean; account: ConnectedAccount }> {
    const res = await fetch('/api/integrations/x/test-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName }),
    });
    if (!res.ok) throw new Error('Failed to test connect X account');
    return res.json();
  },

  async disconnectX(): Promise<{ success: boolean }> {
    const res = await fetch('/api/integrations/x/disconnect', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to disconnect X account');
    return res.json();
  },

  async syncX(): Promise<{ success: boolean; addedCount: number; discoveredCount: number; items: Bookmark[]; error?: string }> {
    const res = await fetch('/api/integrations/x/sync', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Sync failed' }));
      throw new Error(err.error || 'Failed to sync X account');
    }
    return res.json();
  },

  async getSyncStatus(): Promise<SyncProgressState> {
    const res = await fetch('/api/integrations/x/sync-status');
    if (!res.ok) throw new Error('Failed to fetch sync status');
    return res.json();
  },

  // Bookmarks
  async getBookmarks(params?: {
    query?: string;
    topic?: string;
    filter?: 'all' | 'unread' | 'favorites' | 'recent';
    sort?: 'newest' | 'oldest' | 'relevant';
  }): Promise<Bookmark[]> {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.topic) searchParams.set('topic', params.topic);
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.sort) searchParams.set('sort', params.sort);

    const url = `/api/bookmarks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch bookmarks');
    return res.json();
  },

  async getRediscoverBookmarks(): Promise<Bookmark[]> {
    const res = await fetch('/api/bookmarks/rediscover');
    if (!res.ok) throw new Error('Failed to fetch rediscover bookmarks');
    return res.json();
  },

  async getBookmarkById(id: string): Promise<Bookmark> {
    const res = await fetch(`/api/bookmarks/${id}`);
    if (!res.ok) throw new Error('Failed to fetch bookmark');
    return res.json();
  },

  async getRelatedBookmarks(id: string): Promise<Bookmark[]> {
    const res = await fetch(`/api/bookmarks/${id}/related`);
    if (!res.ok) throw new Error('Failed to fetch related bookmarks');
    return res.json();
  },

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark> {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update bookmark');
    return res.json();
  },

  // Topics
  async getTopics(): Promise<Topic[]> {
    const res = await fetch('/api/topics');
    if (!res.ok) throw new Error('Failed to fetch topics');
    return res.json();
  },

  // Collections
  async getCollections(): Promise<Collection[]> {
    const res = await fetch('/api/collections');
    if (!res.ok) throw new Error('Failed to fetch collections');
    return res.json();
  },

  async getCollectionBySlug(slug: string): Promise<Collection & { bookmarks: Bookmark[] }> {
    const res = await fetch(`/api/collections/${slug}`);
    if (!res.ok) throw new Error('Failed to fetch collection');
    return res.json();
  },

  async createCollection(name: string, description: string, visibility: 'private' | 'public' = 'private'): Promise<Collection> {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, visibility }),
    });
    if (!res.ok) throw new Error('Failed to create collection');
    return res.json();
  },

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection> {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update collection');
    return res.json();
  },

  async deleteCollection(id: string): Promise<boolean> {
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete collection');
    const data = await res.json();
    return data.success;
  },

  async toggleBookmarkInCollection(collectionId: string, bookmarkId: string): Promise<Collection> {
    const res = await fetch(`/api/collections/${collectionId}/toggle-bookmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmarkId }),
    });
    if (!res.ok) throw new Error('Failed to toggle bookmark in collection');
    return res.json();
  },

  // Digests
  async getDigests(): Promise<Digest[]> {
    const res = await fetch('/api/digests');
    if (!res.ok) throw new Error('Failed to fetch digests');
    return res.json();
  },

  async generateDigest(): Promise<Digest> {
    const res = await fetch('/api/digests/generate', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate digest');
    return res.json();
  },

  async getDigestSettings(): Promise<DigestSettings> {
    const res = await fetch('/api/digest/settings');
    if (!res.ok) throw new Error('Failed to fetch digest settings');
    return res.json();
  },

  async updateDigestSettings(settings: Partial<DigestSettings>): Promise<DigestSettings> {
    const res = await fetch('/api/digest/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update digest settings');
    return res.json();
  },

  // Insights
  async getInsights(): Promise<InsightsData> {
    const res = await fetch('/api/insights');
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Chat
  async getChatThreads(): Promise<ChatThread[]> {
    const res = await fetch('/api/chat/threads');
    if (!res.ok) throw new Error('Failed to fetch chat threads');
    return res.json();
  },

  async createChatThread(title?: string): Promise<ChatThread> {
    const res = await fetch('/api/chat/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create chat thread');
    return res.json();
  },

  async sendMessage(threadId: string, message: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  // Subscription
  async getSubscription(): Promise<Subscription> {
    const res = await fetch('/api/subscription');
    if (!res.ok) throw new Error('Failed to fetch subscription');
    return res.json();
  },

  async upgradeSubscription(): Promise<Subscription> {
    const res = await fetch('/api/subscription/upgrade', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to upgrade subscription');
    return res.json();
  },

  // Global Search (Cmd+K)
  async globalSearch(q: string): Promise<{ bookmarks: Bookmark[]; collections: Collection[]; topics: Topic[] }> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to perform global search');
    return res.json();
  },

  // AI Enrichment Pipeline
  async reprocessBookmark(bookmarkId: string): Promise<boolean> {
    const res = await fetch(`/api/bookmarks/${bookmarkId}/reprocess`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reprocess bookmark');
    const data = await res.json();
    return data.success;
  },

  async reprocessAllPending(): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/bookmarks/reprocess-all', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger bulk re-enrichment');
    return res.json();
  },

  async removeTopicFromBookmark(bookmarkId: string, topic: string): Promise<Bookmark> {
    const res = await fetch(`/api/bookmarks/${bookmarkId}/topics/${encodeURIComponent(topic)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove topic');
    return res.json();
  },

  async getEnrichmentStatus(): Promise<{
    isProcessing: boolean;
    activeCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    provider: string;
    model: string;
    version: string;
    recentJobs: any[];
  }> {
    const res = await fetch('/api/ai/enrichment-status');
    if (!res.ok) throw new Error('Failed to fetch enrichment status');
    return res.json();
  },

  async getAIUsage(): Promise<{
    summary: {
      totalOperations: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      totalCostUSD: number;
    };
    records: any[];
  }> {
    const res = await fetch('/api/ai/usage');
    if (!res.ok) throw new Error('Failed to fetch AI usage');
    return res.json();
  },

  // Data & Reset
  async exportData(): Promise<void> {
    window.location.href = '/api/data/export';
  },

  async resetData(): Promise<void> {
    const res = await fetch('/api/data/clear', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset data');
  },
};
