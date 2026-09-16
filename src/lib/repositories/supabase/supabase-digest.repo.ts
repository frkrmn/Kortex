import { IDigestRepository } from '../types';
import { Digest, DigestSettings } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapDigestRowToDigest, mapDigestSettingsRowToSettings } from './mappers';

export class SupabaseDigestRepository implements IDigestRepository {
  async getAll(): Promise<Digest[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await (supabase as any)
      .from('digests')
      .select('*')
      .order('period_start', { ascending: false });

    if (error || !data) {
      console.error('Supabase digests error:', error);
      return [];
    }

    return data.map((d: any) => mapDigestRowToDigest(d));
  }

  async getById(id: string): Promise<Digest | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await (supabase as any)
      .from('digests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapDigestRowToDigest(data);
  }

  async getSettings(): Promise<DigestSettings> {
    const supabase = getSupabase();
    const fallback: DigestSettings = {
      user_id: '00000000-0000-0000-0000-000000000001',
      frequency: 'weekly',
      delivery_day: 'Monday',
      delivery_time: '09:00',
      timezone: 'America/New_York',
      email: 'user@example.com',
      enabled: true,
    };

    if (!supabase) return fallback;

    const { data, error } = await (supabase as any)
      .from('digest_settings')
      .select('*')
      .single();

    if (error || !data) return fallback;
    return mapDigestSettingsRowToSettings(data);
  }

  async updateSettings(settings: Partial<DigestSettings>): Promise<DigestSettings> {
    const supabase = getSupabase();
    if (!supabase) return settings as DigestSettings;

    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const dbUpdates: Record<string, any> = {};
    if (settings.frequency) dbUpdates.frequency = settings.frequency;
    if (settings.delivery_day) dbUpdates.delivery_day = dayMap[settings.delivery_day] ?? 1;
    if (settings.delivery_time) dbUpdates.delivery_time = `${settings.delivery_time}:00`;
    if (settings.timezone) dbUpdates.timezone = settings.timezone;
    if (settings.enabled !== undefined) dbUpdates.enabled = settings.enabled;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const { data, error } = await (supabase as any)
      .from('digest_settings')
      .upsert({
        user_id: userId,
        ...dbUpdates,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase update digest_settings error:', error);
      return this.getSettings();
    }

    return mapDigestSettingsRowToSettings(data);
  }
}
