import { ISavedItemRepository, SavedItemFilterOptions } from '../types';
import { Bookmark } from '../../../types';
import { demoBookmarks } from '../../demo-data';

const STORAGE_KEY = 'recallly_demo_bookmarks_v1';

export class DemoSavedItemRepository implements ISavedItemRepository {
  private getItems(): Bookmark[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback if localStorage is unavailable
    }
    return [...demoBookmarks];
  }

  private saveItems(items: Bookmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  async getAll(params?: SavedItemFilterOptions): Promise<Bookmark[]> {
    let items = this.getItems();

    if (params?.query) {
      const q = params.query.toLowerCase();
      items = items.filter(
        (b) =>
          b.content.toLowerCase().includes(q) ||
          b.author_name.toLowerCase().includes(q) ||
          b.author_username.toLowerCase().includes(q) ||
          b.ai_summary.toLowerCase().includes(q) ||
          b.topics.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (params?.topic) {
      items = items.filter((b) =>
        b.topics.some((t) => t.toLowerCase() === params.topic?.toLowerCase())
      );
    }

    if (params?.filter) {
      if (params.filter === 'unread') items = items.filter((b) => !b.is_read);
      if (params.filter === 'favorites') items = items.filter((b) => b.is_favorite);
    }

    if (params?.sort) {
      if (params.sort === 'oldest') {
        items.sort(
          (a, b) =>
            new Date(a.bookmark_created_at).getTime() -
            new Date(b.bookmark_created_at).getTime()
        );
      } else {
        items.sort(
          (a, b) =>
            new Date(b.bookmark_created_at).getTime() -
            new Date(a.bookmark_created_at).getTime()
        );
      }
    }

    return items;
  }

  async getById(id: string): Promise<Bookmark | null> {
    const items = this.getItems();
    return items.find((b) => b.id === id) || null;
  }

  async search(query: string, options?: SavedItemFilterOptions): Promise<Bookmark[]> {
    return this.getAll({ ...options, query });
  }

  async updateReadStatus(id: string, isRead: boolean): Promise<Bookmark | null> {
    const items = this.getItems();
    const index = items.findIndex((b) => b.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], is_read: isRead };
    this.saveItems(items);
    return items[index];
  }

  async updateFavoriteStatus(id: string, isFavorite: boolean): Promise<Bookmark | null> {
    const items = this.getItems();
    const index = items.findIndex((b) => b.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], is_favorite: isFavorite };
    this.saveItems(items);
    return items[index];
  }

  async update(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
    const items = this.getItems();
    const index = items.findIndex((b) => b.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates };
    this.saveItems(items);
    return items[index];
  }

  async delete(id: string): Promise<boolean> {
    const items = this.getItems();
    const filtered = items.filter((b) => b.id !== id);
    if (filtered.length === items.length) return false;

    this.saveItems(filtered);
    return true;
  }

  async create(item: Omit<Bookmark, 'id'>): Promise<Bookmark> {
    const items = this.getItems();
    const newBookmark: Bookmark = {
      ...item,
      id: `bm_${Date.now()}`,
    };
    items.unshift(newBookmark);
    this.saveItems(items);
    return newBookmark;
  }

  async getRelated(id: string, count = 3): Promise<Bookmark[]> {
    const items = this.getItems();
    const target = items.find((b) => b.id === id);
    if (!target) return items.slice(0, count);

    const related = items
      .filter((b) => b.id !== id)
      .map((b) => {
        let score = 0;
        const sharedTopics = b.topics.filter((t) => target.topics.includes(t));
        score += sharedTopics.length * 3;
        const sharedKeywords = b.keywords.filter((k) => target.keywords.includes(k));
        score += sharedKeywords.length * 2;
        if (b.author_username === target.author_username) score += 4;
        return { item: b, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((r) => r.item);

    return related.length > 0 ? related : items.filter((b) => b.id !== id).slice(0, count);
  }

  async getRediscover(count = 4): Promise<Bookmark[]> {
    const items = this.getItems();
    return items
      .filter((b) => !b.is_read || b.is_favorite)
      .slice(0, count);
  }
}
