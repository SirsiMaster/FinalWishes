# ADR-046: Persona-Based Estate Access Control

**Status:** Accepted
**Date:** 2026-06-08
**Author:** claude-finalwishes
**Reviewed by:** Routed to `claude-codex-standin` for PASS-ACK (codex OOO 2026-06-08→~06-10); item `20260609-030046-...-pass-ack-batch`

---

## Context

An estate is multi-tenant: one estate has a **principal** (owner) plus **executor, trustee, heir, legal counsel, CPA** members, and the app already exposed a rich surface (assets, vault, lockbox, Soul Log, directives, time capsules, events, probate, …). Two problems:

1. **Cross-persona leakage.** Navigation was filtered by `ROLE_PERMISSIONS` in `Sidebar.tsx`, but (a) hiding nav is not authorization — a forbidden URL still rendered, and (b) the role was read from the **global** `profile.role`, ignoring the estate-specific role. A user who is `principal` on their own estate but `heir`/`executor` on another got the wrong, over-privileged experience.
2. **ETHOS conflict.** The heir's first screen must be the sacred moment (face/voice/letter), never an owner completion dashboard; the owner's *private* Soul Log diary must stay private even from estate members.

Per Rule 25/ADR-031 (Secure Enclave) and Rule 26 (PII siloing), access must be enforced by the data layer, not just the UI.

## Decision

A **single source of truth** drives three layers that must agree, with the Firestore rules as the actual security boundary.

### 1. Source of truth — `web/src/lib/persona.ts`
- `PERSONA_ACCESS: Record<PersonaRole, Set<SectionId>>` — the route-level access matrix (spec: `docs/PERSONA_ACCESS_MATRIX.md`).
- `resolveEffectiveRole(estateUserRole, profileRole)` — **estate-scoped role wins**: `estateUser?.role ?? profile?.role ?? 'principal'`. This is the linchpin fix; every layer resolves role through it.
- `canAccess(role, section)`, `requiresItemScope(role, section)` (◐ sections needing item-level filtering), `personaLanding(role)`.

### 2. Three layers (all import the source of truth)
- **Layer 1 — nav visibility:** `Sidebar` filters via `canAccess(effectiveRole, …)`.
- **Layer 2 — route enforcement:** `RoleGuard` wraps the estate `<Outlet>`. On `!canAccess` it shows a warm "This isn't part of your role" state and routes to `personaLanding`. It renders **nothing** until the role is definitive (gates on `authLoading || !profileResolved || estateUserLoading || !profile`) so it cannot leak during the resolution window or default to `principal` for an unauthenticated user.
- **Layer 3 — persona experience:** `DashboardRouter` branches `/dashboard` — principals/admins get the owner timeline; heirs get the sacred `HeirDashboard` ("For You", love first); fiduciaries/advisors get role-specific dashboards.

### 3. Verification gate consistency
`IdentityGate` keys fiduciary MFA+attestation on the **estate-scoped** effective role (not the global role), so a principal-on-their-own-estate cannot skip fiduciary verification on another estate.

### 4. Firestore rules are the boundary (defense in depth)
The UI layers are convenience; the rules enforce. Notably:
- **Lockbox** is `principal + admin` only (most-sensitive collection, credentials). The persona matrix was tightened to match — `executor/trustee/cpa` do **not** get lockbox, because the rule denies them regardless.
- **Soul Log read** = `isEstatePrincipal || isAdmin || (canAccessEstate && resource.data.visibility == 'shared')`. Owner/admin read everything; every other member reads **only `shared`** entries — never `private`/`sealed`. Non-owner queries are constrained to `where('visibility','==','shared')` (with a `(visibility, createdAt)` index) so the list read is allowed without exposing private entries.
- **Events `rsvpCount`**: any estate accessor may update an event when the diff touches **only** `rsvpCount` (bounded `int`, `0..100000`), so an heir's RSVP can tally without write access to the event.

## Alternatives Considered

- **Sidebar-only filtering (status quo):** rejected — hiding nav is not authorization; direct URLs bypass it.
- **Global `profile.role` for authorization:** rejected — breaks multi-estate users and is the original leak.
- **Per-doc Firestore filtering of all Soul Log entries (private incl.):** deferred — Firestore list rules require the query to be constrained, so non-owners must query `shared`-only; full per-recipient enforcement needs a `taggedPeople` → UID migration (tracked, see Consequences).
- **Widening the lockbox rule to fiduciaries:** rejected without an explicit security decision — the rule is the canon boundary; the matrix yields to it.

## Consequences

- Sidebar, RoleGuard, IdentityGate, DashboardRouter, the Shepherd, and tests cannot drift — they all import `persona.ts`. Locked by `persona.test.ts` + `RoleGuard.test.ts` (≥29 unit tests).
- The owner Soul Log experience and query are byte-for-byte unchanged; only non-owner reads are constrained.
- **Open residual (Codex's data-model lane):** among `shared` Soul Log entries, per-recipient narrowing is still a client-side `taggedPeople` (display-name) filter — a non-owner can read all *shared* entries, not just ones tagged to them. Closing this needs `taggedPeople` → UIDs + an `array-contains(viewerUid)` query/rule clause.
- **Verification:** persona logic is unit-tested; live per-persona E2E is gated on fiduciary TOTP MFA (`web/e2e/persona-safety.spec.ts`, honestly skipped) — an `otplib`-at-login test-infra unblock is in progress.

## References
- `docs/PERSONA_ACCESS_MATRIX.md`, `web/src/lib/persona.ts`, `RoleGuard.tsx`, `IdentityGate.tsx`, `PersonaDashboard.tsx`, `firestore.rules`
- Commits: `508ec89`, `c70d3a7`, `32136db`, `c939b05` (persona), `b2bab21` (hardening), `4378a23` (Soul Log read-privacy), `a690dc9` (RSVP)
- Rules 25/26, ADR-031 (Secure Enclave), ADR-035 (Tiered Identity), ETHOS.md
