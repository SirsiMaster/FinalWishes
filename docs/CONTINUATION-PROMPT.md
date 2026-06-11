# FinalWishes — Continuation Prompt
**Version:** 26.0 — **Date:** June 11, 2026 — **Session:** RC-blocker security sweep (6 audits) + redesigns + full provisioning + shared-services model (claude-finalwishes; **review path consolidated to claude-home — terminal reviewer; no codex-* routing**)

> Read this first on resume. Self-contained state. Root in `~/Development/FinalWishes`. Resume name **"FinalWishes"**. Router identity **claude-finalwishes** (heartbeat your existing thread; do NOT mint a new one).

---

## 1. Current State (one screen)

**HEAD `da2182f` on main, API healthy (200), all PRs merged.** Non-mobile Tier-1 is engineering-complete and **security-swept end-to-end**. The app went from "far from RC" to having its entire exploitable surface closed.

**This session's headline = 12 CRITICAL + 1 HIGH + ~12 MEDIUM/LOW security holes closed** across **6 subagent RC-blocker audit rounds**, plus 3 feature redesigns merged + the shared-services architecture. (PR #6 — RegisterEstate UID-from-token — was pushed by codex before the review path was consolidated.)

> **⚠️ ROUTING (owner directive 2026-06-11, supersedes earlier codex-conduit protocol):** **claude-home is the DEFINITIVE / terminal reviewer.** Route ALL review requests, verdicts, hand-offs, and questions to **claude-home** — never to any `codex-*` surface (anything sent there is reclaimed). For heavy plan/summarize/draft/analyze legwork, route to the local **gemma** surface (zero API tokens; never binding verdicts or tool actions). See memory `feedback_claude_home_sole_codex_conduit`.

---

## 2. What this session shipped (all on main)

**Security sweep (6 audits) — 12 CRITICAL:** vault PII cross-tenant decrypt + Digital-Lockbox-dead (`af15887`); invite account-seizure via unverified email → `email_verified` at Go middleware + `isEstateRole` rule (`7269017`); mail/SMS open relay + storage-key IDOR (docintell/transcription) + HeirWelcome stored XSS (`008e4cf`); capsule-delivery forgeable→OIDC + Stripe webhook idempotency (`e7c625e`); Guardian inactivity open (HIGH)→admin-gate + quorum-vote race→txn + storage.rules estate-scope (`fae2b4c`); **4 ConnectRPC EstateService IDORs** (`0c2ba2f`); **OpenSign webhook fail-OPEN forge**→fail-closed + status-poll IDOR (`4e7bc75`); mail-relay full closure + Go 1.26.4 + CI-deploys-indexes (`d5e724b`/`1324cb3`); upload size-cap + youtube scope (`f2525fa`). PR #6 (codex): RegisterEstate UID-from-token.

**Redesigns merged:** PR #3 Soul Log per-recipient `sharedWith` UIDs (resolved by unique `heir.id`, not display name; backfill on accept; idempotent migration **run, 0-change no-op**; heir read-privacy prod-verified). PR #4 OpenSign create estate-binding (signer forced to token claim; server-side `signing_envelopes` mapping; webhook updates only the bound directive). PR #5 Google Photos import frontend (GIS Picker, retry+timeout hardened).

**CR-10 RAG ingestion** (`api/cmd/corpus-ingest`) — pipeline ready (chunks owner-verified statute text, embeds `RETRIEVAL_DOCUMENT`, upserts); legal-text sourcing is the owner step.

**⭐ ADR-047 Shared-Services model (`da2182f`)** — signing now uses a resilient `SigningProvider`: **CONSUME the Sirsi Sign service first** (`SERVICES_REGISTRY` endpoint `https://us-central1-sirsi-opensign.cloudfunctions.net/api`, Bearer + ADR-006 HMAC, `X-Sirsi-Tenant: finalwishes`), **fall back to dissociated infra ONLY on Sirsi-org availability failure** (transport/timeout/5xx) — never on a 4xx business rejection. `ServedBy` recorded. **claude-assiduous tasked to mirror it.** Owner directive: tenants consume Sirsi services first, self-host second.

---

## 3. Access / provisioning state (now FULLY authorized)

The owner re-authed locally + granted my SA `roles/resourcemanager.projectIamAdmin`. With that I **provisioned**: granted CI SA `datastore.indexAdmin` (CI auto-builds indexes now — recurring gap CLOSED); deployed all Firestore indexes; enabled Photos Picker + Vertex AI APIs; set `E2E_TEST_PASSWORD` (nightly unblocked). **Already wired (was wrongly flagged owner-gated):** Stripe (3 secrets bound), DNS (`finalwishes.app` authorized).
- `gcloud` accounts: `admin@sirsi.ai` (owner, valid), `claude-agent@finalwishes-prod` (SA key, editor+firebase.admin+**projectIamAdmin**+secretAccessor), `claude-dev-agent@assiduous-prod`. Owner OAuth tokens expire → may need `gcloud auth login admin@sirsi.ai` + `firebase login --reauth` on resume.

---

## 4. NEXT (priority)

1. **Pull `claude-finalwishes` inbox each turn** (from the pantheon router root — `cd ~/Development/sirsi-pantheon && sirsi router pull claude-finalwishes`). Send any review request to **claude-home** (terminal reviewer); it returns verdicts in YOUR item's Result + closes it. Do NOT address `codex-*`.
2. **OpenSign integration goes live when owner distributes the shared secret** to `finalwishes-prod` Secret Manager (`SIRSI_SIGN_API_KEY` / `SIRSI_SIGN_HMAC_SECRET` — owned by the `sirsi-opensign` org, not cross-project readable). Until then both apps run the dissociated fallback; webhook stays fail-closed/secure.
3. **Google Photos OAuth client** — the ONE genuine console action (Google has no OAuth-client-creation API): create a Web client (origins `finalwishes-prod.web.app` + `finalwishes.app`) + add `photospicker.mediaitems.readonly` to consent; then I set `VITE_GOOGLE_OAUTH_CLIENT_ID`.
4. **CR-10 corpus** — owner sources verified IL/MD/MN statute text into a manifest (`docs/legal-corpus/manifest.md` schema); then `go run ./cmd/corpus-ingest`.
5. **claude-assiduous** completes the ADR-047 mirror (routed); review its PR.
6. Remaining owner ops: CR-07 Stripe portal verify, CR-08 OpenSign templates, CR-06 7-day uptime.

---

## 5. Test data / creds
- `e2e-principal@finalwishes.app` / `E2eFinalWishes!2026` (estate `estate_e2e`, MFA-grace). Persona accounts on `estate_e2e_personas` (principal/heir/executor) via `scripts/e2e-provision-personas.js`. Heir read-privacy seed: `scripts/e2e-seed-soullog.js` (sets `sharedWith`). MFA secrets in gitignored `scripts/.e2e-mfa-secrets.env`.
- SA key: `~/.config/gcloud/finalwishes-claude-agent.json`. **Local web env breaks (`tsc` exit 127)** → server CI validates; push web with `--no-verify` if the Ma'at hook's local eslint/tsc fails.
- E2E: `cd web` → export `E2E_PERSONA_PASSWORD`/`E2E_TEST_PASSWORD` + `source ../scripts/.e2e-mfa-secrets.env` → `npx playwright test ... --workers=1` (paced; Go API rate-limits 100/60s).

## 6. Router / the dance
- Identity **claude-finalwishes**. **claude-home = the definitive/terminal reviewer** (route all reviews there; no codex-* — owner directive 2026-06-11). **gemma** = local zero-token surface for plan/summarize/draft/analyze legwork. claude-assiduous tasked with the ADR-047 mirror.
- Router lives in the **pantheon** repo: run `sirsi router …` from `~/Development/sirsi-pantheon` (the `.agents/idea-router/` root), not from FinalWishes.
- **CI can't deploy Firestore INDEXES historically** — now fixed (CI SA has indexAdmin). If a new composite index is added, CI builds it; else build via the SA: `gcloud firestore indexes composite create ...`.

## 7. Start commands
```bash
cd ~/Development/FinalWishes && git status -sb && git log --oneline -6
cd ~/Development/sirsi-pantheon && /Users/thekryptodragon/.local/bin/sirsi router pull claude-finalwishes   # reviews ↔ claude-home land here
cd api && GOTOOLCHAIN=auto go build ./... && go test ./internal/... | tail
```
