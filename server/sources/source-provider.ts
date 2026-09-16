import { Bookmark, SourceType } from '../../src/types';

export interface RawExternalPost {
  id: string;
  source: SourceType;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar: string;
  };
  text: string;
  url: string;
  media?: Array<{
    type: 'image' | 'video' | 'link_preview';
    url: string;
    previewUrl?: string;
  }>;
  createdAt: string;
  metrics?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

export interface SyncOptions {
  cursor?: string;
  limit?: number;
  sinceId?: string;
}

export interface SyncResult {
  rawPosts: RawExternalPost[];
  nextCursor?: string;
  hasMore: boolean;
  totalAvailable?: number;
}

export interface SourceProvider {
  sourceType: SourceType;
  displayName: string;
  
  authenticate(authPayload?: Record<string, any>): Promise<{
    success: boolean;
    username: string;
    displayName: string;
    avatarUrl: string;
    scopes: string[];
    error?: string;
  }>;

  sync(userId: string, options?: SyncOptions): Promise<SyncResult>;

  normalize(raw: RawExternalPost, userId: string): Bookmark;

  disconnect(userId: string): Promise<boolean>;
}
