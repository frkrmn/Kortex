import {
  ISavedItemRepository,
  ICollectionRepository,
  ITopicRepository,
  IDigestRepository,
  IProfileRepository,
  IConnectedAccountRepository,
  IChatRepository,
} from './types';

import { DemoSavedItemRepository } from './demo/demo-saved-item.repo';
import { DemoCollectionRepository } from './demo/demo-collection.repo';
import { DemoTopicRepository } from './demo/demo-topic.repo';
import { DemoDigestRepository } from './demo/demo-digest.repo';
import { DemoProfileRepository } from './demo/demo-profile.repo';
import { DemoConnectedAccountRepository } from './demo/demo-connected-account.repo';
import { DemoChatRepository } from './demo/demo-chat.repo';

import { SupabaseSavedItemRepository } from './supabase/supabase-saved-item.repo';
import { SupabaseCollectionRepository } from './supabase/supabase-collection.repo';
import { SupabaseTopicRepository } from './supabase/supabase-topic.repo';
import { SupabaseDigestRepository } from './supabase/supabase-digest.repo';
import { SupabaseProfileRepository } from './supabase/supabase-profile.repo';
import { SupabaseConnectedAccountRepository } from './supabase/supabase-connected-account.repo';
import { SupabaseChatRepository } from './supabase/supabase-chat.repo';
import { isSupabaseConfigured } from '../supabase/client';

export * from './types';

/**
 * Checks whether the app is running in Demo mode.
 * Defaults to true if VITE_DEMO_MODE is not explicitly set to 'false',
 * or if Supabase environment variables are missing.
 */
export const isDemoMode = (): boolean => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envDemo =
    metaEnv?.VITE_DEMO_MODE ||
    (typeof process !== 'undefined' && process.env?.VITE_DEMO_MODE);

  if (envDemo === 'false') {
    // Explicitly opted into production mode - check if Supabase is actually configured
    return !isSupabaseConfigured();
  }

  // Default to demo mode for preview stability
  return true;
};

// Lazy singletons
let savedItemRepo: ISavedItemRepository | null = null;
let collectionRepo: ICollectionRepository | null = null;
let topicRepo: ITopicRepository | null = null;
let digestRepo: IDigestRepository | null = null;
let profileRepo: IProfileRepository | null = null;
let connectedAccountRepo: IConnectedAccountRepository | null = null;
let chatRepo: IChatRepository | null = null;

export const getSavedItemRepository = (): ISavedItemRepository => {
  if (!savedItemRepo) {
    savedItemRepo = isDemoMode() ? new DemoSavedItemRepository() : new SupabaseSavedItemRepository();
  }
  return savedItemRepo;
};

export const getCollectionRepository = (): ICollectionRepository => {
  if (!collectionRepo) {
    collectionRepo = isDemoMode() ? new DemoCollectionRepository() : new SupabaseCollectionRepository();
  }
  return collectionRepo;
};

export const getTopicRepository = (): ITopicRepository => {
  if (!topicRepo) {
    topicRepo = isDemoMode() ? new DemoTopicRepository() : new SupabaseTopicRepository();
  }
  return topicRepo;
};

export const getDigestRepository = (): IDigestRepository => {
  if (!digestRepo) {
    digestRepo = isDemoMode() ? new DemoDigestRepository() : new SupabaseDigestRepository();
  }
  return digestRepo;
};

export const getProfileRepository = (): IProfileRepository => {
  if (!profileRepo) {
    profileRepo = isDemoMode() ? new DemoProfileRepository() : new SupabaseProfileRepository();
  }
  return profileRepo;
};

export const getConnectedAccountRepository = (): IConnectedAccountRepository => {
  if (!connectedAccountRepo) {
    connectedAccountRepo = isDemoMode()
      ? new DemoConnectedAccountRepository()
      : new SupabaseConnectedAccountRepository();
  }
  return connectedAccountRepo;
};

export const getChatRepository = (): IChatRepository => {
  if (!chatRepo) {
    chatRepo = isDemoMode() ? new DemoChatRepository() : new SupabaseChatRepository();
  }
  return chatRepo;
};

export const repositories = {
  get savedItems() {
    return getSavedItemRepository();
  },
  get collections() {
    return getCollectionRepository();
  },
  get topics() {
    return getTopicRepository();
  },
  get digests() {
    return getDigestRepository();
  },
  get profiles() {
    return getProfileRepository();
  },
  get connectedAccounts() {
    return getConnectedAccountRepository();
  },
  get chat() {
    return getChatRepository();
  },
};
