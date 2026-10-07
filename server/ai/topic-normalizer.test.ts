import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTopicName } from './topic-normalizer';

test('legacy enrichment path shares the conservative canonical topic policy', () => {
  assert.equal(normalizeTopicName('# Artificial Intelligence '), 'AI');
  assert.equal(normalizeTopicName('Book Recommendations'), 'Book Recommendation');
  assert.equal(normalizeTopicName('Open-source software'), 'Open Source');
  assert.equal(normalizeTopicName('Machine Learning'), 'Machine Learning');
  assert.equal(normalizeTopicName('Deep Learning'), 'Deep Learning');
  assert.equal(normalizeTopicName('Bitcoin'), 'Bitcoin');
  assert.equal(normalizeTopicName('Cryptocurrency'), 'Cryptocurrency');
});
