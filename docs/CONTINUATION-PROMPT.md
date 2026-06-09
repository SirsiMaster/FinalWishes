# FinalWishes — Continuation Prompt
**Version:** 23.0 — **Date:** June 9, 2026 — **Session:** Non-mobile GA hardening + E2E + persona-safety (claude-finalwishes, codex OOO)

> Read this first on resume. It is the self-contained state. Be rooted in `~/Development/FinalWishes`.
> Resume name: **"FinalWishes"**. Router identity: **claude-finalwishes** (re-register on resume — see §6).

---

## 1. Current State (one screen)

Non-mobile **Tier-1 web product is engineering-complete, hardened, E2E-verified, and deployed** to
`https://finalwishes-prod.web.app` (CI green; the live bundle == local build). GA is gated almost
entirely on **owner operational tasks + a 7-day uptime window**, not missing features.

GA bar = the **Tier-1 GA goal, 12 criteria** (`docs/ga-evidence/README.md`). Status:
- ✅ CR-01 features · ✅ CR-02 tests (226+) · ✅ CR-03 CI green · ✅ CR-04 Dependabot (0 open)
- ⬜ CR-05 finalwishes.app DNS+TLS (**YOU**) · ⬜ CR-06 7-day uptime (passive, pre-staged) · ⬜ CR-07 Stripe portal (**YOU**) · ⬜ CR-08 OpenSign 4 templates (**YOU**; app wiring done)
- 🚫 CR-09 mobile (EXCLUDED — non-mobile) · ◻ CR-10 RAG / CR-12 Google Photos (scope-expansion) · ◻ CR-11 Lob (deferred)

Full owner checklist + procedures: `docs/ga-evidence/RELEASE-READINESS-non-mobile-2026-06-08.md`.

---

## 2. What This Session Shipped (all committed + pushed + CI-green)

**Persona safety (ADR-046)** — `web/src/lib/persona.ts` single source of truth; estate-scoped
`resolveEffectiveRole`; 3 layers: Sidebar (`canAccess`) / `RoleGuard` (Layer-2 route enforcement,
warm blocked state, gated until role definitive) / `PersonaDashboard` `DashboardRouter` (owner timeline
vs **heir sacred HeirDashboard "For You"** vs fiduciary dashboards); `IdentityGate` keyed on estate role;
trustee role full-stack; Phase-5 Shepherd filtered by `canAccess`. Tests: `persona.test.ts` + `RoleGuard.test.ts`.

**Phase-4 CRUD complete** — soul-log delete+edit(title+TipTap), memoirs edit, lockbox edit, timecapsule
edit, notifications mark-read; heir-RSVP bug fixed (narrow `rsvpCount` rule). Obituary delete intentionally absent (legal permanence).

**Security hardening** (`b2bab21`, PASS-ACKed by standin) — fixed a CRITICAL Rules-of-Hooks crash
(notifications.tsx useState-after-return), lockbox persona/rule mismatch (removed lockbox from
executor/trustee/cpa to match principal-only Firestore rule), null-auth `!profile` gates, `rsvpCount`
bounds, IdentityGate loading race.

**Soul Log read-privacy** (`4378a23`, PASS-ACKed) — non-owners can no longer read `private`/`sealed`
entries; rule = `isEstatePrincipal || isAdmin || (canAccessEstate && resource.data.visibility=='shared')`;
non-owner query constrained to shared + new `(visibility,createdAt)` index. Owner path unchanged.

**E2E now real & reliable** — `scripts/e2e-provision.js` (provisions `e2e-principal@finalwishes.app` +
`estate_e2e`, MFA-grace) made the authenticated specs RUN (were skipping). `playwright.config` set serial.
`scripts/e2e-run.sh` paced runner → **31/31 green** vs live prod in one command (smoke 8, authenticated 12,
returning-user 2, life-first 9). Found+fixed a strict-mode selector bug.

**Release infra (3 parallel agents)** — `.github/workflows/e2e-nightly.yml` (scheduled E2E; needs NEW
secret `E2E_TEST_PASSWORD`); CR-06 uptime pre-stage (`scripts/uptime-check-setup.sh` + `uptime-evidence.sh`
+ `docs/sla-evidence/README.md`); persona-safety E2E (`web/e2e/persona-safety.spec.ts` +
`scripts/e2e-provision-personas.js` — principal tests run, heir/executor honestly `test.skip`'d behind the
fiduciary MFA gate). ADR-046 written.

Latest pushed commit: **`032b6b1`**. Recent arc: 27c20b7→ee3a052→…→4378a23→17b3d98→e3da4a5→582a191→032b6b1.

---

## 3. ⚠️ UNCOMMITTED WORK IN THE TREE (otplib MFA-unblock agent, KILLED mid-run)

A background agent was implementing the otplib TOTP unblock so the 6 skipped fiduciary persona tests
RUN. It was **stopped mid-run** (had enrolled MFA + tuned timing — "Principal stays 60s, both fiduciary
blocks now 120s; about to re-run the full spec after the rate window"). Its work is **uncommitted +
UNVERIFIED** on disk (survives /clear):
- `M web/e2e/helpers/auth.ts` (additive MFA-challenge handling at login — must NOT break the non-MFA principal path)
- `M web/e2e/persona-safety.spec.ts` (un-skip when TOTP secret env present)
- `?? scripts/e2e-enroll-mfa.js` (Firebase CLIENT-SDK TOTP enrollment for heir/executor)
- `M web/package.json` + `web/package-lock.json` (added `otplib` devDep) · `M .gitignore` · `D web/test-results/.last-run.json`
- **Known issue:** the agent's `npm i -D otplib` broke LOCAL eslint (`TypeError: expand is not a function`) → the Ma'at pre-push gate fails locally. Fix on resume: `cd web && rm -rf node_modules && npm ci` (or investigate the lock diff). The pushed state uses the OLD lock so server CI is unaffected.

**TO FINISH (resume step 1):** fix local eslint → re-run `web/e2e/persona-safety.spec.ts --workers=1`
(sparingly; the heir/executor secrets are in a gitignored file the agent wrote — check `.gitignore` diff
+ `scripts/e2e-enroll-mfa.js` output) to confirm the 6 fiduciary tests PASS + the principal auth still
works (no regression) → THEN commit + push + route for PASS-ACK. Do NOT loosen security; otplib is test-infra only.

---

## 4. NEXT (priority order)

1. **Finish the otplib persona-E2E unblock** (§3) — verify + commit.
2. **Residual Soul Log per-recipient fix** (the last real security item, now verifiable via the unblocked
   heir E2E): migrate `taggedPeople` (names) → UIDs + add `array-contains(viewerUid)` to the non-owner
   query/rule so a non-owner reads only entries tagged to THEM (today they can read all `shared` entries).
   Data migration + query + rule. Verify with the heir E2E.
3. **Standin PASS-ACK follow-ups** (from the soul-log/hardening review, in MEMORY.md): (a) `canAccessEstate`
   scope, (b) Soul Log `visibility` WRITE rule, (c) heir-view live walk. Address each.
4. **Owner ops** (route a crisp checklist; not mine): CR-05 DNS, CR-07 Stripe portal, CR-08 OpenSign templates.
   Then start **CR-06** (`bash scripts/uptime-check-setup.sh` once finalwishes.app is live → 7-day window).
5. Scope-expansion if directed: CR-12 Google Photos finish, CR-10 RAG corpus. (CR-11 Lob deferred.)

---

## 5. Test data & creds (provisioned in prod, idempotent)
- `e2e-principal@finalwishes.app` / pw `E2eFinalWishes!2026` (estate `estate_e2e`, MFA-grace) — re-run
  `GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/finalwishes-claude-agent.json E2E_PROV_PASSWORD='E2eFinalWishes!2026' node scripts/e2e-provision.js` to reset the grace window before an E2E session.
- persona accounts on `estate_e2e_personas` (principal/heir/executor) via `scripts/e2e-provision-personas.js`.
- SA key: `~/.config/gcloud/finalwishes-claude-agent.json` (Firebase Auth admin + Firestore). firebase-admin is in functions/node_modules.
- Run E2E: `cd web` then `export E2E_TEST_EMAIL=e2e-principal@finalwishes.app E2E_TEST_PASSWORD='E2eFinalWishes!2026'` → `bash scripts/e2e-run.sh` (paced, serial; Go API rate-limits 100/60s, 10-min ban).

---

## 6. Router thread / the dance (keep continuous)
- Identity **claude-finalwishes**. On resume, re-register: `sirsi thread register --agent claude-finalwishes --surface claude --workstream finalwishes`, then keep a SILENT heartbeat (`sirsi thread heartbeat --thread <id>` every 60s; full path `/Users/thekryptodragon/.local/bin/sirsi`).
- **codex is OOO ~06-08→06-10** → route ALL arch-verify/review/PASS-ACK to **claude-codex-standin** (NOT codex-*). Standin has PASS-ACKed soul-log + hardening (3 follow-ups, §4.3).
- Open review item routed: `20260609-030046-…-pass-ack-batch` (E2E reliability + nightly CI + CR-06 + persona E2E). Pull `claude-finalwishes` inbox on resume for replies.

## 7. Start commands
```bash
cd ~/Development/FinalWishes && git status -sb && git log --oneline -5
cd web && rm -rf node_modules && npm ci   # fix the eslint breakage from §3
/Users/thekryptodragon/.local/bin/sirsi router pull claude-finalwishes
```
