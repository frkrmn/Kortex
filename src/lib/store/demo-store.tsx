import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bookmark,
  Collection,
  Topic,
  Digest,
  DigestSettings,
  UserProfile,
  ConnectedAccount,
  Subscription,
  SyncProgressState,
  RediscoveryCandidateItem,
  InsightsData,
} from '../../types';
import {
  demoUser,
  demoConnectedAccounts,
  demoSubscription,
  demoDigestSettings,
  demoTopics,
  demoBookmarks,
  demoCollections,
  demoDigests,
  demoInsights,
  RichInsightsData,
} from '../demo-data';
import { repositories, isDemoMode } from '../repositories';
import { api } from '../api';

export interface XStatusState {
  connected: boolean;
  username: string;
  displayName: string;
  avatarUrl: string;
  last_sync_at?: string;
  last_successful_sync?: string;
  sync_status: 'idle' | 'syncing' | 'error';
  configured: boolean;
  redirectUri?: string;
}

interface DemoStoreContextType {
  // State
  dataMode: 'demo' | 'supabase';
  profile: UserProfile;
  connectedAccounts: ConnectedAccount[];
  xStatus: XStatusState;
  syncProgress: SyncProgressState;
  subscription: Subscription;
  digestSettings: DigestSettings;
  topics: Topic[];
  bookmarks: Bookmark[];
  collections: Collection[];
  digests: Digest[];
  insights: RichInsightsData | InsightsData;
  rediscoveryCandidates: RediscoveryCandidateItem[];
  isGeneratingDigest: boolean;
  sidebarCollapsed: boolean;
  bookmarkViewMode: 'comfortable' | 'compact';
  toastMessage: string | null;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBookmarkViewMode: (mode: 'comfortable' | 'compact') => void;
  showToast: (message: string) => void;
  clearToast: () => void;

  toggleFavorite: (id: string) => void;
  toggleRead: (id: string) => void;
  deleteBookmark: (id: string) => void;

  createCollection: (name: string, description: string, visibility: 'public' | 'private') => Collection;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  toggleBookmarkInCollection: (collectionId: string, bookmarkId: string) => void;

  updateProfile: (updates: Partial<UserProfile>) => void;
  updateDigestSettings: (updates: Partial<DigestSettings>) => void;
  resetData: () => void;

  // Intelligence & Digest Actions
  refreshDigests: () => Promise<void>;
  generateNewDigest: (options?: { forceRegenerate?: boolean; period?: string }) => Promise<Digest>;
  regenerateDigest: (id: string) => Promise<Digest>;
  refreshInsights: () => Promise<void>;
  refreshRediscovery: (limit?: number, surface?: string) => Promise<void>;
  sendRediscoveryFeedback: (
    bookmarkId: string,
    interaction: 'useful' | 'not_relevant' | 'hide' | 'click' | 'view',
    surface?: string
  ) => Promise<void>;

  // X Integration Actions
  refreshXStatus: () => Promise<void>;
  syncXBookmarks: () => Promise<{ success: boolean; addedCount: number; discoveredCount?: number }>;
  disconnectXAccount: () => Promise<void>;
  addImportedBookmarks: (newItems: Bookmark[]) => void;

  // AI Enrichment Actions & State
  reprocessBookmark: (id: string) => Promise<void>;
  reprocessAllBookmarks: () => Promise<void>;
  removeTopicFromBookmark: (bookmarkId: string, topic: string) => Promise<void>;
  enrichmentStatus: {
    isProcessing: boolean;
    activeCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
  };

  // Selectors
  getBookmark: (id: string) => Bookmark | undefined;
  getCollection: (slugOrId: string) => Collection | undefined;
  getDigest: (id: string) => Digest | undefined;
  getRelatedBookmarks: (id: string, count?: number) => Bookmark[];
  getCollectionBookmarks: (collection: Collection) => Bookmark[];
  searchBookmarks: (
    query?: string,
    options?: {
      topic?: string;
      filter?: 'all' | 'unread' | 'favorites';
      sort?: 'newest' | 'oldest' | 'relevant';
    }
  ) => Bookmark[];
}

const DemoStoreContext = createContext<DemoStoreContextType | null>(null);

const STORAGE_KEYS = {
  BOOKMARKS: 'recallly_demo_bookmarks_v1',
  COLLECTIONS: 'recallly_demo_collections_v1',
  PROFILE: 'recallly_demo_profile_v1',
  DIGEST_SETTINGS: 'recallly_demo_digest_settings_v1',
  DIGESTS: 'recallly_demo_digests_v1',
  VIEW_MODE: 'recallly_view_mode_v1',
  SIDEBAR_COLLAPSED: 'recallly_sidebar_collapsed_v1',
};

export const DemoStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local persistence helpers
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return saved ? JSON.parse(saved) : demoBookmarks;
    } catch {
      return demoBookmarks;
    }
  });

  const [digests, setDigests] = useState<Digest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIGESTS);
      return saved ? JSON.parse(saved) : demoDigests;
    } catch {
      return demoDigests;
    }
  });

  const [insights, setInsights] = useState<RichInsightsData | InsightsData>(demoInsights);
  const [rediscoveryCandidates, setRediscoveryCandidates] = useState<RediscoveryCandidateItem[]>([]);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState<boolean>(false);

  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      return saved ? JSON.parse(saved) : demoCollections;
    } catch {
      return demoCollections;
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : demoUser;
    } catch {
      return demoUser;
    }
  });

  const [digestSettings, setDigestSettings] = useState<DigestSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIGEST_SETTINGS);
      return saved ? JSON.parse(saved) : demoDigestSettings;
    } catch {
      return demoDigestSettings;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const [bookmarkViewMode, setBookmarkViewModeState] = useState<'comfortable' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return saved === 'compact' ? 'compact' : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast handler with auto-clear
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // X Integration State
  const [xStatus, setXStatus] = useState<XStatusState>({
    connected: true,
    username: 'faruk',
    displayName: 'Faruk',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    last_sync_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    last_successful_sync: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    sync_status: 'idle',
    configured: false,
  });

  const [syncProgress, setSyncProgress] = useState<SyncProgressState>({
    isSyncing: false,
    stage: 'idle',
    processedCount: 0,
    totalCount: 0,
    message: 'Ready',
  });

  // Fetch initial X status from server
  const refreshXStatus = useCallback(async () => {
    try {
      const status = await api.getXStatus();
      setXStatus(status);
    } catch (e) {
      console.warn('Could not fetch X status:', e);
    }
  }, []);

  useEffect(() => {
    refreshXStatus();
  }, [refreshXStatus]);

  // Add imported bookmarks helper (deduplicated)
  const addImportedBookmarks = useCallback((newItems: Bookmark[]) => {
    if (!newItems || newItems.length === 0) return;
    setBookmarks((prev) => {
      const existingIds = new Set(prev.map((b) => b.external_id || b.id));
      const fresh = newItems.filter((item) => !existingIds.has(item.external_id || item.id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev];
    });
  }, []);

  // Sync X Bookmarks Action
  const syncXBookmarks = useCallback(async () => {
    setSyncProgress({
      isSyncing: true,
      stage: 'fetching',
      processedCount: 0,
      totalCount: 0,
      message: 'Connecting to X and checking bookmarks...',
    });

    try {
      const result = await api.syncX();
      if (!result.success) throw new Error(result.error || 'X sync could not complete.');
      if (result.success && result.items && result.items.length > 0) {
        addImportedBookmarks(result.items);
      }
      await refreshXStatus();
      setSyncProgress({
        isSyncing: false,
        stage: 'complete',
        processedCount: result.addedCount,
        totalCount: result.discoveredCount || result.addedCount,
        message: `Sync complete. ${result.addedCount} new bookmark(s) imported.`,
      });
      showToast(`Imported ${result.addedCount} new bookmark(s) from X`);
      return { success: true, addedCount: result.addedCount, discoveredCount: result.discoveredCount };
    } catch (err: any) {
      setSyncProgress({
        isSyncing: false,
        stage: 'idle',
        processedCount: 0,
        totalCount: 0,
        message: err.message || 'Sync failed',
      });
      showToast(err.message || 'Failed to sync with X');
      return { success: false, addedCount: 0 };
    }
  }, [addImportedBookmarks, refreshXStatus, showToast]);

  // Disconnect X
  const disconnectXAccount = useCallback(async () => {
    try {
      await api.disconnectX();
      await refreshXStatus();
      showToast('X account disconnected');
    } catch (e) {
      showToast('Could not disconnect X account');
    }
  }, [refreshXStatus, showToast]);

  // AI Enrichment Pipeline State & Actions
  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    isProcessing: boolean;
    activeCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
  }>({
    isProcessing: false,
    activeCount: 0,
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0,
  });

  const reprocessBookmark = useCallback(async (id: string) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, enrichment_status: 'processing' } : b));
    showToast('Queued for AI analysis...');
    try {
      await api.reprocessBookmark(id);
    } catch (e: any) {
      showToast(e.message || 'Failed to start AI analysis');
      setBookmarks(prev => prev.map(b => b.id === id ? { ...b, enrichment_status: 'failed' } : b));
    }
  }, [showToast]);

  const reprocessAllBookmarks = useCallback(async () => {
    try {
      const res = await api.reprocessAllPending();
      showToast(`Enqueued ${res.count} bookmarks for AI analysis`);
      setBookmarks(prev =>
        prev.map(b => (!b.ai_summary || b.enrichment_status === 'failed' ? { ...b, enrichment_status: 'pending' } : b))
      );
    } catch (e: any) {
      showToast(e.message || 'Failed to trigger batch analysis');
    }
  }, [showToast]);

  const removeTopicFromBookmark = useCallback(async (bookmarkId: string, topic: string) => {
    setBookmarks(prev =>
      prev.map(b => (b.id === bookmarkId ? { ...b, topics: (b.topics || []).filter(t => t !== topic) } : b))
    );
    try {
      await api.removeTopicFromBookmark(bookmarkId, topic);
      showToast(`Removed topic "${topic}"`);
    } catch (e: any) {
      console.warn('Could not remove topic on server:', e);
    }
  }, [showToast]);

  // Dynamically computed topics based on real bookmarks
  const topics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookmarks) {
      for (const t of b.topics || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }

    const topicMap = new Map<string, Topic>();
    for (const dt of demoTopics) {
      topicMap.set(dt.name.toLowerCase(), {
        ...dt,
        count: counts[dt.name] || 0,
      });
    }

    for (const [name, count] of Object.entries(counts)) {
      const lower = name.toLowerCase();
      if (!topicMap.has(lower)) {
        topicMap.set(lower, {
          id: `top_${lower.replace(/[^a-z0-9]/g, '_')}`,
          user_id: profile.user_id,
          name,
          slug: lower.replace(/[^a-z0-9]+/g, '-'),
          count,
        });
      } else {
        topicMap.get(lower)!.count = count;
      }
    }

    return Array.from(topicMap.values()).sort((a, b) => b.count - a.count);
  }, [bookmarks, profile.user_id]);

  // Live polling for asynchronous AI enrichment jobs
  useEffect(() => {
    const hasActiveOrPending = bookmarks.some(
      b => b.enrichment_status === 'pending' || b.enrichment_status === 'processing'
    );

    if (!hasActiveOrPending && !enrichmentStatus.isProcessing) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const [statusData, serverBookmarks] = await Promise.all([
          api.getEnrichmentStatus(),
          api.getBookmarks(),
        ]);

        setEnrichmentStatus({
          isProcessing: statusData.isProcessing,
          activeCount: statusData.activeCount,
          pendingCount: statusData.pendingCount,
          completedCount: statusData.completedCount,
          failedCount: statusData.failedCount,
        });

        if (serverBookmarks && serverBookmarks.length > 0) {
          setBookmarks(prev => {
            const serverMap = new Map(serverBookmarks.map(b => [b.id, b]));
            return prev.map(local => {
              const updated = serverMap.get(local.id);
              if (
                updated &&
                (updated.ai_summary !== local.ai_summary ||
                  updated.enrichment_status !== local.enrichment_status ||
                  (updated.topics && updated.topics.length !== (local.topics || []).length))
              ) {
                return { ...local, ...updated };
              }
              return local;
            });
          });
        }
      } catch (err) {
        console.warn('Enrichment poller error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [bookmarks, enrichmentStatus.isProcessing]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Could not persist bookmarks to localStorage', e);
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    } catch (e) {
      console.warn('Could not persist collections to localStorage', e);
    }
  }, [collections]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not persist profile to localStorage', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIGEST_SETTINGS, JSON.stringify(digestSettings));
    } catch (e) {
      console.warn('Could not persist digest settings to localStorage', e);
    }
  }, [digestSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIGESTS, JSON.stringify(digests));
    } catch (e) {
      console.warn('Could not persist digests to localStorage', e);
    }
  }, [digests]);

  const setSidebarCollapsed = useCallback((val: boolean) => {
    setSidebarCollapsedState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(val));
    } catch {}
  }, []);

  const setBookmarkViewMode = useCallback((mode: 'comfortable' | 'compact') => {
    setBookmarkViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    } catch {}
  }, []);

  // Data mode indicator
  const dataMode: 'demo' | 'supabase' = isDemoMode() ? 'demo' : 'supabase';

  // Mutations
  const toggleFavorite = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, is_favorite: !b.is_favorite } : b));
      const target = next.find((b) => b.id === id);
      if (target) {
        repositories.savedItems.updateFavoriteStatus(id, target.is_favorite).catch(console.error);
      }
      return next;
    });
  }, []);

  const toggleRead = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, is_read: !b.is_read } : b));
      const target = next.find((b) => b.id === id);
      if (target) {
        repositories.savedItems.updateReadStatus(id, target.is_read).catch(console.error);
      }
      return next;
    });
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    repositories.savedItems.delete(id).catch(console.error);
    // Also remove from any collections
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        bookmark_ids: col.bookmark_ids.filter((bId) => bId !== id),
      }))
    );
    showToast('Bookmark removed from library');
  }, [showToast]);

  const createCollection = useCallback(
    (name: string, description: string, visibility: 'public' | 'private') => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const newCol: Collection = {
        id: `col_${Date.now()}`,
        user_id: profile.user_id,
        name: name.trim(),
        slug: slug || `col-${Date.now()}`,
        description: description.trim(),
        visibility,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bookmark_ids: [],
        creator_name: profile.display_name,
      };
      setCollections((prev) => [newCol, ...prev]);
      repositories.collections.create(name.trim(), description.trim(), visibility).catch(console.error);
      showToast(`Collection "${newCol.name}" created`);
      return newCol;
    },
    [profile, showToast]
  );

  const updateCollection = useCallback(
    (id: string, updates: Partial<Collection>) => {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === id
            ? { ...col, ...updates, updated_at: new Date().toISOString() }
            : col
        )
      );
      repositories.collections.update(id, updates).catch(console.error);
      showToast('Collection updated');
    },
    [showToast]
  );

  const deleteCollection = useCallback(
    (id: string) => {
      setCollections((prev) => prev.filter((col) => col.id !== id));
      repositories.collections.delete(id).catch(console.error);
      showToast('Collection deleted');
    },
    [showToast]
  );

  const toggleBookmarkInCollection = useCallback(
    (collectionId: string, bookmarkId: string) => {
      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const exists = col.bookmark_ids.includes(bookmarkId);
          const nextBookmarkIds = exists
            ? col.bookmark_ids.filter((id) => id !== bookmarkId)
            : [...col.bookmark_ids, bookmarkId];
          return {
            ...col,
            bookmark_ids: nextBookmarkIds,
            updated_at: new Date().toISOString(),
          };
        })
      );
      repositories.collections.toggleItem(collectionId, bookmarkId).catch(console.error);
      // Also update collection_ids in bookmark
      setBookmarks((prev) =>
        prev.map((b) => {
          if (b.id !== bookmarkId) return b;
          const prevColIds = b.collection_ids || [];
          const exists = prevColIds.includes(collectionId);
          return {
            ...b,
            collection_ids: exists
              ? prevColIds.filter((id) => id !== collectionId)
              : [...prevColIds, collectionId],
          };
        })
      );
    },
    []
  );

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    repositories.profiles.update(updates).catch(console.error);
  }, []);

  const updateDigestSettings = useCallback((updates: Partial<DigestSettings>) => {
    setDigestSettings((prev) => ({ ...prev, ...updates }));
    repositories.digests.updateSettings(updates).catch(console.error);
    showToast('Digest settings saved');
  }, [showToast]);

  // Intelligence & Digest Actions
  const refreshDigests = useCallback(async () => {
    try {
      const list = await api.getDigests(profile.user_id);
      if (Array.isArray(list) && list.length > 0) {
        setDigests(list);
      }
    } catch (e) {
      console.warn('Failed to refresh digests:', e);
    }
  }, [profile.user_id]);

  const refreshInsights = useCallback(async () => {
    try {
      const data = await api.getInsights(profile.user_id);
      if (data) {
        setInsights(data as any);
      }
    } catch (e) {
      console.warn('Failed to refresh insights:', e);
    }
  }, [profile.user_id]);

  const refreshRediscovery = useCallback(async (limit = 4, surface = 'dashboard') => {
    try {
      const candidates = await api.getRediscovery(limit, surface, profile.user_id);
      if (Array.isArray(candidates)) {
        setRediscoveryCandidates(candidates);
      }
    } catch (e) {
      console.warn('Failed to refresh rediscovery:', e);
    }
  }, [profile.user_id]);

  const generateNewDigest = useCallback(async (options?: { forceRegenerate?: boolean; period?: string }) => {
    setIsGeneratingDigest(true);
    try {
      const newDigest = await api.generateDigest({
        userId: profile.user_id,
        forceRegenerate: options?.forceRegenerate,
        period: options?.period,
      });
      setDigests((prev) => {
        const filtered = prev.filter(d => d.id !== newDigest.id);
        return [newDigest, ...filtered];
      });
      showToast('New intelligence digest generated');
      return newDigest;
    } catch (e: any) {
      showToast(e.message || 'Failed to generate digest');
      throw e;
    } finally {
      setIsGeneratingDigest(false);
    }
  }, [profile.user_id, showToast]);

  const regenerateDigest = useCallback(async (id: string) => {
    setIsGeneratingDigest(true);
    try {
      const updated = await api.regenerateDigest(id, profile.user_id);
      setDigests((prev) => prev.map(d => (d.id === id ? updated : d)));
      showToast('Digest regenerated with fresh synthesis');
      return updated;
    } catch (e: any) {
      showToast(e.message || 'Failed to regenerate digest');
      throw e;
    } finally {
      setIsGeneratingDigest(false);
    }
  }, [profile.user_id, showToast]);

  const sendRediscoveryFeedback = useCallback(async (
    bookmarkId: string,
    interaction: 'useful' | 'not_relevant' | 'hide' | 'click' | 'view',
    surface = 'dashboard'
  ) => {
    try {
      await api.sendRediscoveryFeedback(bookmarkId, interaction, surface, profile.user_id);
      if (interaction === 'not_relevant' || interaction === 'hide') {
        setRediscoveryCandidates(prev => prev.filter(c => c.bookmark.id !== bookmarkId));
        showToast('Feedback noted: surfacing fewer similar items');
      } else if (interaction === 'useful') {
        showToast('Marked as useful! We will remember this topic preference');
      }
    } catch (e) {
      console.warn('Failed to submit feedback:', e);
    }
  }, [profile.user_id, showToast]);

  // Initial intelligence fetch
  useEffect(() => {
    refreshDigests();
    refreshInsights();
    refreshRediscovery(4, 'dashboard');
  }, [refreshDigests, refreshInsights, refreshRediscovery]);

  const resetData = useCallback(() => {
    setBookmarks(demoBookmarks);
    setCollections(demoCollections);
    setProfile(demoUser);
    setDigestSettings(demoDigestSettings);
    setDigests(demoDigests);
    setInsights(demoInsights);
    localStorage.removeItem(STORAGE_KEYS.BOOKMARKS);
    localStorage.removeItem(STORAGE_KEYS.COLLECTIONS);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.DIGEST_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.DIGESTS);
    showToast('Demo data reset to initial fixtures');
  }, [showToast]);

  // Selectors
  const getBookmark = useCallback(
    (id: string) => bookmarks.find((b) => b.id === id),
    [bookmarks]
  );

  const getCollection = useCallback(
    (slugOrId: string) =>
      collections.find((c) => c.slug === slugOrId || c.id === slugOrId),
    [collections]
  );

  const getDigest = useCallback(
    (id: string) => digests.find((d) => d.id === id) || demoDigests.find((d) => d.id === id),
    [digests]
  );

  const getRelatedBookmarks = useCallback(
    (id: string, count = 3) => {
      const current = bookmarks.find((b) => b.id === id);
      if (!current) return bookmarks.slice(0, count);

      const targetTopics = new Set(current.topics || []);
      return bookmarks
        .filter((b) => b.id !== id)
        .sort((a, b) => {
          const aOverlap = (a.topics || []).filter((t) => targetTopics.has(t)).length;
          const bOverlap = (b.topics || []).filter((t) => targetTopics.has(t)).length;
          return bOverlap - aOverlap;
        })
        .slice(0, count);
    },
    [bookmarks]
  );

  const getCollectionBookmarks = useCallback(
    (collection: Collection) => {
      return collection.bookmark_ids
        .map((id) => bookmarks.find((b) => b.id === id))
        .filter((b): b is Bookmark => Boolean(b));
    },
    [bookmarks]
  );

  const searchBookmarks = useCallback(
    (
      query = '',
      options?: {
        topic?: string;
        filter?: 'all' | 'unread' | 'favorites';
        sort?: 'newest' | 'oldest' | 'relevant';
      }
    ) => {
      let result = [...bookmarks];
      const q = query.trim().toLowerCase();

      if (q) {
        result = result.filter((b) => {
          const inContent = b.content.toLowerCase().includes(q);
          const inAuthor = b.author_name.toLowerCase().includes(q) || b.author_username.toLowerCase().includes(q);
          const inSummary = (b.ai_summary || '').toLowerCase().includes(q);
          const inTopics = (b.topics || []).some((t) => t.toLowerCase().includes(q));
          const inKeywords = (b.keywords || []).some((k) => k.toLowerCase().includes(q));
          return inContent || inAuthor || inSummary || inTopics || inKeywords;
        });
      }

      if (options?.topic && options.topic !== 'all') {
        const target = options.topic.toLowerCase();
        result = result.filter((b) =>
          (b.topics || []).some((t) => t.toLowerCase() === target)
        );
      }

      if (options?.filter === 'unread') {
        result = result.filter((b) => !b.is_read);
      } else if (options?.filter === 'favorites') {
        result = result.filter((b) => b.is_favorite);
      }

      if (options?.sort === 'oldest') {
        result.sort((a, b) => new Date(a.bookmark_created_at).getTime() - new Date(b.bookmark_created_at).getTime());
      } else {
        // default newest
        result.sort((a, b) => new Date(b.bookmark_created_at).getTime() - new Date(a.bookmark_created_at).getTime());
      }

      return result;
    },
    [bookmarks]
  );

  const value = useMemo(
    () => ({
      dataMode,
      profile,
      connectedAccounts: demoConnectedAccounts,
      xStatus,
      syncProgress,
      subscription: demoSubscription,
      digestSettings,
      topics,
      bookmarks,
      collections,
      digests,
      insights,
      rediscoveryCandidates,
      isGeneratingDigest,
      sidebarCollapsed,
      bookmarkViewMode,
      toastMessage,
      enrichmentStatus,
      setSidebarCollapsed,
      setBookmarkViewMode,
      showToast,
      clearToast,
      toggleFavorite,
      toggleRead,
      deleteBookmark,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleBookmarkInCollection,
      updateProfile,
      updateDigestSettings,
      resetData,
      refreshDigests,
      generateNewDigest,
      regenerateDigest,
      refreshInsights,
      refreshRediscovery,
      sendRediscoveryFeedback,
      refreshXStatus,
      syncXBookmarks,
      disconnectXAccount,
      addImportedBookmarks,
      reprocessBookmark,
      reprocessAllBookmarks,
      removeTopicFromBookmark,
      getBookmark,
      getCollection,
      getDigest,
      getRelatedBookmarks,
      getCollectionBookmarks,
      searchBookmarks,
    }),
    [
      dataMode,
      profile,
      xStatus,
      syncProgress,
      digestSettings,
      bookmarks,
      collections,
      digests,
      insights,
      rediscoveryCandidates,
      isGeneratingDigest,
      sidebarCollapsed,
      bookmarkViewMode,
      toastMessage,
      setSidebarCollapsed,
      setBookmarkViewMode,
      showToast,
      clearToast,
      toggleFavorite,
      toggleRead,
      deleteBookmark,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleBookmarkInCollection,
      updateProfile,
      updateDigestSettings,
      resetData,
      refreshDigests,
      generateNewDigest,
      regenerateDigest,
      refreshInsights,
      refreshRediscovery,
      sendRediscoveryFeedback,
      refreshXStatus,
      syncXBookmarks,
      disconnectXAccount,
      addImportedBookmarks,
      reprocessBookmark,
      reprocessAllBookmarks,
      removeTopicFromBookmark,
      topics,
      enrichmentStatus,
      getBookmark,
      getCollection,
      getDigest,
      getRelatedBookmarks,
      getCollectionBookmarks,
      searchBookmarks,
    ]
  );

  return (
    <DemoStoreContext.Provider value={value}>
      {children}
    </DemoStoreContext.Provider>
  );
};

export const useDemoStore = () => {
  const context = useContext(DemoStoreContext);
  if (!context) {
    throw new Error('useDemoStore must be used within a DemoStoreProvider');
  }
  return context;
};
