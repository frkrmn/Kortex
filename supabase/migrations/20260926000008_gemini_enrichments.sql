-- Gemini v1 results are separate from the source record. Clients may only read
-- their own results; all writes are performed by the server service role.
ALTER TABLE public.saved_items ADD CONSTRAINT saved_items_id_user_unique UNIQUE (id, user_id);

CREATE TABLE public.saved_item_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_item_id uuid NOT NULL,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'gemini' CHECK (provider = 'gemini'),
  model text NOT NULL DEFAULT 'gemini-3.5-flash-lite',
  schema_version text NOT NULL DEFAULT 'v1',
  prompt_version text NOT NULL DEFAULT 'v1',
  summary text,
  category text CHECK (category IN ('AI','Engineering','Product','Business','Finance','Crypto','Design','Marketing','Career','Science','News','Books','Other')),
  topics text[] NOT NULL DEFAULT '{}',
  key_concepts text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  error_code text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  enriched_at timestamptz,
  CONSTRAINT saved_item_enrichments_owner_fk FOREIGN KEY (saved_item_id, user_id)
    REFERENCES public.saved_items(id, user_id) ON DELETE CASCADE,
  CONSTRAINT saved_item_enrichments_version_unique UNIQUE (saved_item_id, prompt_version, schema_version)
);

CREATE INDEX saved_item_enrichments_user_idx ON public.saved_item_enrichments(user_id);
CREATE INDEX saved_item_enrichments_status_idx ON public.saved_item_enrichments(user_id, status, next_attempt_at);
CREATE INDEX saved_item_enrichments_category_idx ON public.saved_item_enrichments(user_id, category) WHERE status = 'completed';
CREATE INDEX saved_item_enrichments_topics_idx ON public.saved_item_enrichments USING gin(topics);
CREATE TRIGGER trg_saved_item_enrichments_updated_at BEFORE UPDATE ON public.saved_item_enrichments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.saved_item_enrichments ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_item_enrichments_select_owner ON public.saved_item_enrichments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON public.saved_item_enrichments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.saved_item_enrichments TO authenticated;
GRANT ALL ON public.saved_item_enrichments TO service_role;

-- Atomic claim prevents concurrent workers from charging Gemini twice.
CREATE OR REPLACE FUNCTION public.claim_gemini_enrichment(p_user_id uuid, p_max_attempts integer, p_rollout_cap integer)
RETURNS SETOF public.saved_item_enrichments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE claims jsonb;
BEGIN
  BEGIN
    claims := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  EXCEPTION WHEN others THEN
    claims := '{}'::jsonb;
  END;
  IF claims->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF p_rollout_cap IS NULL OR p_rollout_cap < 1 THEN
    RETURN;
  END IF;
  -- Serialize claims across cron and private backfill invocations. Processing
  -- rows count against the cap until completed or explicitly failed.
  PERFORM pg_advisory_xact_lock(hashtext('gemini_enrichment:' || p_user_id::text));
  IF (SELECT count(*) FROM public.saved_item_enrichments
      WHERE user_id = p_user_id AND status IN ('processing', 'completed')) >= p_rollout_cap THEN
    RETURN;
  END IF;
  RETURN QUERY
  UPDATE public.saved_item_enrichments e SET status = 'processing', attempts = e.attempts + 1
  WHERE e.id = (
    SELECT q.id FROM public.saved_item_enrichments q
    WHERE q.user_id = p_user_id AND q.status IN ('pending', 'failed')
      AND q.next_attempt_at <= now() AND q.attempts < LEAST(GREATEST(p_max_attempts, 1), 3)
    ORDER BY q.created_at, q.id FOR UPDATE SKIP LOCKED LIMIT 1
  ) RETURNING e.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_gemini_enrichment(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_gemini_enrichment(uuid, integer, integer) TO service_role;
