# GA Evidence — FinalWishes Tier 1 v1.0.0

Source of truth for `/goal: finalwishes-tier1-ga` acceptance verification.
Governed by `.agents/idea-router/proposals/20260520-claude-finalwishes-tier1-ga-goal-v3.md` (canonical pending codex final approval after v3.1 patch — see `.agents/idea-router/decisions/20260520-claude-finalwishes-tier1-ga-goal-v3-1-patch.md`).

## Convention

Every verification command produces a dated artifact so codex can issue a reproducible `GOAL_MET` verdict.

### Naming

```
docs/ga-evidence/cr-{NN}-{slug}-{YYYY-MM-DD}.md
```

- `NN` ∈ `01..12` — two-digit criterion number from the v3 goal.
- `slug` — short stable token (see index below).
- `YYYY-MM-DD` — UTC date the evidence was captured.

Example: `docs/ga-evidence/cr-01-tier1-features-2026-06-15.md`.

### Required contents per artifact

1. Criterion ID and exact wording (copy from v3).
2. Verification command(s) run, with full transcript or sanitized output.
3. Concrete identifiers tying the evidence to a point in time: commit SHA, Cloud Run revision, gh run ID, Stripe config ID, OpenSign template IDs, dig output, etc.
4. Governing ADR or decision-record reference for any criterion that requires one (see index).
5. Verdict line: `MET` / `NOT MET` / `MET-WITH-CAVEATS`, with caveats enumerated.
6. Author (`claude-finalwishes` or `codex-finalwishes`) and capture timestamp.

## Criterion index (v3 — 12 criteria)

### Engineering (4)

| # | Slug | Owner | ADR required | Blocking workstream |
|---|---|---|---|---|
| 01 | `tier1-features` | claude-finalwishes | — | — (MET as of v0.10.2 / rev 37) |
| 02 | `tests` | claude-finalwishes | — | — (MET, ≥211 tests) |
| 03 | `ci` | claude-finalwishes | — | `finalwishes-deploy-iam-fix` |
| 04 | `dependabot` | claude-finalwishes | — | `finalwishes-dependabot-sweep` |

### Operational (4)

| # | Slug | Owner | ADR required | Blocking workstream |
|---|---|---|---|---|
| 05 | `domain` | USER | — | `finalwishes-domain-cutover` |
| 06 | `uptime` | AUTOMATIC | — | `finalwishes-uptime-window` (passive 7-day) |
| 07 | `stripe-portal` | USER | — | `finalwishes-stripe-portal` |
| 08 | `opensign` | USER + claude-finalwishes | — | `finalwishes-opensign-templates` |

### Scope-expansion (4) — added by principal directive 2026-05-20

| # | Slug | Owner | ADR required | Blocking workstream |
|---|---|---|---|---|
| 09 | `mobile` | claude-finalwishes + USER | **YES** — reverses April 2026 mobile-scaffold deletion | `finalwishes-mobile-platform` |
| 10 | `rag` | claude-finalwishes | **Conditional** — required if Vertex Vector Search is selected; pgvector on Cloud SQL/AlloyDB covered by existing Postgres doctrine | `finalwishes-rag-corpus` |
| 11 | `lob` | claude-finalwishes | **YES** — paid third-party vendor; exposes recipient address data | `finalwishes-lob-mail` |
| 12 | `google-photos` | claude-finalwishes | **YES** — introduces Google OAuth scopes and user photo-library data handling | `finalwishes-google-photos` |

## Required pass/fail security clauses (v3.1 patch)

- **CR-08 OpenSign wiring path:** the wiring module does not yet exist. The OpenSign workstream MUST create `web/src/lib/directives.ts` (or equivalent registry module) as part of CR-08 implementation; evidence MUST cite the actual committed path at the moment of verification.
- **CR-11 Lob:** evidence MUST prove no raw PII is written to client logs or public telemetry, and that delivery confirmations are tied to the estate audit trail by estate/session identifiers (not URL slugs). Per Rule 26 (PII/HIPAA Siloing).
- **CR-12 Google Photos:** evidence MUST list OAuth scopes, token storage location, revocation behavior, EXIF preservation rules, and deduplication key strategy.

## Rules

- Do **not** pre-fill an artifact. Write it at the moment the criterion flips to MET, against a real, dated run.
- Do **not** edit an artifact after it is referenced by a codex `GOAL_MET` verdict. If the underlying state regresses, file a new dated artifact and let codex re-verdict.
- The 7-day uptime window (CR-06) artifact links to a `docs/sla-evidence/<start>-to-<end>.md` companion file capturing hourly availability.
- Release hygiene (CHANGELOG semver retro-note + `docs/CONTINUATION-PROMPT.md` v22) is **not** evidence-tracked here; it lives in CHANGELOG and the prompt doc respectively.
- For criteria with `ADR required`, the governing ADR MUST be merged before the criterion can be marked `MET`.
