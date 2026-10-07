import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const userA = '00000000-0000-0000-0000-000000000001';
const userB = '00000000-0000-0000-0000-000000000002';

await db.exec(`
  CREATE SCHEMA auth;
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role BYPASSRLS;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('test.user_id', true), '')::uuid $$;
  CREATE TABLE connected_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_user_id text,
    username text,
    access_token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamptz,
    last_sync_at timestamptz,
    last_successful_sync_at timestamptz,
    sync_cursor text,
    sync_status text DEFAULT 'idle',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    next_sync_at timestamptz,
    reauthorization_required boolean DEFAULT false,
    last_error_code text,
    last_error_message text
  );
  ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY connected_accounts_select_owner ON connected_accounts
    FOR SELECT USING (auth.uid() = user_id);
  CREATE VIEW connected_accounts_safe AS
    SELECT id, user_id, provider, provider_user_id, username, sync_status,
      last_sync_at, last_successful_sync_at, metadata, created_at, updated_at
    FROM connected_accounts;
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  GRANT ALL ON connected_accounts TO anon, authenticated, service_role;
  GRANT SELECT ON connected_accounts_safe TO anon, authenticated, service_role;
  INSERT INTO connected_accounts
    (user_id, provider, provider_user_id, username, access_token_encrypted, refresh_token_encrypted, metadata)
  VALUES
    ('${userA}', 'twitter', 'x-a', 'owner-a', 'fake-encrypted-access-a', 'fake-encrypted-refresh-a', '{"account_label":"Owner A"}'),
    ('${userB}', 'twitter', 'x-b', 'owner-b', 'fake-encrypted-access-b', 'fake-encrypted-refresh-b', '{"account_label":"Owner B"}');
`);

await db.exec(fs.readFileSync('supabase/migrations/20260919000001_connected_accounts_permissions.sql', 'utf8'));

await db.exec('SET ROLE anon');
await assert.rejects(db.query('SELECT access_token_encrypted FROM connected_accounts'), /permission denied/);
await assert.rejects(db.query('SELECT refresh_token_encrypted FROM connected_accounts'), /permission denied/);
await assert.rejects(db.query('SELECT * FROM connected_accounts'), /permission denied/);
await assert.rejects(db.query('SELECT * FROM connected_accounts_safe'), /permission denied/);
await db.exec('RESET ROLE');

await db.exec(`SET test.user_id = '${userA}'; SET ROLE authenticated`);
await assert.rejects(db.query('SELECT access_token_encrypted FROM connected_accounts'), /permission denied/);
await assert.rejects(db.query('SELECT refresh_token_encrypted FROM connected_accounts'), /permission denied/);
await assert.rejects(db.query('SELECT * FROM connected_accounts'), /permission denied/);

const directSafe = await db.query('SELECT id, user_id, provider, username FROM connected_accounts');
assert.deepEqual(directSafe.rows.map(row => row.user_id), [userA]);

const safeView = await db.query('SELECT * FROM connected_accounts_safe');
assert.deepEqual(safeView.rows.map(row => row.user_id), [userA]);
assert.equal('access_token_encrypted' in safeView.rows[0], false);
assert.equal('refresh_token_encrypted' in safeView.rows[0], false);
assert.equal(safeView.rows.some(row => row.user_id === userB), false);
await db.exec('RESET ROLE');

await db.exec('SET ROLE service_role');
const trusted = await db.query(
  'SELECT user_id, access_token_encrypted, refresh_token_encrypted FROM connected_accounts ORDER BY user_id',
);
assert.equal(trusted.rows.length, 2);
assert.ok(trusted.rows.every(row => row.access_token_encrypted && row.refresh_token_encrypted));
await db.exec('RESET ROLE');

await db.close();
console.log('connected_accounts browser credentials denied; safe owner view and service-role access preserved');
