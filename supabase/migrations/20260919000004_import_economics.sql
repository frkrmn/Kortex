-- Import economics. All writes are service-role-only RPCs; authenticated clients have read-only wallet access.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
CREATE TABLE import_legacy_users (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
INSERT INTO import_legacy_users(user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
CREATE TABLE credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_credits integer NOT NULL DEFAULT 0 CHECK (available_credits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('signup','migration','monthly','trial','purchase','support','refund')),
  quantity integer NOT NULL CHECK (quantity > 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0 AND remaining_quantity <= quantity),
  idempotency_key text NOT NULL UNIQUE,
  reference_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_grants_spend_idx ON credit_grants(user_id, expires_at, created_at) WHERE remaining_quantity > 0;
CREATE TABLE credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id uuid REFERENCES credit_grants(id),
  type text NOT NULL CHECK (type IN ('grant','purchase','monthly_allowance','import_consumption','refund','adjustment','expiration')),
  quantity integer NOT NULL CHECK (quantity > 0),
  balance_delta integer NOT NULL CHECK (balance_delta <> 0),
  source text NOT NULL,
  reference_type text,
  reference_id text,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_created_idx ON credit_ledger(user_id, created_at DESC);
CREATE FUNCTION prevent_credit_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'credit ledger is append-only'; END $$;
CREATE TRIGGER credit_ledger_append_only BEFORE UPDATE OR DELETE ON credit_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_credit_ledger_mutation();
CREATE TABLE import_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  saved_item_id uuid,
  first_imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider, external_id)
);
-- Deleting a bookmark leaves its history. Reimport is free, but still requires an available wallet to initiate an X read.
INSERT INTO import_history(user_id, provider, external_id, saved_item_id)
SELECT user_id, 'twitter', external_id, id FROM saved_items
WHERE source IN ('twitter','x') AND external_id IS NOT NULL ON CONFLICT DO NOTHING;

CREATE TABLE provider_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL,
  operation text NOT NULL,
  resource_type text NOT NULL,
  resources_read integer NOT NULL CHECK (resources_read >= 0),
  requests_made integer NOT NULL CHECK (requests_made > 0),
  estimated_unit_cost numeric(12,6) NOT NULL CHECK (estimated_unit_cost >= 0),
  estimated_cost numeric(14,6) NOT NULL CHECK (estimated_cost >= 0),
  pricing_version text NOT NULL,
  provider_request_id text,
  sync_job_id uuid REFERENCES sync_jobs(id) ON DELETE SET NULL,
  reservation_id uuid UNIQUE,
  imported_items integer NOT NULL DEFAULT 0 CHECK (imported_items >= 0),
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provider_usage_provider_month_idx ON provider_usage_events(provider, occurred_at);
CREATE INDEX provider_usage_user_month_idx ON provider_usage_events(user_id, provider, occurred_at);
CREATE TABLE provider_budget_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  estimated_cost numeric(14,6) NOT NULL CHECK (estimated_cost > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE provider_usage_events ADD CONSTRAINT provider_usage_reservation_fk
  FOREIGN KEY (reservation_id) REFERENCES provider_budget_reservations(id) ON DELETE SET NULL;
CREATE TABLE credit_refund_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  stripe_object_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_pack_purchases (
  stripe_session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_key text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_total_minor integer NOT NULL CHECK (amount_total_minor >= 0),
  currency text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL CHECK (event_name IN ('import_credits_viewed','import_pack_selected','import_checkout_started',
    'import_pack_purchased','import_started','import_completed','import_credit_limit_reached','sync_zero_yield')),
  properties jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_analytics_name_created_idx ON import_analytics_events(event_name,created_at DESC);
CREATE INDEX provider_budget_active_idx ON provider_budget_reservations(provider, created_at) WHERE completed_at IS NULL;

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_legacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_refund_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY credit_balances_read_own ON credit_balances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY credit_grants_read_own ON credit_grants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY credit_ledger_read_own ON credit_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON credit_balances, credit_grants, credit_ledger, import_history, provider_usage_events FROM anon, authenticated;
REVOKE ALL ON import_legacy_users FROM anon, authenticated;
REVOKE ALL ON provider_budget_reservations FROM anon, authenticated;
REVOKE ALL ON credit_refund_reviews FROM anon, authenticated;
REVOKE ALL ON import_pack_purchases FROM anon, authenticated;
REVOKE ALL ON import_analytics_events FROM anon, authenticated;
GRANT SELECT ON credit_balances, credit_grants, credit_ledger TO authenticated;

CREATE FUNCTION grant_import_credits(p_user_id uuid, p_quantity integer, p_source text, p_key text,
  p_reference_id text DEFAULT NULL, p_expires_at timestamptz DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance integer; v_grant uuid; v_key_user uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000 OR p_key IS NULL OR length(p_key) < 8
     OR p_expires_at IS NOT NULL
     OR p_source NOT IN ('signup','migration','monthly','trial','purchase','support','refund') THEN
    RAISE EXCEPTION 'invalid credit grant';
  END IF;
  INSERT INTO credit_balances(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  SELECT available_credits INTO v_balance FROM credit_balances WHERE user_id = p_user_id FOR UPDATE;
  SELECT user_id INTO v_key_user FROM credit_grants WHERE idempotency_key = p_key;
  IF v_key_user IS NOT NULL THEN
    IF v_key_user <> p_user_id THEN RAISE EXCEPTION 'idempotency key belongs to another user'; END IF;
    RETURN v_balance;
  END IF;
  INSERT INTO credit_grants(user_id, source, quantity, remaining_quantity, idempotency_key, reference_id, expires_at)
  VALUES (p_user_id, p_source, p_quantity, p_quantity, p_key, p_reference_id, p_expires_at) RETURNING id INTO v_grant;
  UPDATE credit_balances SET available_credits = available_credits + p_quantity, updated_at = now()
  WHERE user_id = p_user_id RETURNING available_credits INTO v_balance;
  INSERT INTO credit_ledger(user_id, grant_id, type, quantity, balance_delta, source, reference_type, reference_id, idempotency_key)
  VALUES (p_user_id, v_grant, CASE WHEN p_source='purchase' THEN 'purchase' WHEN p_source='monthly' THEN 'monthly_allowance' WHEN p_source='refund' THEN 'refund' WHEN p_source='support' THEN 'adjustment' ELSE 'grant' END,
    p_quantity, p_quantity, p_source, p_source, p_reference_id, p_key);
  RETURN v_balance;
END $$;

CREATE FUNCTION import_x_saved_item(p_user_id uuid, p_external_id text, p_row jsonb, p_sync_job_id uuid)
RETURNS TABLE(imported boolean, charged boolean, item_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid; v_history boolean; v_grant_id uuid; v_id uuid; v_balance integer;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_external_id IS NULL OR p_external_id = '' OR length(p_external_id) > 200 OR p_row->>'content' IS NULL THEN
    RAISE EXCEPTION 'invalid import';
  END IF;
  -- Serialize all credit writes and same-user imports on the wallet row.
  INSERT INTO credit_balances(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  SELECT available_credits INTO v_balance FROM credit_balances WHERE user_id=p_user_id FOR UPDATE;
  SELECT id INTO v_existing FROM saved_items WHERE user_id=p_user_id AND source IN ('twitter','x') AND external_id=p_external_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN QUERY SELECT false, false, v_existing; RETURN; END IF;
  SELECT EXISTS (SELECT 1 FROM import_history WHERE user_id=p_user_id AND provider='twitter' AND external_id=p_external_id) INTO v_history;
  IF NOT v_history AND v_balance < 1 THEN RAISE EXCEPTION 'import credits exhausted' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO saved_items(user_id,source,external_id,content,url,author_id,author_name,author_username,author_avatar_url,published_at,saved_at,metadata)
  VALUES (p_user_id,'twitter',p_external_id,p_row->>'content',p_row->>'url',p_row->>'author_id',p_row->>'author_name',
    p_row->>'author_username',p_row->>'author_avatar_url',NULLIF(p_row->>'published_at','')::timestamptz,now(),COALESCE(p_row->'metadata','{}'::jsonb))
  RETURNING id INTO v_id;
  IF v_history THEN
    UPDATE import_history SET saved_item_id=v_id WHERE user_id=p_user_id AND provider='twitter' AND external_id=p_external_id;
  ELSE
    INSERT INTO import_history(user_id,provider,external_id,saved_item_id) VALUES(p_user_id,'twitter',p_external_id,v_id);
    SELECT id INTO v_grant_id FROM credit_grants
    WHERE user_id=p_user_id AND remaining_quantity>0 AND (expires_at IS NULL OR expires_at>now())
    ORDER BY expires_at ASC NULLS LAST, created_at ASC LIMIT 1 FOR UPDATE;
    IF v_grant_id IS NULL THEN RAISE EXCEPTION 'import credits exhausted' USING ERRCODE = 'P0001'; END IF;
    UPDATE credit_grants SET remaining_quantity=remaining_quantity-1 WHERE id=v_grant_id;
    UPDATE credit_balances SET available_credits=available_credits-1,updated_at=now() WHERE user_id=p_user_id;
    INSERT INTO credit_ledger(user_id,grant_id,type,quantity,balance_delta,source,reference_type,reference_id,idempotency_key,metadata)
    VALUES(p_user_id,v_grant_id,'import_consumption',1,-1,'x','saved_item',v_id::text,
      'x-import:'||p_user_id||':'||p_external_id,jsonb_build_object('sync_job_id',p_sync_job_id));
  END IF;
  -- Preserve the existing Phase 12 enrichment queue. AI retries never consume another Import Credit.
  INSERT INTO processing_jobs(user_id,saved_item_id,job_type,status) VALUES(p_user_id,v_id,'enrichment','pending');
  INSERT INTO job_queue(user_id,type,status,priority,metadata)
  VALUES(p_user_id,'enrichment','pending',10,jsonb_build_object('savedItemId',v_id,'source','x-import'));
  RETURN QUERY SELECT true, NOT v_history, v_id;
END $$;

REVOKE ALL ON FUNCTION grant_import_credits(uuid,integer,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION import_x_saved_item(uuid,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_import_credits(uuid,integer,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION import_x_saved_item(uuid,text,jsonb,uuid) TO service_role;

-- Serialize provider reservations for the month. Unsettled reservations remain counted until support resolves them.
CREATE FUNCTION reserve_provider_budget(p_user_id uuid, p_provider text, p_estimated_cost numeric,
  p_global_limit numeric, p_user_limit numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz := date_trunc('month', now()); v_global numeric; v_user numeric; v_id uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
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
  INSERT INTO provider_budget_reservations(user_id,provider,estimated_cost) VALUES(p_user_id,p_provider,p_estimated_cost) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE FUNCTION settle_provider_budget(p_reservation_id uuid, p_sync_job_id uuid, p_resources integer,
  p_imported integer, p_unit_cost numeric, p_pricing_version text, p_request_id text DEFAULT NULL,
  p_count_estimated boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_res provider_budget_reservations%ROWTYPE;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_res FROM provider_budget_reservations WHERE id=p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation missing'; END IF;
  IF v_res.completed_at IS NOT NULL THEN RETURN; END IF;
  IF p_resources<0 OR p_imported<0 OR p_unit_cost<0 OR p_resources*p_unit_cost>v_res.estimated_cost THEN RAISE EXCEPTION 'invalid provider usage'; END IF;
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
