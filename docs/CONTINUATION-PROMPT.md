# FinalWishes - Continuation Prompt
**Version:** 22.0 - **Date:** June 5, 2026 - **Target:** Tuesday, June 9, 2026 persona-safe feature completion

---

## Session Progress — June 5 (persona-safe push, claude-finalwishes)

**Persona safety mission: structurally COMPLETE + verified + pushed.**
- Source of truth: `web/src/lib/persona.ts` (PERSONA_ACCESS, resolveEffectiveRole, canAccess, requiresItemScope, personaLanding) + audit `docs/PERSONA_ACCESS_MATRIX.md`. Tests: `persona.test.ts`.
- Layer 1 (nav): Codex — Sidebar via `canAccess` + estate-scoped `effectiveRole`.
- Root-cause leak (estate role vs global): FIXED (`estates.$estateId.tsx` `resolveEffectiveRole`).
- Layer 2 (route enforcement): `web/src/components/guards/RoleGuard.tsx` + `RoleGuard.test.ts` (wraps Outlet, blocks direct-URL, warm blocked state, gates on profileResolved+estateUser load).
- IdentityGate: now uses estate-scoped role for `isFiduciary` (converged w/ Codex).
- Layer 3 dashboards: `web/src/components/estate/PersonaDashboard.tsx` — `DashboardRouter` branches: owner (unchanged) / fiduciary+advisor persona dashboards / **HeirDashboard (sacred landing — love first)**. `dashboard` is now persona-aware; heir gained it safely; `personaLanding` uniform.
- Seed recipe for browser proof: `scripts/seed-persona-qa.js` (NOT run; Codex owns the walk).

**Commits this session (pushed):** 99b7899, 508ec89, f5810d0, c70d3a7, c5b7372, 32136db, c939b05, c93fa72 (+ IdentityGate fix absorbed into Codex's tree).

**Phase 4 (CRUD completeness) — IN PROGRESS (split with Codex, item 20260605-192631):**
- DONE: Soul Log DELETE (`c93fa72`).
- CLAUDE half (open): soul-log UPDATE + memoirs UPDATE (make the media composer edit-aware).
- CODEX half (open): lockbox UPDATE (`updateLockboxItem` est-actions:401), timecapsule UPDATE (`updateTimeCapsule` :498), estate rename (`updateEstate` :86), settings persistence, notifications mark-read, obituary DELETE.
- Full CRUD already works for: assets, beneficiaries/team, vault, directives, heirlooms, life-chapters, events.

**Remaining:** Phase 4 (above) + Phase 5 (Shepherd-everywhere) + the seeded per-persona browser walk (Codex). All routes for Phase 4 gaps are currently clean (no collision).

---

## Mission

Continue FinalWishes with one non-negotiable outcome: every persona sees only the flows, data, calls to action, and emotional experience meant for that persona, while the product remains end-to-end usable for the Tuesday demo.

This is not just a navigation cleanup. Persona safety has three layers that must agree:

1. **Navigation visibility:** the sidebar, quick actions, empty states, and Shepherd prompts only show allowed flows.
2. **Route enforcement:** a user typing a forbidden URL must be redirected or shown a role-appropriate blocked state.
3. **Persona experience:** each role gets its own first screen and workflow, not the owner dashboard with a few links hidden.

The Shepherd must stay central to all actions. A user should never wonder what to do next, why a section is hidden, or how to complete their role-specific journey.

---

## Canon Re-Ingested

Read these before changing code:

- `ETHOS.md`: FinalWishes is "the place where your life lives." Life first, death second. The heir's first moment is sacred: first the face, voice, and letter; then assets and legal mechanics.
- `AGENTS.md`: FinalWishes is the Estate Operating System; web-first TypeScript/React with Go backend; Royal Neo-Deco; secure enclave; router etiquette; changelog/documentation requirements.
- `docs/CANONICAL_DEVELOPMENT_PLAN.md`: active build is Tier 1 Living Legacy, web-first. Mobile, full probate engines, and direct Plaid-style financial discovery are deferred unless already implemented through existing surfaces.
- `docs/PROJECT_SCOPE.md`: mission spans Principal and Executor journeys, with launch focus on Maryland, Illinois, and Minnesota.
- `docs/REQUIREMENTS_SPECIFICATION.md`: current implemented surface includes registration, roles, identity gates, assets, vault, beneficiaries, Shepherd, Soul Log, time capsules, heirlooms, life chapters, memorials, events, lockbox, directives, OpenSign, and per-person directive visibility.
- `docs/USER_STORIES.md`: core personas are Principal, Executor, Heir, and Admin; current implementation also has Legal, CPA, Trustee, and the "beneficiary" label for heir.
- `docs/DATA_MODEL.md`: estate data must remain estate-scoped; PII and account numbers belong in protected enclaves/API paths, not public state.
- `docs/API_SPECIFICATION.md`: ConnectRPC serves core estate CRUD; REST serves vault, lockbox, guidance, media, guardian, capsules, and signing.
- `docs/SECURITY_COMPLIANCE.md`: least privilege, MFA/attestation for fiduciaries, auditability, and no cross-estate leakage.
- `docs/TEST_PLAN.md`: route guards, identity, Firestore rules, invitation flow, vault, and E2E journeys are priority test targets.

---

## User Directive

The user wants Claude and Codex to meet in the middle on:

- Add and make interactive CRUD for users, estates, memories, diary entries, voice notes, photos, bank accounts, all accounts, jewelry/heirlooms, real estate, lawyer/legal accounts, trustees, executors, wills, POAs, and related estate records.
- Make viewable CRUD interactive, not static or decorative.
- Make sure Shepherd works.
- Make Shepherd central to all actions so the user never gets lost.
- Focus the next continuation on persona-based access: each persona sees only their own flows.
- Deliver full end-to-end feature completeness for Tuesday, June 9, 2026.

Better framing: do not interpret this as "add random more pages." Interpret it as "the existing rich product surface must become persona-safe, complete, interactive, and guided."

---

## Personas And Boundaries

### Principal / Estate Owner

Purpose: build the living legacy and estate plan.

Allowed primary flows:

- Create/manage estate profile.
- Add/manage assets: financial, real estate, vehicles, digital, personal property.
- Add/manage lockbox accounts and credentials.
- Add/manage vault documents including wills, trusts, deeds, insurance, POAs, directives, legal documents.
- Add/manage beneficiaries, executors, trustees, legal counsel, and CPA advisors.
- Add/manage Soul Log diary entries, voice notes, videos, photos, memoirs, life chapters, heirlooms/jewelry, time capsules, directives, events, obituary/final record, settings, pricing.
- Use Shepherd as the companion and next-action guide.

Must not feel like: a death checklist. It should feel like wrapping a gift.

### Executor

Purpose: verify, administer, and settle after authority is active.

Allowed primary flows:

- Fiduciary verification: MFA plus attestation.
- Estate dashboard in executor mode, not owner completion mode.
- Authorized assets, vault documents, directives, lockbox, beneficiaries, events, probate/guardian, notifications, quorum/settlement actions.
- Report death/status, confirm role, follow probate/settlement steps.

Must not see:

- Owner-only creation flows such as Soul Log creation, owner pricing/settings that affect private owner setup, or private owner diary controls.
- Owner's private living-legacy prompts unless explicitly shared/authorized.

### Trustee

Purpose: administer trust-related assets and distributions.

Allowed primary flows:

- Fiduciary verification: MFA plus attestation.
- Authorized assets, trust/estate documents, directives, beneficiaries, vault, lockbox, probate/settlement context where trust administration is relevant.

Current status:

- Trustee support has been locally added across invitations, Firestore rules, auth role type, IdentityGate, sidebar, attestation, beneficiaries UI, email templates, and tests.
- Verify backend write authorization and role-specific route enforcement before calling it complete.

### Heir / Beneficiary

Purpose: receive love first, then understand inheritance and required actions.

Allowed primary flows:

- Sacred first moment: face, voice, letter, memory, or time capsule intended for them.
- Shared/tagged memories, Soul Log entries, directives, events, obituary/final record, assigned assets/heirlooms, notifications.
- Identity verification where required.

Must not see:

- Owner dashboard completion score as their first experience.
- Full estate setup/admin/edit controls.
- Private memories, private lockbox, unassigned assets, owner-only settings, or settlement controls.

### Legal Counsel

Purpose: advise on estate documents and directives.

Allowed primary flows:

- Authorized vault documents, directives, assets needed for counsel, notifications.
- Read/comment/review where supported.

Must not see:

- Owner private diaries/memories, non-legal lockbox details, pricing, owner settings, unrelated heir content.

### CPA Advisor

Purpose: advise on financial/tax/accounting estate matters.

Allowed primary flows:

- Authorized financial assets, relevant vault documents, lockbox/account metadata where explicitly authorized, notifications.

Must not see:

- Owner private diaries/memories, legal-only documents without authorization, heir-only content, owner settings.

### Admin

Purpose: internal support and operations.

Allowed flows:

- Internal diagnostics/support surfaces only.
- Admin should not be conflated with a normal estate persona in user-facing flows.

---

## Current Findings

1. The app already has broad feature surfaces: estate creation, assets, beneficiaries/heirs/executors/legal/CPA, trustee additions in progress, lockbox accounts, heirlooms/jewelry, memoirs/photos/videos, Soul Log diary/audio/video/text, directives, forms/wills/POAs, vault documents, events, time capsules, probate/guardian, notifications, Shepherd chat/nudges.
2. `web/src/components/layout/Sidebar.tsx` has role-filtered navigation (`ROLE_PERMISSIONS`), but this is not sufficient for persona safety.
3. `web/src/routes/estates.$estateId.tsx` fetches the estate-specific role from `estate_users/{uid}_{estateId}`, but currently renders `userRole` from `profile?.role`. This can leak the wrong persona experience when a user is principal globally but heir/executor/trustee on another estate.
4. `IdentityGate` enforces verification but does not by itself enforce every route's persona permission.
5. `HeirWelcome` and `OwnerWelcome` exist, but every downstream route still needs persona-appropriate content and hard guards.
6. Settings currently treats fiduciary roles as `heir`, `executor`, `legal`, `cpa`; add `trustee` if the trustee role remains supported.
7. Go ConnectRPC write authorization currently allows principal, executor, admin for write operations; decide whether trustee writes are allowed for any trust-admin actions, and keep heir/legal/CPA read-only unless canon explicitly changes.
8. Firestore rules include trustee in several role lists after Codex local pass; verify every affected collection and tests.

---

## Codex Local Work Already In Progress

Uncommitted local changes currently include:

- `web/src/components/estate/ShepherdCompanion.tsx`: route-aware Shepherd guidance and action shortcuts expanded across assets, beneficiaries, vault, lockbox/accounts, heirlooms, memoirs, Soul Log diary/voice notes, directives, forms, and time capsules.
- Trustee role support across:
  - `web/src/lib/invitations.ts`
  - `web/src/routes/estates.$estateId.beneficiaries.tsx`
  - `firestore.rules`
  - `web/src/lib/auth.tsx`
  - `web/src/lib/firestore.ts`
  - `web/src/components/guards/IdentityGate.tsx`
  - `web/src/routes/estates.$estateId.tsx`
  - `web/src/components/layout/Sidebar.tsx`
  - `web/src/lib/email-templates.ts`
  - `web/src/components/estate/InviteTeamMember.tsx`
  - `web/src/components/identity/AttestationForm.tsx`
  - `web/src/components/estate/README.md`
  - `web/src/lib/invitations.test.ts`

Prior verification for this pass:

- `cd web && npm run typecheck`: PASS
- `cd web && npx vitest run src/lib/invitations.test.ts src/components/estate/ShepherdNudge.test.tsx`: PASS, 28 tests
- `cd web && npm run build`: PASS with existing chunk/font warnings

Router coordination:

- Sent to Claude: `20260605-175125-codex-finalwishes-claude-finalwishes-shared-finalwishes-persona-safe-tuesday-acceptance-bar`
- Current Codex inbox was clear when checked.

Do not overwrite Claude's changes if they arrive. Pull/read router items before committing.

---

## Tuesday Completion Plan

### Phase 1 - Persona Source Of Truth

- Create or centralize a persona/role access map shared by sidebar, route guards, quick actions, Shepherd actions, and tests.
- Normalize role naming:
  - canonical data role: `heir`
  - display label: `Beneficiary`
  - accepted legacy alias: `beneficiary` only as a label/compat alias, not a new data role unless already persisted.
- Use estate-specific role first: `estateUser?.role ?? profile?.role ?? 'principal'`.
- Ensure `principal` on Estate A can be `heir`, `executor`, `trustee`, `legal`, or `cpa` on Estate B.

### Phase 2 - Hard Route Guards

- Add a route-level role guard around estate child routes.
- Sidebar hiding is not enough.
- Forbidden route behavior:
  - show a warm Shepherd-guided "This area is not part of your role" state, or redirect to that persona's dashboard.
  - never expose private data during the loading or blocked state.
- Add tests for direct URL attempts by heir/executor/legal/CPA/trustee.

### Phase 3 - Persona Dashboards

- Principal dashboard: living legacy completion, creation actions, Shepherd next steps.
- Heir dashboard: sacred first moment, shared letter/voice/memory first, then assigned assets/events/documents.
- Executor dashboard: verification, death/status reporting, probate/guardian, settlement checklist, quorum, authorized evidence.
- Trustee dashboard: trust assets/documents/distribution guidance.
- Legal dashboard: document/directive review workspace.
- CPA dashboard: financial/accounting workspace.
- Admin dashboard: internal support only.

Do the smallest practical implementation for Tuesday: persona-specific panels and action sets can share components, but the visible content must be meaningfully different.

### Phase 4 - Feature Completeness Pass

For every major object, verify Create, Read, Update, Delete or explain why Delete is disabled:

- Users/profile
- Estates
- Assets including financial, bank, all accounts, real estate, vehicles, digital, personal property
- Lockbox credentials/accounts
- Beneficiaries/heirs
- Executors
- Trustees
- Legal counsel/lawyer accounts
- CPA advisors
- Vault documents: wills, trusts, POAs, deeds, insurance, financial, medical, other
- Directives
- Soul Log diary entries: text, audio/voice note, video
- Memoirs/photos/videos
- Heirlooms/jewelry
- Life chapters
- Time capsules
- Events/RSVP
- Obituary/final record
- Notifications

If a CRUD action is intentionally unavailable for security or legal reasons, surface the reason in UI and tests.

### Phase 5 - Shepherd Everywhere

- Shepherd must know the user's persona and current route.
- Shepherd prompts must only suggest allowed actions for that persona.
- Shepherd should explain hidden/blocked flows without shame or confusion.
- Shepherd should provide next actions after every create/update/delete.
- For heirs, Shepherd tone should honor the sacred moment, not administrative productivity.
- For principals, Shepherd tone should be life-first.
- For fiduciaries, Shepherd tone should be calm, precise, and task-oriented.

---

## Verification Required Before Tuesday Demo

Run and capture evidence:

- `cd web && npm run typecheck`
- `cd web && npx vitest run`
- Add focused tests for persona access map and direct route guard behavior.
- `cd web && npm run build`
- Run browser verification on local app:
  - principal sees owner build flows and Shepherd create actions
  - heir sees sacred first moment and cannot direct-URL owner-only routes
  - executor sees settlement/probate and cannot direct-URL private owner diary creation
  - trustee sees trustee-appropriate authorized trust/asset flows
  - legal sees document/directive review only
  - cpa sees financial/accounting surfaces only
- Check DevTools for zero runtime errors.
- Check Firestore rules coverage if rules changed.

---

## Guardrails

- Do not resurrect mobile, desktop, full state probate engines, direct Plaid, Lob, or other deferred scope for Tuesday.
- Do not expose raw PII, account numbers, URLs with sensitive slugs, or private owner media to unauthorized personas.
- Do not rely on sidebar filtering as authorization.
- Do not make the heir experience a generic dashboard.
- Do not make Shepherd suggest forbidden actions.
- Do not commit without updating `CHANGELOG.md` and relevant docs if code changes are included.
- Do not push until Claude/Codex router coordination is reconciled.

---

## Start Commands

```bash
cd /Users/thekryptodragon/Development/FinalWishes
git status --short
sirsi router pull codex-finalwishes
cd web && npm run typecheck
```

Current active collaboration thread:

- `thr-3edb6c3ce0806019`

