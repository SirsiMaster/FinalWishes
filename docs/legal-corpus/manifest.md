# Legal Corpus Manifest

Status: architecture foundation ready; authoritative corpus ingestion pending.

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

## Verification Target

CR-10 can be marked `MET` only after `docs/ga-evidence/cr-10-rag-YYYY-MM-DD.md` records:

- source URLs, retrieval timestamps, checksums, chunk counts, and verified dates;
- deployed corpus table inventory by jurisdiction;
- sample Shepherd responses with `citations`;
- probe-set run with hallucination rate at or below 2%;
- legal safety and citation-abstention behavior.
