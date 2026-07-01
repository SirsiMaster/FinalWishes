# Changelog — FinalWishes

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **Completion Law / Commercialization Gate scaffolding** (`docs/COMMERCIALIZATION_GATE.md`, `.agents/completion.contract.json`) — the two mandatory gate artifacts were missing, so FinalWishes had no machine-validatable release gate (a release-readiness gap in itself). Added the repo-local commercialization profile (classification `commercial-product`; buyer/user roles, primary workflows, willingness-to-pay tiers, trust boundary, done-evidence) and the completion contract (canon docs, 5-closure done-definition, required verification commands). `agent_completion_gate.py check-contract` PASSES; `validate` now enforces per-closure evidence before "done". Refs: ~/Development/AGENTS.md Completion Law + Commercialization Gate.

### Security

- **P0 — removed hardcoded prod test-account passwords + disabled the exposed accounts** (`scripts/create-test-accounts.js`) — the script committed literal passwords (one `Legacy<Role>2025!`-pattern password per role) for four **real, enabled `finalwishes-prod` Auth accounts** (`admin@`/`principal@`/`executor@`/`heir@finalwishes.app`, `admin@` = admin role), so anyone reading the repo had valid production credentials (confirmed via Identity Toolkit lookup: all four existed, enabled, `principal@` recently used). **Contained** by disabling all four accounts (reversible), then rewrote the script to generate a strong random password per newly-created account at runtime and print it once — no credentials in the file (Credential & Secret Safety Law, 2026-06-30). The `IMPERSONATE_USER`/`SENDER_EMAIL = admin@sirsi.ai` constant in `functions/index.js` was triaged as a **false positive** — legitimate Gmail domain-wide-delegation sender identity (auth is a SA key from Secret Manager), not a credential or bypass. Note: old passwords remain in git history but are now inert (accounts disabled); rotate + re-enable individually if any account is still needed.

### Added

- **Obituary Shepherd — guided "tell me what happened" obituary writing** (`web/src/components/estate/ObituaryShepherd.tsx`, wired into `web/src/routes/estates.$estateId.obituary.lazy.tsx`) — replaces the blank TipTap editor + one-shot "AI Draft" button (which fired a single canned prompt and dumped a blob) with a conversational, guided experience: the Shepherd opens by listening ("tell me what happened"), walks through gentle questions one at a time — pre-filled from the estate's heirs + service events so the family confirms rather than retypes — then composes a dignified draft via `/guidance/assist-obituary` (Claude Sonnet, warm) and lets them refine it conversationally (Warmer / Shorter / More formal / More about family / Add faith). Scripted empathy for the questions; AI only for composition. Royal Neo-Deco (Cinzel, royal + gold). Voice adapts to planning mode (self vs. after-loss). Refs: CLAUDE.md §"The Shepherd", ADR-048.
- **Obituary Shepherd — full in-conversation memorial spine** (`web/src/components/estate/ObituaryShepherd.tsx` + page wiring) — after "Use this draft", the Shepherd no longer closes; it continues through three guided steps, all without leaving the conversation (owner decision: fully in-conversation, on the obituary page now, graduating to a Memorial hub later): (1) **Photos** — upload memorial photos from the device (first becomes the portrait if unset); (2) **Recipients** — select family from heirs-with-emails or add anyone by email; (3) **Share** — print/download the PDF, email the obituary to the chosen recipients, or publish a public memorial + link (social), each a tap-permissioned action with inline success/failure, then a closing "It's ready" moment. Reuses the existing PDF/mail/public_memorials machinery (Rule 0) via page-owned callbacks; `handleShare` refactored to share its email body with the new `handleEmailTo(recipients)`. Google Photos import deferred (heirlooms-scoped, returns counts not URLs — follow-up). Refs: CLAUDE.md §"The Shepherd", ADR-048.

### Fixed

- **Post-deploy stale lazy-chunk MIME failure now self-heals** (`web/src/lib/chunk-reload.ts`, imported first in `web/src/main.tsx`) — after a deploy, a browser holding an old index can request a content-hashed chunk (`/assets/<name>-<hash>.js`) that no longer exists; Firebase Hosting's catch-all SPA rewrite serves `index.html` (`text/html`) for it, so the dynamic import fails — in WebKit/iOS with "'text/html' is not a valid JavaScript MIME type". A tiny handler listens for Vite's `vite:preloadError` plus the raw `unhandledrejection` (chunk/MIME signatures) and reloads the page **once** (session-guarded against reload loops; guard cleared after a clean load so a later deploy can retry). The Firebase `**`→`/index.html` rewrite can't cleanly exclude `/assets/**`, so the canonical fix is client-side. Closes the F8 follow-up surfaced by the WebKit persona matrix (F1). Refs: docs/verification/PERSONA_MATRIX.md.
- **Settings showed team-invite management to fiduciaries — `getEstateInvitations` permission-denied** (`web/src/routes/estates.$estateId.settings.tsx`) — `InviteTeamMember` rendered ungated on the settings page (every persona reaches settings for MFA) and fetched `estate_invitations` on mount, which `firestore.rules` restricts to `isEstatePrincipal` — so executor/trustee/cpa hit a `permission-denied` console error (same estate-scoped cross-read class as the lockbox + HeirWelcome fixes; the component used the GLOBAL `profile.role` which the persona-QA seed sets to principal for all). Fix: gate the render on `useIsEstatePrincipal(estateId)` (mirrors the firestore rule). Caught by the iOS-engine (WebKit) verification matrix (F1).

- **HeirWelcome read the estate owner's `users/<principalId>` doc — `permission-denied` for every heir** (`web/src/components/guards/HeirWelcome.tsx`) — the heir's sacred-moment welcome fetched `users/${estate.principalId}` to show the owner's name/photo/lifespan, but Firestore (correctly) denies a heir any other user's doc, so the read **always** failed: the photo + lifespan never loaded for heirs in prod, only the name fallback showed, and every render logged a `permission-denied` console error (same cross-user-read class as the lockbox bug). Fix: drop the futile read; source the owner's display name from the readable estate doc (`estate.ownerName || estate.name`); photo/lifespan gracefully absent (as they already were). **Caught by the iOS-engine (WebKit) verification matrix** — Chromium masked it (the welcome stayed dismissed via localStorage; WebKit re-showed it), which is exactly the "don't assume same-bundle = same-render" value of claude-home's bind Note 1. Follow-up: denormalize owner photo + lifespan onto the estate doc to restore the full memorial welcome for heirs.
- **iOS status bar is now light (white) content** (`web/ios/App/App/Info.plist`) — the app chrome behind the status bar is Royal Blue (`#133378`, `capacitor.config` backgroundColor + `contentInset: always`), on which iOS-default black status-bar text is barely legible. Set `UIViewControllerBasedStatusBarAppearance=false` + `UIStatusBarStyle=UIStatusBarStyleLightContent`. Verified in the iPhone 17 Pro simulator: time + WiFi/battery render white/legible.

### Fixed

- **Persona access consistency — `heir` now lists `estates`** (`web/src/lib/persona.ts`) — every persona except heir had `estates` in `PERSONA_ACCESS`, yet that route is ungated in RoleGuard `GUARDED_SECTIONS` (universal estate-shell nav) and self-scoped to the user's OWN `estate_users` records (`useUserEstates(userId)` — no cross-estate leak). The per-role live verification matrix surfaced the omission (`heir/estates` rendered the switcher on a route PERSONA_ACCESS called blocked). Aligned heir to the safe reality; no route behavior change.

### Security

- **npm audit sweep — 6 advisories → 0 (lockfile-only, non-breaking)** (`package-lock.json`) — cleared all 6 advisories present on `main` (1 low, 2 moderate, 3 high) via `npm audit fix` (semver-compatible only, no `--force`): **dompurify → 3.4.10** (was ≤3.4.8; runtime HTML-sanitizer / XSS path — user-reachable), **protobufjs → 7.6.4** (was ≤7.6.2; via ConnectRPC — prototype-shadow + DoS), **vite → 8.0.16** (was 8.0.0–8.0.15; dev-server `fs.deny` bypass), plus `@babel/core`, `hono`, `js-yaml` bumped within compatible ranges. `package.json` is **unchanged** (every fix is lockfile-level inside existing `^` ranges → zero dependency-API surface change). Verified no regression: web build ✓, `vitest` 208/208 ✓, `eslint` ✓, `tsc --noEmit` ✓, `npm audit` → **0**.

### Added

- **iOS app — TestFlight / device-build prep (ADR-048)** (`web/ios/App/App.xcodeproj/project.pbxproj`, `web/ios/App/App/Info.plist`, `web/ios/App/App/Assets.xcassets/`, `web/assets/`, `docs/ios/TESTFLIGHT.md`) — made the Capacitor shell signable + shippable against the now-active Apple Developer Program (Team `9D382WV988`): wired `DEVELOPMENT_TEAM = 9D382WV988` into both Debug + Release configs (automatic signing); generated **branded app icon + splash** (the gold guardian mark `#C8A951` on Royal Blue `#133378`, replacing Capacitor's blank default) from 1024²/2732² opaque sources; set `ITSAppUsesNonExemptEncryption = false` for export compliance (standard HTTPS/Firebase is exempt → no per-upload TestFlight prompt). Added `docs/ios/TESTFLIGHT.md` — the exact in-repo-done vs OWNER-remaining runbook to App Store Connect. The icon generator (`@capacitor/assets`) was removed after use (one-shot tool; assets are committed) so the dependency tree stays **vuln-neutral vs `origin/main`** (verified: identical 6 pre-existing advisories, 0 introduced — pre-existing set flagged for a separate `fix/npm-audit-sweep`). Auth confirmed email/password-only → works in the WKWebView as-is, and Apple's "Sign in with Apple" rule (Guideline 4.8) does not trigger. Verified: `xcodebuild` **BUILD SUCCEEDED** for `iphonesimulator` with the new signing + branded assets; icon render confirmed gold-on-royal, opaque (no alpha). Native payment / native-auth plugin / APNs remain deferred follow-ups.
- **iOS app — Capacitor web-to-native shell (ADR-048)** (`web/capacitor.config.ts`, `web/ios/`, `web/src/lib/platform.ts`) — the native iOS target wraps the EXISTING production Vite build in a Capacitor 8 (SPM) shell, served offline from `capacitor://localhost` (not a remote web-view). `appId: ai.sirsi.finalwishes`, Royal-Blue (`#133378`) launch background (no white flash). Verified end-to-end: `xcodebuild` **BUILD SUCCEEDED** for `iphonesimulator`, and the app launches + renders the Royal Neo-Deco landing in the iPhone 17 Pro simulator. Pricing/upgrade surfaces are HIDDEN inside the native shell for now (`isNative()`/`showPricing()` gate the Sidebar "Upgrade Plan", the `pricing` route → redirect to dashboard, and the landing `#pricing` section + nav/footer links) because pricing is undecided and Apple Guideline 3.1.1 forbids in-app Stripe billing of digital subscriptions; the web bundle is byte-unaffected (`isNative()` is false on web). Native payment (StoreKit/IAP hybrid), native Firebase Auth plugin, and APNs push are deferred follow-ups. Unblocked by the active Apple Developer Program (Team `9D382WV988`).
- **Shared-services signing provider — consume Sirsi first, dissociated fallback (ADR-047)** (`api/internal/opensign/provider.go`, `handler.go`, `webhook.go`) — the OpenSign create flow now goes through a `SigningProvider` that CONSUMES THE SIRSI SIGN SERVICE FIRST (`SERVICES_REGISTRY` endpoint, Bearer/ADR-006 HMAC, tenant-attributed) and falls back to dissociated/self-hosted infra ONLY on a Sirsi-org **availability** failure (transport/timeout/5xx) — never on a clean business rejection (4xx), which is surfaced. Each result records `ServedBy` for consumption observability. Realizes the owner's shared-services model (tenants buy Sirsi services; resilient to Sirsi-org outages) portfolio-wide. The server-side envelope→directive binding + fail-closed webhook are unchanged. Config via `SIRSI_SIGN_*` (primary) + `OPENSIGN_*` (fallback) env/secrets.
- **Google Photos import — frontend flow (CR-12, ADR-045)** (`web/src/lib/google-photos-import.ts`, `web/src/routes/estates.$estateId.heirlooms.tsx`) — wires the existing backend Picker routes (`/api/v1/heirlooms/{estateId}/google-photos/*`) to the UI: an "Import from Google Photos" button on the Heirloom Registry obtains a Picker-scoped Google OAuth token via Google Identity Services (works for email/password users — no Firebase session disruption), creates a picking session, opens Google's own picker, polls until the user finishes, then triggers the server-side import (download + de-dup + store as heirlooms). Realtime list shows imports automatically. GIS load retries on script error + a 90s token timeout guards a dismissed popup. **OWNER PREREQUISITES (build-time/infra):** enable the Google Photos Picker API on `finalwishes-prod`, add `…/auth/photospicker.mediaitems.readonly` to the OAuth consent screen, and set `VITE_GOOGLE_OAUTH_CLIENT_ID`. Until configured, the button reports "not configured." Full end-to-end verification requires those prereqs.
- **Legal RAG corpus ingestion pipeline (CR-10, ADR-044)** (`api/cmd/corpus-ingest`, `api/internal/guidance/rag.go`, `docs/legal-corpus/manifest.md`) — an idempotent CLI that loads the Shepherd's legal corpus (`legal_corpus_sources` + `legal_corpus_chunks`, pgvector) from a manifest of **owner-verified, verbatim** statute text. Chunks on blank-line paragraph boundaries (≤~2000 chars, never mid-sentence), embeds each chunk with `gemini-embedding-001`/`RETRIEVAL_DOCUMENT` (new `EmbedDocument` — asymmetric to the retriever's `RETRIEVAL_QUERY`), and upserts by id. `-dry-run` parses+chunks with no DB/Vertex. The pipeline NEVER generates/paraphrases/truncates legal text (Rule 9); engineering owns the pipeline, owner/legal owns sourcing the verified text (IL/MD/MN launch statutes). Built + vetted + dry-run verified; corpus population + the CR-10 evidence run remain the owner/data step.
- **CI now runs the Cloud Functions Jest suite** (`.github/workflows/firebase-hosting-pull-request.yml`, `.github/workflows/firebase-hosting-merge.yml`) — added a `functions-test` job (ubuntu-latest, Node 22, `working-directory: ./functions`, `npm ci` → `npm test`) to both PR and merge workflows. Previously `functions/index.test.js` (18 tests covering `autoMatchInvitation` backfill, `sendMail` recipient validation, MIME header-injection guards, Guardian inactivity) ran in neither CI workflow and could silently rot while functions were still deployed. The job now gates the PR aggregate (`build_and_preview`) alongside `api-check`/`web-test`, and gates all three merge deploys (`deploy-hosting`, `deploy-api`, `deploy-functions`) so no release ships with red functions tests. Closes the deferred residual from the completion wave (the fix-bucket globs excluded workflow YAML).

### Changed

- **Browser-profile lock — FinalWishes dev is locked to Chrome `Profile 15` / `cylton@sirsi.ai` (Rule 28 updated)** (`CLAUDE.md`, workspace-root `~/Development/CLAUDE.md`) — owner directive: all FinalWishes browser work (subagents + claude-in-chrome MCP) now executes in **`Profile 15`** (account `cylton@sirsi.ai`, Cylton Collymore; launch `--profile-directory="Profile 15"`). This profile is **dual-locked** to its original use (Sirsi founder identity + Apple Developer / App Store Connect account holder, Team `9D382WV988` — where the iOS app signs/distributes) AND to FinalWishes development (App Store Connect, Firebase/GCP `finalwishes-prod`, Google OAuth/Photos-Picker, Stripe, live-site verification). **Supersedes** the prior `ccollymo@alumni.chicagobooth.edu` designation; the authoritative definition lives in the workspace-root `~/Development/CLAUDE.md` ("Browser Profile Locks"), with `FinalWishes/CLAUDE.md` Rule 28 kept in sync.
- **Scrubbed unowned `finalwishes.app` references** (`web/src/routes/privacy.tsx`, `terms.tsx`, `components/landing/ProductShowcase.tsx`, `lib/email-templates.ts`, `lib/mfa.ts`, `lib/README-email.md`, `docs/GOOGLE-PHOTOS-VERIFICATION.md`, `docs/user-guides/*`) — owner confirmed `finalwishes.app` is NOT owned; `finalwishes-prod.web.app` is the sole production site. User-facing website URLs (privacy/terms footer, product-showcase mockup, Photos verification runbook) now point at `https://finalwishes-prod.web.app`; contact/sender emails → `support@sirsi.ai`/`noreply@sirsi.ai` (Gmail-API sender already delegates via admin@sirsi.ai). Test-account identifiers (`*@finalwishes.app`, Firebase auth IDs the owner keeps) left intact.
- **OpenSign signer is now the estate PRINCIPAL, not the caller — with a verified-email gate (ADR-047; claude-home signer=principal decision 2026-06-14)** (`api/internal/opensign/handler.go`, `signer.go`, `webhook.go`, `cmd/api/main.go`) — a legal directive/POA must be signed BY the estate principal whose estate it governs; an executor/admin only INITIATES the ceremony. `HandleCreateEnvelope` no longer takes the signer identity from the authenticated caller's token claims. It now resolves the signer SERVER-SIDE from `estates/{id}.principalId` → Firebase Auth (verified email + display name), and **REJECTS with HTTP 403 if the principal's email is not verified** (signing cannot proceed against an unverified address). Missing/empty `principalId` → 400; auth client unavailable → 503; Firebase lookup failure → 502. The caller is recorded only as `initiatedBy` in the server-only `signing_envelopes` audit record (`createdBy` retained for back-compat; `signerEmail` now persisted). `NewWebhookHandler` gains an `*firebaseAuth.Client` param (threaded from `main.go`, declared at outer scope so it is in scope at all 3 call sites). Resolution is fronted by a small `signerResolver` interface (production `firebaseSignerResolver` backed by Firestore+Firebase Auth; a fake in tests) — the auth client cannot be constructed offline. This supersedes the prior "signer = authenticated caller" behavior. `provider.go` untouched.
- **Soul Log per-recipient narrowing — `sharedWith` UIDs (ADR-046 #1 residual closed)** (`firestore.rules`, `firestore.indexes.json`, `web/src/routes/estates.$estateId.soul-log.lazy.tsx`, `web/src/lib/firestore.ts`, `functions/index.js`, `scripts/migrate-soullog-sharedwith.js`) — a non-owner could read EVERY `shared` Soul Log entry (incl. other heirs'); now a non-owner reads only entries shared WITH THEM. Entries carry `sharedWith` (array of heir UIDs); the read rule + non-owner query gate on `request.auth.uid in resource.data.sharedWith` (array-contains, new composite index). The composer resolves tagged heir names→UIDs at save; `autoMatchInvitation` backfills a heir's UID into `sharedWith` of entries tagged with their name when they accept (so pre-registration sharing resolves). Ships an idempotent DRY-RUN-by-default migration for existing entries (`scripts/migrate-soullog-sharedwith.js` — owner runs `--apply` AFTER review). **Migration must run before the rule deploys, as the rule/query is breaking for un-migrated entries.**

### Fixed

- **Lockbox permission-denied console error on every estate page (all non-principal personas)** (`web/src/lib/firestore.ts`, `web/src/lib/search.ts`, `web/src/routes/estates.$estateId.settings.tsx`) — the always-mounted global search (`AdminHeader` → `useEstateSearch`) and the settings page (reachable by every persona for MFA) both called `useLockboxItems(estateId)` unconditionally. Lockbox is principal/admin-only (`firestore.rules` `isEstatePrincipal()||isAdmin()`), so for heir/executor/trustee/legal/cpa the subscription threw `Missing or insufficient permissions` on **every** page (caught by the live per-role verification matrix — 103/126 cells). Nothing leaked (the rule correctly denied), but it's console noise + a privacy smell (attempting to read credentials for users who can't). Fix: `useLockboxItems(estateId, enabled=true)` gains an `enabled` gate (lockbox ROUTE keeps default-true behavior); new `useIsEstatePrincipal(estateId)` (mirrors the rule: `estate.principalId===uid||admin`) gates the two always-mounted call sites. Found via `scripts/verify-persona-matrix.mjs` (NEW — Playwright per-role×per-surface live-render harness against finalwishes-prod; 6 personas × 21 sections, captures console/render/permission-state/screenshot). Also fixed `scripts/seed-persona-qa.js` to set the canonical `principalId` (was only `ownerId`, so even persona-principal failed `isEstatePrincipal`).
- **Guidance/score fetch logged a spurious CORS/network error when navigating away mid-request** (`web/src/lib/useGuidanceScore.ts`) — the ~1.3s `/api/v1/guidance/score` call (fires on every estate page) was not aborted on unmount, so a fast route change surfaced the cancelled cross-origin request as a console error. The endpoint itself returns 200 + correct CORS (verified) and the UI already degraded gracefully — this only suppresses the cancel noise via `AbortController` (AbortError is treated as expected, not a failure).
- **Hosting cache headers — `index.html` was cached 1h, hiding fresh deploys** (`firebase.json`) — Firebase's default served `/index.html` with `max-age=3600`, so after a deploy users (and the CDN edge) kept the OLD index pointing at OLD JS bundles for up to an hour (this is why the card-regression fix looked 'not deployed'). Now `/index.html` + `/` are `no-cache, no-store, must-revalidate` (deploys are instantly visible) while content-hashed `/assets/**` are `immutable, max-age=1y`. Adds `scripts/verify-live-cards.mjs` — a real-Chromium live-render check (the in-browser verification that should gate UI 'done' claims).
- **CRITICAL UI regression — custom-background Cards rendered white (empty-looking landing cards)** (`web/src/components/ui/card.tsx`) — the shadcn Card refactor applied the surface background as a variant-scoped `data-[variant=default]:bg-card`, whose attribute-selector specificity silently overrode any caller `bg-[var(--royal)]`/`bg-*` className. Result: ~40 cards across the app (incl. the landing "Three Steps" and "Built for Real Families" royal cards) rendered as plain white, making their white text invisible (empty cards). Fix: make `bg-card` a PLAIN base class so tailwind-merge dedupes it against a caller's custom `bg-*` and the caller wins (glass variant still overrides via its own attribute selector). Verified in-browser: the 9 royal cards now render `rgb(19,51,120)` with visible text; full-page audit shows 0 invisible-text elements; login + dashboard render confirmed.
- **PR test contract drift — email-only invitations and settings MFA access** (`web/src/lib/invitations.test.ts`, `web/src/lib/persona.test.ts`, `web/src/components/guards/RoleGuard.test.ts`) — aligned Vitest expectations with the documented production contract: invitations remain email-only until a live SMS provider/function exists, so phone input from older callers is ignored rather than persisted or queued; fiduciary/heir access to `settings` remains allowed for MFA/profile security while protected estate surfaces stay blocked.
- **HIGH — OpenSign signing ceremony now estate-bound (H1 create-side closed; Assiduous pattern)** (`api/internal/opensign/handler.go`, `webhook.go`, `cmd/api/main.go`, `firestore.rules`, `web/src/routes/estates.$estateId.directives.lazy.tsx`) — `CreateEnvelopeHandler` was a standalone func that took `signerEmail`/templateId from the body with **no estate binding**, and the webhook stamped the verified result onto **whatever directive matched the envelopeId across ALL estates** (a client-writable field). Adopted the proven Assiduous `opensign.Service` pattern: the create handler is now a method on the fs-bearing handler, requires `estateId`+`directiveId`, verifies estate **writer** access, and records a **server-only `signing_envelopes/{envelopeId}` → (estate,directive) mapping**; `handleSigningCompleted`/`handleSigningDeclined`/status-poll resolve that mapping with a direct GET and update **only the bound directive** — the signing evidence chain can no longer be redirected to another estate's directive. The signer identity is now forced to the AUTHENTICATED caller (token email claim) — a writer can no longer name an arbitrary signerEmail (claude-home PR #4 review). (The unauthenticated webhook **forge** was already closed separately.) Added `auth.ContextWithUserID` test helper.

### Added

- **Persona-safety E2E now runs the fiduciary flows live (otplib TOTP unblock)** (`web/e2e/helpers/auth.ts`, `web/e2e/persona-safety.spec.ts`, `scripts/e2e-enroll-mfa.js`, `otplib` devDep) — the 6 heir/executor persona tests were `test.skip`'d behind the IdentityGate fiduciary MFA gate; `scripts/e2e-enroll-mfa.js` enrolls a real TOTP factor (Firebase client SDK) and the login helper now computes the live code at the `#modal-mfa` challenge (ADDITIVE — the non-MFA principal path is untouched; TOTP only engages when the challenge actually shows; secrets stay in gitignored `scripts/.e2e-mfa-secrets.env`). Each fiduciary persona logs in ONCE (Firebase Auth persists via indexedDB which Playwright storageState can't capture, and TOTP codes are single-use → re-login-per-test hit anti-replay), walking all its assertions in one session. **Verified live: 4/4 green** — principal sees everything + owner timeline; heir blocked from vault/lockbox, lands on the sacred HeirDashboard "For You", soul-log reachable+scoped; executor blocked from lockbox, lands on Settlement.
- **Continuation prompt v23** (`docs/CONTINUATION-PROMPT.md`) — refreshed self-contained resume baseline: non-mobile Tier-1 engineering-complete + the full session arc, the UNCOMMITTED otplib persona-E2E work + local-eslint note, prioritized NEXT, test creds, and the claude-finalwishes router/dance state. Companion thoth auto-memory updated.
- **ADR-046 — Persona-Based Estate Access Control** (`docs/ADR-046-PERSONA-ACCESS-CONTROL.md`, `docs/ADR-INDEX.md`) — codifies (Rule 8) the session's biggest architectural decision: the `persona.ts` single source of truth, estate-scoped `resolveEffectiveRole`, the 3-layer model (nav / RoleGuard route enforcement / persona dashboards), `IdentityGate` keyed on the estate role, and the Firestore rules as the security boundary (lockbox principal-only, Soul Log read = owner-all / others-shared-only, events `rsvpCount`-only accessor update). Records the open residual (Soul Log per-recipient `taggedPeople`→UID migration) and the alternatives considered.
- **Nightly E2E CI** (`.github/workflows/e2e-nightly.yml`) — scheduled (09:00 UTC) + manual workflow that provisions the E2E account (`scripts/e2e-provision.js`, SA key from `GCP_SA_KEY_FINALWISHES_PROD`) and runs the **paced** suite (`scripts/e2e-run.sh`) against prod, uploading the Playwright report/test-results as artifacts. Scheduled (not per-push) to respect the Go API rate-limiter. **Requires a new repo secret `E2E_TEST_PASSWORD`** (used for both provision + run). The runtime SA also needs Firebase Auth admin + Firestore write on `finalwishes-prod`.
- **CR-06 uptime monitoring pre-staged** (`scripts/uptime-check-setup.sh`, `scripts/uptime-evidence.sh`, `docs/sla-evidence/README.md`) — idempotent gcloud script that creates a Cloud Monitoring HTTPS uptime check (5 regions, `GET /`→2xx, 1-min) + an availability alert policy on `finalwishes.app` (host-overridable), so the GA 7-day window can start the instant DNS cuts over (`bash scripts/uptime-check-setup.sh`). `uptime-evidence.sh` queries the check and emits the `docs/sla-evidence/<start>-to-<end>.md` artifact (per the ga-evidence convention) with the computed availability + MET/NOT-MET verdict. Needs the Monitoring API + `monitoring.editor`/`viewer` on the agent SA.
- **Persona-safety E2E** (`web/e2e/persona-safety.spec.ts`, `scripts/e2e-provision-personas.js`) — provisions one shared estate with a principal + heir + executor (each **global role `principal`**, persona only on the `estate_users` junction — so a green fiduciary assertion can _only_ be explained by `resolveEffectiveRole` letting the estate role win), plus verified `attestations` for fiduciaries. 8 specs: 2 run today (principal sees everything / gets the owner timeline, not the heir "For You"); 6 are written-in-full but **honestly `test.skip`'d** (heir blocked from /vault & /lockbox, heir dashboard = sacred HeirDashboard, heir soul-log shared-only, executor blocked from /lockbox, executor dashboard = Settlement) behind `requireMfaCapableFiduciary()`. **Empirically confirmed on live prod:** a fiduciary with a seeded verified attestation is still stopped by IdentityGate's **MFA** step before RoleGuard renders, and `firebase-admin` v13 cannot enroll TOTP (phone-only) — so the cleanest unblock is real TOTP enrollment + an `otplib`-computed code at login (no production change, no security weakening). _(Decision pending — see report.)_

### Fixed

- **Upload byte-size cap + YouTube status estate-scope** (`api/internal/service/estate/service.go`, `api/internal/youtube/handler.go`, `web/src/routes/estates.$estateId.heirlooms.tsx`, `web/src/routes/estates.$estateId.memoirs.lazy.tsx`) — the V4 PUT signed upload URL now constrains size via `X-Goog-Content-Length-Range:0,<MAX_UPLOAD_BYTES default 100MB>` (client PUTs send the matching header). `youtube GetVideoStatus` now requires `estateId` + an `estate_users` membership check (was authenticated-only).
- **Mail open-relay fully closed (server-side recipient validation)** (`functions/index.js`) — the `createdBy==uid` rule gave attribution but a user could still relay to an ARBITRARY recipient; `sendMail` now validates each recipient before sending and FAILS CLOSED (marks the doc rejected, no send) unless the recipient is a pending `estate_invitations` target, the senders own account email, or a member of an estate the sender belongs to. Covers the two legit writers (invitation email, obituary-to-self).
- **Go 1.26.4 toolchain bump + CI now deploys Firestore indexes** (`api/go.mod`, `go.work`, `.github/workflows/firebase-hosting-merge.yml`) — bumped the toolchain to `go1.26.4` to clear two stdlib CVEs (GO-2026-5039 net/textproto, GO-2026-5037 crypto/x509). Added a `firebase deploy --only firestore:indexes` CI step (`continue-on-error` until the owner grants the CI deploy SA `roles/datastore.indexAdmin`) — closes the systemic gap where composite indexes added since the last manual deploy silently never built.
- **CRITICAL — OpenSign webhook failed OPEN, forging legal-signature evidence** (`api/internal/opensign/webhook.go`) — `HandleWebhook` verified the HMAC signature only _if_ `OPENSIGN_WEBHOOK_SECRET` happened to be set; with it unset (and it was never wired into Cloud Run) verification was skipped in ALL environments, so an **unauthenticated** caller could POST `{event_type:"signing.completed", envelope_id:<known>}` and stamp `signingVerified:true` + `signerIP` + `signatureCertificateId` + an arbitrary `signedDocumentUrl` onto a legal directive (advance-directive/POA). Now **fails closed in production** (rejects with 503 when the secret is unset and `GOOGLE_CLOUD_PROJECT` is set), mirroring the Stripe webhook. **OWNER ACTION REQUIRED:** provision `OPENSIGN_WEBHOOK_SECRET` in Secret Manager and bind it to the Cloud Run service, or the signing-completion webhook will (correctly) reject all calls. (Found by a 6th RC-blocker audit.)
- **MEDIUM — cross-estate IDOR in the OpenSign signing-status poll** (`api/internal/opensign/webhook.go`) — `GET /api/v1/opensign/status?envelopeId=` required auth but not estate access; it matched the directive by the caller-supplied envelopeId across ALL estates and returned its signing state/timestamps. Now walks the matched directive up to its estate and runs the `estate_users` access check before disclosing.
- **CRITICAL — four cross-estate IDORs in the ConnectRPC EstateService** (`api/internal/service/estate/service.go`) — a surface the prior REST-handler audits never touched (no Connect auth interceptor exists, so each method self-authorizes, and four read methods didn't). **`ListEstates`** queried `estates where user_id == req.Msg.UserId` using the CLIENT-supplied `user_id` — any authenticated user could **enumerate another user's estate IDs** (the keystone). **`GetObituary`**, **`GetEstateMetadata`**, and **`ListNotifications`** then read `estates/{estateId}/...` via the admin SDK (bypassing Firestore rules) with **no access check** — leaking, by guessed/enumerated estate ID, the deceased's obituary narrative, the estate's billing tier + MFA on/off + last-login (targeting recon), and the settlement/Guardian/security notification feed. Fix: `ListEstates` now derives the UID from the verified token (ignores `req.Msg.UserId`); the three reads now call `checkEstateAccess`. (Found by a 5th RC-blocker audit; the write methods + other reads were already gated.)
- **Google Photos import now requires a writer role** (`api/internal/googlephotos/handler.go`) — `authorize` checked estate membership but not role, so a read-only heir could import photos (a write) into the estate's heirlooms. Now gated on principal/executor/admin (mirrors `canWriteEstate`). The storage path was already server-built from the validated estateId (no IDOR) — this closes the missing role gate. (Round-4 LOW.)
- **HIGH — fleet-wide Guardian inactivity escalation callable by any authenticated user** (`api/internal/guardian/inactivity.go`, `api/internal/auth/middleware.go`) — `HandleRunInactivityCheck` discarded the caller identity (`_ = userID`), so any logged-in user could trigger a scan of EVERY estate, mutate `escalationLevel` fleet-wide, and blast owner-reminder + executor-notification emails to the whole platform (spam + Guardian-state corruption). Now requires the `admin` role claim (the only legitimate caller is Cloud Scheduler, which mints a `role:admin` custom token). The auth middleware's `email_verified` gate now exempts `admin` service tokens (which have no email) so the scheduler still reaches admin endpoints.
- **MEDIUM — quorum vote race could silently drop a legally-significant vote** (`api/internal/probate/quorum.go`) — `HandleVoteQuorumAction` did a non-transactional read→modify→`Set`, so two executors voting concurrently was last-write-wins: the second overwrote the first's vote and miscomputed the 2-of-3 quorum on a legally-binding approval. Wrapped the read + duplicate-vote/status checks + tally + write in `RunTransaction` (re-runs against the latest state on commit contention).
- **MEDIUM — Cloud Storage rules allowed any authenticated user to read any estate's files** (`storage.rules`) — every estate path used `allow read: if request.auth != null` (no estate scoping), so a token holder could read another estate's vault docs / Soul Log media / memoir thumbnails via a raw Storage SDK call by guessing the path (mitigated in practice because the app reads only via Go-API signed URLs, which bypass these rules — but the rule is still reachable). Now gated on `isEstateMember(estateId)` (principal via `estates.principalId` OR `estate_users` junction). Verified separately: the real `finalwishes-vault` bucket has no `allUsers`/`allAuthenticatedUsers` IAM binding.
- **CRITICAL — forgeable time-capsule delivery endpoint** (`api/internal/capsules/handler.go`) — `HandleDeliverCapsule` "authenticated" Cloud Tasks by merely checking the `X-CloudTasks-*` headers are non-empty (trivially spoofable; route is outside `authMiddleware`). An attacker who knows an `estateId`+`capsuleId` could POST those headers and force **premature delivery of an "on death"/scheduled legacy message to grieving family** — and the idempotency marker then suppresses the legitimate future delivery. The task already attaches an OIDC token; the handler now **validates it** (`idtoken.Validate` against the deliver-URL audience + pins the `finalwishes-api` SA email) before acting. (Independently flagged CRITICAL by a 4th RC-blocker audit.)
- **Stripe webhook idempotency** (`api/internal/payments/handlers.go`, `firestore.rules`) — Stripe delivers webhooks at-least-once and retries on any non-2xx, so the same `event.ID` could write duplicate `payments` ledger records on every retry (the tier `Set/MergeAll` was already idempotent, so no double-entitlement). Now claims each `event.ID` via a `stripe_events/{id}` `Create` (skips on `AlreadyExists`) before processing; the marker collection is server-only (`allow read, write: if false`).
- **CRITICAL — open email/SMS relay from the sirsi.ai domain** (`firestore.rules`, `functions/index.js`, `web/src/routes/estates.$estateId.obituary.lazy.tsx`) — the `mail`/`sms_queue` create rule was `if isAuthenticated()`, so any logged-in user could write a doc with an arbitrary recipient + attacker-authored HTML, which `sendMail` sends verbatim via domain-wide delegation (SPF/DKIM-signed phishing-as-a-service); `buildMimeMessage` also interpolated `to`/`subject`/`replyTo` into raw MIME with no CRLF stripping (header injection → Bcc fan-out from one doc). Fix: create now requires `createdBy == request.auth.uid` (non-spoofable attribution; the obituary writer now sets it) and the MIME builder strips CR/LF from all header values (kills the fan-out multiplier). (Full relay closure via server-side recipient validation tracked as a follow-up.)
- **CRITICAL — cross-estate document/transcript exfiltration (storage-key IDOR)** (`api/internal/docintell/handler.go`, `api/internal/transcription/handler.go`) — both handlers authorized the client-supplied `estateId` (estate_users junction) but then read a SEPARATELY client-supplied `storageKey`/`storageUri` with no check it belonged to that estate. A member of estate A could pass `storageKey=estates/B/vault/<file>` and exfiltrate estate B's vault document (will, deeds) into their own estate's analysis, or transcribe estate B's Soul Log audio. Fix: require the storage key/object to live under `estates/<estateId>/` (the guard already used by `estate/download.go` + `mail/handler.go`).
- **CRITICAL — stored XSS owner→heir in the Heir Welcome screen** (`web/src/components/guards/HeirWelcome.tsx`) — owner/writer-authored Soul Log / time-capsule HTML was rendered into the HEIR's authenticated session via `dangerouslySetInnerHTML` through a hand-rolled regex sanitizer that stripped only `<script>` + quoted `on*=` (missed `<img onerror>`, `<svg onload>`, `javascript:` URIs, unquoted handlers). A malicious owner/executor could hijack a heir's session/Firebase token. Fix: replaced with `DOMPurify.sanitize` (already a dependency, same as the memorial path).
- **CRITICAL — invitation account-seizure via unverified email** (`api/internal/auth/middleware.go`, `firestore.rules`) — invitation auto-match (`functions/index.js`) writes the `estate_users` junction on a bare email-string match with no email-verification, and every downstream authz layer (Go handlers, Firestore rules) trusted only the junction — the sole `emailVerified` gate was client-side (`IdentityGate`) and bypassable by calling the API/SDK directly. An attacker who learned an invited-but-unregistered address could register it first and seize the executor/heir role (estate assets, beneficiaries, vault metadata, directives, probate **write** authority). Fix: require `email_verified` server-side at BOTH choke points — the Go auth middleware (all protected routes) and the `isEstateRole` Firestore rule (SDK path). An attacker can register an address they don't control but can never VERIFY it, so the junction stays unusable until the real invitee verifies. (Found by an RC-blocker audit.)
- **AI obituary endpoint had no estate authz** (`api/internal/guidance/handler.go`) — `HandleAssistObituary` only required authentication, then ran the LLM on an attacker-controlled prompt with no estate binding (unmetered AI cost + prompt-injection surface). Now requires `estateId` + verifies the `estate_users` junction, mirroring `HandleChat`.
- **Heir Soul Log shared-feed read was broken in prod (two root causes)** (`firestore.rules`, manual index build, `web/e2e/persona-safety.spec.ts`, `scripts/e2e-seed-soullog.js`) — a heir's `where('visibility','==','shared')` feed returned nothing. **(1) Missing index:** the `(visibility ASC, createdAt DESC)` composite index was defined in `firestore.indexes.json` but never built in prod — **CI deploys `firestore:rules` ONLY, not `:indexes`** (the CI Firebase SA lacks `datastore.indexAdmin`), so any index added since the last manual deploy silently never built. Built it via the agent SA. **(2) Rule:** the member read branch used `canAccessEstate`, whose nested `get()` calls inside the `resource.data.visibility`-constrained branch made Firestore's LIST analyzer reject the feed — switched to the pure-`exists()` `isEstateRole` (owner/admin still read via the standalone branches). Verified live: heir now SEES the owner's `shared` entry and NEVER the `private` one (persona-safety heir test strengthened with a seeded private+shared pair). **Systemic follow-up (owner):** grant the CI deploy SA `datastore.indexAdmin` and fold `firestore:indexes` into the deploy so future indexes build automatically.
- **CRITICAL — cross-tenant PII breach closed in the Cloud SQL vault** (`api/internal/vault/handlers.go`, `cmd/api/main.go`) — the asset-PII and heir-PII store/retrieve handlers authenticated the caller but never authorized them against the supplied `estate_id`, and the repository queries purely by `asset_id`/`estate_id` (no caller scoping) with crypto AAD bound to `estateID` only — so any logged-in user could `GET /api/v1/vault/asset-pii?estate_id=<other>&asset_id=<other>&full=true` and decrypt another estate's account/routing numbers, VINs, SSNs, DOBs. This data lives in Cloud SQL (NO Firestore-rules backstop), so the missing Go check was the only gate. Added a fail-closed `verifyEstateAccess` (the `estate_users` junction gate used by capsules/guardian) to all four handlers; wired the Firestore client into the vault handler. (Found by an RC-blocker audit.)
- **CRITICAL — Digital Lockbox was 100% non-functional in production** (`api/internal/lockbox/handler.go`) — `verifyEstateAccess` read an `ownerId` field + `members` map that this app never writes (estates use `principalId` + the `estate_users` junction), so every legitimate principal hit `403` on both store and retrieve — saving or viewing any credential failed for all real users. Re-pointed it at the real model (owner via `principalId`, others via `estate_users` role principal/admin). Tests missed it because none seeded a real estate doc.
- **Events cancel/delete showed false success on write failure** (`web/src/routes/estates.$estateId.events.tsx`) — both inline `AlertDialog` actions `await`'d the Firestore op with no try/catch and unconditionally toasted success; on a permission/network failure the user was told "Event cancelled/deleted" while nothing changed. Now wrapped: error toast on failure, dialog closes only on success.
- **Soul Log write tightened to owner-only (standin follow-up #2); read-scope (#1) deferred** (`firestore.rules`) — **#2 (shipped):** create/update was `canWriteEstate`, so an **executor** could flip a `private` entry to `shared` and then read it, defeating the read-privacy fix — tightened to **principal+admin only** (it is the owner's diary). **#1 (deferred):** an attempt to tighten the non-owner _read_ to heir-only via `get().data.role == 'heir'` was reverted because **`get()` is denied inside Firestore LIST/query rules** (verified live: the heir's feed read was denied while the owner was unaffected). Read stays `canAccessEstate && visibility=='shared'`; rule-level heir-only narrowing now folds into the `taggedPeople`→UID + `array-contains` redesign (resource.data-based, query-constrainable), with the route layer (RoleGuard) enforcing it meanwhile.
- **E2E is now a reliable single-command green gate** (`web/playwright.config.ts`, `scripts/e2e-run.sh`) — the config ran tests **parallel** locally (`fullyParallel: true`, `workers: undefined`), which instantly trips the prod Go API rate-limiter (100/60s, 10-min ban) — contradicting the documented "run serial." Set `workers: 1` + `fullyParallel: false` always (CI already did), and the `line` reporter locally. Added `scripts/e2e-run.sh`, a paced runner that runs each spec serially with a cooldown between (default 30s) so the full 31-test suite completes GREEN in one command without ever tripping the ban (a single back-to-back `playwright test` of all specs still can, from sheer volume — the runner is the supported way to run everything).
- **E2E suite now actually runs the authenticated flows (was silently skipping) — 31/31 green against live prod** (`web/e2e/authenticated.spec.ts`, `scripts/e2e-provision.js`) — the 3 authenticated Playwright specs (`authenticated`, `returning-user`, `life-first-features`) `requireTestAccount()` and **skipped** because the documented test-account password was invalid (login returned "Invalid email or password"). Added `scripts/e2e-provision.js` (Admin SDK via the `finalwishes-claude-agent` SA key) that provisions a real, idempotent E2E principal — `e2e-principal@finalwishes.app` + `estates/estate_e2e` + `estate_users` + a profile with `createdAt=NOW` so the IdentityGate MFA-grace window holds (login works without TOTP). With it, all four specs pass against `finalwishes-prod.web.app`: smoke 8, authenticated 12, returning-user 2, life-first 9. Also fixed one **real test bug** found along the way: `authenticated.spec.ts` used `getByRole('button', {name: /Add Asset/i})` which strict-mode-violated on an empty estate (the empty-state CTA card "Add Assets…" also matched) — tightened to `{name: 'Add Asset', exact: true}`. **Run note:** the Go API rate-limits `100 req/60s` with a **10-min ban**, so run `--workers=1` and **per-spec / paced** — a single all-31 invocation trips the ban (the API smoke tests then see 429 instead of 401). Procedure documented in `scripts/e2e-provision.js`.
- **SECURITY — Soul Log private diary is no longer readable by other estate members** (`firestore.rules`, `firestore.indexes.json`, `web/src/routes/estates.$estateId.soul-log.lazy.tsx`) — closes the HIGH pre-existing gap where `allow read: if canAccessEstate` let any accessor read **all** entries (incl. the owner's `private`/`sealed` diary) via the SDK. Now: **owner/admin read everything (path unchanged); every other member reads ONLY `shared` entries** — rule = `isEstatePrincipal || isAdmin || (canAccessEstate && resource.data.visibility == 'shared')`. The soul-log route resolves the **estate-scoped** role and constrains the non-owner query to `where('visibility','==','shared')` (gated until the role is definitive so no unconstrained/denied read fires), with a new `(visibility, createdAt)` composite index. The owner's query + experience are untouched (blast radius limited to the non-owner view). **Residual (tracked for Codex):** per-recipient narrowing of _shared_ entries is still a client-side `taggedPeople` (display-name) filter — a non-owner can read all _shared_ entries, not just ones tagged to them; the UID migration for rule-level per-recipient enforcement remains. The critical _private_-entry exposure is closed. ETHOS "locked diary" / Rule 26.
- **Code-review hardening pass (correctness + security)** — an adversarial review of the session's persona-safe + CRUD changes surfaced real issues, now fixed:
  - **CRITICAL — Rules-of-Hooks crash:** `notifications.tsx` called `useState` _after_ the `if (isLoading) return` early return — a hooks-order violation that corrupts state in prod (tests + typecheck can't catch it). Moved the hook above the conditional return.
  - **Persona/Firestore mismatch (broken access):** `PERSONA_ACCESS` granted `executor`/`trustee`/`cpa` the `lockbox` section, but the Firestore lockbox rule is **principal+admin-only by canon** (most-sensitive collection). Those personas passed `RoleGuard` then hit permission-denied. Removed `lockbox` from executor/trustee/cpa in `persona.ts` + `SCOPED_SECTIONS` (the security rule is the boundary; widening lockbox to fiduciaries is a future rule-first decision). Tests updated.
  - **Null-auth defense-in-depth:** `RoleGuard` and `DashboardRouter` resolve `'principal'` when `profile` is null, so an unauthenticated user reaching an estate route (if an upstream guard failed) could briefly render owner content. Both now also gate on `!profile`.
  - **Event `rsvpCount` integrity:** the new accessor-update branch is now bounded — `rsvpCount` must be an `int`, `>= 0`, `<= 100000` — so an heir can't corrupt the (cosmetic) tally to a negative or absurd value.
  - **IdentityGate loading race:** the non-fiduciary `setLoading(false)` effect now also waits on `!estateUserLoading` so it can't clear loading before the estate role is definitive.
- **Heir RSVPs no longer error, and their attendee count is now tallied** (`firestore.rules`, `web/src/components/estate/RSVPDialog.tsx`) — previously an heir (estate accessor, not writer) could create the RSVP subcollection doc, but the follow-up `rsvpCount` increment on the parent event was denied by `allow update: if canWriteEstate(...)` — so the whole submit hit the catch and the heir saw an **error even though the RSVP saved** (confusing, and a duplicate-submit risk), with a stale count. Fixed with a **narrow rule branch**: any estate accessor may update an event when the diff touches **only `rsvpCount`** (`affectedKeys().hasOnly(['rsvpCount'])`, matching the existing notification/attestation patterns), so RSVPs increment the tally without granting event write access. Also made the count bump **non-fatal** in `RSVPDialog` (its own try/catch) so the RSVP success never again depends on the denormalized counter write. (Closes the deferred RSVP item noted in this changelog.)
- **Notifications can be marked read (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.notifications.tsx`) — the activity feed was read-only with a decorative "View Details" button. Wired the existing `markNotificationRead` / `markAllNotificationsRead` (estate-actions:575/594) helpers: each unread item shows a **"New"** badge + ring indicator and a hover **"Mark as read"** action; the header shows a **"Mark all read (N)"** button when unread > 0. Read items dim. Firestore rule already permits the `read` field update. (Create/Delete intentionally absent — notifications are system-generated, not user-authored.)
- **Time capsules / letters can now be edited (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.timecapsule.lazy.tsx`) — capsules had create + cancel but no update (`updateTimeCapsule` existed, unwired). Added an Edit affordance on each pending `CapsuleCard` → `EditCapsuleDialog` (TipTap message editor via the existing `LetterToolbar`) editing **title + message** → `updateTimeCapsule` with toasts + saving state. Delivery type, recipient, and date are intentionally **not** editable (changing them would alter when/to-whom a sealed letter is delivered — cancel-and-rewrite covers that).
- **Lockbox accounts can now be edited (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.lockbox.lazy.tsx`) — lockbox had create + archive but no update (the `updateLockboxItem` helper existed but was unwired). Added an Edit affordance on each `LockboxCard` (pencil, beside archive) → `EditLockboxModal` prefilled with the account **metadata** (name, category, institution, identifier, transition instructions, notes) → `updateLockboxItem` with toasts + saving state. Secure credentials (passwords/PINs) are intentionally **not** editable here — they live on the encrypted PII-Vault path and are managed separately.
- **Soul Log entries can now be edited (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.soul-log.lazy.tsx`) — added an Edit affordance (pencil, beside delete) on each `EntryCard` → an `EditEntryDialog` (always-mounted so `useEditor` is unconditional) that edits the **title for every entry type** and the **rich text content for text entries via a TipTap editor** (Bold/Italic/List toolbar, seeded from the entry's HTML on open) → `updateDoc` on `estates/{id}/soul-log/{entryId}` (`title`, `content` for text, `updatedAt`) with toasts + saving state. Visibility/sealed-delivery intentionally left untouched (delivery side-effects). Media entries remain title-only (can't re-record).
- **Memories can now be edited (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.memoirs.lazy.tsx`) — memoirs had upload (create), view (read), and delete, but no Update — titles/visibility were frozen after upload. Added an **Edit** action in the `CinemaViewer` (next to Delete) that opens an edit dialog (title `Input` + visibility `Select`) and saves via `updateDoc` on `estates/{id}/memoirs/{id}` (`title`, `visibility`, `updatedAt`) with success/error toasts and a saving state. Media itself isn't re-uploaded (metadata edit), which covers the "fix a typo/title" case.
- **Soul Log entries can now be deleted (Phase 4 CRUD)** (`web/src/routes/estates.$estateId.soul-log.lazy.tsx`) — the Soul Log (the app's heartbeat) supported create + read but entries were permanent: no edit, no delete. Added a delete affordance on each `EntryCard` (trash button, `stopPropagation` so it doesn't toggle expand) → a warm confirm `AlertDialog` ("Keep it" / "Delete") → `deleteDoc` on `estates/{id}/soul-log/{entryId}` with success/error toasts and a deleting state. Owner-path Firestore rules already permit the delete. _(Soul Log edit/update — making the media composer edit-aware — tracked as a follow-up in the Phase 4 CRUD audit.)_
- **Invitees could not accept their invitation** (`web/src/routes/accept-invite.tsx`) — the last workflow not completing per the Codex clean walkthrough. The accept page tried to grant access _client-side_ (update `estate_invitations` -> accepted + create the `estate_users` junction), which Firestore rules correctly DENY (only the principal/admin may write those — `estate_users` IS the access grant). But access is already granted SERVER-SIDE by the autoMatch Cloud Functions (admin SDK): `autoMatchOnInvitation` links existing accounts on invite-create, `autoMatchInvitation` links on signup. So the invitee actually received access while the page showed "Missing or insufficient permissions". Rewrote the flow to AWAIT the server grant (poll the invitee's own `estate_users/{uid}_{estateId}` junction, which they may read) and then navigate — removing the denied client writes. Security-preserving (no rule loosening; removes an attempted client privilege escalation). If the async trigger hasn't landed, the page now guides ("almost in — refresh in a moment") instead of dead-ending.
- **THE DEMO-KILLER: interactive saves never finished in production** (vault video/audio upload, notifications, life-chapters, sealed Soul Log) — found by codex-finalwishes reproducing every client write against live Firestore with a real user token. Root causes were NOT security-rule denials on the owner path (those pass); they were **missing Firestore composite indexes that CI never deployed**, plus two shape/rule mismatches:
  - **CI deployed `firestore:rules` but NOT `firestore:indexes`** (`.github/workflows/firebase-hosting-merge.yml`), so `firestore.indexes.json` never reached prod. The local emulator auto-builds indexes, so queries worked in dev but threw `FAILED_PRECONDITION: The query requires an index` in the live demo, hanging the feature. Fixed the deploy to `firestore:rules,firestore:indexes` and added the 3 missing indexes (also created live via `gcloud` so the demo doesn't wait on the next deploy): `documents`(displayName,status,version desc) — the vault upload replacement-check that blocked **video/audio upload before the metadata write**; `notifications`(read,createdAt desc); `life-chapters`(status,order).
  - **Sealed Soul Log save → 403**: the sealed-diary capsule sidewrite (no recipient/deliveryType) was denied by the standard `capsules` create rule. Added a second allowed create shape for the `type:'soul-log', visibility:'sealed'` record. (Follow-up: move sealed deliveries to their own subcollection.)
  - **Notification mark-read → denied**: client writes `{ read, readAt }` but the rule allowed only `['readAt','status']`. Added `read` to the permitted `affectedKeys`.
  - Noted (heir-only, deferred): RSVP create succeeds but the heir cannot update the parent event `rsvpCount` (writer-only) — move the count to the backend or add a narrow `rsvpCount` update branch.
- **End-to-end verification sweep (every user process)** — drove the real app on live prod with a sanctioned test account (the `principal@finalwishes.app` password-set trick) and found/fixed several issues that unit tests + the web-only pre-push gate missed:
  - **CI was RED and C5 never deployed** — the C5 commit (`6044dd1`) updated the forms-count guard in `api/internal/forms/maps/registry_test.go` but the sibling `api/internal/formsapi/handler_test.go` (a 5→7 assertion) was not staged, so `go test -race ./...` failed in CI and the deploy step was skipped. The pre-push Ma'at gate only runs `turbo build` (web), so it passed locally. Committed the guard fix (`0d5efee`); CI green; **C5 forms verified live** (`GET /api/v1/forms` → 7 incl `mn_poa_523_23` + `md_poa_17_202`; fill MN/MD POA → 200 `application/pdf`).
  - **Wizard intake metadata silently lost on EVERY estate creation** — `firestore.rules` had no `match` for `estates/{id}/metadata/{doc}`, so the create-estate wizard's write to `estates/{id}/metadata/intake` (situation, marital/children profile, selected asset categories) hit default-deny and was swallowed as "non-blocking" in `estates.create.tsx`. Added the missing rule (owner/writer may write, estate accessors may read). The intake personalization data now persists.
  - **The Shepherd conversational chat returned 500 in production — root cause was a region bug in the vendored AI SDK, NOT a missing key.** `/api/v1/guidance/chat` failed with "Failed to generate response". The `sirsi-ai` SDK is **Vertex-AI-native and authenticates via the service account (ADC)** — there is no API key to provision (the SA already has `roles/aiplatform.user` and Vertex AI is enabled). The real fault: FinalWishes' vendored `api/packages/sirsi-ai/gemini.go` built the Vertex client with `Location: cfg.Region` (`us-central1`), but **`gemini-3.1-flash-lite-preview` is served only from the `global` endpoint** — so every call 404'd (`Publisher Model ... was not found`), and with Claude-on-Vertex also unavailable in this project, "all providers failed". Fixed by using `cfg.GeminiRegion` (default `global`), adding the missing `GeminiRegion` field + `SIRSI_AI_GEMINI_REGION` env to `config.go`, and correcting the empty-model fallback from the disallowed `gemini-2.0-flash` to `gemini-3.1-flash-lite-preview` (policy: Gemini 3.x or newer only). This matches the known-good Assiduous configuration. **Verified**: `gemini-3.1-flash-lite-preview` @ `global` returns 200 and generates for `finalwishes-prod`. The chat handler also **fails soft** (logs the error, returns a warm 200 fallback instead of a 500) so an AI outage never makes the Shepherd feel broken; ops must alert on the `"Chat generation failed"` log. **Remaining (quality, optional):** enable Anthropic/Claude models in `finalwishes-prod`'s Vertex Model Garden (404 in all regions today) to put the Shepherd back on Claude Opus as designed — until then it runs on Gemini 3.1 Flash Lite.
  - **E2E suite couldn't actually run the authenticated flows** — `web/e2e/helpers/auth.ts` navigated to `/?login=true` (bare), which TanStack Router parses as a boolean and does NOT open the login modal (the app emits `?login="true"`, JSON-quoted, via the `/login` route). Pointed the helper at `/login`, and added dismissal of the first-run `OwnerWelcome` takeover so specs reach the dashboard. **Modernized the authenticated + life-first specs to the shipped grouped/collapsible sidebar** (`web/e2e/authenticated.spec.ts`, `life-first-features.spec.ts`): added an idempotent `navigateToNestedItem(parentGroup, childLabel)` helper that expands a collapsed group only when the target child isn't already visible (clicking a group toggles it; the active group auto-expands), so specs reach nested items like `Directives` (under "Letters"), `Assets` (under "The Vault"), `Soul Log`/`Life Chapters` (under "My Legacy"). Verified against live prod — runs must be SERIAL (`--workers=1`) and sparing: the Go API rate limiter is `NewLimiter(100/60s, 10-min ban)`, so the parallel default trips a ban.
- **Forms list test hardened (per Codex C5 review)** — `api/internal/formsapi/handler_test.go` `TestListForms` now asserts the _presence_ of the required form IDs (each served with field schemas) instead of a brittle `len == 7`. A bare count check breaks and blocks the deploy every time a form is added; membership verifies the real contract while staying additive-friendly.
- **PRODUCTION UPLOADS WERE BROKEN FOR ALL USERS** — root cause found and fixed by live end-to-end test. The deployed Cloud Run API (`finalwishes-api`) had **no `GOOGLE_CLOUD_PROJECT` env var set**. `api/cmd/api/main.go` only initializes the Firestore _and_ Cloud Storage clients when that var is non-empty (Cloud Run does **not** set it automatically); without it the API silently ran in local-dev mode with `fs == nil` and `sc == nil`, so `GenerateUploadUrl` returned `failed_precondition: storage client not initialized` and Firestore-backed RPCs returned hardcoded mock data. Demo mode was masking this because the demo path never hit the real upload API. Fixes: (1) set `GOOGLE_CLOUD_PROJECT=finalwishes-prod` on the service (revision `finalwishes-api-00064-fk5`) and pinned it in `.github/workflows/firebase-hosting-merge.yml` so CI can't regress it; (2) granted the runtime compute SA `860699311615-compute@developer.gserviceaccount.com` `roles/iam.serviceAccountTokenCreator` on itself so it can sign V4 signed upload/download URLs (`iam.serviceAccounts.signBlob`). **Verified live**: minted a real Firebase ID token for an authenticated principal → `GenerateUploadUrl` 200 → PUT to signed URL 200 → GET back via `finalUrl`, bytes matched. Also purged stale demo Firestore records (`users/user_tameeka`, `estates/estate_lockhart`, `estate_users/user_tameeka_estate_lockhart`).
- `web/src/lib/auth.tsx` — **sign-out no longer re-logs the user back in**, and a redirect-bounce regression was prevented. The app keeps a demo/guest session under `localStorage['finalwishes_user']` that `loadDemoSession()` reads synchronously on every mount (seeding the auth context and skipping the Firebase listener). The old `handleSignOut` only called `firebaseSignOut() + setProfile(null)`, leaving that key and the in-memory demo refs intact, so the next render restored the session and logged the user straight back in. Sign-out now removes `finalwishes_user`, resets `demoActiveRef`, clears `user`/`profile`, **logs** (no longer swallows) any `firebaseSignOut` failure, and hard-navigates to `/login` for a clean re-init. In `signIn`, the profile is now fetched and set **before** `user` becomes truthy — the login modal redirects the instant `user` is set, and a null-profile redirect routed to `/estates/create` instead of the user's estate dashboard (a visible mid-login bounce). Verified: `tsc --noEmit` clean, 15/15 auth tests green. Codex-reviewed.
- `web/src/routes/dashboard.tsx` — the legacy `/dashboard` redirect routed **solely** off `localStorage['finalwishes_user']`, so a real Firebase user (no demo key) was wrongly bounced to `/login`. It now waits for auth to settle and routes from the authoritative auth context (`user`/`profile`), falling back to the demo key only when the context hasn't populated.
- **Surface-audit UI-reflection bugs (data was saving; the UI lied about it)** — `web/src/routes/estates.$estateId.directives.lazy.tsx`: the directive auto-save, **Save Draft**, and **Finalize** handlers `await`ed `updateDirective` but ignored its returned `ActionResult`, so a failed Firestore write still showed "Saved"/"Draft saved"/"Finalized" and (for Finalize) flipped the doc to a locked view it hadn't actually reached. All three now gate on `result.success`, surface `toast.error` (and a new "Not saved" auto-save indicator state) on failure, and no longer mutate UI state on a failed write. The Illinois advance-directives loader's `.catch(() => {})` (which silently swallowed load failures) now logs and toasts. `web/src/routes/estates.$estateId.life-chapters.tsx`: the edit-dialog form reset relied on `useState(initializer)` (fires once at mount) plus a `key={resetKey}` remount that doesn't change when reopening the **same** chapter — so reopening a chapter after a partial edit showed stale fields. Reset is now a `useEffect` keyed on `[chapter?.id, open]`. Verified: `tsc --noEmit` clean, 168/168 vitest green. (Obituary editor `setContent`-on-load, heirloom `result.success` gating, executors rendering in the family grid, and the `probate.ts` `API_BASE` import were already fixed in the prior surface-audit commit.)

### Known / operational

- **Soul Log per-recipient shared filtering — residual (the critical private exposure is FIXED above).** Non-owners can now only read `shared` entries (private/sealed are DB-blocked), but among shared entries the per-recipient narrowing is still a client-side `taggedPeople` (display-name) filter — so a non-owner can technically read _all shared_ entries via the SDK, not only ones tagged to them. Closing this fully needs the `taggedPeople` → UID migration + an `array-contains` query/rule clause (tracked for codex-finalwishes, who owns the data model). Lower severity than the closed private-diary exposure; shared content is by-definition for sharing.
- The `?demo=true` login path activates a **hardcoded fake** "Tameeka Lockhart" session whose `getIdToken()` returns the literal `'demo-token'`, and Firebase's `auth.currentUser` is `null` in that mode. The backend rejects `demo-token` unless `DEMO_MODE=true` (off in prod, by design — `api/internal/auth/middleware.go`), and signed-upload-URL requests (`web/src/lib/client.ts`) read the token from `auth.currentUser` which is null — so **uploads cannot work in demo mode**. Real uploads require a real Firebase login (use the actual account, not the `?demo=true` link). This is the root cause behind "all uploads failed" in the buyer demo. Confirmed by Codex review.

### Added

- **Trustee fiduciary role (full stack) + Phase 5 Shepherd persona-filter + persona-layer integration** (codex-finalwishes WIP, committed by claude-finalwishes while Codex is offline) — adds `trustee` as a first-class fiduciary role across `web/src/lib/invitations.ts`, `auth.tsx`, `firestore.ts`, `email-templates.ts`, `IdentityGate.tsx`, `Sidebar.tsx`, `AttestationForm.tsx`, `InviteTeamMember.tsx`, `estates.$estateId.beneficiaries.tsx`, and **`firestore.rules`** (trustee added to the role allow-lists for user-profile create, attestation create, `estate_users` create, and invitation create — additive, no security regression). Integrates the persona-safe layers: `Sidebar`/`estates.$estateId.tsx` resolve the estate-scoped `effectiveRole` and filter nav via `canAccess`; `RoleGuard` wraps the estate Outlet; `IdentityGate` keys fiduciary verification on the estate role. **Phase 5:** `ShepherdCompanion` now filters all route-aware guidance/next-steps through `canAccess(effectiveRole, section)` so the Shepherd never routes a persona to a forbidden flow. Full tree verified: `tsc --noEmit` clean, 202 vitest, build OK.
- **Heir sacred landing (Phase 3 — the ETHOS screen)** (`HeirDashboard` in `web/src/components/estate/PersonaDashboard.tsx`) — heirs now land on a warm, grief-aware dashboard that leads with **the love first** (letters & voice, photos & videos, their story, heirlooms, sealed time capsules), then their wishes/gatherings/remembrance, and only last and gently "what they left you" — never a completion score or an asset list. Made `dashboard` **persona-aware** in the source of truth: `PERSONA_ACCESS.heir` now includes `dashboard` (safe because `DashboardRouter` renders `HeirDashboard`, never the owner timeline) and `personaLanding` is uniform (`dashboard` for all; the route branches by role). Tests updated accordingly (`persona.test.ts`, `RoleGuard.test.ts`): heir's dashboard is allowed-and-heir-shaped, while vault/lockbox/forms/probate/settings stay blocked. **Coordination:** `persona.ts` is shared — Sidebar (Codex) will now surface a dashboard/home nav for heirs pointing at the sacred landing; routed to Codex. `tsc` + vitest (202) + build PASS.
- **Persona dashboards (Phase 3, first slice)** (`web/src/components/estate/PersonaDashboard.tsx`) — the estate `dashboard` route now branches by persona via `DashboardRouter`: principals/admins keep the owner "My Legacy" timeline (`DashboardIndex`, untouched), while **fiduciaries/advisors (executor/trustee/legal/cpa) get a role-specific dashboard** instead of the owner completion screen — a purpose line + an action grid of _only_ the flows they may use, driven by the same `PERSONA_ACCESS`/`canAccess` source of truth (so it can't drift from sidebar/RoleGuard). Heirs never reach it (RoleGuard routes them to their memories). Resolves the estate-scoped role and waits for it to be definitive before rendering. Wired by branching the route component in `web/src/routes/estates.$estateId.dashboard.lazy.tsx` (owner module unchanged). **Fixes the leak** where every non-principal who landed on `/dashboard` saw the owner completion timeline. `tsc --noEmit` + full vitest (201) + `npm run build` PASS. Per-persona visual lands in the seeded browser walk. _(Remaining Phase 3: heir sacred landing route, principal unchanged; Phase 4 CRUD completeness; Phase 5 Shepherd-everywhere.)_
- **`scripts/seed-persona-qa.js` — persona-QA seed recipe** for browser-verifying `RoleGuard`/Layer 2. Seeds one isolated, clearly-marked test estate (`estate_persona_qa`) with a `persona-<role>@finalwishes.app` account per persona and the `estate_users` grant that `RoleGuard` enforces (plus `attestations: verified` for fiduciaries). Each account is seeded **global `principal` + estate-scoped persona role** so it passes `IdentityGate`'s grace and reaches `RoleGuard` without TOTP MFA — which also demonstrates the estate-scoped leak-fix live. Idempotent; `SEED_PROJECT`/`FIRESTORE_EMULATOR_HOST` aware; touches no real data. **Surfaced finding (routed to Codex):** `IdentityGate.tsx:53` computes `isFiduciary` from the **global** `profile.role`, not the estate-scoped role — inconsistent with `RoleGuard`/Sidebar, and a real gap (a principal-on-their-own-estate could skip fiduciary attestation on another estate). Not executed against any DB (recipe + data shape only; browser walk is Codex's lane).
- **`RoleGuard` — Layer 2 route enforcement** (`web/src/components/guards/RoleGuard.tsx`) — closes the persona-safety gap where sidebar hiding was the _only_ thing between a persona and a forbidden route (a heir typing `/estates/X/vault` directly still rendered it). Wraps the estate child `<Outlet>` (inside `IdentityGate`): derives the section from the URL (`sectionFromPath`), resolves the **estate-scoped** effective role, and on `!canAccess(role, section)` shows a warm, Shepherd-toned "this isn't part of your role" state with a route back to the persona's landing — never the owner dashboard for heirs. Critically, it **owns its own `estateUser` fetch and gates on `authLoading || !profileResolved || estateUserLoading`** before deciding, so no private data renders during the window where the role can transiently read as the global `profile.role` (the loading-window leak). Locked with `web/src/components/guards/RoleGuard.test.ts` (10 tests: `sectionFromPath` parsing + direct-URL deny decisions per persona). Integration wrap in `web/src/routes/estates.$estateId.tsx` is a single additive `<RoleGuard>` around the Outlet. `tsc --noEmit` + full vitest (201) + `npm run build` PASS. In-browser per-persona block demo deferred to the dedicated verification pass (needs seeded multi-role test estates).
- **Persona access — single source of truth** (`web/src/lib/persona.ts`) + audit (`docs/PERSONA_ACCESS_MATRIX.md`) — Phase 1 of the persona-safe Tuesday push (v22.0 mission). One module encoding the per-persona route-access matrix (`PERSONA_ACCESS`), **estate-scoped role resolution** (`resolveEffectiveRole` — the fix for the confirmed leak where `estates.$estateId.tsx:132` and `Sidebar.tsx:376` read the global `profile.role` and ignored the already-fetched `estateUser.role`, so a multi-estate user got the wrong persona), `canAccess` (route allow/deny), `requiresItemScope` (the ◐ sections that additionally need assigned/authorized/relevant item filtering), and `personaLanding` (heir → sacred memories, never the owner dashboard). Sidebar, the forthcoming `RoleGuard`, the Shepherd, and tests all consume it so the three persona-safety layers (nav visibility, route enforcement, persona experience) cannot drift. Inert until imported (not yet wired into Sidebar — landed first per the codex-finalwishes labor split; Sidebar is the shared seam). The audit doc grounds the section catalog in the _real_ estate routes and flags 5 uncatalogued routes (`forms`, `attestation`, `pricing`, `estates`, `index`) reachable by direct URL today. Locked with `web/src/lib/persona.test.ts` (19 tests: estate-scoped role precedence, the heir sacred-moment boundary, fiduciary/advisor scoping, structural invariants). `tsc --noEmit` + vitest PASS.
- **C5 — multi-state Power of Attorney** (`api/internal/forms/maps/mn_poa_523_23.go`, `md_poa_17_202.go` + official SHA-pinned blanks). Completes the launch-priority POA set (MD/IL/MN — Illinois already had Property + Health Care POA). Both are flat coordinate-overlay maps built on the proven `il_poa_property_2011` spine; coordinates derived from `pdftotext -bbox` positioned-text extraction, not estimated. **Minnesota Statutory Short Form POA** (Minn. Stat. § 523.23, official MN Attorney General blank, SHA `bd49b1a6…`): principal/attorney-in-fact/successor identity, the opt-in powers checkboxes (A)–(N), and expiration date; signature + notary `Execution=true`. **Maryland Statutory Personal Financial POA** (Md. Code, Est. & Trusts § 17-202, official General Assembly blank, SHA `31509bd7…`): principal/agent/coagent/successor identity + telephone + optional termination date; principal signature, notary acknowledgment, and both witness blocks `Execution=true`. Registered in `registry.go`, so both auto-surface in `GET /api/v1/forms` with field schemas and render in the existing schema-driven Forms UI with zero frontend change. Each carries the engine guarantees (SHA fail-closed, execution-never-stamped, true-flatten) with unit tests mirroring `il_hcpoa_test.go`, and proof rasters under `docs/forms-phase0/proof/` (body values land on the rules; execution page blank). **NOTE — `Will`/`Trust` remain legal-gated and were NOT built (never LLM-authored).** **Production gate: human/legal visual sign-off on the proof rasters** before these are surfaced to end users (per the coordinate-confidence discipline). MD source PDF carries the General Assembly statute-web wrapper on page 1 / trailing page (known-cosmetic, intentionally intact — it is the authoritative artifact). Provenance recorded in `docs/forms-phase0/source-manifest.json`; status in `docs/forms-phase0/PHASE1-STATUS.md`; user guide updated.
- `api/internal/formsapi/` + `api/internal/forms/maps/registry.go` — **statutory forms are now a live HTTP API**: `GET /api/v1/forms` (list + field schemas), `GET /api/v1/forms/{id}`, `POST /api/v1/forms/{id}/fill` (returns `application/pdf`), mounted behind auth in `cmd/api/main.go`. Blanks are `go:embed`ed into the binary (the Cloud Run build is `--source ./api`), so the SHA-pinned official PDFs ship in the container. `forms.FillBytes` added so the engine fills from embedded bytes; `maps.FillByID` resolves form→embedded blank. Execution fields are reported via `X-Forms-Skipped-Execution`; missing required via `X-Forms-Missing-Required`.
- `api/internal/forms/maps/il_mhtpd_2016.go` + official IDPH blank — **5th statutory form**, the IL Declaration for Mental Health Treatment (755 ILCS 43). Found the official flat blank on `dph.illinois.gov` (the previously-assumed source bot-blocked downloads), SHA-pinned `3d03480a…`. Declarant identity (name, DOB) + primary/successor attorney-in-fact mapped; signature + two witnesses `Execution=true`. Proof-verified pages 1–3. Variable preference sections (medication/ECT/admission) documented as a follow-up.
- `firebase.json` — storage rules now target the default bucket explicitly (`finalwishes-prod.firebasestorage.app`) so `firebase deploy --only storage` succeeds without a project-level default-bucket lookup (the project's `resources.storageBucket` is unset; the bucket was registered with Firebase Storage via the `addFirebase` API this session). Fixes the last red CI deploy job.
- `scripts/fix-ci-deploy-permissions.sh` — one-command fix for the two failing CI deploy jobs (Firestore/Storage Rules + Firebase Functions): grants the CI deploy service account the missing IAM roles (`serviceusage.serviceUsageConsumer`, `firebaserules.admin`, Cloud Functions/Run/Build/Artifact-Registry, and `iam.serviceAccountUser` incl. ActAs on the App Engine runtime SA). Run after `gcloud auth login` as the project owner.
- `docs/ga-evidence/README.md` — evidence artifact convention for `/goal: finalwishes-tier1-ga` per Codex review revision #5. Defines `docs/ga-evidence/ga-c{N}-{slug}-{YYYY-MM-DD}.md` naming, required contents per artifact, and the 8-criterion ownership index. Seeded as part of acknowledging the Tier 1 GA goal v2 proposal.
- `docs/ga-evidence/cr-04-dependabot-2026-05-20.md` — blocked CR-04 Dependabot sweep evidence recording the GitHub API access failure and local verification commands.
- `docs/ga-evidence/cr-05-domain-2026-05-20.md`, `docs/ga-evidence/cr-07-stripe-portal-2026-05-20.md`, and `docs/ga-evidence/cr-08-opensign-2026-05-20.md` — owner-gated GA evidence/checklists for DNS/TLS, Stripe Customer Portal, and OpenSign template readiness.
- `docs/ADR-044-LEGAL-RAG-CORPUS.md`, `api/internal/guidance/rag.go`, `api/internal/guidance/schema.sql`, `api/cmd/rag-eval`, and `docs/legal-corpus/` — CR-10 legal RAG architecture foundation using PostgreSQL + pgvector, `gemini-embedding-001`, official-source provenance, citation return payloads, and citation-abstention behavior.
- `docs/ga-evidence/cr-10-rag-2026-05-20.md` — CR-10 evidence artifact marking the architecture foundation ready while authoritative corpus ingestion and probe-set scoring remain before `MET`.
- `api/internal/googlephotos/` — CR-12 Google Photos import package (Picker-flow handler + client + content hashing) wired into `api/cmd/api/main.go`. Imports selected photos into the encrypted vault bucket; completes wiring that `main.go` already referenced.
- `api/internal/forms/` — statutory-form coordinate-overlay engine (Phase 1a). Generic Go-native `Fill()` over a per-form `CoordinateMap`, stamping official FLAT government PDFs via pdfcpu (library import). Proven on the IL Statutory Short Form Power of Attorney for Property (755 ILCS 45): SHA256 source fail-closed, execution fields never stamped (wet-sign default), true-flatten output assertion. Human-review proof under `docs/forms-phase0/proof/`.
- `api/internal/forms/maps/il_small_estate_3606.go` — Phase 1b fan-out: second official form on the same proven spine, the IL Small Estate Affidavit (Form 3606, 755 ILCS 5/25-1). Core single-value affidavit fields (affiant/decedent identity, dates, addresses, relationship) + execution-block skip. Variable-length creditor/heir schedules documented as a follow-up (need repeating-row support).
- `api/internal/forms/acroform.go` — `FlattenAcroForm`: removes AcroForm widgets from official fillable PDFs to produce a true-flat blank (verified on the CaringInfo IL advance-directive packet, 36 fields → 0), unblocking overlay-stamping of AcroForm-distributed forms (HCPOA, Living Will). Kept out of the deterministic `Fill` path; used offline to derive + SHA-pin flat blanks.
- `docs/ADR-045-GOOGLE-PHOTOS-IMPORT.md` + `docs/ga-evidence/cr-12-google-photos-2026-06-02.md` — CR-12 governance: documents the Google Photos import decision (minimal-scope **Picker API**, `photospicker.mediaitems.readonly`; per-request tokens never persisted; EXIF stripped from Firestore per Rule 26; SHA-256 + dHash dedup). Verdict **MET**.
- `docs/forms-phase0/PHASE1-STATUS.md` — Phase 1 form roadmap: shipped (Property POA, Small Estate), buildable-next (HCPOA, Living Will via flatten route), owner-blocked (HIPAA, Mental Health, Disposition, VSD 773 — need manual downloads).
- `api/internal/forms/maps/il_hcpoa_caringinfo.go` + `docs/forms-phase0/blanks/il_hcpoa_caringinfo_flat.pdf` — **priority-1 Health Care POA** (755 ILCS 45/4-10), first form built via the AcroForm→flat route: the CaringInfo packet flattened once (SHA-pinned `de7ae3d6…`), then overlay-stamped. Principal + agent (name/address/phone) on page 11; execution block (principal signature/date p15, witness p16) flagged `Execution=true`. Proof verified: page 11 values land (incl. caption-below-line agent fields), execution pages blank.
- `api/internal/forms/maps/il_living_will_caringinfo.go` — IL Living Will Declaration (755 ILCS 35) on the SAME pinned flat blank (page 17): declarant name + residence filled; declaration date, declarant signature, and both witness signatures `Execution=true`. Completes the in-house statutory-form set (4 forms). Proof-verified.

### Changed

- **Design sweep — completed the "kill the rainbow" tokenization across the remaining ~45 surfaces** (follow-up to C4 `cd4e34d`, which did the first 6 core surfaces). Visual-safe mechanical swaps only — no JSX/logic changes (diff is symmetric 1178/1178). Replaced hardcoded hex with design tokens across all routes (vault, timecapsule, memoirs, lockbox, create, obituary, settings, probate, events, assets, pricing, estates, forms, notifications, memorial, index/landing, about, accept-invite, terms, privacy, dashboard) and shared components (guards, layout/Sidebar, identity, estate/\*, landing, skeletons, ui): brand blues → `var(--royal)`/`var(--royal-blue)`/`var(--royal-bright)`, golds → `var(--gold)`, slate/gray neutrals → named Tailwind slate utilities (or `var(--color-slate-NNN)` inside inline-style objects), every decorative "rainbow" accent (purple/brown/decorative-green) collapsed to a single restrained gold, card/section titles confirmed on the Cinzel heading token. True semantic status colors (success `#059669`, danger `#dc2626`, warning `#f59e0b`) preserved as-is. Intentionally KEPT as raw hex (cannot tokenize without a logic/visual regression): hex+alpha string concatenations (`` `${color}10` `` in SectionHeader/lockbox/pricing/probate), QR `fgColor` (serialized SVG detaches from stylesheet), Canvas 2D `strokeStyle`, and `@react-pdf/renderer` StyleSheets. Verified: `tsc --noEmit` clean, 172/172 vitest green, 0 brand hex remaining in className arbitrary-value contexts, no malformed tokens.
- `docs/ga-evidence/README.md` — upgraded to v3/12-criteria convention per codex v3 review (R2). New naming: `docs/ga-evidence/cr-{NN}-{slug}-{YYYY-MM-DD}.md`. Index expanded from 8 to 12 criteria (engineering / operational / scope-expansion). Added `ADR required` column (R3) flagging CR-09 mobile, CR-11 Lob, CR-12 Google Photos (YES) and CR-10 RAG (conditional). Added pass/fail security clauses (R4) for CR-08 OpenSign wiring path, CR-11 PII-in-logs prohibition, CR-12 OAuth-scope disclosure. Governing canon now references v3 proposal + v3.1 patch. Router state (decision artifact and codex review migration) recorded locally under gitignored `.agents/idea-router/`.
- `api/internal/payments/handlers.go` — added `APP_BASE_URL` support so Stripe checkout and Billing Portal return URLs can switch to `https://finalwishes.app` after CR-05 passes without another code change.
- `api/internal/guidance/handler.go` and `api/internal/guidance/genkit.go` — legal-topic chat now injects retrieved corpus context when RAG is configured and instructs Shepherd to cite or abstain for legal claims.
- `api/internal/formsapi/handler.go` + `api/cmd/api/main.go` — forms fill response now emits `X-Forms-Missing-Required` / `X-Forms-Skipped-Execution` as clean comma-joined lists (was Go's `[a b c]`) and exposes them via CORS `ExposedHeaders` so the browser client can read them.

- `web/src/components/estate/ShepherdWelcome.tsx` + `web/src/lib/shepherd.ts` — **Shepherd is now the first voice on the estate dashboard**: a warm, time-aware, personal greeting + a **live conversation** wired to the real AI guidance engine (`POST /api/v1/guidance/chat`, estate context + legal RAG). Replaces the buried nudge-only presence — per ETHOS, the user meets warmth and a familiar voice before any dashboard or completion percentage. Rendered as the first element of `estates.$estateId.dashboard`.
- `web/src/routes/estates.$estateId.forms.tsx` + `web/src/lib/forms.ts` — **Statutory Forms UI**: the forms fill engine is now a user-facing feature. Schema-driven form picker → dynamic field form (rendered from `GET /api/v1/forms`) → `POST …/fill` → print-ready PDF download. Execution fields (signature/witness/notary) are filtered out client-side, mirroring the wet-sign guarantee. Discoverable via a card in Final Directives. Rule-30 docs: `docs/user-guides/legal-forms.md` + `web/src/lib/README-forms.md`.

- `docs/ga-evidence/cr-03-ci-2026-06-02.md` — CR-03 CI evidence (MET-with-caveats): all required jobs green after this session's deploy-IAM grants + API test fix; the Storage-rules sub-step is `continue-on-error` (defense-in-depth rules; blocked only on a one-time Firebase console "Get Started").

### Changed

- `.github/workflows/firebase-hosting-merge.yml` — Storage-rules deploy marked `continue-on-error` (non-blocking). It governs the default Firebase Storage bucket, which the app's client SDK never uses (uploads go through V4 signed URLs that bypass storage rules); the deploy is blocked only by the un-provisioned default bucket (console "Get Started"). Firestore rules remain required.

### Fixed

- **Take Photo / Record Video** (`camera-capture-button.tsx`) added to the library picker on Memories (photo+video) and Heirlooms (photo). Uses the `capture` attribute — mobile opens the device camera directly; desktop falls back to the file picker. Routes the captured file through the same upload path as drag-and-drop.
- **Mobile performance / lock-ups (mitigation 1).** The `directives` (TipTap editor) and `obituary` routes statically imported **react-pdf (~1.4 MB)** and were NOT lazy routes, so that weight was parsed on the initial load of _every_ page — a known freeze on low-end phones. Converted both to lazy routes (`createLazyFileRoute`); react-pdf + TipTap now load only when those screens are opened. Main bundle ‑62 kB. (Deeper render-cascade audit — 24 `set-state-in-effect` sites — tracked separately.)
- **Dropdowns with prefilled options (house rule).** Added `SelectWithOther` (dropdown + fillable "Other") and a shared `US_STATES` list (50 states + DC). Applied: beneficiaries **Relationship** is now a prefilled dropdown (was free text); the estate-creation **State of Residence** offers all 50 states + DC (was Maryland/Illinois/Minnesota/Other). Also **fixed a latent bug** — the beneficiary role dropdown offered "Trustee", which the Firestore rule rejects (`role in executor/heir/legal/cpa`), so choosing it failed with "insufficient permissions"; replaced with Legal Counsel + CPA / Tax Advisor.
- **Photo/video uploads failed site-wide ("most of the way through, then error").** The `finalwishes-vault` storage bucket had **no CORS configuration**, so the browser's cross-origin signed-URL `PUT` to GCS was blocked. Applied a CORS policy allowing `GET/PUT/HEAD/OPTIONS` from the web origins (`infra/storage/vault-cors.json` + `apply-cors.sh`). Verified via preflight (returns `access-control-allow-origin`). Live bucket setting — no redeploy needed.
- **Adding a family member failed with "Missing or insufficient permissions."** The invitation flow (`web/src/lib/invitations.ts`) queried the `users` collection by the invitee's email to check for an existing account — but the `users` read rule only permits reading your OWN doc (PII siloing, Rule 26), so Firestore denied the query and broke the entire add-member action. Removed the client-side user lookup (and the client-side auto-link, which also wrote another user's records). Existing-account invitees are now linked **server-side** by a new `autoMatchOnInvitation` Cloud Function trigger on `estate_invitations` creation (complementing `autoMatchInvitation` on signup). `functions/index.js`.
- **(Security, CR-04) Dependency vulnerability sweep** — remediated all 22 open Dependabot advisories (6 high, 15 moderate, 1 low) via npm `overrides` in `web/` (fast-uri, protobufjs, hono, postcss, qs, ip-address, brace-expansion, @protobufjs/utf8) and `functions/` (qs, uuid). Lockfiles regenerated to patched versions; `npm ci` + web build verified clean. Evidence: `docs/ga-evidence/cr-04-dependabot-2026-06-02.md`. Root cause: CI installs from the workspace-member `web/package-lock.json`, which had drifted from the already-fixed root lockfile.
- **(Security, Rule 26) Google Photos import leaked EXIF PII** — `api/internal/googlephotos/` no longer writes the raw JPEG EXIF APP1 segment into the client-readable Firestore heirloom document. EXIF carries GPS coordinates, device identifiers, and timestamps; the original photo bytes (EXIF intact) stay only in the vault storage object. (Codex review P1.)
- **Google Photos duplicate-check masked failures** — `hasHash` now propagates unexpected Firestore errors instead of returning `false, nil`, so transient/permission failures abort the import rather than silently importing possible duplicates. (Codex review P2.)

---

## [0.10.2] — 2026-05-20

### Fixed

- Corrected Illinois small-estate guidance copy to match ADR-043 and the implemented $150K threshold with vehicles excluded.
- Updated the estate settlement guide to describe implemented multi-executor quorum approval instead of marking it as future work.

---

## [0.10.1] — 2026-05-19

### C3 — Documentation, Testing, Timeline, Quorum, GCP Evaluation

### Added

- **10 developer READMEs** — guards, landing, layout, search, skeletons, styles, gen, functions, shared, api (Rule 30 compliance — 25 total READMEs)
- **3 user guides** — soul-log, estate-settlement, events-broadcasting (25 total guides in `docs/user-guides/`)
- **24 Cloud Function unit tests** — Jest tests for `autoMatchInvitation`, `sendMail`, `sendSMS`, `guardianInactivityCheck` with mocked Firestore/Gmail
- **SettlementGantt component** — Recharts horizontal bar chart showing probate deadlines as a visual timeline with "Today" marker and urgency color coding
- **Multi-executor quorum (2-of-3)** — `quorum.go` with propose/vote/list/config endpoints, `QuorumPanel.tsx` approval UI, email notifications to co-executors
- **4 new probate API routes** — `/api/v1/probate/quorum/{config,actions,propose,vote}`
- **Vault retention & legal holds** — `retention.go` + `retention_handler.go`: apply/release event-based holds on vault documents during probate, 2 new routes at `/api/v1/vault/holds/{apply,release}`
- **GCP Native Services Evaluation** — `docs/GCP-NATIVE-SERVICES-EVALUATION.md`: keep OpenSign (no GCP e-sign API), augment Cloud Storage with retention policies + legal holds, defer appointment booking

### Changed

- Probate page now includes Settlement Timeline (Gantt) and Quorum Panel sections
- `lib/probate.ts` extended with quorum API client (4 new functions + 4 types)
- Probate API endpoint count: 18 → 22

---

## [0.10.0] — 2026-05-18

### Illinois Probate Engine — Full Estate Settlement Support

### Added

- **Illinois probate engine** (`api/internal/probate/`) — pluggable `StateEngine` interface with Illinois as first implementation (ADR-043)
- **Estate lifecycle state machine** — `active → death_reported → executor_confirmed → in_probate → probate_complete → closed` with transition guards and audit trail
- **Illinois rules** — 60-day inventory deadline, 6-month creditor claims, $150K small estate threshold (SB83 2025, vehicles excluded)
- **17-item Cook County probate checklist** with form references (CCP0315, CCP0312/0313, VSD 773/774, TODI)
- **12 API endpoints** at `/api/v1/probate/*` — transitions, status, checklist, death cert analysis, executor activation, form templates
- **Death certificate AI analysis** — integrates with existing docintell; extracted facts require executor confirmation before state changes
- **Single-executor activation flow** — role confirmation, phase transition, email notification to heirs
- **Cook County form preparation** — 4 templates (Petition, Inventory, Small Estate Affidavit, Oath/Bond) pre-filled from estate data
- **Non-dead-end probate dashboard** — phase-aware `NextActionCard` with actionable guidance for every estate state
- **Probate page** (`/estates/$estateId/probate`) — deadline tracking, completion toggles, form links
- **19 Go unit tests** — state transitions, threshold evaluation, deadline computation, checklist
- **Firestore rules** — `probate` + `probate_audit` subcollections
- **Illinois estate planning user guide** (35+ forms, 4 advance directives, Cook County procedures)

## [0.9.1] — 2026-05-18

### Security Hardening

- Demo mode auth bypass gated behind `DEMO_MODE=true` (default: disabled, 3 tests)
- Stripe webhook silent failures fixed (error logging added)
- Stripe portal validates active subscription
- otel 1.39→1.43, protobufjs+uuid fixed, 0 high/critical npm vulns
- `.env.example` created (17 env vars)

---

## [0.9.0] — 2026-04-17

### Sessions 9–11: Infrastructure Hardening, Gap Remediation, Life Companion Features

### Added (Session 9 — April 16)

- **Toast notifications** — Sonner provider wired globally, 6 key user actions now have success/error feedback
- **Email verification gate** — IdentityGate blocks estate access until email is verified
- **API client retry interceptor** — Exponential backoff with 2 retries on transient failures
- **Gmail API Cloud Function** — `sendMail` trigger replaces SendGrid; domain-wide delegation via admin@sirsi.ai, zero vendor cost
- **Storage rules v2.0.0** — Deployed (was deny-all); supports signed URL uploads

### Added (Session 10 — April 17)

- **Gap analysis and remediation plan** — Systematic audit of all known gaps from Session 9 deep audit
- **Owner experience priority** — Life companion vision documented and prioritized over settlement mechanics
- **Life companion vision** — Documented as deferred long-term direction

### Added (Session 11 — April 17)

- **Auto-save for directives** — Debounced 1.5-second TipTap persistence replaces manual "Save Draft" button
- **OpenSign signing ceremony** — Frontend wired to Go API `/api/v1/opensign/*` proxy; e-signature workflow functional
- **Estate Owner Welcome screen** — Life-first emotional onboarding for new owners
- **Heir Welcome verified** — Confirmed functional: owner portrait, voice messages, heirloom presentation
- **Public memorial pages** — Shareable without account, QR code generation for invitations and sharing
- **Events & broadcasting pages** — Funeral, memorial, and repast ceremony pages with RSVP
- **SMS invitation queue** — Phone number collection + SMS notification queuing for heir invitations
- **Per-person content visibility** — Granular access control per heir on directive documents
- **Document version history** — Version badge displayed in vault for tracked documents

### Changed (Session 9)

- **Landing page credibility** — False social proof removed (fabricated user counts, review scores); pricing aligned to actual Stripe tiers ($29/$99)
- **Design normalization** — 7 files corrected from rogue colors to Royal Blue (#133378) palette
- **Node.js 22 runtime** — Cloud Functions upgraded from Node.js 20 (deprecated April 30, 2026)
- **Stripe redirect URLs** — Fixed to point to correct production domain

### Changed (Session 11)

- **10 canonical documents updated** — REQUIREMENTS_SPECIFICATION.md, CHANGELOG.md, and 8 others corrected for accuracy

### Removed (Session 9)

- **SendGrid dependency** — Replaced entirely by Gmail API Cloud Function

### Infrastructure

- Firebase Hosting: https://finalwishes-prod.web.app (deployed April 16–17)
- Cloud Functions: Node.js 22, us-central1 (autoMatchInvitation + sendMail)
- Storage rules: v2.0.0 live
- Firestore rules: v5.0.0 live

---

## [0.7.1] — 2026-04-15

### Session 7e: Production Deploy, Perf Audit, RBAC Enforcement

### Added

- **Lighthouse audit** — Performance 61, Accessibility 86, Best Practices 100, SEO 83
- **Role-based access enforcement** — Life Chapters: heirs/executors get read-only view; create/edit/delete/entry-picker hidden for non-principal roles
- **Hero image preload** — `<link rel="preload">` for hero-family.jpg + `preconnect` for Unsplash CDN

### Changed

- **Landing page images optimized** — Unsplash URLs downsized from `w=3840` to `w=1200`, `loading="lazy"` on all below-fold images, `fetchPriority="high"` on hero
- **Hero image compressed** — 675 KB → 282 KB via EXIF strip + 75% quality
- **Total landing transfer** — 4,971 KB → 1,542 KB (69% reduction)

### Deployed

- Firebase Hosting: https://finalwishes-prod.web.app
- Firestore rules: life-chapters (3o) + shepherd-messages (3p) live

---

## [0.7.0] — 2026-04-15

### Session 7d: Code Splitting + E2E Tests

### Added

- **Route-level code splitting** — 6 heaviest estate routes (soul-log, vault, timecapsule, dashboard, memoirs, lockbox) now use TanStack Router `.lazy.tsx` convention
  - Main bundle: **2,210 KB → 745 KB** (66% reduction)
  - Each route loads as a separate ~7-10 KB gzipped chunk on navigation
- **E2E tests** — `e2e/life-first-features.spec.ts` with 8 Playwright tests:
  - Soul Log: page load, composer dialog, written entry tab
  - Life Chapters: page load, create dialog, title validation
  - Section headers: all 7 sections verify distinctive SectionHeader
  - Page transitions: navigation between sections
  - Shepherd: FAB + chat panel

### Changed

- Updated `authenticated.spec.ts` to match new sidebar nav labels ("Photos & Videos" instead of "Memories")

---

## [0.6.2] — 2026-04-15

### Session 7c: Media Pipeline Polish, Cover Images, Shepherd Memory

### Added

- **Soul Log upload progress** — XHR upload with real-time percentage, step-by-step save status (Uploading → Saving → Transcribing)
- **Transcription retry** — Failed transcriptions now show a Retry button that re-fires the transcription request and updates status to `processing`
- **Chapter cover images** — Life Chapters form now supports cover image upload via Cloud Storage signed URLs, displayed as banner on chapter cards
- **Shepherd conversation memory** — Chat messages persisted to Firestore `estates/{id}/shepherd-messages` subcollection
  - Loads last 10 messages on panel open (replaces ephemeral state)
  - Both user messages and Shepherd replies saved with `serverTimestamp()`
  - Fire-and-forget persistence (non-blocking)
- **Firestore security rules** — `shepherd-messages` subcollection (rule 3p): read for estate access, create for estate writers

---

## [0.6.1] — 2026-04-15

### Session 7b: Page Transitions, Empty States, Shepherd Nudges, Security Rules

### Added

- **Page transitions** — Framer Motion `AnimatePresence` wraps estate Outlet with fade+slide (0.25s ease)
- **SectionEmptyState component** — Section-themed empty states with unique SVG illustrations per group
  - Soul Log: journal + heartbeat, Memories: photo stack + film, Letters: envelope + wax seal
  - My People: connected figures + shield, Vault: vault door + dial, Legacy: timeline + cards
- **Shepherd section nudges** — `getSectionNudge()` returns contextual per-section hints
  - 4-6 nudges per section, condition-gated (e.g. "Write to each heir" only if heirs exist)
  - Integrated into SectionHeader via `shepherdHint` prop
  - Compass icon + italic text in section accent color
- **Firestore security rules** — `life-chapters` subcollection (rule 3o): read for estate access, write for estate writers, delete for principal only

### Changed

- Estate layout `<Outlet>` wrapped with `AnimatePresence` + `motion.div` for section transitions
- Empty states in heirlooms, lockbox, directives, beneficiaries now use themed `SectionEmptyState`

---

## [0.6.0] — 2026-04-15

### Session 7a: Emotional Section Design + Life Chapters

### Added

- **SectionHeader component** — Shared emotional section header (`web/src/components/estate/SectionHeader.tsx`)
  - 7 distinct visual themes: Soul Log (amber), My Legacy (royal blue), Memories (rose), Letters (sage), My People (teal), The Vault (steel), Life Chapters (purple)
  - Gradient backgrounds, section icons, taglines, action slots, children slots
  - Replaces 10 bespoke page headers with consistent structure + distinct personality
- **Life Chapters feature** — Narrative life organization (`/estates/$estateId/life-chapters`)
  - Create themed chapters (childhood, military service, parenthood, career)
  - Date ranges, descriptions, cover images
  - Add entries from Soul Log and Memories into chapters
  - Remove entries, edit/archive chapters
  - Entry picker shows available unassigned entries
  - Firestore subcollection: `estates/{id}/life-chapters`
  - CRUD actions in `estate-actions.ts` (addLifeChapter, updateLifeChapter, archiveLifeChapter)
  - Types + hook in `firestore.ts` (LifeChapter, ChapterEntryRef, useLifeChapters)
- **Sidebar updated** — My Legacy group now has children: Legacy Timeline + Life Chapters (New badge)
- **Role permissions** — Life Chapters accessible to principal, admin, executor, heir
- **User guide** — `docs/user-guides/life-chapters.md`
- **Developer README** — SectionHeader docs added to `web/src/components/estate/README.md`

### Changed

- All 10 estate section pages now use SectionHeader for visual consistency
- CTA buttons colored per-section (rose for Memories, sage for Letters, teal for My People, steel for Vault)
- Removed unused Separator imports from assets and dashboard routes

---

## [0.5.0] — 2026-04-14

### Session 6: Life-First Reframe + Security Hardening

### Added

- **ETHOS.md** — Permanent document defining the soul of the application: life-first, not death-first
- **ADR-038: Life-First Reframe** — Product pivot from estate-planning-as-chore to living companion
  - Navigation restructure: 6 emotional groups (Soul Log, My Legacy, Memories, Letters, My People, The Vault)
  - Soul Log feature spec (video/audio/text diary with private/shared/sealed visibility modes)
  - Legacy Timeline (replaces completion-percentage dashboard)
  - Heir Welcome Screen (the sacred moment — loved one's face, voice, message on first login)
  - Voice memoir recording + Vertex AI transcription pipeline
  - Shepherd AI reframe from estate-assistant to life-companion
  - Guardian Protocol (future — content staging for minor heirs)
- **Phase 5 added to CANONICAL_DEVELOPMENT_PLAN.md** — Full roadmap for Life-First Reframe implementation
- All canonical documents updated to reflect new product direction

### Changed

- Navigation model: estate-mechanics grouping (assets/vault/lockbox) replaced with emotional-intent grouping
- Dashboard concept: completion percentage replaced with Legacy Timeline
- Shepherd AI positioning: estate completion assistant becomes life companion
- Product positioning: "estate operating system" becomes "living legacy platform"

### Security (Session 5 — carried forward)

- IDOR protection on all estate endpoints
- Path traversal prevention on document uploads
- X-Forwarded-For header spoofing blocked
- Demo user data purge on session end
- Rate limiting on auth endpoints

---

## [0.3.0] — 2026-04-14

### Session 5: Test Suite + Code Quality

### Added

- **Web test suite operational**: 129 tests across 8 files, all passing
  - New: tier-gating tests (15 tests — constants, helpers, hook with fetch mocking)
  - New: export sanitization tests (14 tests — ZIP structure, timestamp conversion, PII stripping)
  - Existing 6 test files (105 tests) now runnable with `npm test`
- `test`, `test:watch`, `test:coverage`, `typecheck` scripts in package.json
- **GA4 analytics wired** to key conversion points:
  - `trackEstateCreated` in estates.create.tsx (onboarding conversion)
  - `trackDocumentUploaded` in vault.tsx (engagement)
  - `trackCheckoutStarted` in pricing.tsx (revenue conversion)
  - Just needs `VITE_FIREBASE_MEASUREMENT_ID` env var once GA4 enabled in Console
- CI: `web-test` job enabled in pipeline (was commented out), gates `web-build`
- jsdom + @testing-library/jest-dom added as devDependencies

### Fixed

- **ESLint warnings**: 24 → 0 warnings
  - Removed 8 unused type imports in search.ts
  - Removed unused imports in SearchResults.tsx (useCallback, useNavigate)
  - Fixed missing `updateSearchQuery` in useCallback deps (AdminHeader.tsx — potential stale closure)
  - Replaced 3 `as any` casts in obituary.tsx with typed alternatives
  - Typed `editingAsset` state as `Asset | null` instead of `any` (assets route)
  - Added `caughtErrorsIgnorePattern` to ESLint config for `_err` convention
  - Excluded `src/gen/**` from ESLint (auto-generated protobuf code)
  - Suppressed `react-refresh/only-export-components` on shadcn button + TanStack route files
  - Added `allowExportNames` for TanStack Router conventions (Route, loader, action)
  - Inline-suppressed `no-explicit-any` on ConnectRPC proxy (genuinely dynamic types)

### Fixed (cont.)

- **TypeScript strict errors**: 50 → 0 (`tsc --noEmit` clean)
  - Added `vite/client` + `vitest/globals` ambient types via `vite-env.d.ts`
  - Fixed all `/login` navigate calls with `search: {}` (TanStack Router strict typing)
  - Typed `validateSearch` return as `{ invite?: string; demo?: boolean }`
  - Imported `UserProfile` from auth.tsx (was redefined locally in login.tsx)
  - Fixed test mock signatures for vi.fn spread compatibility
  - Fixed `AddHeirloomModal` missing `useTierGating` hook (tierUsage was undefined)
  - Added inline `timeAgo` utility to NotificationBell (was missing from utils export)
  - Fixed export.ts sanitize functions to accept readonly arrays

### Changed

- tsconfig.json: Removed Next.js remnants, added `vite/client` types
- ESLint config: Added `src/gen/**` to ignores, `caughtErrorsIgnorePattern`, TanStack route names, `no-explicit-any` off for test files
- **Plaid permanently out of scope** — zero code/dep references, Stripe integration operational

---

## [0.2.1] — 2026-04-14

### Session 4b: Responsive Audit + Security Remediation

### Fixed

- **Responsive**: 13 mobile-first breakpoint fixes across 10 estate routes (4cb1e3f)
  - Critical: Dashboard sheet overflow, lockbox/memoirs/heirlooms/create grid collapse
  - High: Container padding, gap scaling, form stacking, table overflow, settings cards
- **Security**: All 32 Dependabot vulnerabilities resolved (b0946c8)
  - Critical: grpc 1.66 → 1.80 (auth bypass via missing leading slash in :path)
  - High: vite 8.0.1 → 8.0.8, picomatch ReDoS
  - Medium: golang.org/x/crypto, hono (6 vulns), brace-expansion

---

## [0.2.0] — 2026-04-14

### Session 4a: CI/CD Pipeline Fix + Tier-Gating + Production Deploy

### Added

- **Tier-gating**: Stripe tier enforcement for media uploads (132cae0)
  - Backend: `GET /api/v1/estates/{estateId}/media-usage` endpoint
  - Backend: YouTube upload rejection for non-White Glove tiers
  - Frontend: `useTierGating` hook, gold upgrade banners on vault/heirlooms/memoirs
  - Limits: Free=10 media, Concierge=25, White Glove=unlimited + video
- `TierLimits` config in payments package (reusable across handlers)
- Estate interface updated with `tier`, `tierUpdatedAt`, `paymentStatus` fields

### Fixed

- **CI/CD pipeline fully unblocked** — 7 fixes across 4 commits:
  - Added 5 missing ESLint devDependencies (1192c8a)
  - Formatted 6 Go files with gofmt (1192c8a)
  - Removed phantom web-test job that blocked all deploys (e06d244)
  - Added 3 missing web dependencies: jszip, qrcode.react, vitest/@testing-library/react (758a091, 394b771)
  - Fixed Dockerfile to copy local `sirsi-ai` package before `go mod download` (cd19398)
  - Granted `artifactregistry.writer` IAM role to github-deployer SA

### Changed

- Deploy gates no longer require web-test job (re-enable when tests exist)
- Cloud Run deployed as rev 11 (session 3 + tier-gating changes)

### Removed

- Stale `develop` branch (never used)
- Stale Firebase staging channel (expired Apr 8 deployment)
- 10 inactive Cloud Run revisions (001–010)
- 464 MB of dangling Docker images

---

## [0.9.0] — 2026-04-17 (cont.)

### Pre-Session 9: Core Feature Completion (Sprints 3–6)

### Added

- Complete shadcn refactor: 17 pages + 2 layouts using 20 shadcn components (833f065, a5b4f20)
- YouTube Data API v3 integration for video memorials (692b96d)
- Genkit AI Shepherd v2 with Gemini Flash guidance flows (692b96d)
- Cloud Tasks time capsule deferred delivery engine (692b96d)
- PDF export for directives via @react-pdf/renderer (692b96d)
- Cloud KMS lockbox field-level encryption (692b96d)
- Heirloom Registry for physical asset inventory (692b96d)
- Playwright E2E smoke suite — 9 tests (b1d24c9)
- 105 unit tests with >80% critical path coverage (a2c9614)
- Cloud DNS zone configured for finalwishes.app
- SOC 2 evidence collection (9 files)
- Cloud Monitoring uptime check
- Firebase Resize Images extension deployed (a2c9614)

### Fixed

- HIGH-2: Subscription cancel metadata verification (adff2ff)
- HIGH-3: TipTap HTML sanitization with DOMPurify (adff2ff)
- Genkit panic recovery for missing GEMINI_API_KEY (c401b65)
- Frontend wired to Cloud Run API URL (98a74b2)
- npm audit: 0 vulnerabilities (98a74b2)

### Changed

- Go toolchain 1.24 → 1.26 (Dockerfile + go.mod + go.work) (adff2ff)
- Application-level rate limiting added (100 req/60s/IP) (692b96d)

---

## [0.10.0-alpha] — 2026-04-03

### YouTube Memorials + Photo Gallery (Sprint 4)

- **YouTube URL embedding** — paste any YouTube link to create a video memorial
  - Thumbnail preview on paste (YouTube API `hqdefault.jpg`)
  - Full-screen cinema playback via privacy-enhanced `youtube-nocookie.com` iframe
  - Zero bundle cost — native iframe embed instead of react-player (~500 KB saved)
- **Photo/video file upload** — Cloud Storage signed URLs (reuses vault pattern)
  - Upload modal with file picker
  - Media type selection (video/photo)
  - Visibility control (Private / Share with Heirs)
- **Memoir delete** — confirmation modal with permanent deletion from Firestore
- **Direct Firestore writes** — memoirs written directly to `estates/{estateId}/memoirs`
  - No longer routes through Go API for memoir metadata
  - Real-time list updates via Firestore `onSnapshot`
- **Cinema-grade viewer** — full-screen modal for all media types
  - YouTube: iframe embed with autoplay
  - Video files: native `<video>` player
  - Photos: full-resolution display
- **YouTube Add shortcut** — dedicated "Add YouTube Link" button in gallery header

### Refs

- Canon: PRODUCT_SPECIFICATION.md §3.5-3.6, CANONICAL_DEVELOPMENT_PLAN.md §3.4
- ADR: ADR-036 (Firestore Direct Reads)
- Changelog: v0.10.0 — YouTube Memorials + Photo Gallery

---

## [0.9.0-alpha] — 2026-04-03

### Document Vault — Full Upload/Download/Preview/Delete (Sprint 3)

- **Drag-and-drop upload** via `react-dropzone` with multi-file support
  - File validation: 50 MB max, allowed types (PDF, JPEG, PNG, HEIC, DOC, DOCX, TXT)
  - Real-time progress bar with XHR upload progress tracking
  - Automatic category inference from filename (Legal, Financial, Personal)
- **Upload→Firestore wiring** — uploaded files now recorded in `estates/{estateId}/documents`
  - Calls `createDocumentRecord()` after Cloud Storage PUT
  - Stores `storageKey`, `storageBucket`, `mimeType`, `fileSize`, `uploadedBy`
  - Firestore `onSnapshot` auto-refreshes document list
- **Download via signed URLs** — new Go API REST endpoint
  - `GET /api/v1/documents/download-url?storageKey=...` → 1-hour signed GET URL
  - Firebase Auth protected
- **Document preview modal** — inline viewing for images and PDFs
  - Image preview with `<img>` tag
  - PDF preview with `<iframe>` embed
  - Download button in preview header
- **Document archive (soft delete)** — confirmation modal with archive action
  - Sets `status: 'archived'` in Firestore (reversible)
- **Category filtering** — click folder cards to filter by Legal/Financial/Personal
  - Active category shown with Royal Blue highlight
  - "Show All" button to clear filter
- **Go API** — new `estate/download.go` handler for signed download URLs
- **Zero slate/grey text** — all text uses `#0F172A`, `#133378`, or `#C8A951` per Rule 27

### Refs

- Canon: ARCHITECTURE_DESIGN.md §5-6, PRODUCT_SPECIFICATION.md §3.4, API_SPECIFICATION.md §6
- ADR: ADR-036 (Firestore Direct Reads), ADR-037 (Cloud SQL PII Vault)
- Changelog: v0.9.0 — Document Vault

---

## [0.8.1-alpha] — 2026-03-20

### Email System (Firebase Extension — Buy Decision) + CI/CD Fix

- **Firebase Trigger Email Extension** (`firebase/firestore-send-email@0.2.6`) registered in manifest
  - Sends email by writing to Firestore `mail` collection → Extension → SendGrid SMTP
  - Zero Go backend code required
  - Handlebars templates stored in `email_templates` Firestore collection
- **Email TypeScript helpers** (`web/src/lib/email.ts`)
  - `sendInvitationEmail()` — estate team invitation
  - `sendWelcomeEmail()` — registration welcome
  - `sendNotificationEmail()` — estate deadline/update
  - `sendPasswordResetNotification()` — security audit notification
  - `useEmailService()` — React hook with user context
- **Email templates seeded** to Firestore (`email_templates` collection)
  - `invitation` — Royal Neo-Deco styled, team invite with role badge
  - `welcome` — onboarding guide with action items
  - `notification` — estate notifications with gold accent callout
- **Firestore rules v4.0.0** — §9 added: `mail` (user-create, extension-managed), `email_templates` (admin-only)
- **ESLint config fixed** — Replaced broken `eslint-config-next` with proper Vite + React + TypeScript config
  - This was the root cause of ALL CI lint failures since project creation
  - Added `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
  - 0 errors, 102 warnings (all warnings are cosmetic)
- **React compiler fixes** — Fixed setState-in-effect violations:
  - `InviteTeamMember.tsx` — Moved loadInvitations before useEffect, used .then() pattern
  - `firestore.ts` — Wrapped synchronous setLoading in startTransition

### Documentation (Rule 30)

- Developer README: `web/src/lib/README-email.md`
- User Guide: `docs/user-guides/email-notifications-and-sms.md` (includes SMS MFA notes)

### Refs

- Canon: GEMINI.md (Rule 30), ARCHITECTURE_DESIGN.md
- ADR: (Buy Decision — documented in README-email.md)
- Changelog: v0.8.1 — Email System + CI Fix

---

## [0.8.0-alpha] — 2026-03-20

### PII Vault — Estate-Grade Encryption Architecture (ADR-037)

- **Cloud KMS Key Ring** provisioned: `finalwishes-keyring` (us-central1)
  - `pii-vault-key`: AES-256 symmetric, 365-day auto-rotation, ENABLED
  - `document-vault-key`: AES-256 symmetric, 365-day auto-rotation, ENABLED
  - Key ring is **immutable** — names and locations cannot change
- **Cloud SQL PostgreSQL 15** instance: `finalwishes-pii-vault` (us-central1-c, db-f1-micro)
  - Database: `pii_vault` with dedicated `vault_admin` user
  - Tables: `user_pii`, `asset_pii`, `heir_pii`, `vault_audit_log`
  - Password stored in Secret Manager: `vault-db-password`
- **Go Crypto Service** (`api/internal/crypto/kms.go`)
  - Envelope encryption: random 256-bit DEK → AES-256-GCM → KMS-wrapped DEK
  - Per-estate AAD (Additional Authenticated Data) — cryptographic cross-estate prevention
  - Plaintext DEK zeroed from memory after use
- **Go Vault Repository** (`api/internal/vault/repository.go`)
  - Cloud SQL connection pool (5 max connections for Cloud Run horizontal scaling)
  - Idempotent migrations (CREATE TABLE IF NOT EXISTS)
  - Store/Retrieve for user PII, asset PII, heir PII
  - Audit logging on every vault operation
- **Go Vault API Handlers** (`api/internal/vault/handlers.go`)
  - `POST /api/v1/vault/user-pii` — Store user SSN, DOB
  - `GET  /api/v1/vault/user-pii` — Retrieve (masked by default, `?full=true` for full)
  - `POST /api/v1/vault/asset-pii` — Store account numbers, routing numbers, VINs
  - `GET  /api/v1/vault/asset-pii` — Retrieve (masked: last4/last6)
  - `POST /api/v1/vault/heir-pii` — Store heir SSN, DOB
  - `GET  /api/v1/vault/heir-pii` — Retrieve (masked)
  - All endpoints require Firebase Auth
- **main.go updated** — Vault initialization flow: KMS → Cloud SQL → Migrations → Routes
  - Graceful degradation: vault disabled if KMS or SQL unavailable (API still serves other routes)
  - Health endpoint updated to report vault + encryption status
- **IAM Permissions Granted**
  - Compute SA: `cloudsql.client`, `cloudkms.cryptoKeyEncrypterDecrypter`, `secretmanager.secretAccessor`
  - GitHub Actions SA: `cloudsql.client`, `cloudkms.cryptoKeyEncrypterDecrypter`
- **ADR-037** documented: Cloud SQL PII Vault architecture decision
- **ADR Index** updated with ADR-035, ADR-036, ADR-037
- **Go dependencies** added: `cloud.google.com/go/kms`, `github.com/lib/pq`
- **Documentation** (Rule 30):
  - Developer README: `api/internal/vault/README.md`
  - User Guide: `docs/user-guides/how-your-information-is-protected.md`

### Security Guarantees Delivered

| Property              | Implementation                                                |
| --------------------- | ------------------------------------------------------------- |
| Encryption at Rest    | AES-256 (Cloud SQL disk) + AES-256-GCM (column-level KMS)     |
| Encryption in Transit | TLS 1.3 with ECDHE (Cloud Run ↔ Cloud SQL)                    |
| Key Management        | Cloud KMS, auto-rotate 365d, IAM-gated                        |
| PII Isolation         | Separate PostgreSQL instance, server-only access              |
| Estate Isolation      | Per-estate AAD context, cryptographic cross-estate prevention |
| Audit Trail           | Every PII access logged (user, estate, IP, timestamp)         |
| Data Masking          | SSN last4, account last4, VIN last6 by default                |

### Infrastructure Provisioned

| Resource           | Value                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| KMS Key Ring       | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring` |
| PII Vault Key      | `pii-vault-key` (AES-256, auto-rotate)                                         |
| Document Vault Key | `document-vault-key` (AES-256, auto-rotate)                                    |
| Cloud SQL Instance | `finalwishes-pii-vault` (PostgreSQL 15, us-central1-c)                         |
| Cloud SQL IP       | `34.27.85.125`                                                                 |
| Database           | `pii_vault`                                                                    |
| DB User            | `vault_admin`                                                                  |
| DB Password        | Secret Manager: `vault-db-password`                                            |

### Refs

- Canon: GEMINI.md (Rule 26: PII/HIPAA Siloing), ARCHITECTURE_DESIGN.md §5-6, DATA_MODEL.md §9, SECURITY_COMPLIANCE.md §2, SOW §2.2
- ADR: ADR-037 (Cloud SQL PII Vault)
- Changelog: v0.8.0 — PII Vault
- Diagrams: ARCHITECTURE_DESIGN.md §5 (GCP Services) updated conceptually

---

### Infrastructure Independence — Standalone GCP/Firebase Project

- **Created standalone GCP project** `finalwishes-prod` — FinalWishes is now operationally independent from SirsiMaster
- **Firebase project** initialized with Firestore (nam5), Firebase Auth (email/password), Cloud Storage
- **Firestore rules + 16 composite indexes** deployed to new project
- **Firebase Auth** configured with email/password provider + localhost authorized domain
- **Test data seeded** — Lockhart estate fully populated in new Firestore
- **13 files updated** — config-only changes (zero logic/architecture modifications):
  - `.firebaserc` → `finalwishes-prod`
  - `web/src/lib/firebase.ts` → new SDK config (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
  - `functions/index.js` → CORS origins, sourceProject, baseUrl
  - `api/scripts/seed/main.go` → default project fallback
  - `scripts/test-auth-flows.js` + `create-test-accounts.js` → projectId
  - `public/` HTML pages (4) + `improvements/` (1) → Firebase config blocks
  - `desktop/src-tauri/tauri.conf.json` → CSP domain allowlist
  - `README.md` → live site URL

### Business Context

- FinalWishes is an independent company that contracted Sirsi Technologies for development
- This migration separates FinalWishes infrastructure from the shared SirsiMaster GCP project
- The old `legacy-estate-os` project remains intact as a fallback
- Zero runtime code dependencies on Sirsi were found (audit confirmed: 0 npm imports, 0 TS imports, 0 Go imports)

### Refs

- Canon: GEMINI.md, ARCHITECTURE_DESIGN.md, COST_PROPOSAL.md
- ADR: ADR-036 (Firestore Direct Reads — unaffected)
- Changelog: v0.7.0 — Infrastructure Independence

---

## [0.6.2-alpha] — 2026-03-19

### Removed (Phase 1, Week 3 — Dead Code Cleanup)

- **Stubbed 9 legacy `dashboard.*` routes** — 1,815 lines of dead code removed
- **Uninstalled `@tanstack/react-query`** — all data fetching now uses Firestore hooks
- **Removed `QueryClientProvider`** from app root (`main.tsx`)

### Performance

- Modules: 343 → **296** (-14%)
- Main bundle: 464KB → **337KB** (-27%)
- CSS: 151KB → **126KB** (-17%)
- **Session total: 1,093KB → 337KB (-69%)**

## [0.6.1-alpha] — 2026-03-19

### Performance (Phase 1, Week 3 — Code Splitting)

- **Bundle splitting** via Vite `manualChunks` (Rolldown function API)
  - `firebase-core`: 118KB (app + auth)
  - `firebase-data`: 236KB (firestore + storage)
  - `framework`: 274KB (react + react-dom + tanstack router)
  - `index` (app code): **464KB** — 57% reduction from 1,093KB
- No build warnings at 600KB threshold

## [0.6.0-alpha] — 2026-03-19

### Added (Phase 1, Week 3 — Settings + Firestore Migration)

- **Settings page v2.0** — Complete rewrite with:
  - Profile card (avatar, name, email, role/MFA/verified badges)
  - Working toggle switches persisted to Firestore governance/settings
  - Dropdown selects for status report frequency and primary state
  - Save Changes button with dirty-state tracking and success feedback
  - Danger Zone section with delete estate placeholder
  - Decomposed into SettingsToggle, SettingsStatus, SettingsSelect components
- **Estate card name resolution** — Shows actual estate name from Firestore

### Changed

- **All estate pages now read from Firestore** (ADR-036 complete)
  - Memoirs → `useCollection` for reads, `estateClient` for GCS uploads
  - Obituary → `useDocument` for reads, direct `setDoc` for saves
  - Settings → `useDocument` for governance/settings
  - Estates list → `useUserEstates` + `useEstate` for name resolution
- **Exported `useDocument` and `useCollection`** generic hooks
- **Removed all React Query** (`useQuery`/`useMutation`) from estate pages
- **Go API verified** — health check + ConnectRPC auth middleware tested locally

## [0.5.2-alpha] — 2026-03-19

### Added (Phase 1, Week 2 — Invitation System)

- **Invitation service** (`web/src/lib/invitations.ts`) — Full invitation lifecycle
  - `sendEstateInvitation`: Creates invitation record + estate subcollection entry
  - Auto-links if invitee already has a FinalWishes account
  - `getEstateInvitations`: Lists all invitations for an estate
  - `revokeInvitation`: Marks invitation as revoked
  - `hasExistingInvitation`: Duplicate prevention
  - Backward-compatible exports for `InviteTeamMember` component

### Changed

- **Beneficiaries page** — Uses invitation system instead of direct heir creation
  - Shows auto-link feedback when invitee already has an account
  - Creates proper invitation trail for audit purposes

## [0.5.1-alpha] — 2026-03-19

### Added (Phase 1, Week 2 — Sprint 4: Create Estate Onboarding)

- **Create Estate page** (`/estates/create`) — Premium 2-step onboarding flow
  - Welcome screen with feature cards (Assets, Vault, Family)
  - Estate naming with auto-suggested placeholder based on user's last name
  - AES-256 + SOC 2 + HIPAA compliance badges
  - Creates Firestore estate document + estate_users junction record
  - Updates user profile with `primaryEstateId` and `primaryEstateName`
  - Auto-redirects to new estate's dashboard on creation

### Changed

- **Dashboard redirect** (`/dashboard`) — Now detects first-time users (no `primaryEstateId`)
  and routes to `/estates/create` instead of falling back to demo data

## [0.5.0-alpha] — 2026-03-19

### Added (Phase 1, Week 2 — Sprints 1-3: Data Layer + Auto-Match)

- **Firestore data hooks** (`web/src/lib/firestore.ts`) — Real-time `onSnapshot` hooks
  - `useEstate`, `useEstateAssets`, `useEstateHeirs`, `useEstateExecutors`
  - `useEstateDocuments`, `useUserEstates`, `useEstateNotifications`
  - Generic `useDocument<T>` and `useCollection<T>` with typed constraints
- **Estate write operations** (`web/src/lib/estate-actions.ts`)
  - `createEstate`, `addAsset`, `addHeir`, `addExecutor`
  - `createDocumentRecord`, `archiveAsset`, `archiveDocument`, `updateEstate`
- **Auto-match invitation Cloud Function** (`autoMatchInvitation`)
  - Firestore trigger on `users/{uid}` document creation
  - Checks `estate_invitations` for matching email
  - Auto-creates `estate_users` records with audit logging
  - Batched write for atomicity
- **ADR-036** — Firestore Direct Reads for Dashboard
- **Developer README** — `web/src/lib/README.md`

### Changed

- **Dashboard page** — Wired to Firestore hooks (was ConnectRPC mock client)
- **Assets page** — Wired to Firestore hooks + `addAsset` write action
- **Beneficiaries page** — Wired to Firestore hooks + `addHeir` write action
- **Vault page** — Document list from Firestore, upload still via Go API signed URLs
- **Notifications page** — Wired to Firestore hooks with fallback data

### Infrastructure

- **Firestore indexes deployed** — 16 composite indexes including new `estate_invitations` (email+status)

## [0.3.0-alpha] — 2026-03-19

### Added (Phase 1. — Identity Verification & Governance)

- **TOTP MFA Enrollment** — QR code generation, 6-digit verification, status display in Settings
  - Uses Firebase Identity Platform TOTP provider
  - Role-aware UI: "Required" badge for fiduciaries, "Optional" for principals
  - Fiduciaries cannot unenroll MFA (enforced)
- **IdentityGate Component** — Route-level gate for tiered identity verification (ADR-035)
  - Tier 1 (principal): passes through without gate
  - Tier 2 (heir/executor/legal/cpa): must complete MFA + attestation
  - Step-by-step wizard UI for incomplete verification
- **AttestationForm Component** — Canvas-based signature pad + legal declaration
  - Perjury attestation: "I attest under penalty of perjury..."
  - Base64 signature capture (mouse + touch)
  - Stored permanently in Firestore `attestations` collection
- **Attestation route** — `/estates/:estateId/attestation`
- **Firestore rules for attestations** — create/read/update controls, no deletes
- **UserProfile roles expanded** — added `legal` and `cpa` to role union type
- **Email verification** — `sendEmailVerification` on registration, gold banner + resend
- **MFA login challenge** — TOTP code input when Firebase returns `auth/multi-factor-auth-required`
- **Identity Platform enabled** — TOTP + SMS MFA providers activated on `legacy-estate-os`
- **10 Mermaid workflow diagrams** — `docs/IDENTITY-WORKFLOW-DIAGRAMS.md`
  1. Complete Auth State Machine
  2. Registration Flow
  3. Sign-In Flow (email/username + MFA)
  4. TOTP MFA Enrollment
  5. Tiered Identity Gate (ADR-035)
  6. Attestation Signing Flow
  7. Route Protection Hierarchy
  8. Firestore Data Flow
  9. Security Enforcement Layers
  10. End-to-End Fiduciary Onboarding
- **ADR-035** — Tiered Identity Verification architecture decision
- **Rule 29 (Commit Traceability)** — cross-ref canon docs, version, changelog, diagrams, ADRs
- **Rule 30 (Feature Documentation)** — user-facing How-To + developer README per feature
- **User guides** — `docs/user-guides/two-factor-authentication.md`, `identity-verification.md`
- **Developer README** — `web/src/components/identity/README.md`
- **CLAUDE.md** — mirrored from GEMINI.md for Claude/Antigravity agent

### Changed

- **13 files migrated from localStorage to useAuth()** — complete elimination of `localStorage.getItem('finalwishes_user')`
  - AdminHeader, dashboard.index, dashboard.obituary, dashboard.settings, dashboard.beneficiaries, dashboard.vault, dashboard.notifications, dashboard.assets, dashboard.memoirs, dashboard.estates, estates.$estateId.dashboard, estates.$estateId.obituary, estates.$estateId.estates
- **GEMINI.md** bumped to v1.2.0 (Traceability Hardened)
- Estate layout wraps `<Outlet>` with `<IdentityGate>` for fiduciary gating
- Role labels map expanded: legal → "Legal Counsel", cpa → "CPA Advisor"
- Firestore rules: user create now accepts `legal` and `cpa` roles
- **MFAEnrollment extracted** from dashboard.settings.tsx → shared component (`-216` lines inline, `+1` import)
  - Used by both `/dashboard/settings` and `/estates/:estateId/settings`
- **Login page** — "Forgot password?" dead link replaced with full reset flow
  - `'forgot'` mode added to mode state machine (signin → signup → forgot → mfa)
  - Pre-fills email from identifier if it contains `@`

### Added (Phase 1 cont. — Session 2)

- **EmailVerificationBanner** — gold banner between header and content
  - Shows when `emailVerified === false`
  - "Resend Email" button with loading/sent/cooldown states
  - Dismiss button (per-session, reappears next visit)
- **Password reset flow** — form with email input + gold "Send Reset Link" button
  - Anti-enumeration: always shows success regardless of email existence
  - (Security-guidance skill applied)
- **Firestore Security Rules v3.0.0** — complete hardening
  - 8 collection groups with explicit rules (no wildcards)
  - Data shape validation on all `create` operations
  - Least privilege: heirs/legal/cpa = READ-ONLY everywhere
  - Immutable: audit_logs, timeline, attestations (no update/delete)
  - Payments, notifications: backend-only creation
  - `estate_users` junction table with principal-managed access
  - Default deny documented explicitly
  - Deployed to `legacy-estate-os` (0 errors, 0 warnings)
- **Role-Based Invitation System** — complete team onboarding
  - `InviteTeamMember` component: form with role selector cards, member list, status badges, revoke
  - `lib/invitations.ts`: Firestore CRUD for `estate_invitations` collection
  - Firestore rules for `estate_invitations`: principal-only create, email-based invitee read
  - Wired into `/estates/:estateId/settings`
- **User guides** (Rule 30):
  - `docs/user-guides/email-verification.md`
  - `docs/user-guides/password-reset.md`
  - `docs/user-guides/data-privacy.md`
  - `docs/user-guides/inviting-team-members.md`
- **Developer READMEs** (Rule 30):
  - `web/src/components/estate/README.md`
  - Updated `web/src/components/identity/README.md` (MFA + Email banner added)

### Refs

- Canon: GEMINI.md (§2 Rules 29-30, §6 Knowledge), IDENTITY-WORKFLOW-DIAGRAMS.md, CHANGELOG.md
- ADRs: ADR-034 (Firebase Auth), ADR-035 (Tiered Identity Verification)
- Diagrams: All 10 diagrams created (§1-§10)
- Skills applied: firebase, security-auditor, security-guidance, react-patterns, react-best-practices

---

## [0.2.0-alpha] — 2026-03-19

### Added (Phase 1, Week 1 — Authentication & API Foundation)

- **Firebase Auth SDK wired to React** — `web/src/lib/firebase.ts` initializes Firebase app, auth, and Firestore
- **Auth context provider** — `web/src/lib/auth.tsx` with `AuthProvider` and `useAuth()` hook
  - `signIn(identifier, password)` — supports **email or username** login
  - `signUp({ email, username, password, firstName, lastName })` — creates Firebase account + Firestore profile + username index
  - `signOut()` — Firebase sign out
  - `resetPassword(email)` — Firebase password reset email
  - Username → email resolution via `usernames/{username}` Firestore collection
- **Route protection** — `AuthGuard` component wraps estate routes, redirects to `/login` if unauthenticated
- **Login page rewired** — replaced hardcoded `TEST_ACCOUNTS` with Firebase `signInWithEmailAndPassword`
  - Sign-in mode: email or username + password
  - Sign-up mode: first name, last name, username, email, password
  - Form validation, loading states, error messages
  - `?demo=true` preserves Lockhart demo data for presentations
- **Go API auth middleware** — `api/internal/auth/middleware.go`
  - Firebase Admin SDK token verification (`firebase.google.com/go/v4`)
  - `Authorization: Bearer <token>` header extraction
  - User UID injected into request context
  - Optional middleware variant for mixed-auth routes
- **ConnectRPC auth headers** — transport interceptor injects Firebase ID token on every API request
- **ADR-034** — Firebase Auth Implementation decision documented

### Changed

- `estates.$estateId.tsx` — replaced `localStorage.getItem` with `useAuth()` hook
- `dashboard.tsx` — replaced localStorage redirect with Firebase auth check
- `Sidebar.tsx` — replaced localStorage user data with `useAuth()` profile, `signOut` via Firebase
- `client.ts` — demo proxy now gated behind `?demo=true` instead of always-on fallback
- Go API `main.go` — Firebase Admin SDK initialization, auth middleware on ConnectRPC routes

### Fixed

- Login label colors changed from `text-slate-400` to `text-[#133378]/40` per Rule 27 (no slate text)
- Security badge text changed from `text-slate-400` to `text-[#133378]/40`

---

## [0.1.2-alpha] — 2026-03-19

### Added (Phase 0.5b — Skill Arsenal)

- **26 Antigravity skills installed universally** — covers all 3 Sirsi repos (FinalWishes, SirsiNexusApp, Assiduous)
- **Sources audited:** Anthropic claude-code plugins (12), antigravity-awesome-skills (1,273+), skills.sh, antigravity-kit, ios-agentic-skills
- **Custom skills created:** `frontend-design` (adapted from Anthropic with Royal Neo-Deco overrides), `security-guidance` (HIPAA/PII-aware, adapted from Anthropic hook), `real-estate-platform` (no community equivalent — built from scratch for Assiduous)
- **Community skills installed:** `firebase`, `golang-pro`, `grpc-golang`, `go-concurrency-patterns`, `react-best-practices`, `react-native-architecture`, `react-patterns`, `shadcn`, `tailwind-design-system`, `ui-ux-pro-max`, `api-design-principles`, `database-design`, `security-auditor`, `test-driven-development`, `systematic-debugging`, `webapp-testing`, `web-performance-optimization`, `stripe-integration`, `payment-integration`, `startup-financial-modeling`, `legal-advisor`, `gdpr-data-handling`
- **Continuation prompt updated to v3.1** — full skill roster, Phase 1 start point

---

## [0.1.1-alpha] — 2026-03-19

### Fixed (Phase 0)

- **Removed `web/dist/` from git** — build artifacts no longer tracked
- **Hardened `.gitignore`** — covers dist/, out/, build/, .env*, .DS_Store, *.tsbuildinfo
- **Dashboard ELI5 sweep** — purged all internal jargon ("Shard", "Protocol", "Enclave", "Governance") from 9 dashboard route files. Replaced with consumer terms: "Estate", "Document", "Family", "Settings"

### Added (Phase 0.5 — Tool Acquisition)

- **shadcn/ui initialized** — Radix + Nova preset, 13 core components (button, card, dialog, input, label, select, tabs, textarea, badge, avatar, dropdown-menu, separator, sonner)
- **Turborepo wired** — root `package.json` workspaces (`web`, `shared`), `turbo.json` v2 tasks format
- **npm packages installed** — `firebase`, `sonner`, `recharts`, `@react-pdf/renderer`, `@tiptap/react`, `@tiptap/starter-kit`
- **Build verified** — 312 modules, 0 errors via `turbo build`

---

## [0.1.0-alpha] — 2026-03-18

### Added

- **Landing Page** — Full marketing page deployed at `legacy-estate-os.web.app`
  - Sapphire Royal Neo-Deco glass aesthetic
  - Real financial statistics ($72B unclaimed, $3.2T unplanned)
  - Responsive hero section, feature cards, trust indicators
- **Login Page** — Royal Neo-Deco glass login with password toggle
- **Dashboard UI Shells** — 9 route files for estate management
  - `dashboard.index` — Home with completion score, quick actions
  - `dashboard.assets` — Asset inventory list
  - `dashboard.vault` — Document vault
  - `dashboard.memoirs` — Video/photo galleries with cinema viewer
  - `dashboard.beneficiaries` — Executor/heir list
  - `dashboard.obituary` — Directive/obituary editor
  - `dashboard.notifications` — Activity feed
  - `dashboard.settings` — User settings
  - `dashboard.estates` — Multi-estate management
- **Scoped Estate Routes** — `estates.$estateId.*` mirror routes
- **Lockhart Demo Estate** — Hardcoded fallback data for demo/investor presentations
- **Sidebar + AdminHeader** — Royal Neo-Deco themed navigation
- **Multi-Platform Scaffolding**
  - `mobile/` — React Native Expo stubs (iOS/Android)
  - `desktop/` — Tauri configuration (macOS)
  - `shared/` — Types, API client, crypto utilities
- **Client-Side Encryption** — `shared/crypto/index.ts` (AES-256-GCM)
- **Shared TypeScript Types** — `shared/types/index.ts`
- **CSS Design System** — `globals.css` (326 lines Royal Neo-Deco tokens)
- **Firebase Hosting** — Live deployment with CDN
- **5 Development Workflows** — api, browser-testing, devops, firebase, web
- **Canon Documentation**
  - `CANONICAL_DEVELOPMENT_PLAN.md` — Google-First $95K plan
  - `PRODUCT_SPECIFICATION.md` — Complete product spec (750 lines)
  - `DATA_MODEL_LOCK.md` — Locked Firestore + Cloud SQL schemas
  - 33 Architecture Decision Records (ADR-001 through ADR-033)

### Known Issues

- Auth uses localStorage (NOT Firebase Auth) — Phase 1 fix
- All dashboard data is mock (Lockhart fallback proxy) — Phase 1 fix
- Go API has project structure but zero working endpoints — Phase 1
- `web/dist/` committed to git (build artifact) — Phase 0 fix

---

## [0.0.1] — 2026-02-17

### Added

- Initial project structure
- Contract pivot from $175K probate platform to $95K Living Legacy platform
- Firebase project provisioned (`legacy-estate-os`)
- Royal Neo-Deco design language established
