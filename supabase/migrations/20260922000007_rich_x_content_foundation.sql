-- Persist rich fields already returned by the official X bookmarks request.
-- The function remains service-role only and preserves existing ownership,
-- idempotency, processing queue, and content lifecycle behavior.
CREATE OR REPLACE FUNCTION import_x_saved_item_unmetered(
  p_user_id uuid, p_external_id text, p_row jsonb, p_sync_job_id uuid
) RETURNS TABLE(imported boolean, item_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing uuid;
  v_history boolean;
  v_id uuid;
  v_claims jsonb := '{}'::jsonb;
  v_claims_raw text;
  v_media jsonb;
BEGIN
  v_claims_raw := current_setting('request.jwt.claims', true);
  BEGIN
    IF v_claims_raw IS NOT NULL AND btrim(v_claims_raw) <> '' THEN
      v_claims := v_claims_raw::jsonb;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_claims := '{}'::jsonb;
  END;

  IF v_claims->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_external_id IS NULL OR p_external_id = '' OR length(p_external_id) > 200 OR p_row->>'content' IS NULL THEN
    RAISE EXCEPTION 'invalid import';
  END IF;
  SELECT id INTO v_existing FROM saved_items
    WHERE user_id=p_user_id AND source IN ('twitter','x') AND external_id=p_external_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN QUERY SELECT false, v_existing; RETURN; END IF;
  SELECT EXISTS (SELECT 1 FROM import_history WHERE user_id=p_user_id AND provider='twitter' AND external_id=p_external_id) INTO v_history;
  v_media := CASE WHEN jsonb_typeof(p_row->'media') = 'array' THEN p_row->'media' ELSE '[]'::jsonb END;
  INSERT INTO saved_items(
    user_id,source,external_id,content,url,author_id,author_name,author_username,
    author_avatar_url,media,published_at,saved_at,metadata,external_content_status
  ) VALUES (
    p_user_id,'twitter',p_external_id,p_row->>'content',p_row->>'url',p_row->>'author_id',p_row->>'author_name',
    p_row->>'author_username',p_row->>'author_avatar_url',v_media,NULLIF(p_row->>'published_at','')::timestamptz,
    now(),COALESCE(p_row->'metadata','{}'::jsonb),'available'
  ) RETURNING id INTO v_id;
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

REVOKE ALL ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) FROM anon;
REVOKE ALL ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION import_x_saved_item_unmetered(uuid,text,jsonb,uuid) TO service_role;
