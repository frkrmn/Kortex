import test from 'node:test';
import assert from 'node:assert/strict';
import type { Session, User } from '@supabase/supabase-js';
import { clearLegacyPrivateCache, isCurrentAuthWork, LEGACY_PRIVATE_CACHE_KEYS, resolveVerifiedSession } from './session-lifecycle';

const user = { id: 'owner-a' } as User;
const session = { access_token: 'verified-token', user } as Session;

test('restores a cached session only after server user verification', async () => {
  const calls: string[] = [];
  const result = await resolveVerifiedSession({
    async getSession() { calls.push('session'); return { data: { session }, error: null }; },
    async getUser(jwt?: string) { calls.push(`user:${jwt}`); return { data: { user }, error: null }; },
    async signOut() { calls.push('signout'); },
  });
  assert.equal(result.user?.id, 'owner-a');
  assert.equal(result.session?.access_token, 'verified-token');
  assert.deepEqual(calls, ['session', 'user:verified-token']);
});

test('invalid, expired, or identity-mismatched cached sessions are cleared locally', async () => {
  for (const returnedUser of [null, { id: 'owner-b' } as User]) {
    const calls: unknown[] = [];
    const result = await resolveVerifiedSession({
      async getSession() { return { data: { session }, error: null }; },
      async getUser() { return { data: { user: returnedUser }, error: returnedUser ? null : new Error('expired') }; },
      async signOut(options) { calls.push(options); },
    });
    assert.deepEqual(result, { session: null, user: null });
    assert.deepEqual(calls, [{ scope: 'local' }]);
  }
});

test('logout and identity changes remove only legacy private cache keys', () => {
  const removed: string[] = [];
  clearLegacyPrivateCache({ removeItem(key) { removed.push(key); } });
  assert.deepEqual(removed, [...LEGACY_PRIVATE_CACHE_KEYS]);
  assert.equal(new Set<string>(removed).has('recallly_view_mode_v1'), false);
});

test('late User A work cannot commit after logout and User B login', () => {
  const delayedUserAGeneration = 1;
  const generationAfterLogoutAndLogin = 3;
  assert.equal(isCurrentAuthWork(delayedUserAGeneration, generationAfterLogoutAndLogin, 'user-a', 'user-b'), false);
  assert.equal(isCurrentAuthWork(generationAfterLogoutAndLogin, generationAfterLogoutAndLogin, 'user-b', 'user-b'), true);
});
