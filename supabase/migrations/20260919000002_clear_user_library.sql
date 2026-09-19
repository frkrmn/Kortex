-- Atomic library reset. The caller identity is read from the verified JWT;
-- no user identifier is accepted as a function argument.
CREATE OR REPLACE FUNCTION public.clear_my_library()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.job_queue WHERE user_id = caller_id;
  DELETE FROM public.email_deliveries WHERE user_id = caller_id;
  DELETE FROM public.sync_jobs WHERE user_id = caller_id;
  DELETE FROM public.processing_jobs WHERE user_id = caller_id;
  DELETE FROM public.connected_accounts WHERE user_id = caller_id;
  DELETE FROM public.chat_threads WHERE user_id = caller_id;
  DELETE FROM public.digests WHERE user_id = caller_id;
  DELETE FROM public.digest_settings WHERE user_id = caller_id;
  DELETE FROM public.collections WHERE user_id = caller_id;
  DELETE FROM public.saved_items WHERE user_id = caller_id;
  DELETE FROM public.topics WHERE user_id = caller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_my_library() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_library() TO authenticated;
