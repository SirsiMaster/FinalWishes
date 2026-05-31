# ADR-044: Legal RAG Corpus for Shepherd Guidance

**Status:** Accepted
**Date:** 2026-05-20
**Author:** Codex (codex-finalwishes)
**Reviewed by:** Router plan `20260520-claude-finalwishes-rag-architecture-plan` and Codex guardrail review `20260520-codex-finalwishes-ga-workstream-plan-batch-review`

---

## Context

CR-10 adds retrieval-augmented Shepherd guidance with a state-specific legal corpus. Legal guidance is high-risk: responses must be grounded in official sources, must not expose estate PII, and must abstain when the corpus cannot support an answer.

The initial Claude plan recommended Cloud SQL PostgreSQL with pgvector and Vertex `text-embedding-005` at 1536 dimensions. Codex approved pgvector but required current model verification. Google Cloud documentation checked on 2026-05-20 lists `gemini-embedding-001` as the current higher-quality embedding model with up to 3072 dimensions, while `text-embedding-005` is available at up to 768 dimensions.

## Decision

Use PostgreSQL + pgvector for the CR-10 corpus index and use Vertex AI `gemini-embedding-001` at 3072 dimensions as the default embedding model.

The legal corpus database is separate from the ADR-037 PII vault database. It stores public-source legal text, source provenance, chunk metadata, and embeddings. User estate facts stay in Firestore/Cloud SQL estate boundaries and are injected at request time only.

Shepherd legal chat must:

- retrieve top corpus chunks before legal generation;
- return a `citations` array with opaque corpus IDs, source URLs, jurisdiction, reference, verified date, and preview;
- include informational-only legal safety language;
- abstain when retrieval fails or no retrieved chunk clears the confidence threshold;
- use official statute, regulation, court-rule, or bar-rule sources for GA evidence.

## Alternatives Considered

1. **Vertex Vector Search** — Rejected for GA. It is managed and scalable but adds a specialty vector service and would require a separate ADR/vendor-cost justification under the portfolio doctrine.
2. **`text-embedding-005`** — Rejected as the default after current-doc verification. It remains a fallback if Google deprecates or restricts `gemini-embedding-001`.
3. **Single-pass citation prompting only** — Rejected. It cannot enforce abstention when no source supports an answer.
4. **Storing corpus in the PII vault** — Rejected. ADR-037 makes that database exclusive to sensitive PII operations.

## Consequences

- Positive: Reuses the existing PostgreSQL operating model and keeps retrieval close to the Go API.
- Positive: Avoids a new paid specialty vector store for the expected sub-100K chunk corpus.
- Positive: Creates a clear evidence path for citation precision, citation recall, and hallucination-rate testing.
- Negative: Corpus ingestion and legal review remain the schedule bottleneck.
- Mitigation: `docs/legal-corpus/manifest.md`, `api/internal/guidance/schema.sql`, and `api/cmd/rag-eval` establish repeatable ingestion/evaluation contracts before source curation begins.

## References

- `api/internal/guidance/rag.go`
- `api/internal/guidance/schema.sql`
- `docs/legal-corpus/manifest.md`
- `docs/ga-evidence/cr-10-rag-2026-05-20.md`
- Google Cloud Vertex AI text embeddings docs checked 2026-05-20: `gemini-embedding-001` up to 3072 dimensions, `text-embedding-005` up to 768 dimensions.
