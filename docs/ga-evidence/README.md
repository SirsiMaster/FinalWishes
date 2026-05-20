# GA Evidence — FinalWishes Tier 1 v1.0.0

Source of truth for `/goal: finalwishes-tier1-ga` acceptance verification.
Governed by `.agents/idea-router/proposals/20260520-claude-finalwishes-tier1-ga-goal-v2.md` (canonical pending codex re-review).

## Convention

Per Codex required revision #5 (review `20260520-codex-finalwishes-tier1-ga-goal-review` line 31):

> Make every verification command produce an artifact path, not just terminal output. Use `docs/ga-evidence/<criterion-id>-<date>.md` or equivalent so Codex can issue a reproducible `GOAL_MET` verdict later.

### Naming

```
docs/ga-evidence/ga-c{N}-{slug}-{YYYY-MM-DD}.md
```

- `N` ∈ {1..8} — criterion number from the v2 goal.
- `slug` — short stable token (e.g. `tier1-features`, `tests`, `ci`, `dependabot`, `domain`, `uptime`, `stripe-portal`, `opensign`).
- `YYYY-MM-DD` — UTC date the evidence was captured.

### Required contents per artifact

1. Criterion ID and exact wording (copy from v2).
2. Verification command(s) run, with full transcript or sanitized output.
3. Concrete identifiers tying the evidence to a point in time: commit SHA, Cloud Run revision, gh run ID, Stripe config ID, OpenSign template IDs, dig output, etc.
4. Verdict line: `MET` / `NOT MET` / `MET-WITH-CAVEATS`, with caveats enumerated.
5. Author (`claude-finalwishes` or `codex-finalwishes`) and capture timestamp.

## Criterion index (v2)

| # | Slug | Owner | Blocking workstream |
|---|---|---|---|
| 1 | `tier1-features` | claude-finalwishes | — (MET as of v0.10.2 / rev 37) |
| 2 | `tests` | claude-finalwishes | — (MET, ≥211 tests) |
| 3 | `ci` | claude-finalwishes | `finalwishes-deploy-iam-fix` (deploy SA grants) |
| 4 | `dependabot` | claude-finalwishes | `finalwishes-dependabot-sweep` |
| 5 | `domain` | USER | `finalwishes-domain-cutover` |
| 6 | `uptime` | AUTOMATIC | `finalwishes-uptime-window` (passive 7-day measurement) |
| 7 | `stripe-portal` | USER | `finalwishes-stripe-portal` |
| 8 | `opensign` | USER + claude-finalwishes | `finalwishes-opensign-templates` |

## Rules

- Do **not** pre-fill an artifact. Write it at the moment the criterion flips to MET, against a real, dated run.
- Do **not** edit an artifact after it is referenced by a codex `GOAL_MET` verdict. If the underlying state regresses, file a new dated artifact and let codex re-verdict.
- The 7-day uptime window (C6) artifact links to a `docs/sla-evidence/<start>-to-<end>.md` companion file capturing hourly availability.
- Release hygiene (CHANGELOG semver retro-note + `docs/CONTINUATION-PROMPT.md` v22) is **not** evidence-tracked here; it lives in CHANGELOG and the prompt doc respectively.
