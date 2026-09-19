import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Request, Response as ExpressResponse } from 'express';
import { beginLiveXOAuth, finishLiveXOAuth, syncLiveX, disconnectLiveX } from './x-live';
import { decryptToken } from '../crypto';

function fakeResponse() {
  const result: { status: number; body: any; cookies: Record<string, string>; cleared: string[]; headers: Record<string, string> } =
    { status: 200, body: null, cookies: {}, cleared: [], headers: {} };
  const res = {
    status(code: number) { result.status = code; return this; },
    type() { return this; },
    setHeader(name: string, value: string) { result.headers[name.toLowerCase()] = value; return this; },
    json(body: unknown) { result.body = body; return this; },
    send(body: unknown) { result.body = body; return this; },
    cookie(name: string, value: string) { result.cookies[name] = value; return this; },
    clearCookie(name: string) { result.cleared.push(name); return this; },
  } as unknown as ExpressResponse;
  return { res, result };
}

function callbackRequest(state: string, cookie: string): Request {
  return { query: { state, code: 'test-code' }, get: (name: string) => name === 'cookie' ? `kortex_x_oauth_bind=${cookie}` : undefined } as unknown as Request;
}

test('X OAuth state is bound to one browser and one user and cannot be replayed', async () => {
  const oldFetch = globalThis.fetch;
  const envKeys = ['APP_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'X_CLIENT_ID', 'ENCRYPTION_KEY', 'ENCRYPTION_SALT'] as const;
  const oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { APP_URL: 'http://localhost:3000', VITE_SUPABASE_URL: 'http://localhost:39999',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', X_CLIENT_ID: 'test-x-client',
    ENCRYPTION_KEY: 'test-encryption-key-with-more-than-32-characters', ENCRYPTION_SALT: 'test-stable-salt-12345' });
  let stateRow: Record<string, any> | null = null;
  let savedAccount: Record<string, any> | null = null;
  let savedBookmark: Record<string, any> | null = null;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    if (url.pathname === '/rest/v1/x_oauth_states' && init?.method === 'POST') {
      stateRow = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    }
    if (url.pathname === '/rest/v1/x_oauth_states' && init?.method === 'DELETE') {
      const pending = stateRow;
      if (pending && url.searchParams.get('state_hash') === `eq.${pending.state_hash}` &&
          url.searchParams.get('browser_hash') === `eq.${pending.browser_hash}`) {
        stateRow = null;
        return Response.json(pending);
      }
      return Response.json(null);
    }
    if (url.hostname === 'api.x.com' && url.pathname === '/2/oauth2/token') {
      const params = new URLSearchParams(String(init?.body));
      assert.equal(params.get('code_verifier'), decryptToken(stateRowForVerifier!.code_verifier_encrypted));
      return Response.json({ access_token: 'private-access-token', refresh_token: 'private-refresh-token', expires_in: 3600 });
    }
    if (url.hostname === 'api.x.com' && url.pathname === '/2/users/me') {
      return Response.json({ data: { id: 'x-user-1', username: 'owner', name: 'Owner' } });
    }
    if (url.pathname === '/rest/v1/connected_accounts' && init?.method === 'POST') {
      savedAccount = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    }
    if (url.pathname === '/rest/v1/connected_accounts' && init?.method === 'GET') {
      assert.equal(url.searchParams.get('user_id'), 'eq.user-a');
      return Response.json({ ...savedAccount, id: 'account-a' });
    }
    if (url.pathname === '/rest/v1/connected_accounts' && (init?.method === 'PATCH' || init?.method === 'DELETE')) {
      assert.equal(url.searchParams.get('id') === 'eq.account-a' || url.searchParams.get('user_id') === 'eq.user-a', true);
      if (new Headers(init?.headers).get('prefer')?.includes('return=representation')) return Response.json({ id: 'account-a' });
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/rest/v1/sync_jobs' && init?.method === 'POST') return Response.json({ id: 'job-a' });
    if (url.pathname === '/rest/v1/sync_jobs' && init?.method === 'PATCH') return new Response(null, { status: 204 });
    if (url.pathname === '/2/users/x-user-1/bookmarks') {
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer private-access-token');
      return Response.json({ data: [{ id: 'tweet-1', text: 'Private bookmark', author_id: 'x-user-1' }],
        includes: { users: [{ id: 'x-user-1', username: 'owner', name: 'Owner' }] } });
    }
    if (url.pathname === '/rest/v1/saved_items' && init?.method === 'POST') {
      const rows = JSON.parse(String(init.body));
      savedBookmark = rows[0];
      return Response.json(rows.map((row: Record<string, any>) => ({ ...row, id: 'bookmark-a', imported_at: row.saved_at,
        created_at: row.saved_at, is_read: false, is_favorite: false, summary: null, media: [] })));
    }
    if (url.pathname === '/rest/v1/saved_items' && init?.method === 'GET') {
      assert.equal(url.searchParams.get('user_id'), 'eq.user-a');
      return Response.json([]);
    }
    throw new Error(`Unexpected request ${init?.method} ${url}`);
  };

  let stateRowForVerifier: Record<string, any> | null = null;

  try {
    const start = fakeResponse();
    await beginLiveXOAuth({} as Request, start.res, 'user-a');
    const state = new URL(start.result.body.url).searchParams.get('state')!;
    const binding = start.result.cookies.kortex_x_oauth_bind;
    assert.ok(state && binding);
    assert.equal(stateRow?.user_id, 'user-a');
    assert.notEqual(stateRow?.state_hash, state);
    assert.equal(start.result.body.url.includes(binding), false);
    stateRowForVerifier = stateRow;
    const challenge = new URL(start.result.body.url).searchParams.get('code_challenge');
    assert.equal(challenge, crypto.createHash('sha256').update(decryptToken(stateRow!.code_verifier_encrypted)).digest('base64url'));

    const wrongBrowser = fakeResponse();
    await finishLiveXOAuth(callbackRequest(state, 'wrong-browser'), wrongBrowser.res);
    assert.equal(wrongBrowser.result.status, 400);
    assert.ok(stateRow);

    const success = fakeResponse();
    await finishLiveXOAuth(callbackRequest(state, binding), success.res);
    assert.equal(success.result.status, 200);
    assert.match(success.result.body, /X_AUTH_SUCCESS/);
    assert.equal(success.result.headers['cross-origin-opener-policy'], 'unsafe-none');
    assert.match(success.result.body, /kortex_x_oauth_result/);
    assert.equal(savedAccount?.user_id, 'user-a');
    assert.equal(decryptToken(savedAccount!.access_token_encrypted), 'private-access-token');
    assert.equal(success.result.body.includes('private-access-token'), false);

    const sync = await syncLiveX('user-a');
    assert.equal(sync.success, true);
    assert.equal(sync.addedCount, 1);
    assert.equal(savedBookmark?.user_id, 'user-a');
    assert.equal(sync.items[0].user_id, 'user-a');

    const disconnected = await disconnectLiveX('user-a');
    assert.equal(disconnected.success, true);

    const replay = fakeResponse();
    await finishLiveXOAuth(callbackRequest(state, binding), replay.res);
    assert.equal(replay.result.status, 400);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of envKeys) {
      if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
    }
  }
});
