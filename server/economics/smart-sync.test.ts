import test from 'node:test';
import assert from 'node:assert/strict';
import { SmartSyncService, type SmartSyncDependencies } from './smart-sync';
import { hasActiveProEntitlement } from '../billing/live-entitlement';

const owner = '123e4567-e89b-42d3-a456-426614174000';
const other = '223e4567-e89b-42d3-a456-426614174000';
const now = new Date('2026-09-28T12:00:00.000Z');
const account = (userId = owner) => ({
  id: `account-${userId}`, user_id: userId, access_token_encrypted: 'encrypted',
  provider_user_id: `x-${userId}`, initial_import_completed_at: '2026-09-01T00:00:00.000Z',
  last_successful_sync_at: '2026-09-26T00:00:00.000Z', next_sync_at: null,
  reauthorization_required: false, sync_status: 'idle',
});
const pro = { plan: 'pro', status: 'active', current_period_end: '2026-10-28T00:00:00.000Z',
  trial_end: null, cancel_at_period_end: false };

function dependencies(overrides: Partial<SmartSyncDependencies> = {}): SmartSyncDependencies {
  return {
    listAccounts: async () => [account()],
    subscriptionFor: async () => pro,
    lastActiveAt: async () => '2026-09-27T00:00:00.000Z',
    recentUsage: async () => [],
    budgetPreflight: async () => ({ allowed: true }),
    sync: async () => ({ success: true, addedCount: 0, discoveredCount: 10, requestCount: 1, queuedCount: 0 }),
    updateAccount: async () => {},
    now: () => now,
    ...overrides,
  };
}

async function withRollout<T>(mode: 'controlled'|'production'|'off', fn: () => Promise<T>) {
  const keys = ['X_AUTO_SYNC_ENABLED', 'X_SYNC_ENABLED', 'X_AUTO_SYNC_ROLLOUT_MODE',
    'X_AUTO_SYNC_CONTROLLED_OWNER_USER_ID', 'X_SMART_SYNC_DAILY_BATCH_SIZE',
    'X_AUTO_SYNC_MAX_PAGES_PER_RUN', 'X_SYNC_INCREMENTAL_PAGE_SIZE'] as const;
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { X_AUTO_SYNC_ENABLED: 'true', X_SYNC_ENABLED: 'true',
    X_AUTO_SYNC_ROLLOUT_MODE: mode, X_AUTO_SYNC_CONTROLLED_OWNER_USER_ID: owner,
    X_SMART_SYNC_DAILY_BATCH_SIZE: '3', X_AUTO_SYNC_MAX_PAGES_PER_RUN: '1',
    X_SYNC_INCREMENTAL_PAGE_SIZE: '10' });
  try { return await fn(); } finally {
    for (const key of keys) prior[key] === undefined ? delete process.env[key] : process.env[key] = prior[key];
  }
}

test('automatic Pro entitlement follows active billing period and fails closed', () => {
  assert.equal(hasActiveProEntitlement(pro, now), true);
  assert.equal(hasActiveProEntitlement({ ...pro, status: 'trialing', trial_end: '2026-10-01T00:00:00.000Z' }, now), true);
  assert.equal(hasActiveProEntitlement({ ...pro, status: 'canceled', cancel_at_period_end: true }, now), true);
  assert.equal(hasActiveProEntitlement({ ...pro, plan: 'free' }, now), false);
  assert.equal(hasActiveProEntitlement({ ...pro, current_period_end: '2026-09-01T00:00:00.000Z' }, now), false);
});

test('disabled, Free, not-due, missing connection, incomplete import, and budget rejection make zero X calls', async () => {
  let calls = 0;
  const base = dependencies({ sync: async () => { calls++; throw new Error('must not run'); } });
  const prior = process.env.X_AUTO_SYNC_ENABLED;
  process.env.X_AUTO_SYNC_ENABLED = 'false';
  assert.equal((await SmartSyncService.run(base)).attempted, 0);
  if (prior === undefined) delete process.env.X_AUTO_SYNC_ENABLED; else process.env.X_AUTO_SYNC_ENABLED = prior;

  await withRollout('controlled', async () => {
    assert.equal((await SmartSyncService.run(dependencies({ ...base, subscriptionFor: async () => ({ plan: 'free', status: 'active' }) }))).skippedFree, 1);
    assert.equal((await SmartSyncService.run(dependencies({ ...base,
      listAccounts: async () => [{ ...account(), last_successful_sync_at: '2026-09-28T06:00:00.000Z' }] }))).skippedNotDue, 1);
    assert.equal((await SmartSyncService.run(dependencies({ ...base,
      listAccounts: async () => [{ ...account(), access_token_encrypted: null }] }))).skippedNoConnection, 1);
    assert.equal((await SmartSyncService.run(dependencies({ ...base,
      listAccounts: async () => [{ ...account(), initial_import_completed_at: null }] }))).skippedInitialImport, 1);
    assert.equal((await SmartSyncService.run(dependencies({ ...base,
      budgetPreflight: async () => ({ allowed: false }) }))).skippedBudget, 1);
  });
  assert.equal(calls, 0);
});

test('controlled rollout excludes every non-canonical owner before provider work', async () => {
  let calls = 0;
  await withRollout('controlled', async () => {
    const result = await SmartSyncService.run(dependencies({
      listAccounts: async () => [account(other)],
      sync: async () => { calls++; throw new Error('must not run'); },
    }));
    assert.equal(result.skippedRollout, 1);
  });
  assert.equal(calls, 0);
});

test('eligible due Pro uses one bounded page and accounts for duplicates and new queue work', async () => {
  let options: unknown;
  const updates: Record<string, unknown>[] = [];
  await withRollout('controlled', async () => {
    const result = await SmartSyncService.run(dependencies({
      sync: async (_userId, value) => {
        options = value;
        return { success: true, addedCount: 1, discoveredCount: 10, requestCount: 1, queuedCount: 1 };
      },
      updateAccount: async (_id, update) => { updates.push(update); },
    }));
    assert.equal(result.synced, 1);
    assert.equal(result.newBookmarks, 1);
    assert.equal(result.duplicates, 9);
    assert.equal(result.queuedEnrichments, 1);
    assert.equal(result.xRequests, 1);
  });
  assert.deepEqual(options, { automatic: true, limit: 10, maxPages: 1 });
  assert.equal(typeof updates[0]?.next_sync_at, 'string');
});

test('one user failure does not prevent the next eligible user in production rollout', async () => {
  const seen: string[] = [];
  await withRollout('production', async () => {
    const result = await SmartSyncService.run(dependencies({
      listAccounts: async () => [account(owner), account(other)],
      sync: async userId => {
        seen.push(userId);
        if (userId === owner) throw Object.assign(new Error('fixture network failure'), { name: 'TypeError' });
        return { success: true, addedCount: 0, discoveredCount: 1, requestCount: 1 };
      },
    }));
    assert.equal(result.failed, 1);
    assert.equal(result.synced, 1);
  });
  assert.deepEqual(seen, [owner, other]);
});

test('authorization and rate-limit failures are bounded and do not produce retries in one run', async () => {
  for (const statusCode of [401, 403, 429]) {
    let calls = 0;
    await withRollout('controlled', async () => {
      const result = await SmartSyncService.run(dependencies({
        sync: async () => {
          calls++;
          return { success: false, statusCode, addedCount: 0, discoveredCount: 0, requestCount: 1 };
        },
      }));
      assert.equal(result.failed, 1);
      assert.equal(result.reauthorizationRequired, statusCode === 401 || statusCode === 403 ? 1 : 0);
    });
    assert.equal(calls, 1);
  }
});

test('fresh overlap is skipped but a stale syncing lease is recoverable', async () => {
  let calls = 0;
  await withRollout('controlled', async () => {
    const fresh = await SmartSyncService.run(dependencies({
      listAccounts: async () => [{ ...account(), sync_status: 'syncing', last_sync_at: '2026-09-28T11:58:00.000Z' }],
      sync: async () => { calls++; throw new Error('fresh lease must not run'); },
    }));
    assert.equal(fresh.skippedNotDue, 1);
    const stale = await SmartSyncService.run(dependencies({
      listAccounts: async () => [{ ...account(), sync_status: 'syncing', last_sync_at: '2026-09-27T00:00:00.000Z' }],
      sync: async () => { calls++; return { success: true, addedCount: 0, discoveredCount: 0, requestCount: 1 }; },
    }));
    assert.equal(stale.synced, 1);
  });
  assert.equal(calls, 1);
});

test('terminal X payment state is not retried automatically', async () => {
  let calls = 0;
  await withRollout('controlled', async () => {
    const result = await SmartSyncService.run(dependencies({
      listAccounts: async () => [{ ...account(), last_error_code: 'x_payment_required' }],
      sync: async () => { calls++; throw new Error('terminal provider state must not run'); },
    }));
    assert.equal(result.skippedProviderBlocked, 1);
  });
  assert.equal(calls, 0);
});
