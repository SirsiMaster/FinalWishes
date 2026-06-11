# Legal Corpus Manifest

Status: **ingestion pipeline ready** (`api/cmd/corpus-ingest`); authoritative corpus **text sourcing** pending (owner/legal — see Rule 9 below).

## Embeddings

- Model: `gemini-embedding-001`
- Dimensions: 3072
- Source: Google Cloud Vertex AI text embeddings documentation checked on 2026-05-20.
- Rationale: current Google guidance positions this model as the higher-quality successor to the older specialized text embedding models. `text-embedding-005` remains available but is not the CR-10 default.

## Storage

- Database: Cloud SQL PostgreSQL 15 or AlloyDB PostgreSQL.
- Extension: `pgvector`.
- Schema: `api/internal/guidance/schema.sql`.
- Boundary: legal corpus tables must not be stored in the ADR-037 PII vault database. Corpus text is public legal source material, while user/estate facts remain estate-scoped and never enter the corpus index.

## Source Policy

GA corpus sources must be official statute, regulation, or court-rule publishers only. Secondary commentary is deferred.

| Jurisdiction | Source family | Status |
|---|---|---|
| IL | 755 ILCS 5, 755 ILCS 35, 755 ILCS 45, 760 ILCS 3, Cook County probate rules | pending ingest |
| US | 26 USC 2001-2058, HIPAA Privacy Rule, ABA Model Rules excerpts | pending ingest |
| MD | Health-General 5-601 through 5-618 | pending ingest |
| MN | Chapter 145C and relevant guardianship/conservatorship references | pending ingest |

## Ingestion (`api/cmd/corpus-ingest`)

Loads the corpus from a JSON manifest of **owner-verified, verbatim** statute text. The
pipeline only chunks (on blank-line paragraph boundaries, ≤ ~2000 chars, never mid-sentence)
and embeds (`gemini-embedding-001` / `RETRIEVAL_DOCUMENT`, 3072-dim — matches the Shepherd
retriever's `RETRIEVAL_QUERY`). It **never generates, paraphrases, or truncates legal text**.

> **Rule 9 — Full Fidelity (non-negotiable):** each `text` field is the complete, unaltered
> statute, copied from the cited official publisher. Engineering owns the pipeline; the
> owner/legal owns sourcing + verifying the text. Wrong/abridged corpus → wrong guidance → harm.

Input manifest schema (one entry per source from the Source Policy table above):

```json
{ "sources": [ {
  "id": "il-755-ilcs-45-4-10",                 // stable unique id
  "jurisdiction": "IL",                         // IL | MD | MN
  "title": "Illinois POA Act — Health Care Short Form",
  "statuteReference": "755 ILCS 45/4-10",       // citation shown to users
  "sourceUrl": "https://www.ilga.gov/...",      // official publisher URL
  "publisher": "Illinois General Assembly",
  "licenseNote": "U.S. state statute — public domain",
  "effectiveAt": "2023-01-01",                  // optional, YYYY-MM-DD
  "verifiedAt": "2026-06-11T00:00:00Z",         // RFC3339 — human verified-vs-source
  "text": "<COMPLETE verbatim statute text; paragraphs separated by blank lines>"
} ] }
```

Run (idempotent — upserts by `id`):

```bash
cd api
go run ./cmd/corpus-ingest -manifest ../docs/legal-corpus/<juris>.json -dry-run   # parse+chunk only
RAG_DATABASE_URL='postgres://…?sslmode=require' GOOGLE_CLOUD_PROJECT=finalwishes-prod \
  go run ./cmd/corpus-ingest -manifest ../docs/legal-corpus/<juris>.json           # embed + load
```

Prereqs: `legal_corpus_*` tables + `vector` extension created (`schema.sql`); Cloud SQL
reachable; Vertex AI enabled + runner authenticated (ADC/SA).

## Verification Target

CR-10 can be marked `MET` only after `docs/ga-evidence/cr-10-rag-YYYY-MM-DD.md` records:

- source URLs, retrieval timestamps, checksums, chunk counts, and verified dates;
- deployed corpus table inventory by jurisdiction;
- sample Shepherd responses with `citations`;
- probe-set run with hallucination rate at or below 2%;
- legal safety and citation-abstention behavior.
