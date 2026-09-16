-- Recallly: Auth User Profile Lifecycle & Onboarding Migration
-- Migration: 20260915000003_auth_profiles_trigger.sql
-- Adds onboarding tracking and resilient profile provisioning trigger for Supabase Auth

-- 1. Add onboarding_completed_at timestamp to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create index on onboarding_completed_at for analytics / queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed_at);

-- 3. Idempotent trigger function to create profile whenever a user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract display name from metadata or email username
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Member'
  );

  -- Extract avatar if provided by OAuth provider (Google, etc.)
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    display_name,
    avatar_url,
    timezone,
    onboarding_completed_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    v_display_name,
    v_avatar_url,
    'UTC',
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 4. Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Helper function for a user to complete their onboarding safely
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  p_display_name TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET
    display_name = COALESCE(NULLIF(p_display_name, ''), display_name),
    timezone = COALESCE(NULLIF(p_timezone, ''), timezone),
    onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
    updated_at = NOW()
  WHERE user_id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;
