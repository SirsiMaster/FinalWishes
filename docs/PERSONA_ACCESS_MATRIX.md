# FinalWishes — Persona Access Matrix (Audit + Source of Truth Spec)

**Version:** 1.0 — **Date:** June 5, 2026 — **Owner:** claude-finalwishes
**Target:** Tuesday, June 9, 2026 persona-safe feature completion
**Refs:** `docs/CONTINUATION-PROMPT.md` (v22.0), `ETHOS.md`, `docs/USER_STORIES.md`, `CLAUDE.md`

> This document is the **audit of the current persona model** and the **spec for the Phase 1
> single source of truth**. It is the contract sidebar, route guards, Shepherd, and tests must
> all agree on. Per the v22.0 mission, persona safety has three layers that must agree:
> (1) navigation visibility, (2) route enforcement, (3) persona experience.

---

## 1. Canonical Roles

Profile role union (`web/src/lib/auth.tsx:51`):
`'principal' | 'executor' | 'heir' | 'trustee' | 'legal' | 'cpa' | 'admin'`

EstateUser role union (`web/src/lib/firestore.ts:163`) — **no `admin`** (admin is global, not an estate persona):
`'principal' | 'executor' | 'heir' | 'trustee' | 'legal' | 'cpa'`

- Canonical data role for beneficiary = **`heir`**; display label = **"Beneficiary"**; `beneficiary` is a
  label/compat alias only, never a new data role.
- **Effective role must be estate-scoped:** `estateUser?.role ?? profile?.role ?? 'principal'`.

---

## 2. Section Catalog (grounded in real routes)

Estate child routes that exist today (`web/src/routes/estates.$estateId.*`):

| Section id | Route | Meaning | Sensitivity |
|---|---|---|---|
| `dashboard` | `dashboard` | Owner "My Legacy" completion timeline | Owner-shaped |
| `life-chapters` | `life-chapters` | Owner's life story chapters | Living legacy |
| `soul-log` | `soul-log` | Diary (video/audio/text); private/shared/sealed | **Private by default** |
| `memoirs` | `memoirs` | Photos & videos | Mixed (shared/private) |
| `heirlooms` | `heirlooms` | Heirlooms / jewelry | Mixed (assigned/private) |
| `assets` | `assets` | Financial, real estate, vehicles, digital, personal property | **PII / financial** |
| `vault` | `vault` | Legal docs: wills, trusts, deeds, insurance, POAs | **Legal evidence** |
| `forms` | `forms` | Will / POA builder | Legal authoring |
| `lockbox` | `lockbox` | Credentials / account secrets | **Secrets** |
| `directives` | `directives` | Directives w/ per-person visibility | Mixed |
| `timecapsule` | `timecapsule` | Sealed future-delivery entries | Sealed |
| `beneficiaries` | `beneficiaries` | Manage team (heirs/executors/trustees/legal/cpa) | Admin |
| `events` | `events` | Funeral / memorial / RSVP | Shared |
| `obituary` | `obituary` | Obituary / final record | Shared |
| `probate` | `probate` | Probate / guardian / settlement / quorum | Fiduciary |
| `notifications` | `notifications` | Notifications | Per-user |
| `pricing` | `pricing` | Upgrade plan | Owner billing |
| `settings` | `settings` | Owner settings | Owner config |
| `attestation` | `attestation` | Fiduciary attestation (verification step) | Fiduciary |
| `estates` | `estates` | Estate switcher / list | Navigation |
| `index` | `index` | Estate home / redirect | Navigation |

**Gap A — uncatalogued routes:** `forms`, `attestation`, `pricing`, `estates`, `index` have **no section id in
`ROLE_PERMISSIONS`**. They are neither nav-filtered nor route-guarded today. `forms` (will/POA authoring) and
`pricing` (billing) are sensitive and currently reachable by any verified role via direct URL.

---

## 3. Access Matrix — Current vs. Target

Legend: ✅ allowed · ⛔ must-not-see · ◐ allowed but **scoped** (only assigned/authorized/relevant items) ·
🔴 current-state violation that leaks across persona.

| Section | principal | executor | trustee | heir | legal | cpa | admin |
|---|---|---|---|---|---|---|---|
| dashboard (owner) | ✅ | 🔴→persona dash | 🔴→persona dash | 🔴→**heir sacred landing** | 🔴→persona dash | 🔴→persona dash | ◐ internal only |
| life-chapters | ✅ | ⛔ (curr ✅ 🔴) | ⛔ (curr ✅ 🔴) | ◐ shared | ⛔ | ⛔ | ◐ |
| soul-log | ✅ | ⛔ | ⛔ | ◐ shared/sealed-to-them (curr ⛔ — **missing**) | ⛔ | ⛔ | ◐ |
| memoirs | ✅ | ⛔ (curr ✅ 🔴) | ⛔ | ◐ shared | ⛔ | ⛔ | ◐ |
| heirlooms | ✅ | ⛔ (curr ✅ 🔴) | ⛔ (curr ✅ 🔴) | ◐ assigned (curr ⛔ — missing) | ⛔ | ⛔ | ◐ |
| assets | ✅ | ◐ authorized | ◐ trust assets | ◐ **assigned only** (curr full 🔴) | ◐ for counsel | ◐ financial only | ◐ |
| vault | ✅ | ◐ authorized | ◐ trust docs | ⛔ | ◐ authorized docs | ◐ financial docs | ◐ |
| forms | ✅ | ⛔ | ⛔ | ⛔ | ◐ review | ⛔ | ◐ |
| lockbox | ✅ | ◐ authorized | ◐ authorized | ⛔ | ⛔ (curr ⛔ ✅) | ◐ acct metadata | ◐ |
| directives | ✅ | ✅ | ✅ | ◐ theirs | ✅ | ⛔ (curr ⛔ ✅) | ◐ |
| timecapsule | ✅ | ⛔ | ⛔ | ◐ sealed-to-them (curr ⛔ — missing) | ⛔ | ⛔ | ◐ |
| beneficiaries | ✅ | ◐ view | ◐ view | ⛔ | ⛔ | ⛔ | ◐ |
| events | ✅ | ✅ | ✅ | ✅ (curr ⛔ — **missing**) | ⛔ | ⛔ | ◐ |
| obituary | ✅ | ✅ | ✅ | ✅ | ⛔ | ⛔ | ◐ |
| probate | ✅ | ✅ | ◐ trust-settlement | ⛔ | ⛔ | ⛔ | ◐ |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ |
| pricing | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ◐ |
| settings | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ◐ |
| attestation | n/a | ✅ | ✅ | ◐ if required | ✅ | ✅ | ◐ |

### Key violations (current `ROLE_PERMISSIONS` in `Sidebar.tsx:27`)

1. **heir includes `dashboard`** → heir's persistent screen is the owner completion timeline.
   Violates ETHOS §"The sacred moment" (face/voice/letter first). HeirWelcome gates *first visit* only.
2. **heir missing `events`, `soul-log`(shared), `heirlooms`(assigned), `timecapsule`(sealed)** → heir can't
   reach memories actually meant for them.
3. **heir `assets` is unscoped** → heir sees the full asset list, not just assigned assets.
4. **executor/trustee include `life-chapters`, `heirlooms`, `memoirs`** → owner living-legacy content leaks to
   fiduciaries (boundary says fiduciaries get settlement/authorized-evidence only).
5. **legal/cpa include `dashboard`** → owner completion timeline leaks to advisors.
6. **admin == principal (full)** → admin should be internal support/diagnostics only, not a full estate persona.

---

## 4. Three-Layer Enforcement Status

| Layer | Status | Evidence |
|---|---|---|
| **1. Navigation visibility** | ◐ PARTIAL | `ROLE_PERMISSIONS` exists but (a) lives only in `Sidebar.tsx`, (b) keyed on **wrong role source** (`profile.role`, not `estateUser.role`), (c) misses 5 real routes (Gap A). |
| **2. Route enforcement** | 🔴 MISSING | No `RoleGuard`. Only `AuthGuard` (auth) + `IdentityGate` (verification). **Direct-URL to any estate child route is not persona-blocked.** |
| **3. Persona experience** | ◐ PARTIAL | `HeirWelcome` + `OwnerWelcome` gate first-visit only; all downstream routes render owner-shaped content; no per-persona dashboards. |

**Root cause (finding #3, confirmed):** `estates.$estateId.tsx:132` `const userRole = profile?.role || 'principal'`
and `Sidebar.tsx:376` `role: profile.role` both ignore the already-fetched `estateUser.role`. Fix this first —
every other persona fix depends on correct effective-role resolution.

**Backend (finding #7, defense-in-depth):** Go ConnectRPC write-authz allows principal/executor/admin; trustee
writes undecided; heir/legal/cpa must stay read-only. Frontend guards are **not** authorization — server + Firestore
rules must enforce the same matrix. Out of frontend scope for the audit but tracked here.

---

## 5. Phase 1 Source-of-Truth Proposal — `web/src/lib/persona.ts`

Single module consumed by Sidebar, the new RoleGuard, ShepherdCompanion, and tests:

```ts
export type PersonaRole = 'principal'|'executor'|'trustee'|'heir'|'legal'|'cpa'|'admin';
export type SectionId = /* the section ids in §2 */;

export const PERSONA_LABELS: Record<PersonaRole,string>;        // "Estate Owner", "Beneficiary", ...
export const PERSONA_ACCESS: Record<PersonaRole, Set<SectionId>>; // the Target matrix in §3
export const SCOPED_SECTIONS: Partial<Record<PersonaRole, Set<SectionId>>>; // ◐ = item-level scope required

export function resolveEffectiveRole(
  estateUserRole?: PersonaRole | null,
  profileRole?: PersonaRole | null,
): PersonaRole;                                                  // estateUser ?? profile ?? 'principal'

export function canAccess(role: PersonaRole, section: SectionId): boolean;
export function personaLanding(role: PersonaRole): string;       // heir → sacred moment; others → persona dash
```

Then:
- `Sidebar` filters on `PERSONA_ACCESS[resolveEffectiveRole(...)]` (replaces local `ROLE_PERMISSIONS`).
- New `RoleGuard` wraps estate child routes: `canAccess` false → warm Shepherd-guided "not part of your role"
  state or redirect to `personaLanding(role)`; **never render private data during loading/blocked**.
- `ShepherdCompanion` suggests only `canAccess`-true actions.
- Tests assert the matrix + direct-URL behavior per persona.

---

## 6. Coordination

- Codex (`codex-finalwishes`) has live uncommitted edits across `Sidebar.tsx`, `IdentityGate.tsx`, `auth.tsx`,
  `firestore.ts`, `invitations.ts`, `estates.$estateId.tsx`, etc. (trustee role support + Shepherd guidance).
- Per Codex's acceptance-bar request: **route changed files + verification before either side commits.**
- This audit doc is new/non-overlapping. The `persona.ts` module + Sidebar/RoleGuard edits in §5 are the
  proposed shared work to meet-in-the-middle before implementation.
