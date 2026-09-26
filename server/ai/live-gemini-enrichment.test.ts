import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueOwnedNewBookmarks } from './live-gemini-enrichment';

test('new owned bookmark is queued once; other users cannot enqueue it', async () => {
  const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY',
    'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const rows = new Map<string, unknown>();
  let reads = 0;
  try {
    Object.assign(process.env, {
      GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
      GEMINI_ENRICHMENT_OWNER_USER_ID: owner, GEMINI_ENRICHMENT_ROLLOUT_CAP: '20',
      GEMINI_API_KEY: 'unit-test', VITE_SUPABASE_URL: 'http://127.0.0.1:39999',
      SUPABASE_SERVICE_ROLE_KEY: 'unit-test-service-role',
    });
    globalThis.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname === '/rest/v1/saved_items') {
        reads++;
        assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
        assert.equal(url.searchParams.get('source'), 'eq.twitter');
        return Response.json([{ id: 'owned-item' }]);
      }
      if (url.pathname === '/rest/v1/saved_item_enrichments') {
        assert.equal(init?.method, 'POST');
        assert.match(new Headers(init?.headers).get('prefer') || '', /resolution=ignore-duplicates/);
        const payload = JSON.parse(String(init?.body)) as { saved_item_id: string; user_id: string }[];
        assert.equal(payload[0].user_id, owner);
        rows.set(payload[0].saved_item_id, payload[0]);
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected API path: ${url.pathname}`);
    };
    assert.equal(await enqueueOwnedNewBookmarks(other, ['owned-item']), 0);
    assert.equal(reads, 0);
    await enqueueOwnedNewBookmarks(owner, ['owned-item', 'owned-item']);
    await enqueueOwnedNewBookmarks(owner, ['owned-item']);
    assert.equal(rows.size, 1);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
