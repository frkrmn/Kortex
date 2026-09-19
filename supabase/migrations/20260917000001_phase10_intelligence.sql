-- Recallly: Phase 10 Personal Knowledge Intelligence & Rediscovery Migration
-- Migration: 20260917000001_phase10_intelligence.sql
-- Adds rediscovery_events table, digest idempotency constraints, and RLS policies.

-- 1. REDISCOVERY EVENTS TABLE
-- Tracks when items are surfaced to prevent repetitive recommendations
-- and captures lightweight feedback (useful, not_relevant, hide).
CREATE TABLE IF NOT EXISTS rediscovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_item_id UUID NOT NULL REFERENCES saved_items(id) ON DELETE CASCADE,
  surface TEXT NOT NULL CHECK (surface IN ('dashboard', 'digest', 'insights')),
  surfaced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interaction TEXT CHECK (interaction IN ('view', 'click', 'useful', 'not_relevant', 'hide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient candidate scoring and filtering
CREATE INDEX IF NOT EXISTS idx_rediscovery_events_user_item 
  ON rediscovery_events(user_id, saved_item_id);

CREATE INDEX IF NOT EXISTS idx_rediscovery_events_user_surfaced 
  ON rediscovery_events(user_id, surfaced_at DESC);

-- 2. ROW LEVEL SECURITY ON REDISCOVERY EVENTS
ALTER TABLE rediscovery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rediscovery_events_select_owner" ON rediscovery_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rediscovery_events_insert_owner" ON rediscovery_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rediscovery_events_update_owner" ON rediscovery_events
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rediscovery_events_delete_owner" ON rediscovery_events
  FOR DELETE USING (auth.uid() = user_id);

-- 3. DIGEST IDEMPOTENCY
-- Ensure no duplicate digests exist for the exact same user and period boundary
CREATE UNIQUE INDEX IF NOT EXISTS uq_digests_user_period
  ON digests(user_id, period_start, period_end);

-- 4. SEMANTIC TIMESTAMP DOCUMENTATION:
-- saved_items.bookmark_created_at: Original post creation timestamp on source platform (e.g. tweet created_at on X).
-- saved_items.created_at: Recallly database insertion timestamp (when synced/imported into Recallly).
-- Notice: The X API v2 bookmarks endpoint does NOT provide the exact timestamp when a user clicked 'Bookmark'.
-- Therefore, Recallly relies on bookmark_created_at for original publication recency, and created_at for import recency.
