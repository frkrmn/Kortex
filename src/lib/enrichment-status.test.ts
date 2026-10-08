import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichmentStatusPresentation } from './enrichment-status';

test('pending enrichment is presented as queued, not active processing', () => {
  const pending = enrichmentStatusPresentation('pending');
  assert.equal(pending.busy, false);
  assert.match(pending.title, /queued/i);
  assert.doesNotMatch(`${pending.title} ${pending.detail} ${pending.summary}`, /in progress|analyzing/i);
});

test('processing enrichment is presented as active work', () => {
  const processing = enrichmentStatusPresentation('processing');
  assert.equal(processing.busy, true);
  assert.match(`${processing.title} ${processing.detail}`, /in progress|analyzing/i);
});
