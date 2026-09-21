-- X bookmark history and content-lifecycle state. The bookmark window is a
-- server configuration value; it is not a limit on a user's Recallly library.
ALTER TABLE connected_accounts
  ADD COLUMN IF NOT EXISTS initial_import_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS initial_import_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS initial_import_count integer NOT NULL DEFAULT 0 CHECK (initial_import_count >= 0),
  ADD COLUMN IF NOT EXISTS initial_import_limit integer,
  ADD COLUMN IF NOT EXISTS historical_limit_reached boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ongoing_sync_import_count integer NOT NULL DEFAULT 0 CHECK (ongoing_sync_import_count >= 0);

ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS external_content_status text NOT NULL DEFAULT 'available'
  CHECK (external_content_status IN ('available','unavailable','deleted','restricted','unknown'));
CREATE INDEX IF NOT EXISTS saved_items_external_content_status_idx
  ON saved_items(user_id, source, external_content_status);

-- New X imports intentionally do not consume Import Credits. Existing credit
-- ledger and balances are preserved for other sources/product actions.
CREATE OR REPLACE FUNCTION import_x_saved_item_unmetered(
  p_user_id uuid, p_external_id text, p_row jsonb, p_sync_job_id uuid
) RETURNS TABLE(imported boolean, item_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid; v_history boolean; v_id uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_external_id IS NULL OR p_external_id = '' OR length(p_external_id) > 200 OR p_row->>'content' IS NULL THEN
    RAISE EXCEPTION 'invalid import';
  END IF;
  SELECT id INTO v_existing FROM saved_items
    WHERE user_id=p_user_id AND source IN ('twitter','x') AND external_id=p_external_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN QUERY SELECT false, v_existing; RETURN; END IF;
  SELECT EXISTS (SELECT 1 FROM import_history WHERE user_id=p_user_id AND provider='twitter' AND external_id=p_external_id) INTO v_history;
  INSERT INTO saved_items(user_id,source,external_id,content,url,author_id,author_name,author_username,author_avatar_url,published_at,saved_at,metadata,external_content_status)
  VALUES (p_user_id,'twitter',p_external_id,p_row->>'content',p_row->>'url',p_row->>'author_id',p_row->>'author_name',
    p_row->>'author_username',p_row->>'author_avatar_url',NULLIF(p_row->>'published_at','')::timestamptz,now(),COALESCE(p_row->'metadata','{}'::jsonb),'available')
  RETURNING id INTO v_id;
  IF v_history THEN
    UPDATE import_history SET saved_item_id=v_id WHERE user_id=p_user_id AND provider='twitter' AND external_id=p_external_id;
  ELSE
    INSERT INTO import_history(user_id,provider,external_id,saved_item_id) VALUES(p_user_id,'twitter',p_external_id,v_id);
  END IF;
  INSERT INTO processing_jobs(user_id,saved_item_id,job_type,status) VALUES(p_user_id,v_id,'enrichment','pending');
  INSERT INTO job_queue(user_id,type,status,priority,metadata)
  VALUES(p_user_id,'enrichment','pending',10,jsonb_build_object('savedItemId',v_id,'source','x-import'));
  RETURN QUERY SELECT true, v_id;
END $$;

-- An explicit unavailable response must not leave cached X text or derivatives
-- looking current. Recallly-owned collections, tags, and notes are untouched.
CREATE OR REPLACE FUNCTION mark_x_content_unavailable(p_user_id uuid, p_external_id text, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('unavailable','deleted','restricted','unknown') THEN RAISE EXCEPTION 'invalid availability status'; END IF;
  SELECT id INTO v_item FROM saved_items WHERE user_id=p_user_id AND source IN ('twitter','x') AND external_id=p_external_id;
  IF v_item IS NULL THEN RETURN; END IF;
  UPDATE saved_items SET external_content_status=p_status, content='This post is no longer available on X.', summary=NULL,
    metadata=metadata || jsonb_build_object('x_content_unavailable_at',now(), 'x_content_status',p_status)
  WHERE id=v_item;
  DELETE FROM saved_item_embeddings WHERE saved_item_id=v_item;
END $$;

REVOKE ALL ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mark_x_content_unavailable(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION mark_x_content_unavailable(uuid,text,text) TO service_role;
