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
  RediscoveryCandidateItem,
  EntitlementData,
  PlanConfig,
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

  async getRelatedBookmarks(id: string, limit = 4): Promise<{
    bookmark: Bookmark;
    similarity: number;
  }[]> {
    const res = await fetch(`/api/bookmarks/${id}/related?limit=${limit}`);
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
  async getDigests(userId?: string): Promise<Digest[]> {
    const url = userId ? `/api/digests?userId=${encodeURIComponent(userId)}` : '/api/digests';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch digests');
    return res.json();
  },

  async getDigest(id: string, userId?: string): Promise<Digest> {
    const url = userId ? `/api/digests/${id}?userId=${encodeURIComponent(userId)}` : `/api/digests/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch digest');
    return res.json();
  },

  async generateDigest(options?: { userId?: string; forceRegenerate?: boolean; period?: string }): Promise<Digest> {
    const res = await fetch('/api/digests/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error('Failed to generate digest');
    return res.json();
  },

  async regenerateDigest(id: string, userId?: string): Promise<Digest> {
    const res = await fetch(`/api/digests/${id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to regenerate digest');
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
  async getInsights(userId?: string): Promise<InsightsData> {
    const url = userId ? `/api/insights?userId=${encodeURIComponent(userId)}` : '/api/insights';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Rediscovery & Worth Revisiting
  async getRediscovery(limit = 4, surface = 'dashboard', userId?: string): Promise<RediscoveryCandidateItem[]> {
    const params = new URLSearchParams({ limit: String(limit), surface });
    if (userId) params.set('userId', userId);
    const res = await fetch(`/api/rediscovery?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch rediscovery candidates');
    return res.json();
  },

  async sendRediscoveryFeedback(
    bookmarkId: string,
    interaction: 'useful' | 'not_relevant' | 'hide' | 'click' | 'view',
    surface = 'dashboard',
    userId?: string
  ): Promise<any> {
    const res = await fetch('/api/rediscovery/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookmarkId, interaction, surface, userId }),
    });
    if (!res.ok) throw new Error('Failed to submit rediscovery feedback');
    return res.json();
  },

  // Chat & Production RAG
  async getChatThreads(userId?: string): Promise<ChatThread[]> {
    const url = userId ? `/api/chat/threads?userId=${encodeURIComponent(userId)}` : '/api/chat/threads';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chat threads');
    return res.json();
  },

  async getChatThread(id: string, userId?: string): Promise<ChatThread> {
    const url = userId ? `/api/chat/threads/${id}?userId=${encodeURIComponent(userId)}` : `/api/chat/threads/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chat thread');
    return res.json();
  },

  async createChatThread(title?: string, scopeDescription?: string, userId?: string): Promise<ChatThread> {
    const res = await fetch('/api/chat/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, scopeDescription, userId }),
    });
    if (!res.ok) throw new Error('Failed to create chat thread');
    return res.json();
  },

  async deleteChatThread(id: string, userId?: string): Promise<{ success: boolean }> {
    const url = userId ? `/api/chat/threads/${id}?userId=${encodeURIComponent(userId)}` : `/api/chat/threads/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete chat thread');
    return res.json();
  },

  async askRecallly(params: {
    question: string;
    threadId?: string;
    scope?: {
      collectionId?: string;
      bookmarkIds?: string[];
      topic?: string;
      scopeDescription?: string;
    };
    filters?: any;
    userId?: string;
  }): Promise<{
    threadId: string;
    answer: string;
    citedSources: any[];
    allRetrievedSources: any[];
    sufficiency: 'sufficient' | 'partial' | 'insufficient';
    metrics: {
      retrievalLatencyMs: number;
      generationLatencyMs: number;
      totalLatencyMs: number;
      sourcesRetrieved: number;
      sourcesCited: number;
      confidence: number;
      retrievalMode: 'hybrid' | 'lexical' | 'semantic';
    };
  }> {
    const res = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'RAG query failed' }));
      throw new Error(err.error || 'Failed to ask Recallly');
    }
    return res.json();
  },

  async sendMessage(
    threadId: string,
    message: string,
    scope?: { collectionId?: string; bookmarkIds?: string[]; topic?: string; scopeDescription?: string }
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, scope }),
    });
    if (!res.ok) throw new Error('Failed to send chat message');
    return res.json();
  },

  // Subscription & Commercial Billing
  async getSubscription(): Promise<Subscription> {
    const res = await fetch('/api/billing/subscription');
    if (!res.ok) throw new Error('Failed to fetch subscription');
    return res.json();
  },

  async upgradeSubscription(): Promise<Subscription> {
    const res = await fetch('/api/subscription/upgrade', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to upgrade subscription');
    return res.json();
  },

  async getBillingConfig(): Promise<{
    plans: Record<string, PlanConfig>;
    defaultTrialDays: number;
    isStripeConfigured: boolean;
  }> {
    const res = await fetch('/api/billing/config');
    if (!res.ok) throw new Error('Failed to fetch billing configuration');
    return res.json();
  },

  async getEntitlements(): Promise<EntitlementData> {
    const res = await fetch('/api/billing/entitlements');
    if (!res.ok) throw new Error('Failed to fetch entitlements');
    return res.json();
  },

  async createCheckoutSession(params: {
    plan?: string;
    interval?: 'monthly' | 'yearly';
    userEmail?: string;
  }): Promise<{ url: string; sessionId?: string; isMock?: boolean }> {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initiate checkout');
    }
    return res.json();
  },

  async createPortalSession(): Promise<{ url: string; isMock?: boolean }> {
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to open billing portal');
    }
    return res.json();
  },

  async simulateSubscription(params: {
    plan: 'free' | 'pro';
    status?: string;
    interval?: 'monthly' | 'yearly';
  }): Promise<{ subscription: Subscription; entitlements: EntitlementData }> {
    const res = await fetch('/api/billing/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to simulate subscription');
    return res.json();
  },

  // Global Search (Cmd+K)
  async globalSearch(q: string): Promise<{
    bookmarks: Bookmark[];
    searchResults?: any[];
    collections: Collection[];
    topics: Topic[];
    searchMode?: string;
    latencyMs?: number;
  }> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('Failed to perform global search');
    return res.json();
  },

  // Hybrid & Semantic Vector Search
  async searchHybrid(
    query: string,
    filters?: {
      topic?: string;
      source?: string;
      filter?: 'all' | 'unread' | 'favorites' | 'recent';
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    query: string;
    results: {
      item: Bookmark;
      score: number;
      matchType: 'lexical' | 'semantic' | 'hybrid';
    }[];
    total: number;
    mode: 'hybrid' | 'lexical' | 'semantic';
    latencyMs: number;
  }> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (filters?.topic && filters.topic !== 'all') params.set('topic', filters.topic);
    if (filters?.source && filters.source !== 'all') params.set('source', filters.source);
    if (filters?.filter && filters.filter !== 'all') params.set('filter', filters.filter);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const res = await fetch(`/api/search/hybrid?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to execute hybrid search');
    return res.json();
  },

  // Embedding Status & Backfill
  async getEmbeddingStatus(): Promise<{
    totalBookmarks: number;
    embeddedCount: number;
    pendingJobs: number;
    processingJobs: number;
    failedJobs: number;
  }> {
    const res = await fetch('/api/embeddings/status');
    if (!res.ok) throw new Error('Failed to fetch embedding status');
    return res.json();
  },

  async triggerEmbeddingBackfill(): Promise<{ success: boolean; enqueuedCount: number }> {
    const res = await fetch('/api/embeddings/backfill', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger embedding backfill');
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

  // Phase 12 Background Automation & Reliability
  async getBackgroundStatus(): Promise<{
    metrics: any;
    recentJobs: any[];
    recentDeliveries: any[];
  }> {
    const res = await fetch('/api/background/status');
    if (!res.ok) throw new Error('Failed to fetch background status');
    return res.json();
  },

  async triggerCronTick(): Promise<any> {
    const res = await fetch('/api/cron/tick', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger cron tick');
    return res.json();
  },

  async triggerCronSync(): Promise<any> {
    const res = await fetch('/api/cron/sync', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger cron sync');
    return res.json();
  },

  async triggerCronDigests(): Promise<any> {
    const res = await fetch('/api/cron/digests', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger cron digests');
    return res.json();
  },

  async triggerBackgroundRun(action: string, options?: any): Promise<any> {
    const res = await fetch('/api/background/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...options }),
    });
    if (!res.ok) throw new Error(`Failed to trigger background run ${action}`);
    return res.json();
  },

  async deliverDigestEmail(digestId: string): Promise<any> {
    const res = await fetch(`/api/digests/${digestId}/deliver`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to deliver digest email');
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
