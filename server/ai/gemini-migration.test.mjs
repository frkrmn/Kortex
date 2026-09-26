import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('enrichment RLS, composite ownership, and privileged claim', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
        SELECT nullif(current_setting('test.user_id', true),'')::uuid $$;
      CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
      CREATE TABLE public.saved_items(id uuid PRIMARY KEY, user_id uuid NOT NULL, source text, content text);
    `);
    await db.exec(fs.readFileSync('supabase/migrations/20260926000008_gemini_enrichments.sql', 'utf8'));
    const one = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const two = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const item = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await db.query('INSERT INTO saved_items(id,user_id,source,content) VALUES($1,$2,\'twitter\',\'hello\')', [item, one]);
    await assert.rejects(db.query(`INSERT INTO saved_item_enrichments(saved_item_id,user_id) VALUES($1,$2)`, [item, two]));
    await db.query(`INSERT INTO saved_item_enrichments(saved_item_id,user_id) VALUES($1,$2)`, [item, one]);
    for (const role of ['public', 'anon', 'authenticated']) {
      const { rows } = await db.query(`SELECT has_function_privilege($1,'public.claim_gemini_enrichment(uuid,integer,integer)','EXECUTE') AS allowed`, [role]);
      assert.equal(rows[0].allowed, false);
    }
    assert.equal((await db.query(`SELECT has_function_privilege('service_role','public.claim_gemini_enrichment(uuid,integer,integer)','EXECUTE') AS allowed`)).rows[0].allowed, true);
    await db.exec(`SET test.user_id = '${two}'; SET ROLE authenticated`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM saved_item_enrichments')).rows[0].n, 0);
    await assert.rejects(db.query(`UPDATE saved_item_enrichments SET status='completed'`));
    await db.exec(`RESET ROLE; SET test.user_id = '${one}'; SET ROLE authenticated`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM saved_item_enrichments')).rows[0].n, 1);
    await assert.rejects(db.query(`SELECT * FROM claim_gemini_enrichment($1,3,20)`, [one]));
    await db.exec(`RESET ROLE; SET request.jwt.claims = '{"role":"service_role"}'; SET ROLE service_role`);
    const claim = await db.query(`SELECT * FROM claim_gemini_enrichment($1,3,20)`, [one]);
    assert.equal(claim.rows.length, 1);
    assert.equal(claim.rows[0].attempts, 1);
    assert.equal((await db.query(`SELECT * FROM claim_gemini_enrichment($1,3,20)`, [one])).rows.length, 0);
    await db.exec('RESET ROLE');
    await db.query(`UPDATE saved_item_enrichments SET status='completed',summary='A book.',category='Books',
      topics=ARRAY['Reading'],key_concepts=ARRAY['Reference'] WHERE saved_item_id=$1`, [item]);
    const stored = (await db.query(`SELECT category,topics,key_concepts FROM saved_item_enrichments WHERE saved_item_id=$1`, [item])).rows[0];
    assert.equal(stored.category, 'Books');
    assert.deepEqual(stored.topics, ['Reading']);
    assert.deepEqual(stored.key_concepts, ['Reference']);
    assert.equal((await db.query(`SELECT content FROM saved_items WHERE id=$1`, [item])).rows[0].content, 'hello');
    const next = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    await db.query(`INSERT INTO saved_items(id,user_id,source,content) VALUES($1,$2,'twitter','still readable')`, [next, one]);
    await db.query(`INSERT INTO saved_item_enrichments(saved_item_id,user_id) VALUES($1,$2)
      ON CONFLICT(saved_item_id,prompt_version,schema_version) DO NOTHING`, [next, one]);
    assert.equal((await db.query(`SELECT * FROM claim_gemini_enrichment($1,3,1)`, [one])).rows.length, 0);
    const retry = await db.query(`SELECT * FROM claim_gemini_enrichment($1,3,2)`, [one]);
    assert.equal(retry.rows.length, 1);
    await db.query(`UPDATE saved_item_enrichments SET status='failed',next_attempt_at=now() WHERE saved_item_id=$1`, [next]);
    assert.equal((await db.query(`SELECT content FROM saved_items WHERE id=$1`, [next])).rows[0].content, 'still readable');
    const retryClaim = await db.query(`SELECT * FROM claim_gemini_enrichment($1,3,2)`, [one]);
    assert.equal(retryClaim.rows[0].attempts, 2);
    await assert.rejects(db.query(`UPDATE saved_item_enrichments SET category='Unknown' WHERE saved_item_id=$1`, [next]));
  } finally {
    await db.close();
  }
});
