import test from 'node:test';
import assert from 'node:assert/strict';
import { isXAutoSyncEnabled } from './scheduled-sync';
import { SmartSyncService } from '../economics/smart-sync';
import { enrichmentControls, runControlledGeminiEnrichment } from '../ai/live-gemini-enrichment';

const owner = '123e4567-e89b-42d3-a456-426614174000';

test('cron authentication alone cannot enable scheduled X sync', async () => {
  const prior = { secret: process.env.CRON_SECRET, auto: process.env.X_AUTO_SYNC_ENABLED,
    legacy: process.env.X_SYNC_ENABLED };
  const priorFetch = globalThis.fetch;
  let providerCalls = 0;
  process.env.CRON_SECRET = 'test-only-secret';
  delete process.env.X_AUTO_SYNC_ENABLED;
  globalThis.fetch = async () => { providerCalls++; throw new Error('Provider call was attempted'); };
  try {
    assert.equal(isXAutoSyncEnabled(), false);
    assert.deepEqual(await SmartSyncService.run(), { synced: 0, skipped: 0 });
    process.env.X_AUTO_SYNC_ENABLED = 'false';
    assert.equal(isXAutoSyncEnabled(), false);
    assert.deepEqual(await SmartSyncService.run(), { synced: 0, skipped: 0 });
    assert.equal(providerCalls, 0);
  } finally {
    globalThis.fetch = priorFetch;
    for (const [name, value] of [['CRON_SECRET', prior.secret], ['X_AUTO_SYNC_ENABLED', prior.auto],
      ['X_SYNC_ENABLED', prior.legacy]] as const) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('scheduled X sync requires explicit opt-in and honors the legacy kill switch', () => {
  assert.equal(isXAutoSyncEnabled({ CRON_SECRET: 'test-only-secret', X_AUTO_SYNC_ENABLED: 'true' }), true);
  assert.equal(isXAutoSyncEnabled({ CRON_SECRET: 'test-only-secret', X_AUTO_SYNC_ENABLED: 'true', X_SYNC_ENABLED: 'false' }), false);
});

test('Gemini scheduling is independent of X auto-sync and fails closed', async () => {
  const config = { GEMINI_ENRICHMENT_OWNER_USER_ID: owner, GEMINI_API_KEY: 'test-only-key',
    GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true', GEMINI_ENRICHMENT_ROLLOUT_CAP: '20',
    X_AUTO_SYNC_ENABLED: 'false', CRON_SECRET: 'test-only-secret' };
  assert.equal(enrichmentControls({ ...config, GEMINI_ENRICHMENT_ENABLED: 'false' }).enabled, false);
  assert.equal(enrichmentControls({ ...config, GEMINI_ENRICHMENT_ENABLED: 'true' }).enabled, true);
  assert.equal(isXAutoSyncEnabled({ ...config, GEMINI_ENRICHMENT_ENABLED: 'true' }), false);
  const prior = process.env.GEMINI_ENRICHMENT_ENABLED;
  process.env.GEMINI_ENRICHMENT_ENABLED = 'false';
  try {
    await assert.rejects(runControlledGeminiEnrichment(), /disabled/);
  } finally {
    if (prior === undefined) delete process.env.GEMINI_ENRICHMENT_ENABLED; else process.env.GEMINI_ENRICHMENT_ENABLED = prior;
  }
});
