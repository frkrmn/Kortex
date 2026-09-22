export const X_BOOKMARK_EXPANSIONS = [
  'author_id',
  'attachments.media_keys',
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'referenced_tweets.id.attachments.media_keys',
] as const;

export const X_BOOKMARK_POST_FIELDS = [
  'attachments',
  'author_id',
  'conversation_id',
  'created_at',
  'note_tweet',
  'referenced_tweets',
] as const;

export const X_BOOKMARK_USER_FIELDS = ['name', 'username', 'profile_image_url'] as const;
export const X_BOOKMARK_MEDIA_FIELDS = [
  'alt_text',
  'height',
  'media_key',
  'preview_image_url',
  'type',
  'url',
  'width',
] as const;

export interface XApiMedia {
  media_key?: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
  width?: number;
  height?: number;
  alt_text?: string;
}

export interface XApiUser {
  id?: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
}

export interface XApiPost {
  id?: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  attachments?: { media_keys?: string[] };
  referenced_tweets?: Array<{ type?: string; id?: string }>;
  note_tweet?: { text?: string };
  // Retained for backward compatibility with responses already accepted by Recallly.
  note_post?: { text?: string };
}

export interface XApiBookmarkPage {
  data?: XApiPost[];
  includes?: { users?: XApiUser[]; media?: XApiMedia[]; tweets?: XApiPost[] };
  errors?: Array<{ resource_id?: string; value?: string; title?: string; detail?: string }>;
  meta?: { next_token?: string };
}

export interface NormalizedXMedia {
  type: 'image' | 'video';
  mediaKey: string;
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface NormalizedXReferencedPost {
  type: 'retweeted' | 'quoted' | 'replied_to';
  externalId: string;
  text?: string;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  publishedAt?: string;
  conversationId?: string;
  media: NormalizedXMedia[];
  available: boolean;
}

export interface NormalizedXBookmarkRow {
  [key: string]: unknown;
  content: string;
  url: string;
  author_id: string | null;
  author_name: string;
  author_username: string;
  author_avatar_url: string | null;
  published_at: string | null;
  media: NormalizedXMedia[];
  metadata: {
    x_conversation_id: string | null;
    x_referenced_posts: NormalizedXReferencedPost[];
    x_thread_detected: boolean;
    x_thread_fully_available: boolean;
  };
}

function normalizeMedia(keys: unknown, mediaByKey: Map<string, XApiMedia>): NormalizedXMedia[] {
  if (!Array.isArray(keys)) return [];
  return keys.flatMap(key => {
    if (typeof key !== 'string') return [];
    const source = mediaByKey.get(key);
    if (!source) return [];
    const displayUrl = source.url || source.preview_image_url;
    if (!displayUrl) return [];
    const isVideo = source.type === 'video' || source.type === 'animated_gif';
    return [{
      type: isVideo ? 'video' as const : 'image' as const,
      mediaKey: key,
      url: displayUrl,
      ...(source.preview_image_url ? { previewUrl: source.preview_image_url } : {}),
      ...(Number.isFinite(source.width) ? { width: source.width } : {}),
      ...(Number.isFinite(source.height) ? { height: source.height } : {}),
      ...(source.alt_text ? { alt: source.alt_text } : {}),
    }];
  });
}

function validReferenceType(value: unknown): value is NormalizedXReferencedPost['type'] {
  return value === 'retweeted' || value === 'quoted' || value === 'replied_to';
}

export function normalizeXBookmarkPage(payload: XApiBookmarkPage): Array<{ externalId: string; row: NormalizedXBookmarkRow }> {
  const users = new Map((payload.includes?.users || []).flatMap(user =>
    typeof user.id === 'string' ? [[user.id, user] as const] : []));
  const media = new Map((payload.includes?.media || []).flatMap(item =>
    typeof item.media_key === 'string' ? [[item.media_key, item] as const] : []));
  const referenced = new Map((payload.includes?.tweets || []).flatMap(post =>
    typeof post.id === 'string' ? [[post.id, post] as const] : []));

  return (payload.data || []).flatMap(post => {
    if (typeof post.id !== 'string' || typeof post.text !== 'string') return [];
    const author = post.author_id ? users.get(post.author_id) : undefined;
    const referencedPosts = (post.referenced_tweets || []).flatMap(reference => {
      if (!validReferenceType(reference.type) || typeof reference.id !== 'string') return [];
      const expanded = referenced.get(reference.id);
      const referencedAuthor = expanded?.author_id ? users.get(expanded.author_id) : undefined;
      return [{
        type: reference.type,
        externalId: reference.id,
        ...(expanded?.text ? { text: expanded.note_tweet?.text || expanded.note_post?.text || expanded.text } : {}),
        ...(expanded?.author_id ? { authorId: expanded.author_id } : {}),
        ...(referencedAuthor?.name ? { authorName: referencedAuthor.name } : {}),
        ...(referencedAuthor?.username ? { authorUsername: referencedAuthor.username } : {}),
        ...(referencedAuthor?.profile_image_url ? { authorAvatarUrl: referencedAuthor.profile_image_url } : {}),
        ...(expanded?.created_at ? { publishedAt: expanded.created_at } : {}),
        ...(expanded?.conversation_id ? { conversationId: expanded.conversation_id } : {}),
        media: normalizeMedia(expanded?.attachments?.media_keys, media),
        available: Boolean(expanded?.text),
      } satisfies NormalizedXReferencedPost];
    });
    const threadDetected = (post.referenced_tweets || []).some(reference => reference.type === 'replied_to') ||
      Boolean(post.conversation_id && post.conversation_id !== post.id);
    return [{
      externalId: post.id,
      row: {
        content: post.note_tweet?.text || post.note_post?.text || post.text,
        url: `https://x.com/${author?.username || 'i'}/status/${post.id}`,
        author_id: post.author_id || null,
        author_name: author?.name || '',
        author_username: author?.username || '',
        author_avatar_url: author?.profile_image_url || null,
        published_at: post.created_at || null,
        media: normalizeMedia(post.attachments?.media_keys, media),
        metadata: {
          x_conversation_id: post.conversation_id || null,
          x_referenced_posts: referencedPosts,
          x_thread_detected: threadDetected,
          // Direct reference expansion cannot prove that an entire conversation was returned.
          x_thread_fully_available: false,
        },
      },
    }];
  });
}
