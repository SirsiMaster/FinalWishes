# ADR-043: Illinois Probate Engine — Pluggable State Machine

**Status:** Accepted
**Date:** 2026-05-18
**Author:** Claude (claude-finalwishes)
**Reviewed by:** Codex (codex-pantheon) — see router review 20260518-codex-finalwishes-v010-illinois-probate-review

---

## Context

FinalWishes v0.9.1 is a "Living Legacy" platform (Tier 1) with no probate functionality. The contract defines Estate Administration (Tier 2, $25K) and Probate Engine (Tier 3, $35K) as future add-ons. The user has requested Illinois probate support by June 1, 2026, starting with Cook County (Chicago).

Illinois has specific probate rules: 60-day inventory deadline, 6-month creditor claims period, $150K small estate threshold (updated 2025 via SB83, vehicles excluded), and Cook County eCourt for e-filing. The architecture must support adding Maryland and Minnesota later without changing the UI contract.

## Decision

Implement a **pluggable StateEngine interface** in `api/internal/probate/` that each jurisdiction implements independently. Illinois (`IllinoisEngine`) is the first implementation.

### Estate Lifecycle State Machine

```
active → death_reported → executor_confirmed → in_probate → probate_complete → closed
                        ↘ small_estate ──────────────────────────────────────↗
```

Transitions are guarded by `CanTransition()` — invalid transitions are rejected. The Guardian Protocol's existing `in_settlement` status maps to `death_reported`.

### StateEngine Interface

Each jurisdiction implements:
- `SmallEstateThreshold()` — dollar threshold for simplified processing
- `EvaluateSmallEstate()` — eligibility check with real estate disqualification
- `InventoryDeadline()` — days after appointment to file inventory
- `CreditorClaimsPeriod()` — duration of creditor claims window
- `ComputeDeadlines()` — all deadlines from letters-issued date
- `Checklist()` — ordered probate steps with form references
- Court system metadata and e-filing availability

### Illinois-Specific Rules Encoded

| Rule | Value | Source |
|------|-------|--------|
| Small estate threshold | $150,000 | SB83 (2025), 755 ILCS 5/ Art. XXV |
| Vehicles in threshold | Excluded | SB83 (2025) |
| Inventory deadline | 60 days | Illinois Probate Act |
| Creditor claims | 6 months from publication | Illinois Probate Act |
| Estate tax threshold | $4 million | Illinois estate tax |
| Probable timeline | 12–24 months | General estimate |
| E-filing | Available (Cook County) | Tyler Technologies eCourt |

### Cook County Form References

17 checklist items reference specific forms: CCP0315 (Petition for Probate), CCP0312/0313 (Oath and Bond), VSD 773/774 (vehicle transfer), TODI forms, and small estate affidavit.

## Alternatives Considered

1. **Hardcoded IL rules in handlers** — Rejected. Cannot extend to MD/MN without duplication.
2. **Generic workflow engine** — Rejected per Codex review: "Start with interfaces around jurisdiction rules... Avoid a giant generic workflow framework."
3. **External rules service** — Rejected. Probate rules change infrequently; embedded Go code is simpler and testable.

## Consequences

- **Positive:** Clean interface boundary. Adding Maryland = implement `MarylandEngine`, no UI changes.
- **Positive:** 19 unit tests cover transitions, thresholds, deadlines, and checklist completeness.
- **Negative:** Rules are point-in-time snapshots of Illinois law. Legislative changes require code updates.
- **Mitigation:** Rules are in a single file (`illinois.go`) with clear comments citing statutes.

## Files

| File | Purpose |
|------|---------|
| `api/internal/probate/engine.go` | StateEngine interface, phase constants, transition guards |
| `api/internal/probate/illinois.go` | Illinois implementation (rules, deadlines, checklist) |
| `api/internal/probate/engine_test.go` | 19 unit tests |

## References

- Codex review: `sirsi-pantheon/.agents/idea-router/reviews/20260518-codex-finalwishes-v010-illinois-probate-review.md`
- Illinois estate planning guide: `docs/user-guides/illinois-estate-planning.md`
- Memory: `project_finalwishes_illinois_estate.md`
- Guardian Protocol: `api/internal/guardian/handler.go` (existing settlement transitions)
