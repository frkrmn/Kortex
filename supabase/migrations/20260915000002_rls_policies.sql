-- Recallly: Row Level Security (RLS) Policies
-- Migration: 20260915000002_rls_policies.sql
-- Enforces complete tenant isolation, public collection reads, and token safety.

-- ==========================================
-- 1. ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_item_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. PROFILES
-- ==========================================
CREATE POLICY "profiles_select_owner" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_owner" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_owner" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_owner" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. CONNECTED ACCOUNTS
-- Sensitive Tokens Note: access_token_encrypted & refresh_token_encrypted
-- Client apps should query `connected_accounts_safe` view or API routes.
-- ==========================================
CREATE POLICY "connected_accounts_select_owner" ON connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "connected_accounts_insert_owner" ON connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connected_accounts_update_owner" ON connected_accounts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "connected_accounts_delete_owner" ON connected_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. SAVED ITEMS
-- Users read their own saved items, OR items that are part of an explicitly public collection.
-- ==========================================
CREATE POLICY "saved_items_select_owner_or_public_collection" ON saved_items
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM collection_items ci
      JOIN collections c ON ci.collection_id = c.id
      WHERE ci.saved_item_id = saved_items.id
        AND c.visibility = 'public'
    )
  );

CREATE POLICY "saved_items_insert_owner" ON saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_items_update_owner" ON saved_items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_items_delete_owner" ON saved_items
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 5. TOPICS
-- ==========================================
CREATE POLICY "topics_select_owner" ON topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "topics_insert_owner" ON topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_update_owner" ON topics
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_delete_owner" ON topics
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 6. SAVED ITEM TOPICS
-- Derived from parent saved_item access
-- ==========================================
CREATE POLICY "saved_item_topics_select" ON saved_item_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND (
          si.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM collection_items ci
            JOIN collections c ON ci.collection_id = c.id
            WHERE ci.saved_item_id = si.id
              AND c.visibility = 'public'
          )
        )
    )
  );

CREATE POLICY "saved_item_topics_insert_owner" ON saved_item_topics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
  );

CREATE POLICY "saved_item_topics_update_owner" ON saved_item_topics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
  );

CREATE POLICY "saved_item_topics_delete_owner" ON saved_item_topics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
  );

-- ==========================================
-- 7. COLLECTIONS
-- Owner access, plus public collection discovery for any user/visitor
-- ==========================================
CREATE POLICY "collections_select_owner_or_public" ON collections
  FOR SELECT USING (
    auth.uid() = user_id
    OR visibility = 'public'
  );

CREATE POLICY "collections_insert_owner" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_update_owner" ON collections
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collections_delete_owner" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 8. COLLECTION ITEMS
-- Read allowed if parent collection is public or owned by user.
-- Modification strictly requires collection ownership AND item ownership.
-- ==========================================
CREATE POLICY "collection_items_select" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR c.visibility = 'public')
    )
  );

CREATE POLICY "collection_items_insert_owner" ON collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = collection_items.saved_item_id
        AND si.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_items_update_owner" ON collection_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "collection_items_delete_owner" ON collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

-- ==========================================
-- 9. DIGESTS
-- ==========================================
CREATE POLICY "digests_select_owner" ON digests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "digests_insert_owner" ON digests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "digests_update_owner" ON digests
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "digests_delete_owner" ON digests
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 10. DIGEST SETTINGS
-- ==========================================
CREATE POLICY "digest_settings_select_owner" ON digest_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "digest_settings_insert_owner" ON digest_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "digest_settings_update_owner" ON digest_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "digest_settings_delete_owner" ON digest_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 11. CHAT THREADS
-- ==========================================
CREATE POLICY "chat_threads_select_owner" ON chat_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_threads_insert_owner" ON chat_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_threads_update_owner" ON chat_threads
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_threads_delete_owner" ON chat_threads
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 12. CHAT MESSAGES
-- Must belong to user and thread owned by user
-- ==========================================
CREATE POLICY "chat_messages_select_owner" ON chat_messages
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND ct.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_owner" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND ct.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_update_owner" ON chat_messages
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND ct.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_delete_owner" ON chat_messages
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND ct.user_id = auth.uid()
    )
  );

-- ==========================================
-- 13. SUBSCRIPTIONS
-- ==========================================
CREATE POLICY "subscriptions_select_owner" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_owner" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_owner" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 14. SYNC JOBS & PROCESSING JOBS
-- ==========================================
CREATE POLICY "sync_jobs_owner_all" ON sync_jobs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "processing_jobs_owner_all" ON processing_jobs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
