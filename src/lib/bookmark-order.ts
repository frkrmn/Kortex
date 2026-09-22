import type { Bookmark } from '../types';

const timestamp = (bookmark: Pick<Bookmark, 'bookmark_created_at'>) => {
  const value = Date.parse(bookmark.bookmark_created_at);
  return Number.isFinite(value) ? value : 0;
};

export function sortBookmarksNewestFirst<T extends Pick<Bookmark, 'bookmark_created_at'>>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => timestamp(b) - timestamp(a));
}
