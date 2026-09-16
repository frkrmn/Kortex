import { IProfileRepository } from '../types';
import { UserProfile } from '../../../types';
import { demoUser } from '../../demo-data';

const STORAGE_KEY = 'recallly_demo_profile_v1';

export class DemoProfileRepository implements IProfileRepository {
  async get(): Promise<UserProfile> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return { ...demoUser };
  }

  async update(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  }
}
