// Domain Repository Contracts for Recallly
// Decouples UI & Business Logic from backend data persistence (Demo Store vs Supabase)

import {
  Bookmark,
  Collection,
  Topic,
  Digest,
  DigestSettings,
  UserProfile,
  ConnectedAccount,
  ChatThread,
  ChatMessage,
  SyncProgressState,
} from '../../types';

export interface SavedItemFilterOptions {
  query?: string;
  topic?: string;
  filter?: 'all' | 'unread' | 'favorites' | 'recent';
  sort?: 'newest' | 'oldest' | 'relevant';
}

export interface ISavedItemRepository {
  getAll(params?: SavedItemFilterOptions): Promise<Bookmark[]>;
  getById(id: string): Promise<Bookmark | null>;
  search(query: string, options?: SavedItemFilterOptions): Promise<Bookmark[]>;
  updateReadStatus(id: string, isRead: boolean): Promise<Bookmark | null>;
  updateFavoriteStatus(id: string, isFavorite: boolean): Promise<Bookmark | null>;
  update(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null>;
  delete(id: string): Promise<boolean>;
  create(item: Omit<Bookmark, 'id'>): Promise<Bookmark>;
  getRelated(id: string, count?: number): Promise<Bookmark[]>;
  getRediscover(count?: number): Promise<Bookmark[]>;
}

export interface ICollectionRepository {
  getAll(): Promise<Collection[]>;
  getById(id: string): Promise<Collection | null>;
  getBySlug(slug: string): Promise<Collection | null>;
  create(name: string, description: string, visibility?: 'private' | 'public'): Promise<Collection>;
  update(id: string, updates: Partial<Collection>): Promise<Collection | null>;
  delete(id: string): Promise<boolean>;
  addItem(collectionId: string, savedItemId: string): Promise<Collection | null>;
  removeItem(collectionId: string, savedItemId: string): Promise<Collection | null>;
  toggleItem(collectionId: string, savedItemId: string): Promise<Collection | null>;
}

export interface ITopicRepository {
  getAll(): Promise<Topic[]>;
  create(name: string, slug: string): Promise<Topic>;
}

export interface IDigestRepository {
  getAll(): Promise<Digest[]>;
  getById(id: string): Promise<Digest | null>;
  getSettings(): Promise<DigestSettings>;
  updateSettings(settings: Partial<DigestSettings>): Promise<DigestSettings>;
  createDigest?(periodStart: string, periodEnd: string): Promise<Digest>;
}

export interface IProfileRepository {
  get(): Promise<UserProfile>;
  update(updates: Partial<UserProfile>): Promise<UserProfile>;
}

export interface IConnectedAccountRepository {
  getAll(): Promise<ConnectedAccount[]>;
  getSyncStatus(): Promise<SyncProgressState>;
  updateConnection(provider: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount>;
}

export interface IChatRepository {
  getThreads(): Promise<ChatThread[]>;
  getThreadById(id: string): Promise<ChatThread | null>;
  createThread(title?: string): Promise<ChatThread>;
  getMessages(threadId: string): Promise<ChatMessage[]>;
  addMessage(threadId: string, role: 'user' | 'assistant' | 'system', content: string, sources?: any): Promise<ChatMessage>;
}
