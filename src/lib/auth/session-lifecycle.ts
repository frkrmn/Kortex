import type { Session, User } from '@supabase/supabase-js';

export type AuthState = 'initializing' | 'authenticated' | 'unauthenticated';

type AuthSessionClient = {
  getSession: () => Promise<{ data: { session: Session | null }; error: unknown }>;
  getUser: (jwt?: string) => Promise<{ data: { user: User | null }; error: unknown }>;
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<unknown>;
};

export const LEGACY_PRIVATE_CACHE_KEYS = [
  'recallly_demo_bookmarks_v1',
  'recallly_demo_collections_v1',
  'recallly_demo_profile_v1',
  'recallly_demo_digest_settings_v1',
  'recallly_demo_digests_v1',
] as const;

export function clearLegacyPrivateCache(storage?: Pick<Storage, 'removeItem'> | null): void {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!target) return;
  for (const key of LEGACY_PRIVATE_CACHE_KEYS) {
    try { target.removeItem(key); } catch { /* Storage may be unavailable in hardened browsers. */ }
  }
}

export function isCurrentAuthWork(
  expectedGeneration: number,
  currentGeneration: number,
  expectedUserId: string,
  currentUserId: string | null,
): boolean {
  return expectedGeneration === currentGeneration && expectedUserId === currentUserId;
}

/**
 * Supabase's local session is useful for restoration, but it is not enough to
 * authorize rendering private data. Verify it with the Auth server first.
 */
export async function resolveVerifiedSession(auth: AuthSessionClient): Promise<{
  session: Session | null;
  user: User | null;
}> {
  const { data: sessionData, error: sessionError } = await auth.getSession();
  const candidate = sessionError ? null : sessionData.session;
  if (!candidate?.access_token) return { session: null, user: null };

  const { data: userData, error: userError } = await auth.getUser(candidate.access_token);
  if (userError || !userData.user || userData.user.id !== candidate.user?.id) {
    await auth.signOut({ scope: 'local' }).catch(() => undefined);
    return { session: null, user: null };
  }

  return { session: candidate, user: userData.user };
}
