import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTopic, normalizeTopics } from './topic-normalization';

test('normalizes audited aliases while preserving useful distinctions', () => {
  assert.equal(normalizeTopic('  Artificial   Intelligence  '), 'AI');
  assert.equal(normalizeTopic('AI'), 'AI');
  assert.equal(normalizeTopic('Book Recommendations'), 'Book Recommendation');
  assert.equal(normalizeTopic('open-source software'), 'Open Source');
  assert.equal(normalizeTopic('Prompt engineering'), 'Prompt Engineering');
  assert.equal(normalizeTopic('Trading Strategies'), 'Trading Strategy');
  assert.equal(normalizeTopic('GitHub Repositories'), 'GitHub Repository');
  assert.equal(normalizeTopic('Machine Learning'), 'Machine Learning');
  assert.equal(normalizeTopic('Deep Learning'), 'Deep Learning');
  assert.equal(normalizeTopic('Bitcoin'), 'Bitcoin');
  assert.equal(normalizeTopic('Cryptocurrency'), 'Cryptocurrency');
});

test('normalization is idempotent and deduplicates canonical aliases', () => {
  const inputs = ['AI', 'Artificial Intelligence', 'Book Recommendations', 'Open Source Software', 'Unknown Topic'];
  for (const input of inputs) assert.equal(normalizeTopic(normalizeTopic(input)), normalizeTopic(input));
  assert.deepEqual(normalizeTopics(['AI', ' Artificial Intelligence ', 'Machine Learning']), ['AI', 'Machine Learning']);
});
