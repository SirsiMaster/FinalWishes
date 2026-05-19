# Probate Engine — `api/internal/probate/`

Illinois probate engine for FinalWishes. Implements a pluggable `StateEngine` interface
designed for per-jurisdiction rules. Illinois is the first implementation; Maryland and
Minnesota follow the same interface without UI changes.

## Architecture (ADR-043)

```
StateEngine interface (engine.go)
  └── IllinoisEngine (illinois.go)  ← first implementation
  └── MarylandEngine (future)
  └── MinnesotaEngine (future)

Handler (handler.go) — API endpoints
DeathCert (deathcert.go) — death certificate analysis + confirmation gate
Executor (executor.go) — single-executor activation flow
Forms (forms.go) — Cook County court form preparation
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/probate/transition` | Phase transition with executor authority checks |
| GET | `/api/v1/probate/status` | Current phase, deadlines, valid transitions |
| GET | `/api/v1/probate/checklist` | IL checklist with completion status |
| POST | `/api/v1/probate/checklist/update` | Mark checklist item complete/incomplete |
| POST | `/api/v1/probate/evaluate-small-estate` | $150K threshold evaluation |
| POST | `/api/v1/probate/death-cert/submit` | Store AI-analyzed death cert facts |
| POST | `/api/v1/probate/death-cert/confirm` | Executor confirms death cert facts |
| GET | `/api/v1/probate/death-cert` | Retrieve stored death cert facts |
| GET | `/api/v1/probate/forms` | Pre-filled Cook County form templates |
| GET | `/api/v1/probate/forms/data` | Per-form detail |
| GET | `/api/v1/probate/executor/status` | Executor activation status |
| POST | `/api/v1/probate/executor/confirm` | Executor confirms role |

## Estate Lifecycle

```
active → death_reported → executor_confirmed → in_probate → probate_complete → closed
                        ↘ small_estate ──────────────────────────────────────↗
```

Transitions are guarded by `CanTransition()`. Invalid transitions return an error with the list of valid alternatives.

## Illinois Rules Encoded

| Rule | Value | Source |
|------|-------|--------|
| Small estate threshold | $150,000 | SB83 (2025) |
| Vehicles in threshold | Excluded | SB83 (2025) |
| Inventory deadline | 60 days | IL Probate Act |
| Creditor claims | 6 months from publication | IL Probate Act |
| Estate tax threshold | $4 million | Illinois estate tax |
| E-filing | Available (Cook County) | Tyler Technologies eCourt |

## Security

- All endpoints require Firebase Auth
- Executor/admin authority for transitions and confirmations
- Principals cannot report their own death
- Death cert facts require user confirmation before state changes
- Append-only audit trail (`probate_audit` subcollection)
- Firestore rules: `probate` (read/write), `probate_audit` (append-only)

## Tests

`engine_test.go` — 19 unit tests covering:
- Valid/invalid state transitions
- Small estate threshold evaluation ($0, $120K, $150K, $200K, real estate)
- Deadline computation (60-day inventory, 6-month creditor claims)
- Overdue detection
- Checklist completeness and ordering
- Form references present
- Engine metadata (state code, timeline, e-filing)

Run: `go test ./internal/probate/ -v`

## Form Templates

4 Cook County forms with pre-filled estate data:
1. **CCP0315** — Petition for Probate of Will and Letters Testamentary
2. **IL Probate Act §14-1** — Estate Inventory (60-day deadline)
3. **755 ILCS 5/ Art. XXV** — Small Estate Affidavit ($150K)
4. **CCP0312/CCP0313** — Oath and Bond of Representative

Every form includes a legal disclaimer: "PREPARATION ASSISTANCE ONLY — This document is a draft... It does NOT constitute a legal filing, legal advice, or attorney representation."

## Dependencies

- `cloud.google.com/go/firestore` — Firestore client
- `github.com/rs/zerolog` — structured logging
- `github.com/sirsi-technologies/finalwishes-api/internal/auth` — Firebase auth context
