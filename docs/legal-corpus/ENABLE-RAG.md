# Enabling the Legal RAG Corpus (CR-10) in Production

**Status as of 2026-06-15: ✅ ENABLED / LIVE in production.** `RAG_DATABASE_URL` is set on the
`finalwishes-api` Cloud Run service (confirmed in the live service env), the startup log shows
`Legal RAG corpus retriever initialized`, and the Shepherd grounds legal Q&A in the 64-chunk
corpus (cites the corpus id per claim, refuses out-of-corpus legal questions, and always states
"informational guidance, not legal advice — consult a licensed attorney"). Both gates below were
cleared (Gate 1 owner-accepted 2026-06-15 — "we go on the legal"; Gate 2 applied). This doc is
kept as the enablement record + re-ingest/maintenance runbook; the steps below are **already done**.

## What is already done

- **Database:** `legal_rag` on Cloud SQL instance `finalwishes-pii-vault`
  (connection `finalwishes-prod:us-central1:finalwishes-pii-vault`), isolated from the
  encrypted `pii_vault` database.
- **Schema:** applied from `api/internal/guidance/schema.sql` (pgvector extension + the two
  `legal_corpus_*` tables). No ANN index — exact cosine scan (see the note in `schema.sql`).
- **Loaded:** 7 sources / 64 chunks (3 IL, 1 MD, 3 MN), every chunk embedded with
  `gemini-embedding-001` (3072-dim). Verified: 64/64 embeddings present, self-similarity and
  nearest-neighbour retrieval correct (IL statutes cluster, cosine 0.83–0.85).
- Source of the text: `docs/legal-corpus/launch-states.json` (verbatim from official `.gov`
  publishers, per-chunk citations). Re-ingest is idempotent (`go run ./api/cmd/corpus-ingest
-manifest docs/legal-corpus/launch-states.json`).

## Gate 1 — Legal review (owner / counsel) — ✅ CLEARED 2026-06-15

The corpus text was **machine-captured** (deterministic HTML→text extraction, no LLM in the
text path) and is **verbatim** from official sources, but `verified_at` is a machine-capture
stamp, **not** a human legal sign-off. Before the Shepherd cites this to grieving families,
counsel should spot-check the captured text against the cited `source_url`s. Nothing below
should run until this gate is cleared.

## Gate 2 — Enable RAG on the Cloud Run service — ✅ APPLIED (env set, live)

The Cloud Run service `finalwishes-api` is already attached to the Cloud SQL instance (it uses
the same instance for the vault). Enabling RAG is just two env vars (`GOOGLE_CLOUD_PROJECT` is
already set). Set `RAG_DATABASE_URL` to the in-VPC socket DSN and bind the DB password from
Secret Manager:

```bash
gcloud run services update finalwishes-api \
  --project finalwishes-prod --region us-central1 \
  --update-secrets RAG_DB_PASSWORD=vault-db-password:latest \
  --update-env-vars '^@^RAG_DATABASE_URL=host=/cloudsql/finalwishes-prod:us-central1:finalwishes-pii-vault user=vault_admin dbname=legal_rag sslmode=disable'
```

> Note: pass the password to the API via the bound `RAG_DB_PASSWORD` secret and have
> `main.go` compose it into the DSN (preferred — keeps the secret out of the env-var string),
> **or** inline `password=...` from the secret if wiring the compose step is deferred. Do not
> hard-code the password in the workflow or the service config.

The Cloud SQL instance must be attached to the service (`--add-cloudsql-instances
finalwishes-prod:us-central1:finalwishes-pii-vault`) — it already is for the vault; confirm with
`gcloud run services describe finalwishes-api --format='value(spec.template.metadata.annotations)'`.

## Verify after enabling

- `GET /health` → 200, and the startup log shows the RAG enabled line (not "disabled").
- Exercise a Shepherd query that should hit a loaded statute (e.g. an Illinois will-signing
  question) and confirm it cites `755 ILCS 5/4-3`.
- Run the probe set (`docs/legal-corpus/probe-set.json`) for the CR-10 GA evidence doc.

## Local re-ingest / maintenance (how the load was done)

```bash
# Cloud SQL Auth Proxy (SA-authenticated), then ingest:
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json \
  cloud-sql-proxy --port 5433 finalwishes-prod:us-central1:finalwishes-pii-vault &
cd api && GOOGLE_CLOUD_PROJECT=finalwishes-prod \
  RAG_DATABASE_URL="host=127.0.0.1 port=5433 user=vault_admin password=<vault-db-password> dbname=legal_rag sslmode=disable" \
  go run ./cmd/corpus-ingest -manifest ../docs/legal-corpus/launch-states.json
```

Refs: ADR-044 (Legal RAG Corpus), CR-10.
