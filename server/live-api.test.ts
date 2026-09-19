import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response as ExpressResponse } from 'express';
import { liveApi } from './live-api';

type FixtureUser = 'user-a' | 'user-b';

function request(path: string, token?: string, method = 'GET', body: Record<string, unknown> = {}): Request {
  return {
    path,
    method,
    query: {},
    body,
    get: (header: string) => header.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : undefined,
  } as unknown as Request;
}

function response() {
  const result = { code: 200, body: undefined as unknown };
  const res = {
    status(code: number) { result.code = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    setHeader() { return this; },
  } as unknown as ExpressResponse;
  return { res, result };
}

test('live API requires a verified session and scopes bookmark lookup to its owner', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
  const previousDemo = process.env.VITE_DEMO_MODE;
  const queries: string[] = [];
  const clearTokens: string[] = [];
  process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:39999';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.VITE_DEMO_MODE = 'false';
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const headers = new Headers(init?.headers);
    const token = headers.get('authorization')?.replace(/^Bearer /i, '');
    if (url.pathname === '/auth/v1/user') {
      if (token === 'user-a' || token === 'user-b') {
        return Response.json({ id: token, aud: 'authenticated', role: 'authenticated', email: `${token}@example.test`, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
      }
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }
    if (url.pathname === '/rest/v1/saved_items') {
      queries.push(url.search);
      const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '') as FixtureUser;
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      assert.equal(owner, token);
      if (id !== `${owner}-bookmark`) return Response.json(null);
      return Response.json({
        id, user_id: owner, source: 'x', external_id: id, content: `${owner} private data`,
        url: null, author_id: null, author_name: owner, author_username: owner,
        author_avatar_url: null, media: [], saved_at: '2026-01-01T00:00:00Z',
        imported_at: '2026-01-01T00:00:00Z', summary: null, is_read: false,
        is_favorite: false, metadata: {}, created_at: '2026-01-01T00:00:00Z',
      });
    }
    if (url.pathname === '/rest/v1/collections') {
      const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '');
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      assert.equal(owner, token);
      if (id !== `${owner}-collection`) return Response.json(null);
      return Response.json({ id, user_id: owner, name: 'Owned', slug: 'owned', description: '', visibility: 'private', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
    }
    if (url.pathname === '/rest/v1/collection_items') return Response.json([]);
    if (url.pathname === '/rest/v1/connected_accounts_safe') {
      const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '');
      assert.equal(owner, token);
      return Response.json({ id: `${owner}-account`, user_id: owner, provider: 'twitter', username: owner,
        provider_user_id: owner, sync_status: 'idle', last_sync_at: null, last_successful_sync_at: null,
        metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
    }
    if (url.pathname === '/rest/v1/ai_usage') {
      const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '');
      assert.equal(owner, token);
      return Response.json([{ id: `${owner}-usage`, user_id: owner, input_tokens: 2, output_tokens: 3, estimated_cost: 0.01 }]);
    }
    if (url.pathname === '/rest/v1/rpc/clear_my_library') {
      clearTokens.push(token || '');
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  };

  try {
    const missing = response();
    await liveApi(request('/bookmarks/user-a-bookmark'), missing.res);
    assert.equal(missing.result.code, 401);

    const own = response();
    await liveApi(request('/bookmarks/user-a-bookmark', 'user-a'), own.res);
    assert.equal(own.result.code, 200);
    assert.equal((own.result.body as { user_id: string }).user_id, 'user-a');

    const crossTenant = response();
    await liveApi(request('/bookmarks/user-b-bookmark', 'user-a'), crossTenant.res);
    assert.equal(crossTenant.result.code, 404);
    assert.ok(queries.every(query => query.includes('user_id=eq.user-a')));

    const crossTenantWrite = response();
    await liveApi(request('/collections/user-b-collection', 'user-a', 'PATCH', { name: 'Stolen' }), crossTenantWrite.res);
    assert.equal(crossTenantWrite.result.code, 404);

    const ownWrite = response();
    await liveApi(request('/collections/user-a-collection', 'user-a', 'PATCH', { name: 'Renamed' }), ownWrite.res);
    assert.equal(ownWrite.result.code, 200);

    const clear = response();
    await liveApi(request('/data/clear', 'user-b', 'POST'), clear.res);
    assert.equal(clear.result.code, 200);
    assert.deepEqual(clearTokens, ['user-b']);

    const xStatus = response();
    await liveApi(request('/integrations/x/status', 'user-a'), xStatus.res);
    assert.equal((xStatus.result.body as { username: string }).username, 'user-a');

    const usage = response();
    await liveApi(request('/ai/usage', 'user-b'), usage.res);
    assert.equal((usage.result.body as { records: Array<{ user_id: string }> }).records[0].user_id, 'user-b');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY; else process.env.VITE_SUPABASE_ANON_KEY = previousKey;
    if (previousDemo === undefined) delete process.env.VITE_DEMO_MODE; else process.env.VITE_DEMO_MODE = previousDemo;
  }
});
