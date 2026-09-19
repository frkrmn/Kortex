-- Recallly: Phase 11 Billing, Plans, Entitlements & Usage Limits Migration
-- Migration: 20260918000001_phase11_billing_entitlements.sql
-- Adds provider_price_id, trial tracking to subscriptions, creates billing_events and usage_events tables,
-- and tightens RLS to enforce server-authoritative billing.

-- 1. EXTEND SUBSCRIPTIONS TABLE
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly'));

-- Relax or update status check constraint for full Stripe lifecycle support
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'));

-- 2. BILLING EVENTS (Stripe Webhook Idempotency & Audit Log)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  error TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_provider_event_id ON billing_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at DESC);

-- 3. USAGE EVENTS (Non-destructive Event-Based Metering)
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK (metric IN ('ask', 'enrichment', 'digest', 'embedding', 'sync')),
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  billing_period_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_metric_period 
  ON usage_events(user_id, metric, billing_period_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created 
  ON usage_events(user_id, created_at DESC);

-- 4. ROW LEVEL SECURITY REINFORCEMENT
-- In accordance with Rule #55: Users can read their own billing & usage state,
-- but MUST NOT tamper with plan, status, or usage counters through the browser Supabase client.
-- Critical writes occur server-side with service role.

-- Subscriptions: Drop client-side write permissions if they existed
DROP POLICY IF EXISTS "subscriptions_insert_owner" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_owner" ON subscriptions;

-- Ensure select policy exists
DROP POLICY IF EXISTS "subscriptions_select_owner" ON subscriptions;
CREATE POLICY "subscriptions_select_owner" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Billing Events: Strictly server-side (Service Role only)
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
-- No public or authenticated policies are created for billing_events, keeping it private to service role.

-- Usage Events: Users can view their own consumption, writes are server-only
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_events_select_owner" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies for authenticated users; service role handles increments.
