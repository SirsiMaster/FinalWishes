# The Shepherd — AI Guidance Engine

> Estate completion scoring with optional AI guidance and legal-corpus retrieval.

## Architecture

**v1 (deterministic):** Counts Firestore subcollections across 8 areas (assets, heirs, executors, documents, lockbox, memoirs, directives, capsules) plus 3 governance checks. Returns a completion percentage, step list, and next action.

**v2 (Genkit/Gemini):** Wraps v1 scores with AI-generated insights via Firebase Genkit + Gemini 2.0 Flash. Three flows:
- `GenerateInsight` — personalized 1-2 sentence guidance based on completion state
- `GenerateObituary` — compassionate obituary draft from user-provided details
- `GenerateSuggestions` — 3-5 actionable next steps as JSON array

**v3 (sirsi-ai Shepherd):** Uses the Sirsi AI router for Claude-first chat, Sonnet obituary drafting, and lightweight suggestion generation.

**v4 (legal RAG foundation):** Legal-topic chat can retrieve official corpus chunks from PostgreSQL + pgvector before generation. Responses include a `citations` array. If the retriever is configured but no approved source supports the question, Shepherd abstains instead of answering from memory.

**Fallback:** If `GEMINI_API_KEY` is missing or Genkit panics, the handler falls back to deterministic mode silently. AI is always optional.

## Configuration

| Env Var | Description | Required |
|---------|-------------|----------|
| `GEMINI_API_KEY` | Google AI API key for Gemini Flash | No |
| `RAG_DATABASE_URL` | PostgreSQL DSN for the non-PII legal corpus database | No |
| `VERTEX_LOCATION` | Vertex AI region for `gemini-embedding-001`; defaults to `us-central1` | No |

## Legal Corpus

- ADR: `docs/ADR-044-LEGAL-RAG-CORPUS.md`
- Schema: `api/internal/guidance/schema.sql`
- Manifest: `docs/legal-corpus/manifest.md`
- Probe set: `docs/legal-corpus/probe-set.json`

The corpus database must not be the ADR-037 PII vault. It stores public legal text, source provenance, and embeddings only.

## Scoring

11 steps across 4 categories: Foundation (assets, heirs, executors), Vault (documents x2), Security (lockbox), Legacy (memoirs, directives, capsules, obituary, settings).

## Known Limitations

- Scoring is snapshot-based (not cached) — recalculated on every request
- Genkit initialization can panic; recovered via `defer/recover`
- CR-10 is not `MET` until authoritative corpus ingestion and held-out hallucination testing are complete
