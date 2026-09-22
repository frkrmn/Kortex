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
    'FREE_SIGNUP_IMPORT_CREDITS', 'X_BOOKMARK_HISTORY_LIMIT', 'X_POST_READ_ESTIMATED_COST', 'X_PRICING_VERSION', 'X_API_MONTHLY_BUDGET', 'X_API_USER_MONTHLY_BUDGET'] as const;
  const oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { APP_URL: 'http://localhost:3000', VITE_SUPABASE_URL: 'http://localhost:39999',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', X_CLIENT_ID: 'test-x-client',
    ENCRYPTION_KEY: 'test-encryption-key-with-more-than-32-characters', ENCRYPTION_SALT: 'test-stable-salt-12345',
    FREE_SIGNUP_IMPORT_CREDITS: '10', X_POST_READ_ESTIMATED_COST: '0.001', X_PRICING_VERSION: 'test',
    X_API_MONTHLY_BUDGET: '100', X_API_USER_MONTHLY_BUDGET: '10', X_BOOKMARK_HISTORY_LIMIT: '30' });
  let stateRow: Record<string, any> | null = null;
  let savedAccount: Record<string, any> | null = null;
  let savedBookmark: Record<string, any> | null = null;
  let bookmarksStatus = 200;
  let xRequests = 0;
  let paginateProvider = false;
  let providerTweets: any[] = [{ id: 'tweet-1', text: 'Private bookmark', note_tweet: { text: 'Full private bookmark' },
    author_id: 'x-user-1', created_at: '2026-09-20T10:00:00Z', conversation_id: 'thread-root',
    attachments: { media_keys: ['media-1', 'media-2'] }, referenced_tweets: [{ type: 'replied_to', id: 'thread-root' }] }];
  const providerIncludes = {
    users: [
      { id: 'x-user-1', username: 'owner', name: 'Owner', profile_image_url: 'https://pbs.twimg.com/owner.jpg' },
      { id: 'x-user-2', username: 'root', name: 'Root author', profile_image_url: 'https://pbs.twimg.com/root.jpg' },
    ],
    media: [
      { media_key: 'media-1', type: 'photo', url: 'https://pbs.twimg.com/image.jpg', width: 1200, height: 800, alt_text: 'Diagram' },
      { media_key: 'media-2', type: 'video', preview_image_url: 'https://pbs.twimg.com/video.jpg', width: 1280, height: 720 },
    ],
    tweets: [{ id: 'thread-root', text: 'Thread root', author_id: 'x-user-2', conversation_id: 'thread-root' }],
  };
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
      if (init?.method === 'PATCH' && savedAccount) Object.assign(savedAccount, JSON.parse(String(init.body)));
      if (new Headers(init?.headers).get('prefer')?.includes('return=representation')) return Response.json({ id: 'account-a' });
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/rest/v1/sync_jobs' && init?.method === 'POST') return Response.json({ id: 'job-a' });
    if (url.pathname === '/rest/v1/sync_jobs' && init?.method === 'PATCH') return new Response(null, { status: 204 });
    if (url.pathname === '/2/users/x-user-1/bookmarks') {
      xRequests++;
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer private-access-token');
      assert.match(url.searchParams.get('tweet.fields') || '', /conversation_id/);
      assert.match(url.searchParams.get('tweet.fields') || '', /referenced_tweets/);
      assert.match(url.searchParams.get('expansions') || '', /attachments.media_keys/);
      assert.match(url.searchParams.get('expansions') || '', /referenced_tweets.id/);
      assert.match(url.searchParams.get('media.fields') || '', /preview_image_url/);
      if (bookmarksStatus === 402) return Response.json({ title: 'Payment Required' }, { status: 402 });
      const pageSize = Number(url.searchParams.get('max_results') || 100);
      const offset = Number(url.searchParams.get('pagination_token') || 0);
      const pageTweets = providerTweets.slice(offset, offset + pageSize);
      return Response.json({ data: pageTweets,
        meta: paginateProvider && offset + pageTweets.length < providerTweets.length ? { next_token: String(offset + pageTweets.length) } : {},
        includes: providerIncludes });
    }
    if (url.pathname === '/rest/v1/subscriptions') return Response.json(null);
    if (url.pathname === '/rest/v1/provider_usage_events' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      if (usage.length) usage[usage.length - 1].imported = body.imported_items;
      return Response.json({ id: 'usage-a' });
    }
    if (url.pathname === '/rest/v1/provider_usage_events' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      usage.push({ resources: body.resources_read, imported: body.imported_items });
      return Response.json({ id: `usage-e2e-${usage.length}` });
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
    if (url.pathname === '/rest/v1/rpc/import_x_saved_item_unmetered') {
      const input = JSON.parse(String(init?.body));
      if (knownIds.has(input.p_external_id)) return Response.json([{ imported: false, item_id: 'known' }]);
      knownIds.add(input.p_external_id);
      savedBookmark = { ...input.p_row, id: 'bookmark-a', user_id: 'user-a', source: 'twitter', external_id: input.p_external_id,
        saved_at: new Date().toISOString(), imported_at: new Date().toISOString(), created_at: new Date().toISOString(),
        is_read: false, is_favorite: false, summary: null, media: input.p_row.media || [] };
      return Response.json([{ imported: true, item_id: 'bookmark-a' }]);
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
    assert.equal(savedBookmark?.content, 'Full private bookmark');
    assert.equal(savedBookmark?.media.length, 2);
    assert.equal(savedBookmark?.metadata.x_conversation_id, 'thread-root');
    assert.equal(savedBookmark?.metadata.x_thread_detected, true);
    assert.equal(savedBookmark?.metadata.x_thread_fully_available, false);
    assert.equal(savedBookmark?.metadata.x_referenced_posts[0].text, 'Thread root');

    providerTweets = Array.from({ length: 10 }, (_, i) => ({ id: `batch-${i}`, text: `Bookmark ${i}`, author_id: 'x-user-1' }));
    for (let i = 0; i < 8; i++) knownIds.add(`batch-${i}`);
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const mixed = await syncLiveX('user-a');
    assert.equal(mixed.addedCount, 2);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 2 });
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const zeroYield = await syncLiveX('user-a');
    assert.equal(zeroYield.addedCount, 0);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 0 });
    providerTweets = Array.from({ length: 10_000 }, (_, i) => ({ id: `large-${i}`, text: `Large library ${i}`, author_id: 'x-user-1' }));
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const bounded = await syncLiveX('user-a', { limit: 10_000, historical: true });
    assert.equal(bounded.addedCount, 10);
    assert.equal(bounded.discoveredCount, 10);
    assert.deepEqual(usage.at(-1), { resources: 10, imported: 10 });

    // The server boundary is configurable. Even if the provider exposes more,
    // an initial historical import stops at that boundary and marks completion.
    savedAccount!.initial_import_completed_at = null;
    savedAccount!.initial_import_count = 0;
    savedAccount!.sync_cursor = null;
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    providerTweets = Array.from({ length: 1000 }, (_, i) => ({ id: `history-${i}`, text: `History ${i}`, author_id: 'x-user-1' }));
    paginateProvider = true;
    const historyBounded = await syncLiveX('user-a', { historical: true });
    assert.equal(historyBounded.addedCount, 30);
    assert.equal(historyBounded.discoveredCount, 30);
    assert.equal(historyBounded.historicalLimit, 30);
    assert.equal(historyBounded.historicalLimitReached, true);
    assert.equal(historyBounded.hasMore, false);
    paginateProvider = false;

    // Missing provider-budget configuration remains fail-closed for normal users.
    const configuredBudget = {
      X_POST_READ_ESTIMATED_COST: process.env.X_POST_READ_ESTIMATED_COST,
      X_PRICING_VERSION: process.env.X_PRICING_VERSION,
      X_API_MONTHLY_BUDGET: process.env.X_API_MONTHLY_BUDGET,
      X_API_USER_MONTHLY_BUDGET: process.env.X_API_USER_MONTHLY_BUDGET,
    };
    delete process.env.X_POST_READ_ESTIMATED_COST;
    delete process.env.X_PRICING_VERSION;
    delete process.env.X_API_MONTHLY_BUDGET;
    delete process.env.X_API_USER_MONTHLY_BUDGET;
    providerTweets = [{ id: 'e2e-bypass', text: 'Controlled provider request', author_id: 'x-user-1' }];
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const requestsBeforeBlockedUser = xRequests;
    const blockedByMissingBudget = await syncLiveX('user-a');
    assert.equal(blockedByMissingBudget.success, false);
    assert.equal(blockedByMissingBudget.statusCode, 503);
    assert.equal(xRequests, requestsBeforeBlockedUser);

    // The internal flag reaches the real provider layer and preserves usage accounting.
    const allowedE2E = await syncLiveX('user-a', { limit: 1, budgetPreflightBypassed: true });
    assert.equal(allowedE2E.success, true);
    assert.equal(xRequests, requestsBeforeBlockedUser + 1);
    assert.deepEqual(usage.at(-1), { resources: 1, imported: 1 });
    Object.assign(process.env, configuredBudget);

    bookmarksStatus = 402;
    savedAccount!.last_sync_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const paymentRequired = await syncLiveX('user-a', { budgetPreflightBypassed: true });
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
