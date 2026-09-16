import { ICollectionRepository } from '../types';
import { Collection } from '../../../types';
import { demoCollections } from '../../demo-data';

const STORAGE_KEY = 'recallly_demo_collections_v1';

export class DemoCollectionRepository implements ICollectionRepository {
  private getItems(): Collection[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [...demoCollections];
  }

  private saveItems(items: Collection[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  async getAll(): Promise<Collection[]> {
    return this.getItems();
  }

  async getById(id: string): Promise<Collection | null> {
    const items = this.getItems();
    return items.find((c) => c.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Collection | null> {
    const items = this.getItems();
    return items.find((c) => c.slug === slug || c.id === slug) || null;
  }

  async create(name: string, description: string, visibility: 'private' | 'public' = 'private'): Promise<Collection> {
    const items = this.getItems();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newCollection: Collection = {
      id: `col_${Date.now()}`,
      user_id: 'user_faruk',
      name,
      slug,
      description,
      visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bookmark_ids: [],
      creator_name: 'Faruk',
    };

    items.unshift(newCollection);
    this.saveItems(items);
    return newCollection;
  }

  async update(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const items = this.getItems();
    const index = items.findIndex((c) => c.id === id);
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveItems(items);
    return items[index];
  }

  async delete(id: string): Promise<boolean> {
    const items = this.getItems();
    const filtered = items.filter((c) => c.id !== id);
    if (filtered.length === items.length) return false;

    this.saveItems(filtered);
    return true;
  }

  async addItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const items = this.getItems();
    const index = items.findIndex((c) => c.id === collectionId);
    if (index === -1) return null;

    if (!items[index].bookmark_ids.includes(savedItemId)) {
      items[index] = {
        ...items[index],
        bookmark_ids: [savedItemId, ...items[index].bookmark_ids],
        updated_at: new Date().toISOString(),
      };
      this.saveItems(items);
    }
    return items[index];
  }

  async removeItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const items = this.getItems();
    const index = items.findIndex((c) => c.id === collectionId);
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      bookmark_ids: items[index].bookmark_ids.filter((id) => id !== savedItemId),
      updated_at: new Date().toISOString(),
    };
    this.saveItems(items);
    return items[index];
  }

  async toggleItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const items = this.getItems();
    const target = items.find((c) => c.id === collectionId);
    if (!target) return null;

    if (target.bookmark_ids.includes(savedItemId)) {
      return this.removeItem(collectionId, savedItemId);
    } else {
      return this.addItem(collectionId, savedItemId);
    }
  }
}
