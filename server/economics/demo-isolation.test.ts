import test from 'node:test';
import assert from 'node:assert/strict';
import { xSyncEngine } from '../sources/x-sync-engine';

test('demo X sync uses sample items without external provider calls', async () => {
  const previous = process.env.VITE_DEMO_MODE;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  process.env.VITE_DEMO_MODE = 'true';
  globalThis.fetch = async () => { calls++; throw new Error('External fetch attempted in demo mode.'); };
  try {
    assert.equal(xSyncEngine.generateAuthorizationUrl('demo-user').configured, false);
    const result = await xSyncEngine.syncBookmarks('demo-user');
    assert.equal(result.success, true);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.VITE_DEMO_MODE; else process.env.VITE_DEMO_MODE = previous;
  }
});
