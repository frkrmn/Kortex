-- Recallly: Phase 12 Background Automation, Job Queue, Digest Scheduling & Email Delivery Migration
-- Migration: 20260918000002_phase12_background_jobs.sql

-- 1. EXTEND CONNECTED ACCOUNTS
-- Add next_sync_at and reauthorization_required tracking for scheduled background sync
ALTER TABLE connected_accounts 
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reauthorization_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_error_code TEXT,
  ADD COLUMN IF NOT EXISTS last_error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_connected_accounts_next_sync 
  ON connected_accounts(provider, sync_status, next_sync_at)
  WHERE sync_status != 'syncing' AND reauthorization_required = FALSE;

-- 2. EXTEND DIGEST SETTINGS
-- Add last_delivered_at and next_delivery_at for precise timezone-aware scheduling
ALTER TABLE digest_settings
  ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_delivery_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_digest_settings_schedule 
  ON digest_settings(enabled, frequency, next_delivery_at)
  WHERE enabled = TRUE AND frequency != 'off';

-- 3. UNIFIED BACKGROUND JOB QUEUE TABLE
-- Handles atomic claiming (SKIP LOCKED), exponential backoff retries, lease timeouts, and priorities
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'x_sync', 
    'enrichment', 
    'embedding', 
    'digest_generation', 
    'digest_email_delivery', 
    'cleanup'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'running', 
    'completed', 
    'retry_scheduled', 
    'failed', 
    'dead'
  )),
  priority INTEGER NOT NULL DEFAULT 10, -- 100 for manual user requests, 10 for background scheduled, 1 for backfill
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to maintain updated_at on job_queue
CREATE TRIGGER trg_job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Fast index for atomic job claiming (FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_job_queue_claim 
  ON job_queue(status, scheduled_at, priority DESC, created_at ASC)
  WHERE status IN ('pending', 'retry_scheduled');

-- Index for detecting stale leases and running jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_lease 
  ON job_queue(status, lease_expires_at)
  WHERE status = 'running';

-- User lookup index
CREATE INDEX IF NOT EXISTS idx_job_queue_user_id 
  ON job_queue(user_id, status);

-- 4. EMAIL DELIVERIES TABLE (Idempotent digest delivery)
CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_id UUID REFERENCES digests(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'weekly_digest' CHECK (type IN ('weekly_digest', 'system_alert')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'bounced')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_email_deliveries_digest_type UNIQUE (digest_id, type)
);

CREATE TRIGGER trg_email_deliveries_updated_at
  BEFORE UPDATE ON email_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_email_deliveries_user 
  ON email_deliveries(user_id, created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_queue_owner_select" ON job_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_deliveries_owner_select" ON email_deliveries
  FOR SELECT USING (auth.uid() = user_id);
