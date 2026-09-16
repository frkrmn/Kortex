import { SourceProvider, RawExternalPost, SyncOptions, SyncResult } from './source-provider';
import { Bookmark } from '../../src/types';

export class XProvider implements SourceProvider {
  sourceType = 'twitter' as const;
  displayName = 'X (Twitter)';

  async authenticate(authPayload?: Record<string, any>): Promise<{
    success: boolean;
    username: string;
    displayName: string;
    avatarUrl: string;
    scopes: string[];
    error?: string;
  }> {
    // Official X OAuth 2.0 PKCE flow simulator / handler
    // In production, exchanges code for access_token with required read-only scopes
    const username = authPayload?.username || 'faruk';
    const displayName = authPayload?.displayName || 'Faruk';
    const avatarUrl = authPayload?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    return {
      success: true,
      username,
      displayName,
      avatarUrl,
      scopes: ['bookmark.read', 'tweet.read', 'users.read', 'offline.access'],
    };
  }

  async sync(userId: string, options?: SyncOptions): Promise<SyncResult> {
    // Returns batch of raw posts simulating X API v2 /2/users/:id/bookmarks
    return {
      rawPosts: [],
      hasMore: false,
    };
  }

  normalize(raw: RawExternalPost, userId: string): Bookmark {
    return {
      id: `bm_${raw.source}_${raw.id}`,
      user_id: userId,
      source: raw.source,
      external_id: raw.id,
      author_id: raw.author.id,
      author_name: raw.author.name,
      author_username: raw.author.username,
      author_avatar: raw.author.avatar,
      content: raw.text,
      url: raw.url,
      media: raw.media,
      bookmark_created_at: raw.createdAt,
      imported_at: new Date().toISOString(),
      is_read: false,
      is_favorite: false,
      ai_summary: '',
      topics: [],
      keywords: [],
      collection_ids: [],
      engagement: {
        likes: raw.metrics?.likes || 0,
        retweets: raw.metrics?.shares || 0,
        replies: raw.metrics?.comments || 0,
      },
    };
  }

  async disconnect(userId: string): Promise<boolean> {
    return true;
  }
}
