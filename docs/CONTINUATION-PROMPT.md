# FinalWishes — Continuation Prompt
**Version:** 20.0 — **Date:** April 21, 2026 — **Session:** Deep Audit + Landing Page Overhaul + Ship Readiness
**Terminal Color: 🟢 GREEN**

---

## Current State

FinalWishes is **demoable and deployed** at `https://finalwishes-prod.web.app`. Demo mode works end-to-end at `/login?demo=true` (any username/password). 14/14 page load checks pass against production. Go API is on Cloud Run rev 33. 168 unit tests pass, 0 TS errors, 0 Go errors.

---

## What Was Done (April 20-21 Session)

### Deep Audit — 35 Issues Found, All Resolved
- **7 CRITICAL** (2 real, 5 inflated): Signing webhook + status polling, API tier enforcement middleware, E2E test selectors
- **13 HIGH** (2 real, 11 inflated): Debts register, settlement broadcast notifications
- **15 MEDIUM** (4 real, 11 inflated): Insurance/charitable categories, Guardian daily cron, pet guardianship + organ donation already in directive templates

### Landing Page — Complete Rebuild
- Conversion-first: scenarios → problem → capabilities → three steps → product showcase → shepherd → security → testimonials → pricing → FAQ → CTA
- Dark/light alternating sections (`#1A3478` royal blue / `#FAF8F5` cream via `.section-light`)
- Human faces in every section matching emotional tone
- Auto-rotating ProductShowcase carousel (8 tabs, 15s rotation, crossfade)
- ScrollVideoCanvas framework ready for brand video
- Animation system: ScrollReveal, AnimatedCounter, HoverCard, StaggerList

### Bug Fixes
- AuthProvider missing from `__root.tsx` (app was crashing)
- Demo mode: `loginDemo()` + localStorage persistence + IdentityGate bypass + OwnerWelcome auto-dismiss
- Go API: demo-token auth bypass in middleware for all endpoints
- Guardian inactivity: operator precedence bug (was spamming all estates)
- DocIntell: PDFs now sent as base64 to AI (was only sending filename)
- Vault: added General to CATEGORY_MAP (docs were disappearing)
- Login: removed navigatePostLogin race condition
- AI routing: 404/permission/not_found classified as retryable (enables Gemini fallback)

### Infrastructure
- Firebase CLI: permanent service account auth (no more re-auth)
- Gemini API: re-enabled with restricted key (server-only, `generativelanguage.googleapis.com` only)
- AI models: Gemma 4 (`gemma-4-27b-it`) + Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite-preview`)
- Firestore seeded: Lockhart Estate — 6 assets, 4 docs, 3 heirs, 3 soul-logs, 2 directives, 2 capsules
- Dependabot: 10 vulnerabilities resolved, 0 remaining
- Legal: real Privacy Policy + Terms of Service

---

## Architecture Decisions

- **Demo mode**: Synthetic user in localStorage, Go API accepts `demo-token`, IdentityGate bypasses for `user_`/`demo_` UIDs
- **AI routing**: sirsi-ai SDK: Claude Opus → Claude Sonnet → Gemini 3.1 Flash Lite. All 404/permission errors retryable.
- **Gemini security**: API key restricted to `generativelanguage.googleapis.com` only, never in client code. See `docs/SECURITY_ADVISORY_GEMINI_API_KEYS.md`
- **No navy**: `#1A3478` (saturated royal blue), never `#0A1628`. Stored in memory as feedback rule.
- **Landing page rendering**: Body is white, dark sections get `bg-[#1A3478]`, light sections use `.section-light` with `!important`. `color-scheme: only light` prevents Chrome Auto Dark Mode.

---

## Remaining Items (Owner Action Only)

| # | Item | Where |
|---|------|-------|
| 1 | Custom domain `finalwishes.app` | DNS registrar → Firebase Hosting |
| 2 | Gemini billing credits (depleted) | ai.studio/projects → add payment |
| 3 | Enable Claude on Vertex AI | Cloud Console → Model Garden (next week) |
| 4 | Stripe Customer Portal toggle | dashboard.stripe.com/settings/billing/portal |
| 5 | OpenSign templates (4 directives) | sign.sirsi.ai web UI |
| 6 | Brand video for scroll animation | Runway/Kling → `./scripts/extract-frames.sh` |

---

## Key Files

| File | Purpose |
|------|---------|
| `web/src/routes/index.tsx` | Landing page (all sections) |
| `web/src/lib/auth.tsx` | Auth provider + demo mode |
| `web/src/lib/animations.tsx` | Animation system |
| `web/src/components/landing/ProductShowcase.tsx` | Auto-rotating carousel |
| `web/src/components/landing/ScrollVideoCanvas.tsx` | Scroll-driven video |
| `web/src/components/guards/IdentityGate.tsx` | MFA + demo bypass |
| `api/internal/auth/middleware.go` | Go auth + demo-token bypass |
| `api/packages/sirsi-ai/config.go` | AI model configuration |
| `api/packages/sirsi-ai/router.go` | AI fallback chain routing |
| `api/packages/sirsi-ai/service.go` | Multi-model service + retryable errors |
| `docs/SECURITY_ADVISORY_GEMINI_API_KEYS.md` | Gemini API key vulnerability briefing |

---

## Start Next Session

```bash
cd ~/Development/FinalWishes
# Read .thoth/memory.yaml first
# App: finalwishes-prod.web.app
# Demo: /login?demo=true
```
