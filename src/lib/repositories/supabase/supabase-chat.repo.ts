import { IChatRepository } from '../types';
import { ChatThread, ChatMessage } from '../../../types';
import { getSupabase } from '../../supabase/client';

export class SupabaseChatRepository implements IChatRepository {
  async getThreads(): Promise<ChatThread[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data: threads, error } = await (supabase as any)
      .from('chat_threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !threads) {
      console.error('Supabase chat_threads error:', error);
      return [];
    }

    const { data: messages } = await (supabase as any)
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    const msgMap = new Map<string, ChatMessage[]>();
    if (messages) {
      for (const m of messages) {
        const list = msgMap.get(m.thread_id) || [];
        list.push({
          id: m.id,
          thread_id: m.thread_id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources as any,
          created_at: m.created_at,
        });
        msgMap.set(m.thread_id, list);
      }
    }

    return threads.map((t: any) => ({
      id: t.id,
      user_id: t.user_id,
      title: t.title,
      created_at: t.created_at,
      updated_at: t.updated_at,
      messages: msgMap.get(t.id) || [],
    }));
  }

  async getThreadById(id: string): Promise<ChatThread | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: thread, error } = await (supabase as any)
      .from('chat_threads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !thread) return null;

    const messages = await this.getMessages(id);

    return {
      id: thread.id,
      user_id: thread.user_id,
      title: thread.title,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      messages,
    };
  }

  async createThread(title = 'New Conversation'): Promise<ChatThread> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const { data, error } = await (supabase as any)
      .from('chat_threads')
      .insert({
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create chat thread: ${error?.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
      updated_at: data.updated_at,
      messages: [],
    };
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((m: any) => ({
      id: m.id,
      thread_id: m.thread_id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      sources: m.sources as any,
      created_at: m.created_at,
    }));
  }

  async addMessage(
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    sources?: any
  ): Promise<ChatMessage> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const { data, error } = await (supabase as any)
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role,
        content,
        sources: sources || [],
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to insert chat message: ${error?.message}`);
    }

    // Touch thread updated_at
    await (supabase as any)
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return {
      id: data.id,
      thread_id: data.thread_id,
      role: (data.role === 'system' ? 'assistant' : data.role) as 'user' | 'assistant',
      content: data.content,
      sources: data.sources as any,
      created_at: data.created_at,
    };
  }
}
