import { ICollectionRepository } from '../types';
import { Collection } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapCollectionRowToCollection } from './mappers';

export class SupabaseCollectionRepository implements ICollectionRepository {
  async getAll(): Promise<Collection[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: cols, error } = await (supabase as any)
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !cols) {
      console.error('Supabase getAll collections error:', error);
      return [];
    }

    // Retrieve collection item memberships
    const { data: items } = await (supabase as any).from('collection_items').select('*');

    const itemMap = new Map<string, string[]>();
    if (items) {
      for (const item of items) {
        const list = itemMap.get(item.collection_id) || [];
        list.push(item.saved_item_id);
        itemMap.set(item.collection_id, list);
      }
    }

    return cols.map((c: any) => mapCollectionRowToCollection(c, itemMap.get(c.id) || []));
  }

  async getById(id: string): Promise<Collection | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const { data: items } = await (supabase as any)
      .from('collection_items')
      .select('saved_item_id')
      .eq('collection_id', id);

    const bookmarkIds = items ? items.map((i: any) => i.saved_item_id) : [];
    return mapCollectionRowToCollection(data, bookmarkIds);
  }

  async getBySlug(slug: string): Promise<Collection | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    const { data: items } = await (supabase as any)
      .from('collection_items')
      .select('saved_item_id')
      .eq('collection_id', data.id);

    const bookmarkIds = items ? items.map((i: any) => i.saved_item_id) : [];
    return mapCollectionRowToCollection(data, bookmarkIds);
  }

  async create(name: string, description: string, visibility: 'private' | 'public' = 'private'): Promise<Collection> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Authentication required to create collections');
    }

    const userId = user.id;

    const { data, error } = await (supabase as any)
      .from('collections')
      .insert({
        user_id: userId,
        name,
        slug,
        description,
        visibility,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create collection: ${error?.message}`);
    }

    return mapCollectionRowToCollection(data, []);
  }

  async update(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;

    const { data, error } = await (supabase as any)
      .from('collections')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await (supabase as any).from('collections').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete collection error:', error);
      return false;
    }
    return true;
  }

  async addItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    await (supabase as any).from('collection_items').upsert({
      collection_id: collectionId,
      saved_item_id: savedItemId,
    });

    return this.getById(collectionId);
  }

  async removeItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    await (supabase as any)
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('saved_item_id', savedItemId);

    return this.getById(collectionId);
  }

  async toggleItem(collectionId: string, savedItemId: string): Promise<Collection | null> {
    const col = await this.getById(collectionId);
    if (!col) return null;

    if (col.bookmark_ids.includes(savedItemId)) {
      return this.removeItem(collectionId, savedItemId);
    } else {
      return this.addItem(collectionId, savedItemId);
    }
  }
}
