import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const userA = '00000000-0000-0000-0000-000000000001';
const userB = '00000000-0000-0000-0000-000000000002';
const itemA = '10000000-0000-0000-0000-000000000001';
const itemB = '10000000-0000-0000-0000-000000000002';
const collectionA = '20000000-0000-0000-0000-000000000001';
const topicA = '30000000-0000-0000-0000-000000000001';
const topicB = '30000000-0000-0000-0000-000000000002';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE ROLE authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('test.user_id', true), '')::uuid $$;
  CREATE TABLE saved_items (id uuid PRIMARY KEY, user_id uuid NOT NULL);
  CREATE TABLE collections (id uuid PRIMARY KEY, user_id uuid NOT NULL, visibility text NOT NULL);
  CREATE TABLE collection_items (
    collection_id uuid NOT NULL REFERENCES collections(id),
    saved_item_id uuid NOT NULL REFERENCES saved_items(id),
    PRIMARY KEY (collection_id, saved_item_id)
  );
  CREATE TABLE topics (id uuid PRIMARY KEY, user_id uuid NOT NULL);
  CREATE TABLE saved_item_topics (
    saved_item_id uuid NOT NULL REFERENCES saved_items(id),
    topic_id uuid NOT NULL REFERENCES topics(id),
    PRIMARY KEY (saved_item_id, topic_id)
  );
  CREATE TABLE saved_item_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    saved_item_id uuid NOT NULL REFERENCES saved_items(id),
    embedding_version text NOT NULL DEFAULT 'v1',
    UNIQUE (saved_item_id, embedding_version)
  );
  ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
  ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE saved_item_topics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE saved_item_embeddings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY saved_items_owner ON saved_items FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY collections_owner ON collections FOR SELECT USING (user_id = auth.uid() OR visibility = 'public');
  CREATE POLICY topics_owner ON topics FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY collection_items_owner_select ON collection_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND (c.user_id = auth.uid() OR c.visibility = 'public'))
  );
  CREATE POLICY collection_items_update_owner ON collection_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.user_id = auth.uid())
  );
  CREATE POLICY saved_item_topics_insert_owner ON saved_item_topics FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM saved_items si WHERE si.id = saved_item_id AND si.user_id = auth.uid())
  );
  CREATE POLICY saved_item_topics_update_owner ON saved_item_topics FOR UPDATE USING (
    EXISTS (SELECT 1 FROM saved_items si WHERE si.id = saved_item_id AND si.user_id = auth.uid())
  );
  CREATE POLICY "Users can insert their own embeddings" ON saved_item_embeddings FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update their own embeddings" ON saved_item_embeddings FOR UPDATE USING (auth.uid() = user_id);
  GRANT USAGE ON SCHEMA public, auth TO authenticated;
  GRANT SELECT ON saved_items, collections, topics TO authenticated;
  GRANT SELECT, UPDATE ON collection_items TO authenticated;
  GRANT SELECT, INSERT, UPDATE ON saved_item_topics, saved_item_embeddings TO authenticated;
  INSERT INTO saved_items VALUES ('${itemA}', '${userA}'), ('${itemB}', '${userB}');
  INSERT INTO collections VALUES ('${collectionA}', '${userA}', 'public');
  INSERT INTO collection_items VALUES ('${collectionA}', '${itemA}');
  INSERT INTO topics VALUES ('${topicA}', '${userA}'), ('${topicB}', '${userB}');
`);

await db.exec(`SET test.user_id = '${userA}'; SET ROLE authenticated`);

// Prove the historical policy allowed a public collection to be retargeted to
// another tenant's item before applying the forward-only fix.
await db.query('UPDATE collection_items SET saved_item_id = $1 WHERE collection_id = $2', [itemB, collectionA]);
assert.equal(
  (await db.query('SELECT saved_item_id FROM collection_items WHERE collection_id = $1', [collectionA])).rows[0].saved_item_id,
  itemB,
);
await db.query('UPDATE collection_items SET saved_item_id = $1 WHERE collection_id = $2', [itemA, collectionA]);
await db.exec('RESET ROLE');

await db.exec(fs.readFileSync('supabase/migrations/20261009000011_grm125_relationship_owner_constraints.sql', 'utf8'));
await db.exec(`SET test.user_id = '${userA}'; SET ROLE authenticated`);

await assert.rejects(
  db.query('UPDATE collection_items SET saved_item_id = $1 WHERE collection_id = $2', [itemB, collectionA]),
  /row-level security policy/,
);
await assert.rejects(
  db.query('INSERT INTO saved_item_topics(saved_item_id, topic_id) VALUES ($1, $2)', [itemA, topicB]),
  /row-level security policy/,
);
await assert.rejects(
  db.query('INSERT INTO saved_item_embeddings(user_id, saved_item_id) VALUES ($1, $2)', [userA, itemB]),
  /row-level security policy/,
);

await db.query('INSERT INTO saved_item_topics(saved_item_id, topic_id) VALUES ($1, $2)', [itemA, topicA]);
await db.query('INSERT INTO saved_item_embeddings(user_id, saved_item_id) VALUES ($1, $2)', [userA, itemA]);
assert.equal((await db.query('SELECT count(*)::int AS count FROM collection_items')).rows[0].count, 1);

await db.exec('RESET ROLE');
await db.close();
console.log('GRM-125 relationship RLS: cross-user writes denied; same-owner writes preserved');
