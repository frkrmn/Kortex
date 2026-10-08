-- PostgREST exposes request claims as one JSON object. Keep both provider
-- budget RPCs restricted to service_role while accepting that representation.
CREATE OR REPLACE FUNCTION reserve_provider_budget(
  p_user_id uuid,
  p_provider text,
  p_estimated_cost numeric,
  p_global_limit numeric,
  p_user_limit numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start timestamptz := date_trunc('month', now());
  v_global numeric;
  v_user numeric;
  v_id uuid;
  v_claims jsonb := '{}'::jsonb;
  v_claims_raw text;
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
  IF p_estimated_cost <= 0 OR p_global_limit <= 0 OR p_user_limit <= 0 THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('provider-budget:'||p_provider||':'||v_start::text));
  SELECT COALESCE(sum(estimated_cost),0) INTO v_global FROM provider_usage_events
    WHERE provider=p_provider AND occurred_at>=v_start;
  SELECT v_global + COALESCE(sum(estimated_cost),0) INTO v_global FROM provider_budget_reservations
    WHERE provider=p_provider AND completed_at IS NULL AND created_at>=v_start;
  SELECT COALESCE(sum(estimated_cost),0) INTO v_user FROM provider_usage_events
    WHERE provider=p_provider AND user_id=p_user_id AND occurred_at>=v_start;
  SELECT v_user + COALESCE(sum(estimated_cost),0) INTO v_user FROM provider_budget_reservations
    WHERE provider=p_provider AND user_id=p_user_id AND completed_at IS NULL AND created_at>=v_start;
  IF v_global+p_estimated_cost>p_global_limit OR v_user+p_estimated_cost>p_user_limit THEN RETURN NULL; END IF;
  INSERT INTO provider_budget_reservations(user_id,provider,estimated_cost)
    VALUES(p_user_id,p_provider,p_estimated_cost) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION settle_provider_budget(
  p_reservation_id uuid,
  p_sync_job_id uuid,
  p_resources integer,
  p_imported integer,
  p_unit_cost numeric,
  p_pricing_version text,
  p_request_id text DEFAULT NULL,
  p_count_estimated boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res provider_budget_reservations%ROWTYPE;
  v_claims jsonb := '{}'::jsonb;
  v_claims_raw text;
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
  SELECT * INTO v_res FROM provider_budget_reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing'; END IF;
  IF v_res.completed_at IS NOT NULL THEN RETURN; END IF;
  IF p_resources<0 OR p_imported<0 OR p_unit_cost<0 OR p_resources*p_unit_cost>v_res.estimated_cost THEN
    RAISE EXCEPTION 'invalid provider usage';
  END IF;
  INSERT INTO provider_usage_events(user_id,provider,operation,resource_type,resources_read,requests_made,
    imported_items,estimated_unit_cost,estimated_cost,pricing_version,provider_request_id,sync_job_id,reservation_id,metadata)
  VALUES(v_res.user_id,v_res.provider,'bookmarks','post',p_resources,1,p_imported,p_unit_cost,p_resources*p_unit_cost,
    p_pricing_version,p_request_id,p_sync_job_id,p_reservation_id,
    jsonb_build_object('zero_yield',p_resources>0 AND p_imported=0 AND NOT p_count_estimated,'count_estimated',p_count_estimated));
  UPDATE provider_budget_reservations SET completed_at=now() WHERE id=p_reservation_id;
END $$;

REVOKE ALL ON FUNCTION reserve_provider_budget(uuid,text,numeric,numeric,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION settle_provider_budget(uuid,uuid,integer,integer,numeric,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_provider_budget(uuid,text,numeric,numeric,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION settle_provider_budget(uuid,uuid,integer,integer,numeric,text,text,boolean) TO service_role;
