-- GRM-125: require both sides of writable relationships to belong to the caller.
-- This migration only replaces RLS policies; it does not rewrite existing data.

DROP POLICY IF EXISTS "collection_items_update_owner" ON collection_items;
CREATE POLICY "collection_items_update_owner" ON collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
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

DROP POLICY IF EXISTS "saved_item_topics_insert_owner" ON saved_item_topics;
CREATE POLICY "saved_item_topics_insert_owner" ON saved_item_topics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = saved_item_topics.topic_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "saved_item_topics_update_owner" ON saved_item_topics;
CREATE POLICY "saved_item_topics_update_owner" ON saved_item_topics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_topics.saved_item_id
        AND si.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM topics t
      WHERE t.id = saved_item_topics.topic_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own embeddings" ON saved_item_embeddings;
CREATE POLICY "Users can insert their own embeddings"
  ON saved_item_embeddings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_embeddings.saved_item_id
        AND si.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own embeddings" ON saved_item_embeddings;
CREATE POLICY "Users can update their own embeddings"
  ON saved_item_embeddings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM saved_items si
      WHERE si.id = saved_item_embeddings.saved_item_id
        AND si.user_id = auth.uid()
    )
  );
