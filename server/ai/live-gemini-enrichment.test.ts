import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueOwnedNewBookmarks, queueControlledBackfill, runControlledGeminiEnrichment,
  runScheduledGeminiEnrichment } from './live-gemini-enrichment';

test('new owned bookmark is queued once; other users cannot enqueue it', async () => {
  const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY',
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
        const inserted = payload.filter(row => !rows.has(row.saved_item_id));
        for (const row of inserted) rows.set(row.saved_item_id, row);
        return Response.json(inserted.map(row => ({ saved_item_id: row.saved_item_id })), { status: 201 });
      }
      throw new Error(`Unexpected API path: ${url.pathname}`);
    };
    assert.equal(await enqueueOwnedNewBookmarks(other, ['owned-item']), 0);
    assert.equal(reads, 0);
    assert.equal(await enqueueOwnedNewBookmarks(owner, ['owned-item', 'owned-item']), 1);
    assert.equal(await enqueueOwnedNewBookmarks(owner, ['owned-item']), 0);
    assert.equal(rows.size, 1);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('reconciliation discovers a missing owned row and remains idempotent', async () => {
  const legacyOwner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY',
    'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const enrichmentIds = new Set(['already-enriched']);
  let inserts = 0;
  try {
    Object.assign(process.env, {
      GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
      GEMINI_ENRICHMENT_OWNER_USER_ID: legacyOwner,
      GEMINI_ENRICHMENT_ALLOWED_USER_IDS: `${legacyOwner},${owner}`,
      GEMINI_ENRICHMENT_ROLLOUT_CAP: '20',
      GEMINI_API_KEY: 'unit-test', VITE_SUPABASE_URL: 'http://127.0.0.1:39999',
      SUPABASE_SERVICE_ROLE_KEY: 'unit-test-service-role',
    });
    globalThis.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname === '/rest/v1/saved_item_enrichments' && (!init?.method || init.method === 'GET')) {
        return Response.json([...enrichmentIds].map(saved_item_id => ({ saved_item_id })));
      }
      if (url.pathname === '/rest/v1/saved_items' && url.searchParams.has('id')) {
        assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
        return Response.json([{ id: 'missing-owned' }]);
      }
      if (url.pathname === '/rest/v1/saved_items') {
        assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
        return Response.json([
          { id: 'missing-owned', user_id: owner, source: 'twitter', external_content_status: 'available' },
          { id: 'already-enriched', user_id: owner, source: 'twitter', external_content_status: 'available' },
          { id: 'wrong-owner', user_id: legacyOwner, source: 'twitter', external_content_status: 'available' },
        ]);
      }
      if (url.pathname === '/rest/v1/saved_item_enrichments' && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body)) as { saved_item_id: string }[];
        const inserted = payload.filter(row => !enrichmentIds.has(row.saved_item_id));
        for (const row of inserted) enrichmentIds.add(row.saved_item_id);
        inserts += inserted.length;
        return Response.json(inserted, { status: 201 });
      }
      throw new Error(`Unexpected API path: ${url.pathname}`);
    };
    assert.equal(await queueControlledBackfill(20, owner), 1);
    assert.equal(await queueControlledBackfill(20, owner), 0);
    assert.equal(inserts, 1);
    assert.deepEqual([...enrichmentIds].sort(), ['already-enriched', 'missing-owned']);
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('scheduled runner fails closed before queue reconciliation or provider work', async () => {
  const prior = process.env.GEMINI_ENRICHMENT_ENABLED;
  process.env.GEMINI_ENRICHMENT_ENABLED = 'false';
  try {
    assert.deepEqual(await runScheduledGeminiEnrichment(), {
      enabled: false, queued: 0, attempted: 0, completed: 0, failed: 0, retries: 0,
      inputTokens: 0, outputTokens: 0, categories: {},
    });
  } finally {
    if (prior === undefined) delete process.env.GEMINI_ENRICHMENT_ENABLED;
    else process.env.GEMINI_ENRICHMENT_ENABLED = prior;
  }
});

test('reconciliation and worker reject an unlisted owner before database or provider work', async () => {
  const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const unlisted = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
    GEMINI_ENRICHMENT_OWNER_USER_ID: owner, GEMINI_ENRICHMENT_ALLOWED_USER_IDS: owner,
    GEMINI_ENRICHMENT_ROLLOUT_CAP: '20', GEMINI_API_KEY: 'unit-test',
  });
  try {
    await assert.rejects(queueControlledBackfill(1, unlisted), /owner is not configured/);
    await assert.rejects(runControlledGeminiEnrichment(1, unlisted), /is disabled/);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('scheduled runner reconciles missing queue rows before bounded provider work when enabled', async () => {
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
    GEMINI_ENRICHMENT_OWNER_USER_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    GEMINI_ENRICHMENT_ROLLOUT_CAP: '1000', GEMINI_API_KEY: 'unit-test',
  });
  const order: string[] = [];
  try {
    const result = await runScheduledGeminiEnrichment({
      queue: async () => { order.push('queue'); return 1; },
      run: async () => {
        order.push('worker');
        return { attempted: 1, completed: 1, failed: 0, retries: 0,
          inputTokens: 10, outputTokens: 5, categories: { AI: 1 } };
      },
    });
    assert.deepEqual(order, ['queue', 'worker']);
    assert.deepEqual(result, { enabled: true, queued: 1, attempted: 1, completed: 1, failed: 0,
      retries: 0, inputTokens: 10, outputTokens: 5, categories: { AI: 1 } });
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('scheduled runner may recover queue work while Gemini provider execution is disabled', async () => {
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_API_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    GEMINI_ENRICHMENT_ENABLED: 'false', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
    GEMINI_ENRICHMENT_OWNER_USER_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    GEMINI_ENRICHMENT_ROLLOUT_CAP: '1000', GEMINI_API_KEY: 'unit-test',
  });
  let workerCalls = 0;
  try {
    const result = await runScheduledGeminiEnrichment({
      queue: async () => 1,
      run: async () => { workerCalls++; throw new Error('worker must remain disabled'); },
    });
    assert.equal(result.enabled, false);
    assert.equal(result.queued, 1);
    assert.equal(result.attempted, 0);
    assert.equal(workerCalls, 0);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('scheduled runner shares its bounded batch across every allowlisted owner', async () => {
  const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const keys = ['GEMINI_ENRICHMENT_ENABLED', 'GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED',
    'GEMINI_ENRICHMENT_OWNER_USER_ID', 'GEMINI_ENRICHMENT_ALLOWED_USER_IDS',
    'GEMINI_ENRICHMENT_ROLLOUT_CAP', 'GEMINI_ENRICHMENT_BATCH_SIZE', 'GEMINI_API_KEY'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
    GEMINI_ENRICHMENT_OWNER_USER_ID: ownerA,
    GEMINI_ENRICHMENT_ALLOWED_USER_IDS: `${ownerA},invalid,${ownerB}`,
    GEMINI_ENRICHMENT_ROLLOUT_CAP: '1000', GEMINI_ENRICHMENT_BATCH_SIZE: '5',
    GEMINI_API_KEY: 'unit-test',
  });
  const queueCalls: { limit: number | undefined; ownerId: string | undefined }[] = [];
  const runCalls: { limit: number | undefined; ownerId: string | undefined }[] = [];
  try {
    const result = await runScheduledGeminiEnrichment({
      queue: async (limit, ownerId) => { queueCalls.push({ limit, ownerId }); return 1; },
      run: async (limit, ownerId) => {
        runCalls.push({ limit, ownerId });
        return { attempted: 1, completed: 1, failed: 0, retries: 0,
          inputTokens: 10, outputTokens: 5, categories: { AI: 1 } };
      },
    });
    assert.deepEqual(queueCalls, [{ limit: 2, ownerId: ownerA }, { limit: 3, ownerId: ownerB }]);
    assert.deepEqual(runCalls, queueCalls);
    assert.equal(queueCalls.reduce((sum, call) => sum + (call.limit || 0), 0), 5);
    assert.deepEqual(result, { enabled: true, queued: 2, attempted: 2, completed: 2, failed: 0,
      retries: 0, inputTokens: 20, outputTokens: 10, categories: { AI: 2 } });
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
