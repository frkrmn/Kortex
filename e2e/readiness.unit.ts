import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAccountReadiness } from './readiness';

test('empty account fails every authenticated smoke data prerequisite', () => {
  assert.deepEqual(summarizeAccountReadiness([]), {
    bookmarks: 0, completedEnrichments: 0, categories: 0, topics: 0,
  });
});

test('a persisted bookmark without completed enrichment does not pass readiness', () => {
  assert.deepEqual(summarizeAccountReadiness([{ enrichment_status: 'pending' }]), {
    bookmarks: 1, completedEnrichments: 0, categories: 0, topics: 0,
  });
});

test('only complete owner-scoped bookmark metadata counts toward readiness', () => {
  assert.deepEqual(summarizeAccountReadiness([
    { enrichment_status: 'completed', ai_summary: 'Fake summary', ai_category: 'AI', topics: ['AI'] },
    { enrichment_status: 'completed', ai_category: 'AI', topics: ['AI'] },
  ]), { bookmarks: 2, completedEnrichments: 1, categories: 1, topics: 1 });
});
