import { ITopicRepository } from '../types';
import { Topic } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapTopicRowToTopic } from './mappers';

export class SupabaseTopicRepository implements ITopicRepository {
  async getAll(): Promise<Topic[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: topics, error } = await (supabase as any).from('topics').select('*');
    if (error || !topics) {
      console.error('Supabase topics error:', error);
      return [];
    }

    // Get item counts per topic
    const { data: links } = await (supabase as any).from('saved_item_topics').select('topic_id');
    const countMap = new Map<string, number>();
    if (links) {
      for (const link of links) {
        countMap.set(link.topic_id, (countMap.get(link.topic_id) || 0) + 1);
      }
    }

    return topics.map((t: any) => mapTopicRowToTopic(t, countMap.get(t.id) || 0));
  }

  async create(name: string, slug: string): Promise<Topic> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const { data, error } = await (supabase as any)
      .from('topics')
      .insert({
        user_id: userId,
        name,
        slug,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create topic: ${error?.message}`);
    }

    return mapTopicRowToTopic(data, 0);
  }
}
