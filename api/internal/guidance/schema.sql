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

CREATE INDEX IF NOT EXISTS idx_legal_corpus_chunks_embedding
  ON legal_corpus_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
