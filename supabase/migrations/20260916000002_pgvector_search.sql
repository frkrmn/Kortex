-- Recallly: pgvector & Hybrid Search Migration
-- Migration: 20260916000002_pgvector_search.sql
-- Enables vector extension, provisions saved_item_embeddings,
-- creates full-text search tsvector indexes, and defines secure user-isolated search functions.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. DEDICATED VECTOR STORAGE TABLE
-- Stores dense vector embeddings (768 dimensions for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS saved_item_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_item_id UUID NOT NULL REFERENCES saved_items(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'text-embedding-004',
  embedding_version TEXT NOT NULL DEFAULT 'v1',
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_saved_item_embeddings_item_version UNIQUE(saved_item_id, embedding_version)
);

CREATE TRIGGER trg_saved_item_embeddings_updated_at
  BEFORE UPDATE ON saved_item_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 3. INDEXES FOR EMBEDDINGS
-- User isolation index
CREATE INDEX IF NOT EXISTS idx_saved_item_embeddings_user_id
  ON saved_item_embeddings(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_item_embeddings_saved_item_id
  ON saved_item_embeddings(saved_item_id);

-- HNSW Vector Index for fast approximate cosine nearest neighbor search
-- Cosine distance operator is <=>
CREATE INDEX IF NOT EXISTS idx_saved_item_embeddings_hnsw
  ON saved_item_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. ROW LEVEL SECURITY ON EMBEDDINGS
ALTER TABLE saved_item_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embeddings"
  ON saved_item_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
  ON saved_item_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings"
  ON saved_item_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
  ON saved_item_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- 5. MULTILINGUAL FULL-TEXT SEARCH ON SAVED_ITEMS
-- Add generated search tsvector using the 'simple' parser to preserve terms in Turkish, German, Spanish, English, etc.
ALTER TABLE saved_items
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', COALESCE(author_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(author_username, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(summary, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(content, '')), 'C') ||
    setweight(to_tsvector('simple', array_to_string(COALESCE(keywords, '{}'::text[]), ' ')), 'B')
  ) STORED;

-- GIN Index for fast full-text queries
CREATE INDEX IF NOT EXISTS idx_saved_items_search_tsv
  ON saved_items USING gin(search_tsv);

-- Trigram extension and gin index for resilient substring matching on authors & content
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS idx_saved_items_content_trgm
  ON saved_items USING gin(content gin_trgm_ops);

-- 6. USER-ISOLATED SEMANTIC SEARCH RPC
-- Strictly bounds similarity search to the authenticated caller
CREATE OR REPLACE FUNCTION match_saved_items_semantic(
  query_embedding vector(768),
  match_count INT DEFAULT 40,
  similarity_threshold FLOAT DEFAULT 0.25
)
RETURNS TABLE (
  saved_item_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  -- Strict security guard: require authenticated user
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for semantic search';
  END IF;

  RETURN QUERY
  SELECT
    sie.saved_item_id,
    ROUND((1 - (sie.embedding <=> query_embedding))::numeric, 4)::float AS similarity
  FROM saved_item_embeddings sie
  WHERE sie.user_id = calling_user_id
    AND (1 - (sie.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY sie.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- 7. USER-ISOLATED RELATED ITEMS RPC
-- Finds nearest neighbor bookmarks belonging to the same user
CREATE OR REPLACE FUNCTION match_related_saved_items(
  target_saved_item_id UUID,
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.30
)
RETURNS TABLE (
  saved_item_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  calling_user_id UUID;
  target_embedding vector(768);
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to find related items';
  END IF;

  -- Fetch target item's embedding ensuring it belongs to calling user
  SELECT embedding INTO target_embedding
  FROM saved_item_embeddings
  WHERE saved_item_id = target_saved_item_id
    AND user_id = calling_user_id
  LIMIT 1;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sie.saved_item_id,
    ROUND((1 - (sie.embedding <=> target_embedding))::numeric, 4)::float AS similarity
  FROM saved_item_embeddings sie
  WHERE sie.user_id = calling_user_id
    AND sie.saved_item_id != target_saved_item_id
    AND (1 - (sie.embedding <=> target_embedding)) >= similarity_threshold
  ORDER BY sie.embedding <=> target_embedding ASC
  LIMIT match_count;
END;
$$;
