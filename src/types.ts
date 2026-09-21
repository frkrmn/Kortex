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
  enrichment_error?: string;
  language?: string;
  enriched_at?: string;
  enrichment_version?: string;
  enrichment_model?: string;
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  embedding?: number[];
  external_content_status?: 'available' | 'unavailable' | 'deleted' | 'restricted' | 'unknown';
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
  count?: number;
}

export interface DigestKeyIdea {
  id: number;
  title: string;
  explanation: string;
  source_ids: string[];
}

export interface DigestConnection {
  source_topic: string;
  target_topic: string;
  explanation: string;
  source_ids: string[];
  bookmark_count: number;
  id?: string;
  sourceTopic?: string;
  targetTopic?: string;
  bookmarkCount?: number;
  connectionSummary?: string;
}

export interface DigestItemReference {
  id: string;
  source_id: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  content: string;
  summary: string;
  topics: string[];
  url: string;
  bookmark_created_at?: string;
}

export interface DigestRevisitItem {
  id: string;
  sourceId?: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  summary: string;
  topics: string[];
  reason: string;
  url: string;
  bookmark_id?: string;
  snippet?: string;
  days_ago?: number;
}

export interface DigestMetrics {
  total_bookmarks: number;
  total_topics: number;
  favorite_count: number;
  unread_count: number;
  read_count: number;
  top_authors: Array<{ name: string; username: string; count: number }>;
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
  // Extended fields for Phase 10 Intelligence
  overview?: string;
  summary?: string;
  type?: 'weekly' | 'monthly';
  period?: string;
  dominant_topics?: string[];
  top_topics?: Array<{ topic: string; count: number; percentage: number }>;
  key_ideas_detailed?: DigestKeyIdea[];
  connections?: DigestConnection[];
  important_bookmarks?: DigestItemReference[];
  worth_revisiting?: DigestRevisitItem[];
  metrics?: DigestMetrics;
  source_map?: Record<string, string>;
  is_lightweight?: boolean;
  generator_metadata?: {
    version: string;
    provider: string;
    model: string;
    generated_at: string;
  };
  // CamelCase aliases for UI flexibility
  bookmarksCount?: number;
  dominantTopics?: string[];
  keyIdeas?: string[];
  standoutBookmarkIds?: string[];
  actionableTakeaways?: string[];
  standout_bookmark_ids?: string[];
  takeaways?: string[];
}

export interface DigestSettings {
  user_id: string;
  frequency: 'daily' | 'weekly' | 'off';
  delivery_day: string; // 'Monday', 'Friday', etc.
  delivery_time: string; // '09:00'
  timezone: string;
  email: string;
  enabled: boolean;
  last_delivered_at?: string;
  next_delivery_at?: string;
}

export interface ChatSourceCitation {
  source_id?: string; // e.g. "S1", "S2"
  bookmark_id: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  excerpt: string;
  url: string;
  topics?: string[];
  relevance_score?: number;
}

export interface ChatMessageMetrics {
  retrievalLatencyMs?: number;
  generationLatencyMs?: number;
  totalLatencyMs?: number;
  sourcesRetrieved?: number;
  sourcesCited?: number;
  confidence?: number;
  retrievalMode?: 'hybrid' | 'lexical' | 'semantic';
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  sender?: 'user' | 'assistant';
  content: string;
  sources?: ChatSourceCitation[];
  metrics?: ChatMessageMetrics;
  is_refusal?: boolean;
  created_at: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  scope_description?: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export type PlanId = 'free' | 'pro';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface Subscription {
  id?: string;
  user_id: string;
  provider: 'stripe';
  customer_id?: string;
  subscription_id?: string;
  price_id?: string;
  status: SubscriptionStatus;
  plan: PlanId | 'free_trial';
  interval?: BillingInterval;
  current_period_start?: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  trial_start?: string;
  trial_end?: string;
  has_used_trial?: boolean;
  trial_days_left?: number;
  price_monthly?: number;
  price_yearly?: number;
}

export type UsageMetric = 'ask' | 'enrichment' | 'digest' | 'embedding' | 'sync';

export interface UsageEventRecord {
  id: string;
  user_id: string;
  metric: UsageMetric;
  quantity: number;
  metadata?: Record<string, any>;
  billing_period_key: string;
  created_at: string;
}

export interface EntitlementData {
  plan: PlanId;
  status: SubscriptionStatus;
  isPro: boolean;
  interval?: BillingInterval;
  limits: {
    bookmarks: number | null; // null = unlimited
    monthlyAsk: number | null;
    monthlyEnrichment: number | null;
    syncAccounts: number;
  };
  usage: {
    bookmarksCount: number;
    monthlyAskCount: number;
    monthlyEnrichmentCount: number;
    connectedAccountsCount: number;
  };
  remaining: {
    bookmarks: number | null;
    monthlyAsk: number | null;
    monthlyEnrichment: number | null;
  };
  features: {
    semanticSearch: boolean;
    digests: boolean;
    advancedInsights: boolean;
    rediscovery: boolean;
    priorityProcessing: boolean;
    exportData: boolean;
  };
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  trialDaysLeft?: number;
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
  next_sync_at?: string;
  last_successful_sync?: string;
  sync_status: 'idle' | 'syncing' | 'processing' | 'complete' | 'error';
  reauthorization_required?: boolean;
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

export interface RediscoveryCandidateItem {
  bookmark: Bookmark;
  score: number;
  reasons: string[];
  surfacedCount: number;
  lastSurfacedAt?: string;
}

export interface InsightsData {
  total_bookmarks?: number;
  topics_distribution?: Array<{ topic: string; percentage: number; count: number }>;
  topicDistribution: Array<{ name?: string; topic?: string; count: number; percentage: number }>;
  emergingInterests: Array<{
    topic: string;
    growth: string | number;
    growthLabel?: string;
    status?: 'growing' | 'new';
    explanation?: string;
    description?: string;
    recentCount?: number;
    baselineCount?: number;
  }>;
  forgottenKnowledge: Bookmark[];
  ideaConnections?: Array<{
    id: string;
    sourceTopic: string;
    targetTopic: string;
    connectionSummary: string;
    bookmarkCount: number;
    primaryBookmarkId: string;
    supportingBookmarkIds?: string[];
  }>;
  connections: Array<{
    theme: string;
    description: string;
    bookmark_ids: string[];
  }>;
  savingActivityTimeline?: Array<{
    weekLabel: string;
    count: number;
    highlightTopic?: string;
    weekStart?: string;
    weekEnd?: string;
  }>;
  top_sources?: Array<{ source: string; count: number; percentage: number }>;
  peak_saving_day?: string;
  avg_bookmarks_per_week?: number;
  reading_completion_rate?: number;
}

export interface SyncProgressState {
  isSyncing: boolean;
  stage: 'idle' | 'fetching' | 'organizing' | 'summarizing' | 'indexing' | 'complete';
  processedCount: number;
  totalCount: number;
  message: string;
}

export type PlanConfig = Record<string, any>;
