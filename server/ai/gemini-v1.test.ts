import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeminiEnrichment, geminiInputParts, GEMINI_ENRICHMENT_INSTRUCTION, GEMINI_RESPONSE_SCHEMA } from './gemini-v1';
import { enrichmentControls, isControlledEnrichmentOwner } from './live-gemini-enrichment';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const allowedOwner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const enabled = {
  GEMINI_ENRICHMENT_ENABLED: 'true', GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED: 'true',
  GEMINI_ENRICHMENT_OWNER_USER_ID: owner, GEMINI_ENRICHMENT_ROLLOUT_CAP: '20', GEMINI_API_KEY: 'unit-test',
};

test('v1 accepts Books and rejects invalid categories and malformed output', () => {
  const result = { summary: 'A useful book.', category: 'Books', topics: ['Reading'], key_concepts: ['Book'] };
  assert.equal(parseGeminiEnrichment(JSON.stringify(result)).category, 'Books');
  assert.throws(() => parseGeminiEnrichment(JSON.stringify({ ...result, category: 'Lifestyle' })));
  assert.throws(() => parseGeminiEnrichment(JSON.stringify({ ...result, topics: [1] })));
  assert.throws(() => parseGeminiEnrichment('{invalid'));
  assert.match(GEMINI_ENRICHMENT_INSTRUCTION, /untrusted data/);
});

test('provider schema limits arrays to the local validator contract', () => {
  const properties = GEMINI_RESPONSE_SCHEMA.properties;
  assert.equal(properties.topics.maxItems, 5);
  assert.equal(properties.key_concepts.maxItems, 6);
  const valid = { summary: 'Useful context.', category: 'AI', topics: ['Agents'], key_concepts: ['MCP'] };
  assert.equal(parseGeminiEnrichment(JSON.stringify(valid)).category, 'AI');
  assert.throws(() => parseGeminiEnrichment(JSON.stringify({ ...valid, topics: ['a', 'b', 'c', 'd', 'e', 'f'] })));
  assert.throws(() => parseGeminiEnrichment(JSON.stringify({ ...valid, key_concepts: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })));
});

test('provider output is normalized deterministically before persistence', () => {
  const parsed = parseGeminiEnrichment(JSON.stringify({
    summary: 'Useful context.', category: 'AI',
    topics: ['Artificial Intelligence', 'AI', 'Open-source software', 'Machine Learning'],
    key_concepts: ['MCP'],
  }));
  assert.deepEqual(parsed.topics, ['AI', 'Open Source', 'Machine Learning']);
  assert.deepEqual(parsed.key_concepts, ['MCP']);
});

test('controlled rollout fails closed for absent config and any other user', () => {
  assert.equal(isControlledEnrichmentOwner(owner, {}), false);
  assert.equal(isControlledEnrichmentOwner(owner, { ...enabled, GEMINI_ENRICHMENT_ROLLOUT_CAP: '0' }), false);
  assert.equal(isControlledEnrichmentOwner('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', enabled), false);
  assert.equal(isControlledEnrichmentOwner(owner, enabled), true);
  assert.equal(isControlledEnrichmentOwner(owner, { ...enabled, GEMINI_ENRICHMENT_OWNER_USER_ID: owner.toUpperCase() }), true);
  assert.equal(isControlledEnrichmentOwner(owner, { ...enabled, GEMINI_ENRICHMENT_ENABLED: 'false' }), true);
  assert.equal(enrichmentControls({ ...enabled, GEMINI_ENRICHMENT_ENABLED: 'false' }).providerEnabled, false);
  assert.equal(enrichmentControls({ ...enabled, GEMINI_API_KEY: undefined }).apiKeyConfigured, false);
  assert.equal(enrichmentControls({ ...enabled, GEMINI_ENRICHMENT_BATCH_SIZE: '999' }).batchSize, 20);
});

test('controlled rollout accepts exact valid allowlist UUIDs and preserves the legacy owner', () => {
  const allowlisted = {
    ...enabled,
    GEMINI_ENRICHMENT_ALLOWED_USER_IDS: ` ${allowedOwner.toUpperCase()},invalid,${allowedOwner} `,
  };
  assert.equal(isControlledEnrichmentOwner(owner, allowlisted), true);
  assert.equal(isControlledEnrichmentOwner(allowedOwner, allowlisted), true);
  assert.equal(isControlledEnrichmentOwner('cccccccc-cccc-4ccc-8ccc-cccccccccccc', allowlisted), false);
  assert.equal(isControlledEnrichmentOwner(allowedOwner.slice(0, -1), allowlisted), false);
  assert.deepEqual(enrichmentControls(allowlisted).ownerIds, [owner, allowedOwner]);
  assert.equal(enrichmentControls({ ...enabled, GEMINI_ENRICHMENT_OWNER_USER_ID: '',
    GEMINI_ENRICHMENT_ALLOWED_USER_IDS: allowedOwner }).queueEnabled, true);
  assert.equal(enrichmentControls({ ...enabled, GEMINI_ENRICHMENT_OWNER_USER_ID: '',
    GEMINI_ENRICHMENT_ALLOWED_USER_IDS: 'invalid,also-invalid' }).queueEnabled, false);
});

test('multimodal input uses only persisted public X image metadata', () => {
  const parts = geminiInputParts({ content: 'Look at this', media: [
    { type: 'image', url: 'https://pbs.twimg.com/media/one.jpg' },
    { type: 'image', url: 'http://127.0.0.1/private' },
  ] });
  assert.equal(parts.length, 2);
  assert.equal(parts[0].type, 'text');
  assert.equal(parts[1].type, 'image');
});
