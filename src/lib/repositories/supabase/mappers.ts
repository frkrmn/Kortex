import { Bookmark, Collection, Topic, Digest, DigestSettings, UserProfile, ConnectedAccount } from '../../../types';
import { Database } from '../../supabase/types';

type SavedItemRow = Database['public']['Tables']['saved_items']['Row'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];
type TopicRow = Database['public']['Tables']['topics']['Row'];
type DigestRow = Database['public']['Tables']['digests']['Row'];
type DigestSettingsRow = Database['public']['Tables']['digest_settings']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ConnectedAccountSafeRow = Database['public']['Views']['connected_accounts_safe']['Row'];

export function mapSavedItemRowToBookmark(
  row: SavedItemRow,
  topics: string[] = [],
  collectionIds: string[] = []
): Bookmark {
  const meta = (row.metadata as Record<string, any>) || {};

  return {
    id: row.id,
    user_id: row.user_id,
    source: (row.source as any) || 'twitter',
    external_id: row.external_id || '',
    author_id: row.author_id || undefined,
    author_name: row.author_name || 'Anonymous',
    author_username: row.author_username || 'anonymous',
    author_avatar: row.author_avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    content: row.content,
    url: row.url || '',
    media: (row.media as any) || [],
    bookmark_created_at: row.saved_at || row.created_at,
    imported_at: row.imported_at || row.created_at,
    is_read: row.is_read,
    is_favorite: row.is_favorite,
    ai_summary: row.summary || '',
    topics: topics.length > 0 ? topics : (meta.topics || []),
    keywords: meta.keywords || [],
    collection_ids: collectionIds.length > 0 ? collectionIds : (meta.collection_ids || []),
    why_saved_insight: meta.why_saved_insight,
    engagement: meta.engagement || {
      likes: meta.likes || 0,
      retweets: meta.retweets || 0,
      replies: meta.replies || 0,
    },
  };
}

export function mapCollectionRowToCollection(
  row: CollectionRow,
  bookmarkIds: string[] = []
): Collection {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    bookmark_ids: bookmarkIds,
    creator_name: 'You',
  };
}

export function mapTopicRowToTopic(row: TopicRow, count = 0): Topic {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    count,
  };
}

export function mapDigestRowToDigest(row: DigestRow): Digest {
  const content = (row.content as Record<string, any>) || {};
  return {
    id: row.id,
    user_id: row.user_id,
    period_start: row.period_start,
    period_end: row.period_end,
    status: (row.status as any) || 'sent',
    title: row.title,
    bookmarks_count: content.bookmarks_count || 0,
    topics_count: content.topics_count || 0,
    key_ideas_count: content.key_ideas?.length || 0,
    topic_groups: content.topic_groups || [],
    key_ideas: content.key_ideas || [],
    worth_revisiting_ids: content.worth_revisiting_ids || [],
    created_at: row.created_at,
    sent_at: row.sent_at || undefined,
  };
}

export function mapDigestSettingsRowToSettings(row: DigestSettingsRow): DigestSettings {
  const dayMap: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

  return {
    user_id: row.user_id,
    frequency: (row.frequency as any) || 'weekly',
    delivery_day: dayMap[row.delivery_day] || 'Monday',
    delivery_time: row.delivery_time.slice(0, 5),
    timezone: row.timezone || 'UTC',
    email: 'user@example.com',
    enabled: row.enabled,
  };
}

export function mapProfileRowToProfile(row: ProfileRow, email?: string): UserProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name || '',
    email: email || 'user@example.com',
    avatar_url: row.avatar_url || '',
    timezone: row.timezone || 'UTC',
    created_at: row.created_at,
    has_onboarded: Boolean(row.onboarding_completed_at),
    onboarding_completed_at: row.onboarding_completed_at || null,
    plan: 'pro',
  };
}

export function mapConnectedAccountSafeToAccount(row: ConnectedAccountSafeRow): ConnectedAccount {
  const meta = (row.metadata as Record<string, any>) || {};
  return {
    id: row.id,
    user_id: row.user_id,
    provider: row.provider as any,
    username: row.username || '',
    displayName: meta.account_label || row.provider,
    avatarUrl: meta.avatar_url || '',
    connected: Boolean(row.username),
    sync_status: (row.sync_status as any) || 'idle',
    last_sync_at: row.last_sync_at || undefined,
    last_successful_sync: row.last_successful_sync_at || undefined,
  };
}
