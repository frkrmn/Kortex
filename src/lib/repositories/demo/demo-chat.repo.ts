import { IChatRepository } from '../types';
import { ChatThread, ChatMessage } from '../../../types';
import { demoAnswers } from '../../demo-data/conversations';

export class DemoChatRepository implements IChatRepository {
  private threads: ChatThread[] = [
    {
      id: 'thread_default',
      user_id: 'user_faruk',
      title: 'AI Agents & LLM OS Exploration',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      messages: [
        {
          id: 'msg_1',
          thread_id: 'thread_default',
          role: 'user',
          content: 'What have I saved about AI agents?',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
        {
          id: 'msg_2',
          thread_id: 'thread_default',
          role: 'assistant',
          content: demoAnswers.ai_agents.answer,
          sources: [
            {
              bookmark_id: 'bm_101',
              author_name: 'Andrej Karpathy',
              author_username: 'karpathy',
              excerpt: 'A mental model for the "LLM OS"...',
              url: 'https://x.com/karpathy/status/1789012345678901201',
            },
            {
              bookmark_id: 'bm_102',
              author_name: 'Andrew Ng',
              author_username: 'AndrewYNg',
              excerpt: 'Four agentic design patterns...',
              url: 'https://x.com/AndrewYNg/status/1789012345678901202',
            },
          ],
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 5000).toISOString(),
        },
      ],
    },
  ];

  async getThreads(): Promise<ChatThread[]> {
    return [...this.threads];
  }

  async getThreadById(id: string): Promise<ChatThread | null> {
    return this.threads.find((t) => t.id === id) || null;
  }

  async createThread(title = 'New Conversation'): Promise<ChatThread> {
    const newThread: ChatThread = {
      id: `thread_${Date.now()}`,
      user_id: 'user_faruk',
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    this.threads.unshift(newThread);
    return newThread;
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const thread = await this.getThreadById(threadId);
    return thread?.messages || [];
  }

  async addMessage(
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    sources?: any
  ): Promise<ChatMessage> {
    let thread = await this.getThreadById(threadId);
    if (!thread) {
      thread = await this.createThread('Conversation');
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      thread_id: thread.id,
      role: (role === 'system' ? 'assistant' : role) as 'user' | 'assistant',
      content,
      sources,
      created_at: new Date().toISOString(),
    };

    thread.messages.push(newMessage);
    thread.updated_at = new Date().toISOString();
    return newMessage;
  }
}
