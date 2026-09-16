import { IProfileRepository } from '../types';
import { UserProfile } from '../../../types';
import { getSupabase } from '../../supabase/client';
import { mapProfileRowToProfile } from './mappers';

export class SupabaseProfileRepository implements IProfileRepository {
  async get(): Promise<UserProfile> {
    const supabase = getSupabase();
    const fallback: UserProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      display_name: 'Recallly Member',
      email: 'user@example.com',
      avatar_url: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      created_at: new Date().toISOString(),
      has_onboarded: true,
      onboarding_completed_at: new Date().toISOString(),
      plan: 'pro',
    };

    if (!supabase) return fallback;

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return fallback;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        return mapProfileRowToProfile(data, user.email);
      }

      // Idempotent profile creation if row is not yet present
      const defaultName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        (user.email ? user.email.split('@')[0] : 'Member');

      const avatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: defaultName,
          avatar_url: avatar,
          timezone: detectedTimezone,
        })
        .select()
        .single();

      if (created) {
        return mapProfileRowToProfile(created, user.email);
      }

      if (insertErr) {
        console.warn('Idempotent profile creation notice:', insertErr.message);
      }
    } catch (e) {
      console.warn('Supabase profile fetch error:', e);
    }

    return fallback;
  }

  async update(updates: Partial<UserProfile>): Promise<UserProfile> {
    const supabase = getSupabase();
    if (!supabase) return updates as UserProfile;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.get();

      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
      if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
      if (updates.has_onboarded === true || updates.onboarding_completed_at) {
        dbUpdates.onboarding_completed_at = updates.onboarding_completed_at || new Date().toISOString();
      }

      const { data, error } = await (supabase
        .from('profiles')
        .update(dbUpdates as any)
        .eq('user_id', user.id)
        .select()
        .single() as any);

      if (error || !data) {
        console.error('Supabase update profile error:', error);
        return this.get();
      }

      return mapProfileRowToProfile(data, user.email);
    } catch (e) {
      console.error('Supabase update profile exception:', e);
      return this.get();
    }
  }
}

