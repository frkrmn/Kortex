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
  const envKeys = ['APP_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'X_CLIENT_ID', 'ENCRYPTION_KEY', 'ENCRYPTION_SALT',
    'FREE_SIGNUP_IMPORT_CREDITS', 'X_POST_READ_ESTIMATED_COST', 'X_PRICING_VERSION', 'X_API_MONTHLY_BUDGET', 'X_API_USER_MONTHLY_BUDGET'] as const;
  const oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { APP_URL: 'http://localhost:3000', VITE_SUPABASE_URL: 'http://localhost:39999',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', X_CLIENT_ID: 'test-x-client',
    ENCRYPTION_KEY: 'test-encryption-key-with-more-than-32-characters', ENCRYPTION_SALT: 'test-stable-salt-12345',
    FREE_SIGNUP_IMPORT_CREDITS: '10', X_POST_READ_ESTIMATED_COST: '0.001', X_PRICING_VERSION: 'test',
    X_API_MONTHLY_BUDGET: '100', X_API_USER_MONTHLY_BUDGET: '10' });
  let stateRow: Record<string, any> | null = null;
  let savedAccount: Record<string, any> | null = null;
  let savedBookmark: Record<string, any> | null = null;
  let bookmarksStatus = 200;
  let creditBalance = 10;
  let xRequests = 0;
  let providerTweets = [{ id: 'tweet-1', text: 'Private bookmark', author_id: 'x-user-1' }];
  const knownIds = new Set<string>();
  const usage: Array<{ resources: number; imported: number }> = [];
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
      xRequests++;
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer private-access-token');
      if (bookmarksStatus === 402) return Response.json({ title: 'Payment Required' }, { status: 402 });
      return Response.json({ data: providerTweets.slice(0, Number(url.searchParams.get('max_results') || 100)),
        includes: { users: [{ id: 'x-user-1', username: 'owner', name: 'Owner' }] } });
    }
    if (url.pathname === '/rest/v1/credit_balances') return Response.json({ available_credits: creditBalance });
    if (url.pathname === '/rest/v1/import_legacy_users') return Response.json(null);
    if (url.pathname === '/rest/v1/subscriptions') return Response.json(null);
    if (url.pathname === '/rest/v1/credit_grants') return Response.json([]);
    if (url.pathname === '/rest/v1/provider_usage_events' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      if (usage.length) usage[usage.length - 1].imported = body.imported_items;
      return Response.json({ id: 'usage-a' });
    }
    if (url.pathname === '/rest/v1/provider_usage_events') return Response.json([]);
    if (url.pathname === '/rest/v1/import_analytics_events') return new Response(null, { status: 201 });
    if (url.pathname === '/rest/v1/rpc/grant_import_credits') return Response.json(10);
    if (url.pathname === '/rest/v1/rpc/reserve_provider_budget') return Response.json('reservation-a');
    if (url.pathname === '/rest/v1/rpc/settle_provider_budget') {
      const body = JSON.parse(String(init?.body));
      usage.push({ resources: body.p_resources, imported: body.p_imported });
      return Response.json(null);
    }
    if (url.pathname === '/rest/v1/rpc/import_x_saved_item') {
      const input = JSON.parse(String(init?.body));
      if (knownIds.has(input.p_external_id)) return Response.json([{ imported: false, charged: false, item_id: 'known' }]);
      knownIds.add(input.p_external_id);
      savedBookmark = { ...input.p_row, id: 'bookmark-a', user_id: 'user-a', source: 'twitter', external_id: input.p_external_id,
        saved_at: new Date().toISOString(), imported_at: new Date().toISOString(), created_at: new Date().toISOString(),
        is_read: false, is_favorite: false, summary: null, media: [] };
      return Response.json([{ imported: true, charged: true, item_id: 'bookmark-a' }]);
    }
    if (url.pathname === '/rest/v1/saved_items' && init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '0-0/0' } });
    if (url.pathname === '/rest/v1/saved_items' && init?.method === 'GET') {
      assert.equal(url.searchParams.get('user_id'), 'eq.user-a');
      return Response.json(savedBookmark ? [savedBookmark] : []);
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

    providerTweets = Array.from({ length: 10 }, (_, i) => ({ id: `batch-${i}`, text: `Bookmark ${i}`, author_id: 'x-user-1' }));
    for (let i = 0; i < 8; i++) knownIds.add(`batch-${i}`);
    const mixed = await syncLiveX('user-a');
    assert.equal(mixed.addedCount, 2);
    assert.equal(mixed.creditsConsumed, 2);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 2 });
    const zeroYield = await syncLiveX('user-a');
    assert.equal(zeroYield.addedCount, 0);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 0 });
    creditBalance = 0;
    const beforeNoCredits = xRequests;
    const exhausted = await syncLiveX('user-a');
    assert.equal(exhausted.statusCode, 402);
    assert.equal(xRequests, beforeNoCredits);
    creditBalance = 10;
    providerTweets = Array.from({ length: 10_000 }, (_, i) => ({ id: `large-${i}`, text: `Large library ${i}`, author_id: 'x-user-1' }));
    const bounded = await syncLiveX('user-a', { limit: 10_000, historical: true });
    assert.equal(bounded.addedCount, 10);
    assert.equal(bounded.discoveredCount, 10);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 10 });

    bookmarksStatus = 402;
    const paymentRequired = await syncLiveX('user-a');
    assert.equal(paymentRequired.success, false);
    assert.equal(paymentRequired.statusCode, 402);
    assert.match(paymentRequired.error, /temporarily unavailable/);

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
