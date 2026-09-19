-- Pending X authorization attempts are server-only. The raw state and browser
-- binding cookie are never stored; both are compared by SHA-256 digest.
CREATE TABLE IF NOT EXISTS public.x_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  browser_hash TEXT NOT NULL,
  code_verifier_encrypted TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_x_oauth_states_expires_at ON public.x_oauth_states(expires_at);

ALTER TABLE public.x_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.x_oauth_states FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.x_oauth_states TO service_role;
-- Service role inserts and atomically consumes a state with DELETE RETURNING.
