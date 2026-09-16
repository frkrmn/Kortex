import { ISavedItemRepository, SavedItemFilterOptions } from '../types';
import { Bookmark } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapSavedItemRowToBookmark } from './mappers';

export class SupabaseSavedItemRepository implements ISavedItemRepository {
  async getAll(params?: SavedItemFilterOptions): Promise<Bookmark[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = (supabase as any).from('saved_items').select('*');

    if (params?.filter === 'unread') {
      query = query.eq('is_read', false);
    } else if (params?.filter === 'favorites') {
      query = query.eq('is_favorite', true);
    }

    if (params?.sort === 'oldest') {
      query = query.order('saved_at', { ascending: true });
    } else {
      query = query.order('saved_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('Supabase get saved_items error:', error);
      return [];
    }

    let bookmarks = data.map((row: any) => mapSavedItemRowToBookmark(row));

    if (params?.query) {
      const q = params.query.toLowerCase();
      bookmarks = bookmarks.filter(
        (b: Bookmark) =>
          b.content.toLowerCase().includes(q) ||
          b.author_name.toLowerCase().includes(q) ||
          b.author_username.toLowerCase().includes(q) ||
          b.ai_summary.toLowerCase().includes(q) ||
          b.topics.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (params?.topic) {
      bookmarks = bookmarks.filter((b: Bookmark) =>
        b.topics.some((t) => t.toLowerCase() === params.topic?.toLowerCase())
      );
    }

    return bookmarks;
  }

  async getById(id: string): Promise<Bookmark | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('saved_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    // Also query associated collection ids
    const { data: collItems } = await (supabase as any)
      .from('collection_items')
      .select('collection_id')
      .eq('saved_item_id', id);

    const collectionIds = collItems ? collItems.map((ci: any) => ci.collection_id) : [];

    return mapSavedItemRowToBookmark(data, [], collectionIds);
  }

  async search(query: string, options?: SavedItemFilterOptions): Promise<Bookmark[]> {
    return this.getAll({ ...options, query });
  }

  async updateReadStatus(id: string, isRead: boolean): Promise<Bookmark | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('saved_items')
      .update({ is_read: isRead })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase updateReadStatus error:', error);
      return null;
    }

    return mapSavedItemRowToBookmark(data);
  }

  async updateFavoriteStatus(id: string, isFavorite: boolean): Promise<Bookmark | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('saved_items')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase updateFavoriteStatus error:', error);
      return null;
    }

    return mapSavedItemRowToBookmark(data);
  }

  async update(id: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const dbUpdates: Record<string, any> = {};
    if (updates.is_read !== undefined) dbUpdates.is_read = updates.is_read;
    if (updates.is_favorite !== undefined) dbUpdates.is_favorite = updates.is_favorite;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.ai_summary !== undefined) dbUpdates.summary = updates.ai_summary;

    const { data, error } = await (supabase as any)
      .from('saved_items')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase update bookmark error:', error);
      return null;
    }

    return mapSavedItemRowToBookmark(data);
  }

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await (supabase as any).from('saved_items').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete bookmark error:', error);
      return false;
    }
    return true;
  }

  async create(item: Omit<Bookmark, 'id'>): Promise<Bookmark> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = user?.id || item.user_id;

    if (!effectiveUserId) {
      throw new Error('Authentication required to save items');
    }

    const insertPayload = {
      user_id: effectiveUserId,
      source: item.source,
      external_id: item.external_id || null,
      content: item.content,
      url: item.url || null,
      author_id: item.author_id || null,
      author_name: item.author_name,
      author_username: item.author_username,
      author_avatar_url: item.author_avatar,
      media: item.media || [],
      summary: item.ai_summary || null,
      is_read: item.is_read,
      is_favorite: item.is_favorite,
      saved_at: item.bookmark_created_at || new Date().toISOString(),
      metadata: {
        keywords: item.keywords || [],
        topics: item.topics || [],
        why_saved_insight: item.why_saved_insight,
        engagement: item.engagement,
      },
    };

    const { data, error } = await (supabase as any)
      .from('saved_items')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create saved item: ${error?.message}`);
    }

    return mapSavedItemRowToBookmark(data);
  }

  async getRelated(id: string, count = 3): Promise<Bookmark[]> {
    const all = await this.getAll();
    const target = all.find((b) => b.id === id);
    if (!target) return all.slice(0, count);

    return all
      .filter((b) => b.id !== id)
      .map((b) => {
        let score = 0;
        const sharedTopics = b.topics.filter((t) => target.topics.includes(t));
        score += sharedTopics.length * 3;
        if (b.author_username === target.author_username) score += 4;
        return { item: b, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((r) => r.item);
  }

  async getRediscover(count = 4): Promise<Bookmark[]> {
    const all = await this.getAll();
    return all.filter((b) => !b.is_read || b.is_favorite).slice(0, count);
  }
}
