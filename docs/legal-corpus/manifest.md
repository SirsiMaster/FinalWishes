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
| IL | 755 ILCS 5, 755 ILCS 35, 755 ILCS 45, 760 ILCS 3, Cook County probate rules | first set sourced (5/4-3, 45/3-3, 45/4-10) — see below |
| US | 26 USC 2001-2058, HIPAA Privacy Rule, ABA Model Rules excerpts | pending ingest |
| MD | Health-General 5-601 through 5-618 | first set sourced (HG § 5-603) — see below |
| MN | Chapter 145C and relevant guardianship/conservatorship references | first set sourced (507.071, 145C.05, 145C.16) — see below |

### Sourced forms — launch states (manifest: `launch-states.json`)

First obvious estate-planning forms for IL/MD/MN, sourced **verbatim** from official
state legislature / revisor publishers only (Rule 9). Captured via deterministic
HTML-to-text extraction (no LLM in the text path); each source URL is recorded per
chunk by the ingestion pipeline. Retrieved/verified **2026-06-14**.

| id | Juris | Citation | Form | Official source | Chunks |
|---|---|---|---|---|---|
| `il-755-ilcs-5-4-3` | IL | 755 ILCS 5/4-3 | Probate Act — will signing & attestation | [ilga.gov](https://www.ilga.gov/documents/legislation/ilcs/documents/075500050K4-3.htm) | 1 |
| `il-755-ilcs-45-3-3` | IL | 755 ILCS 45/3-3 | POA Act — statutory short form POA for **property** | [ilga.gov](https://www.ilga.gov/documents/legislation/ilcs/documents/075500450K3-3.htm) | 13 |
| `il-755-ilcs-45-4-10` | IL | 755 ILCS 45/4-10 | POA Act — statutory short form POA for **health care** | [ilga.gov](https://www.ilga.gov/documents/legislation/ilcs/documents/075500450K4-10.htm) | 15 |
| `md-hg-5-603` | MD | Md. Code, Health-General § 5-603 | Advance directive statutory form | [mgaleg.maryland.gov](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=ghg&section=5-603&enactments=false) | 10 |
| `mn-507-071` | MN | Minn. Stat. § 507.071 | Transfer-on-death deed (TODD) + form | [revisor.mn.gov](https://www.revisor.mn.gov/statutes/cite/507.071) | 16 |
| `mn-145c-05` | MN | Minn. Stat. § 145C.05 | Health care directive — provisions that may be included | [revisor.mn.gov](https://www.revisor.mn.gov/statutes/cite/145C.05) | 3 |
| `mn-145c-16` | MN | Minn. Stat. § 145C.16 | Health care directive — suggested form | [revisor.mn.gov](https://www.revisor.mn.gov/statutes/cite/145C.16) | 6 |

Dry-run (`go run ./cmd/corpus-ingest -manifest ../docs/legal-corpus/launch-states.json -dry-run`):
**7 sources, 64 chunks — PASS** (all sources validated; nothing embedded or written).

**Gaps / not yet sourced (Rule 9 — recorded, not invented):**
- IL has **no fill-in-the-blank statutory will form** in 755 ILCS 5 (unlike CA Prob. Code).
  Will validity is governed by execution requirements (755 ILCS 5/4-3, sourced). A
  full self-proving-will template would come from court/forms sources, not a statute —
  deferred pending owner/legal direction.
- MN statutory **will** is likewise not a single fill-in form; MN intestacy/will rules
  live in 524.2-xxx (Uniform Probate Code). Only the TODD + health-care-directive forms
  are sourced in this first set.
- MD POA / estates-&-trusts statutory forms (Est. & Trusts Title 17) and MD additional
  advance-directive variants are not yet sourced — next batch.
- US federal estate tax (26 USC 2001) and HIPAA excerpts remain pending ingest.

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
