import { IDigestRepository } from '../types';
import { Digest, DigestSettings } from '../../../types';
import { demoDigests, demoDigestSettings } from '../../demo-data';

const SETTINGS_KEY = 'recallly_demo_digest_settings_v1';

export class DemoDigestRepository implements IDigestRepository {
  private digests: Digest[] = [...demoDigests];

  async getAll(): Promise<Digest[]> {
    return [...this.digests];
  }

  async getById(id: string): Promise<Digest | null> {
    return this.digests.find((d) => d.id === id) || null;
  }

  async getSettings(): Promise<DigestSettings> {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return { ...demoDigestSettings };
  }

  async updateSettings(settings: Partial<DigestSettings>): Promise<DigestSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  }

  async createDigest(periodStart: string, periodEnd: string): Promise<Digest> {
    const newDigest: Digest = {
      id: `dig_${Date.now()}`,
      user_id: 'user_faruk',
      period_start: periodStart,
      period_end: periodEnd,
      status: 'sent',
      title: 'Your Week in Bookmarks',
      bookmarks_count: 12,
      topics_count: 4,
      key_ideas_count: 3,
      topic_groups: [
        {
          topic: 'AI Agents',
          summary: 'Reflections and agent loop evaluations.',
          bookmark_ids: ['bm_101', 'bm_102'],
        },
      ],
      key_ideas: [
        'Agentic pipelines benefit from multi-turn verification loops.',
        'Pragmatic minimalism out-executes microservice sprawl.',
      ],
      worth_revisiting_ids: ['bm_101'],
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    };
    this.digests.unshift(newDigest);
    return newDigest;
  }
}
