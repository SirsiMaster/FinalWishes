# ADR-007: Sirsi Repository Unification (Monorepo)
**Date:** January 20, 2026
**Status:** Accepted
**Canonical Source:** `SirsiNexusApp/docs/ADR-010-SIRSI-REPOSITORY-UNIFICATION.md`

---

## Context

The Sirsi ecosystem grew into multiple isolated repositories (`SirsiNexusApp`, `sirsi-opensign`, `sirsi-ui`, `sirsi-pitch-deck`), causing fragmentation, documentation drift, and deployment complexity.

## Decision

Unify ALL `sirsi-XXX` repositories into the **SirsiNexusApp** monorepo using a `packages/` directory:

| Original Repo | New Location |
|:---|:---|
| `sirsi-ui` | `packages/sirsi-ui` |
| `sirsi-opensign` | `packages/sirsi-opensign` |
| `sirsi-pitch-deck` | `docs/pitch-deck` |

## Consequences

- **Positive:** Simplified dependency management, atomic commits across services, unified documentation, consistent CI/CD.
- **Negative:** Increased repository size (mitigated by selective builds).

---

*Note: This is ADR-010 in SirsiNexusApp, re-numbered to ADR-007 in the governance registry to fill the gap and avoid collision with ADR-010 (Offerings Engine).*

*Last updated: February 9, 2026*
