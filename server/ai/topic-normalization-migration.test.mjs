import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = fs.readFileSync('supabase/migrations/20261007000009_normalize_enrichment_topics.sql', 'utf8');
const db = new PGlite();
await db.exec(`
  CREATE TABLE saved_item_enrichments (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    summary text,
    category text,
    topics text[] NOT NULL DEFAULT '{}',
    key_concepts text[] NOT NULL DEFAULT '{}'
  );
  INSERT INTO saved_item_enrichments VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
      'Summary stays', 'AI', ARRAY[' Artificial Intelligence ', 'AI', 'Machine Learning'], ARRAY['Concept stays']),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
      'Books stay', 'Books', ARRAY['Book Recommendations', 'Open-source software'], ARRAY['Reading']);
`);

const before = (await db.query('SELECT * FROM saved_item_enrichments ORDER BY id')).rows;
await db.exec(migration);
const afterFirst = (await db.query('SELECT * FROM saved_item_enrichments ORDER BY id')).rows;
assert.deepEqual(afterFirst[0].topics, ['AI', 'Machine Learning']);
assert.deepEqual(afterFirst[1].topics, ['Book Recommendation', 'Open Source']);
for (let index = 0; index < before.length; index++) {
  assert.equal(afterFirst[index].id, before[index].id);
  assert.equal(afterFirst[index].user_id, before[index].user_id);
  assert.equal(afterFirst[index].category, before[index].category);
  assert.equal(afterFirst[index].summary, before[index].summary);
  assert.deepEqual(afterFirst[index].key_concepts, before[index].key_concepts);
}

await db.exec(migration);
const afterSecond = (await db.query('SELECT * FROM saved_item_enrichments ORDER BY id')).rows;
assert.deepEqual(afterSecond, afterFirst);
await db.close();
