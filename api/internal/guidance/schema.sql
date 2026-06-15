CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS legal_corpus_sources (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  publisher TEXT NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  sha256 TEXT NOT NULL,
  license_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_corpus_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES legal_corpus_sources(id),
  jurisdiction TEXT NOT NULL,
  title TEXT NOT NULL,
  statute_reference TEXT NOT NULL,
  source_url TEXT NOT NULL,
  effective_at DATE,
  verified_at TIMESTAMPTZ NOT NULL,
  chunk_text TEXT NOT NULL,
  token_count INTEGER NOT NULL CHECK (token_count > 0),
  embedding_model TEXT NOT NULL,
  embedding vector(3072) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_corpus_chunks_jurisdiction
  ON legal_corpus_chunks(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_legal_corpus_chunks_reference
  ON legal_corpus_chunks(statute_reference);

-- NOTE: no ANN (ivfflat/hnsw) index on `embedding`. pgvector's ivfflat and hnsw
-- index types cap at 2000 dimensions, but gemini-embedding-001 produces 3072-dim
-- vectors, so an ANN index cannot be built on the `vector(3072)` column. Retrieval
-- (rag.go) uses an EXACT cosine scan `ORDER BY embedding <=> $1::vector`, which is
-- correct and sub-millisecond at corpus scale (tens–thousands of chunks). If the
-- corpus ever grows large enough to need ANN, switch the column to `halfvec(3072)`
-- (hnsw supports up to 4000 dims via halfvec_cosine_ops) and cast in both the index
-- and the query. Until then, the exact scan is the right call.
