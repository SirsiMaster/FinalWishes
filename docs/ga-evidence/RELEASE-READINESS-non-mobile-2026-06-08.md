# FinalWishes — Non-Mobile Release Readiness

**Date:** 2026-06-08 · **Author:** claude-finalwishes (solo; codex-finalwishes offline 2 days)
**Scope:** Tier-1 **web** GA (mobile CR-09 explicitly excluded per owner directive)
**HEAD:** `6d4ccf7` · **Prod:** https://finalwishes-prod.web.app (bundle `index-BU2QsfW3.js` = local build, confirmed live)

---

## Headline

**The non-mobile product is engineering-complete and deployed.** All four engineering
criteria (CR-01…04) are MET. The only things between us and GA are **three operational
toggles you own** (DNS, Stripe, OpenSign templates) and **a 7-day passive uptime window**.
No missing features block release.

**Estimated time to non-mobile GA: ~1 week**, bounded by the uptime window — not by build work.

---

## Scorecard (12 criteria)

| # | Criterion | Owner | Status | Note |
|---|---|---|---|---|
| 01 | Tier-1 features shipped | claude | ✅ MET | enhanced: persona-safe layers, full CRUD, heir sacred landing |
| 02 | Tests green (≥211) | claude | ✅ MET | 226+ (web 202 + functions 24 + 17 Go pkgs) |
| 03 | CI green | claude | ✅ MET | green on last 6+ pushes; deploys gated by green build jobs |
| 04 | Dependabot 0 high | claude | ✅ **MET** | 30 alerts, all fixed, **0 open** (was 6 highs on 2026-05-20) |
| 05 | finalwishes.app DNS+TLS | **YOU** | ⬜ | ~15 min — point DNS at Firebase Hosting |
| 06 | 7-day uptime ≥99.9% | passive | ⬜ | window just needs to run after a stable deploy |
| 07 | Stripe Customer Portal | **YOU** | ⬜ | ~5 min — toggle in Stripe dashboard |
| 08 | 4 OpenSign templates | **YOU** | ⬜ | ~1 hr — app-side wiring already done (directives route) |
| 09 | Native iOS+Android | — | 🚫 EXCLUDED | non-mobile scope; 8–12 wk if ever pursued |
| 10 | Full RAG legal corpus | claude | ◻ post-launch | foundation built (ADR-044, pgvector); 2–3 wk |
| 11 | Lob certified mail | claude | ◻ deferred | per guardrails; ~1 wk if pursued |
| 12 | Google Photos | claude | ◻ post-launch | package exists; ~1 wk to finish |

Legend: ✅ MET · ⬜ open + blocking GA · ◻ scope-expansion (not blocking non-mobile Tier-1) · 🚫 excluded

---

## What you (owner) must do — the 3 GA blockers that are yours

These are the only blocking items not owned by engineering. Total: ~1.5 hours.

### CR-05 — Custom domain (finalwishes.app) DNS + TLS
1. Firebase Console → Hosting → Add custom domain → `finalwishes.app` (+ `www`).
2. Add the TXT (verification) + A/AAAA records Firebase shows at your DNS registrar.
3. Wait for Firebase to provision the TLS cert (auto, ~minutes–hours).
- Verify: `dig finalwishes.app +short` resolves to Firebase IPs; `curl -I https://finalwishes.app` → 200.

### CR-07 — Stripe Customer Portal
1. Stripe Dashboard → Settings → Billing → Customer portal → **Activate**.
2. Configure allowed actions (update payment method, cancel, invoices).
- Verify: the in-app "Manage subscription" link opens the Stripe-hosted portal.

### CR-08 — 4 OpenSign templates (app wiring already done)
The code path exists: the directives route already creates OpenSign envelopes
(`/api/v1/opensign/create-envelope`) and polls status. What's missing is the **4 templates**
in OpenSign (sign.sirsi.ai):
1. Log into OpenSign, create the 4 directive templates (per `docs/ga-evidence/cr-08-opensign-*`).
2. Record the template IDs; confirm the directive "Send for signature" flow resolves them.
- Verify: create a test directive → Send for signature → envelope created → signed callback returns.

---

## CR-06 — the uptime window (passive)
Once CR-05 is live and the deploy is stable, a 7-day ≥99.9% availability window must elapse.
Set up a Cloud Monitoring uptime check (or use the existing one) on `https://finalwishes.app`
and capture hourly availability to `docs/sla-evidence/<start>-to-<end>.md`. This is the single
longest pole for non-mobile GA — **start it as soon as CR-05 is live.**

---

## Manual verification script (run when convenient / when browser tooling is up)

Server-level health is confirmed (200s, API auth-enforcing, latest bundle live). The
interactive click-through below verifies the new persona-safe + CRUD work end-to-end.
Use the `ccollymo@alumni.chicagobooth.edu` Chrome profile (Rule 28).

**As principal** (`principal@finalwishes.app` / `LegacyPrincipal2025!` if grace-period active, else your real account):
1. Open your estate dashboard — confirm the owner "My Legacy" timeline renders (no white screen). ← verifies RoleGuard doesn't break principal routes.
2. Soul Log → create a text entry → **edit it** (pencil → change title + text → Save) → **delete it** (trash → confirm). Both should toast success.
3. Memories → open a photo → **Edit** → change title/visibility → Save.
4. Lockbox → on an account, hover → **pencil** → edit name/notes → Save.
5. Time Capsules → on a pending letter → **Edit** → change title/message → Save.
6. Open DevTools console — confirm **zero runtime errors** during the above.

**Persona-safety (needs seeded non-principal accounts):** run `node scripts/seed-persona-qa.js`,
then log in as each `persona-<role>@finalwishes.app` and confirm:
- heir lands on the **sacred** dashboard (letters/memories first, not a completion score);
- typing `/estates/estate_persona_qa/vault` as heir shows the warm "not part of your role" block;
- executor sees the settlement dashboard, not the owner timeline.
(Logic is unit-proven by 29 persona/RoleGuard tests; this confirms the live render.)

---

## What I did this session (solo)
- Committed codex's orphaned, verified WIP (trustee role full-stack + Phase 5 Shepherd persona-filter) so 2 days offline wouldn't lose it — deployed clean (`ee3a052`).
- Confirmed + captured **CR-04 → MET** (0 open Dependabot alerts).
- Armed/verified the 𓆄 Ma'at pre-push gate (now runs vitest too) + enabled GitHub auto-merge.
- Server-smoked prod (app + API + exact-bundle-match live).
- This readiness doc.

## What's blocked / needs you or Codex
- **Branch protection (CR-03 hardening):** requires GitHub Pro (private repo on free plan) or making the repo public — **owner decision**. Auto-merge is on; CI is green; protection just isn't *enforced*.
- **Interactive browser walk:** Chrome extension was disconnected this session; do it manually (script above) or let Codex run its seeded walk on return.
- **Scope-expansion CR-10/CR-12** (RAG, Google Photos): not blocking non-mobile Tier-1; schedule post-launch if desired.
