# FinalWishes — Continuation Prompt (2026-06-03)

Resume name: **"FinalWishes guided process"**. Paste this into a fresh session to continue.

## Context: what this session was about
A live buyer demo (owner = Tameeka Lockhart, her real account `tameekalockhart@gmail.com`)
failed across the board. Root-causing it uncovered systemic bugs, then the owner
directed a product reframe: make FinalWishes a **guided, resumable, premium** estate
process (not a tool-jumble), with **Shepherd as the front door** and the **garish/childish
design overhauled**. Work is done in conjunction with **codex-finalwishes** (router items
under `~/Development/sirsi-pantheon/.agents/idea-router/items/`; codex has no live worker
on this host — trigger via `/Applications/Codex.app/Contents/Resources/codex exec -C <repo> --sandbox read-only -`).

## SHIPPED THIS SESSION (all on main, deployed via CI)
1. **Removed demo mode entirely** (was a hardcoded fake session bypassing real Firebase auth — the actual reason "everything failed" in the demo). Frontend + backend (`DEMO_MODE`/`demo-token` gone). NOTE: auto-memory still says `/login?demo=true` — that is STALE, demo is GONE.
2. **THE production bug**: Cloud Run API had **no `GOOGLE_CLOUD_PROJECT` env var** → it ran in local-dev mode with **nil Firestore + Storage clients** → every upload + Firestore-backed RPC failed/returned mock data. Fixed: set the env var on the service (rev `finalwishes-api-00064-fk5`) + pinned it in `.github/workflows/firebase-hosting-merge.yml`; granted the runtime compute SA `roles/iam.serviceAccountTokenCreator` to sign V4 upload URLs. **Verified live end-to-end** (real token → GenerateUploadUrl 200 → PUT → GET).
3. **All 15 estate RPCs return 200** (probed live with a minted ID token). Firestore-direct surfaces (soul-log, directives, life-chapters, heirlooms) verified writing under live security rules with the exact app shapes.
4. **Family-member display fixed**: heirs created `status:'pending'` were filtered out; `useEstateHeirs` now shows pending/invited, and BOTH Cloud Functions (`autoMatchInvitation`, `autoMatchOnInvitation`) now flip the heir/executor subcollection doc to `active` on link.
5. **Estate unification** (codex-reviewed, 3 FAIL rounds → PASS): Tameeka had 3 duplicate "Lockhart Family Estate" records; unified into the real one `2Q1oyBTqYox4LwI8ZwRc` (she is principal, 2 heirs). Fail-closed migration committed at `scripts/unify_tameeka_estates.py` (DRY_RUN=True by default).
6. **Login regression** (was hitting ALL accounts): returning users were dumped on `/estates/create` (forced re-personalize). Fixed with a `profileResolved` flag in `web/src/lib/auth.tsx` (distinguishes not-loaded / no-doc / failed) + a create-page guard. All new-vs-returning routing gates on `profileResolved`, not `!loading`.
7. **GUIDED-PROCESS BUILD (the reframe), codex build-order:**
   - **C0** deterministic guidance Score (`api/internal/guidance/handler.go`: `Step.Optional`, Priority sort, `nextAction` = lowest-priority incomplete *core* step, completion% over completable steps) + fixed `--font-heading` → Cinzel (was wrongly Geist).
   - **C1** `ShepherdCompanion.tsx` docked front-door companion (right panel desktop / launcher+overlay mobile, symmetric open/close) consuming `useGuidanceScore` — greets by name, shows progress, presents the next step. Wired into `estates.$estateId.tsx` after OwnerWelcome.
   - **C2** wizard persistence (`web/src/lib/wizardDraft.ts` + `estates.create.tsx`): localStorage draft, 14-day TTL, `profileResolved`-gated hydration, Resume/Start-over, cleared on create. NO partial Firestore estate.
   - **C3** `useResumables.ts` + ShepherdCompanion "Continue where you left off" (draft directives + draft obituary).
   - **C4** design sweep of **6 core surfaces** (dashboard, beneficiaries, soul-log, heirlooms, directives, life-chapters): ~300 hardcoded hex → tokens (`var(--royal)`, `var(--gold)`, slate scale), every rainbow accent collapsed to gold, Cinzel headings.

Last commit: `55c092c`. CI green/deploying. tsc clean, 172 vitest tests pass.

## NEXT (not done)
- **Finish the design sweep** — remaining ~34 surfaces (vault, timecapsule, lockbox, memoirs, obituary, settings, landing, components/*). Same token map as C4. Parallelize with agents on disjoint files; codex-review each batch; screenshots ideal (no repo-wide codemod).
- **C5 — multi-state Will/Trust/POA**: LEGAL-GATED. Multi-state POA can reuse the existing `api/internal/forms` coordinate-overlay engine (one CoordinateMap + SHA-pinned official blank per form). Will/Trust need official blanks or attorney templates + legal review — **never LLM-authored**. Owner/legal decision required.
- **Spawned follow-up** (chip): explicit `profileResolved` already done; the e2e specs (`web/e2e/`) need `@playwright/test` and a returning-user test asserting login → dashboard (not /estates/create).
- **Latent**: 7-day signed-URL display expiry for media uploaded >7 days ago (store storage key, sign on read like `download.go`). Mobile render-cascade audit (set-state-in-effect sites).

## Working notes
- This is an npm **workspace** — node_modules is hoisted to repo ROOT (`FinalWishes/node_modules`), not `web/`. Run tooling from there (`FinalWishes/node_modules/.bin/{tsc,vitest,eslint}`) or `npx` from `web/`. `npm ci` must run from the repo root.
- Pre-push Ma'at gate runs lint+typecheck+build; a broken local install will block the push (not a code problem).
- Real accounts (do NOT reset passwords): tameekalockhart@gmail.com (uid fjhdz…, estate 2Q1oy), me@carshenaross.com, cylton@cylton.com (estate cOydeh…), cylton@sirsi.ai. Plus 4 `*@finalwishes.app` role-test accounts (owner chose to KEEP).
- Verification creds: `gcloud ... --account=claude-agent@finalwishes-prod.iam.gserviceaccount.com` (Firestore REST + token minting via principal@ password-set trick). Web API key in `web/src/lib/firebase.ts`.
