import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnrichment, publicXImageUrls, selectSample, validateBenchmarkConfig, type BenchmarkItem } from './gemini-benchmark';

const valid = JSON.stringify({ summary: 'Useful framework.', category: 'Product', topics: ['User Onboarding'], key_concepts: ['Activation rate'] });

test('accepts only the benchmark output schema', () => {
  assert.equal(parseEnrichment(valid).category, 'Product');
  assert.throws(() => parseEnrichment('{bad json'));
  assert.throws(() => parseEnrichment(JSON.stringify({ ...JSON.parse(valid), category: 'Unknown' })));
  assert.throws(() => parseEnrichment(JSON.stringify({ ...JSON.parse(valid), confidence: 0.9 })));
  assert.throws(() => parseEnrichment(JSON.stringify({ ...JSON.parse(valid), topics: [42] })));
});

test('requires a server key, explicit owner, and operator-confirmed Free Tier', () => {
  const base = {
    GEMINI_BENCHMARK_USER_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    GEMINI_BENCHMARK_FREE_TIER_CONFIRMED: 'true',
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
  };
  assert.throws(() => validateBenchmarkConfig(base));
  assert.throws(() => validateBenchmarkConfig({ ...base, GEMINI_API_KEY: 'test-only', GEMINI_BENCHMARK_USER_ID: 'not-a-uuid' }));
  assert.throws(() => validateBenchmarkConfig({ ...base, GEMINI_API_KEY: 'test-only', GEMINI_BENCHMARK_FREE_TIER_CONFIRMED: '' }));
  assert.equal(validateBenchmarkConfig({ ...base, GEMINI_API_KEY: 'test-only' }), base.GEMINI_BENCHMARK_USER_ID);
});

test('only existing public X image URLs can be sent directly to Gemini', () => {
  assert.deepEqual(publicXImageUrls([
    { type: 'image', url: 'https://pbs.twimg.com/media/one.jpg' },
    { type: 'image', url: 'http://127.0.0.1/private' },
    { type: 'image', url: 'https://pbs.twimg.com.evil.test/one.jpg' },
    { type: 'image', url: 'https://pbs.twimg.com:8443/one.jpg' },
    { type: 'video', url: 'https://pbs.twimg.com/media/video.jpg' },
  ]), ['https://pbs.twimg.com/media/one.jpg']);
});

test('selection is deterministic, owned, and includes available rich image items', () => {
  const rows: BenchmarkItem[] = Array.from({ length: 40 }, (_, index) => ({
    id: `item-${index}`, user_id: 'owner', source: 'twitter', content: `Post ${index}`,
    media: index === 39 ? [{ type: 'image', url: 'https://pbs.twimg.com/media/one.jpg' }] : [],
    saved_at: '2026-09-01',
  }));
  rows.push({ ...rows[0], id: 'foreign', user_id: 'other' });
  rows.push({ ...rows[0], id: 'deleted', external_content_status: 'deleted' });
  const a = selectSample(rows, 'owner');
  assert.equal(a.length, 25);
  assert.deepEqual(a, selectSample(rows, 'owner'));
  assert.ok(a.some((item) => item.id === 'item-39'));
  assert.ok(a.every((item) => item.user_id === 'owner' && item.id !== 'deleted'));
});
