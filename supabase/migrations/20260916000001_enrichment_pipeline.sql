-- Recallly: AI Bookmark Enrichment Pipeline Migration
-- Migration: 20260916000001_enrichment_pipeline.sql
-- Adds enrichment tracking fields to saved_items and provisions the ai_usage table

-- 1. ENRICHMENT FIELDS ON SAVED_ITEMS
ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'not_processed'
    CHECK (enrichment_status IN ('not_processed', 'pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_version TEXT;

-- Index for querying pending/processing enrichment jobs
CREATE INDEX IF NOT EXISTS idx_saved_items_user_enrichment_status
  ON saved_items(user_id, enrichment_status);

-- 2. AI USAGE TABLE
-- Records token metrics, models, and cost estimates for all AI enrichment operations
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_item_id UUID REFERENCES saved_items(id) ON DELETE SET NULL,
  operation TEXT NOT NULL, -- e.g. 'enrichment', 'summarize', 'classification'
  provider TEXT NOT NULL,  -- 'gemini', 'openai', 'anthropic'
  model TEXT NOT NULL,     -- e.g. 'gemini-3.8-flash', 'gpt-4o-mini'
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0.000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for AI usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_saved_item_id ON ai_usage(saved_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at DESC);

-- 3. RLS POLICIES FOR AI USAGE
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role or backend can insert AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
