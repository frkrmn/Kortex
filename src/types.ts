export type SourceType = 'twitter' | 'reddit' | 'linkedin' | 'youtube' | 'substack' | 'article' | 'rss' | 'manual';

export interface BookmarkMedia {
  type: 'image' | 'video' | 'link_preview';
  url: string;
  previewUrl?: string;
  alt?: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  source: SourceType;
  external_id: string;
  author_id?: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  content: string;
  url: string;
  media?: BookmarkMedia[];
  bookmark_created_at: string;
  imported_at: string;
  is_read: boolean;
  is_favorite: boolean;
  ai_summary: string;
  topics: string[];
  keywords: string[];
  collection_ids?: string[];
  why_saved_insight?: string;
  enrichment_status?: 'not_processed' | 'pending' | 'processing' | 'completed' | 'failed';
  language?: string;
  enriched_at?: string;
  enrichment_version?: string;
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  embedding?: number[];
}

export interface Topic {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  count: number;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  visibility: 'private' | 'public';
  created_at: string;
  updated_at: string;
  bookmark_ids: string[];
  creator_name?: string;
}

export interface DigestTopicGroup {
  topic: string;
  summary: string;
  bookmark_ids: string[];
}

export interface Digest {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'sent';
  title: string;
  bookmarks_count: number;
  topics_count: number;
  key_ideas_count: number;
  topic_groups: DigestTopicGroup[];
  key_ideas: string[];
  worth_revisiting_ids: string[];
  created_at: string;
  sent_at?: string;
}

export interface DigestSettings {
  user_id: string;
  frequency: 'daily' | 'weekly' | 'off';
  delivery_day: string; // 'Monday', 'Friday', etc.
  delivery_time: string; // '09:00'
  timezone: string;
  email: string;
  enabled: boolean;
}

export interface ChatSourceCitation {
  bookmark_id: string;
  author_name: string;
  author_username: string;
  excerpt: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSourceCitation[];
  created_at: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface Subscription {
  user_id: string;
  provider: 'stripe';
  customer_id?: string;
  subscription_id?: string;
  status: 'trialing' | 'active' | 'cancelled';
  plan: 'pro' | 'free_trial';
  current_period_end: string;
  trial_days_left?: number;
  price_monthly: number;
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: 'twitter' | 'reddit' | 'linkedin' | 'youtube' | 'rss';
  username: string;
  displayName: string;
  avatarUrl: string;
  connected: boolean;
  last_sync_at?: string;
  last_successful_sync?: string;
  sync_status: 'idle' | 'syncing' | 'processing' | 'complete' | 'error';
  errorMessage?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string;
  timezone: string;
  created_at: string;
  has_onboarded: boolean;
  onboarding_completed_at?: string | null;
  plan?: 'pro' | 'free_trial' | 'starter';
}

export interface InsightsData {
  topicDistribution: Array<{ name: string; count: number; percentage: number }>;
  emergingInterests: Array<{ topic: string; growth: string; explanation: string }>;
  forgottenKnowledge: Bookmark[];
  connections: Array<{
    theme: string;
    description: string;
    bookmark_ids: string[];
  }>;
}

export interface SyncProgressState {
  isSyncing: boolean;
  stage: 'idle' | 'fetching' | 'organizing' | 'summarizing' | 'indexing' | 'complete';
  processedCount: number;
  totalCount: number;
  message: string;
}
