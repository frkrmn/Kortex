-- Keep OAuth credentials private even from the account owner in PostgREST.
-- RLS controls rows; column grants control which fields a browser may read.
REVOKE ALL ON TABLE public.connected_accounts FROM anon, authenticated;

GRANT SELECT (
  id, user_id, provider, provider_user_id, username, token_expires_at,
  last_sync_at, last_successful_sync_at, sync_status, metadata,
  created_at, updated_at, next_sync_at, reauthorization_required,
  last_error_code, last_error_message
) ON public.connected_accounts TO authenticated;

GRANT INSERT (
  user_id, provider, username, sync_status, metadata
) ON public.connected_accounts TO authenticated;

GRANT UPDATE (
  username, sync_status, metadata
) ON public.connected_accounts TO authenticated;

-- The view must enforce the caller's RLS policies, rather than its owner's.
ALTER VIEW public.connected_accounts_safe SET (security_invoker = true);
REVOKE ALL ON public.connected_accounts_safe FROM anon, authenticated;
GRANT SELECT ON public.connected_accounts_safe TO authenticated;
