# FinalWishes — Continuation Prompt
**Version:** 12.0 — **Date:** April 8, 2026 — **Session:** shadcn refactor + Phase 2-4 completion

---

## Resume Key

**Last commit:** `d6c0b2f` (main) — Heirloom Registry + 49 Go tests + perf hints + canonical doc updates
**Repo:** `/Users/thekryptodragon/Development/FinalWishes`
**Contract:** MSA-2025-111-FW | SOW-2025-001 | $95K Fixed Bid | 16 Weeks
**Canonical plan:** `docs/CANONICAL_DEVELOPMENT_PLAN.md` v3.0.0

---

## What Was Done This Session (11 commits)

### shadcn Royal Neo-Deco Refactor (COMPLETE)
- All 17 route pages + 2 layout components (Sidebar, AdminHeader) refactored from hand-rolled HTML to shadcn/ui primitives
- 16 of 20 installed shadcn components in active use: Button (20 files), Badge (17), Card (14), Dialog (10), Separator (10), Input (9), Label (8), Select (6), AlertDialog (3), Avatar (3), Textarea (3), Switch (2), Progress (2), Tabs (1), Table (1), ScrollArea (1)
- Royal Neo-Deco flows through CSS variables — `--primary=#133378`, `--accent=#C8A951`, `--radius=1rem`
- Commit: `a5b4f20`

### Phase 2 Features Built (6 features, all in `692b96d`)
1. **YouTube Data API v3** — `api/internal/youtube/handler.go` — unlisted video uploads, processing status, Firestore memoir docs
2. **Genkit AI Shepherd v2** — `api/internal/guidance/genkit.go` — Gemini Flash flows: estate guidance, obituary assistant, action suggestions. Falls back to deterministic v1 if unavailable.
3. **Cloud Tasks delivery engine** — `api/internal/capsules/handler.go` — scheduled_date -> Cloud Task, anniversary -> annual re-enqueue, on_death/on_settlement -> Firestore listener. Delivers via `mail` collection (Firebase SendGrid extension).
4. **PDF export** — `web/src/components/pdf/DirectivePDF.tsx` — @react-pdf/renderer, Royal Neo-Deco styled A4 PDFs, code-split (4.36KB lazy chunk)
5. **Cloud KMS lockbox encryption** — `api/internal/lockbox/handler.go` — AES-256-GCM field-level envelope encryption, per-estate AAD, audit logging
6. **Heirloom Registry** — `web/src/routes/estates.$estateId.heirlooms.tsx` — physical asset inventory with 7 categories, photos, provenance, designated heir

### Security Fixes (`adff2ff`, `c401b65`)
- HIGH-2: Subscription cancel now verifies subscription ID matches estate record
- HIGH-3: TipTap HTML sanitized via DOMPurify before editor load
- Genkit panic recovery (GoogleAI plugin panics without GEMINI_API_KEY — now caught with defer/recover)

### Testing (154 total tests)
- **105 frontend unit tests** across 6 files (auth, firestore, estate-actions, mfa, invitations, ErrorBoundary) — >80% critical path coverage
- **9 Playwright E2E tests** — smoke suite against production (public pages + API auth checks)
- **49 Go integration tests** across 6 packages (guidance, payments, capsules, ratelimit, youtube, lockbox)
- Frontend: `cd web && npm test` / E2E: `cd web && npm run test:e2e` / Go: `cd api && go test ./...`

### Infrastructure
- **Cloud Run:** revision `finalwishes-api-00008-bll` — all services active (Firestore, Cloud SQL, KMS, Stripe, Genkit, YouTube, Cloud Tasks, OpenSign, rate limiter)
- **8 secrets in Secret Manager:** stripe-secret-key, stripe-publishable-key, stripe-webhook-secret, sendgrid-api-key, vault-db-password, opensign-api-url, gemini-api-key, ext-firestore-send-email-SMTP_PASSWORD
- **Cloud DNS zone** `finalwishes-app` created with A, TXT, CNAME records for Firebase Hosting + API + www
- **Cloud Armor WAF** policy created (SQLi + XSS + rate limiting) — needs load balancer attachment
- **Firebase extensions:** firestore-send-email (active), storage-resize-images (deployed, 200x200 + 800x800)
- **Staging:** `https://finalwishes-prod--staging-5givr132.web.app` (expires 2026-05-08)
- **Uptime check:** Cloud Monitoring polling `/api/v1/payments/tiers` every 5 min
- **SOC 2 evidence:** 9 files in `docs/soc2-evidence/`
- **Cloud Tasks queue:** `capsule-delivery` in us-central1

### Stripe Keys (Sirsi shared account `51ShDB5`)
Source: `sirsi-nexus-live` GCP project (sign.sirsi.ai)
- Live mode keys configured in Secret Manager
- `STRIPE_USE_LIVE=false` on the Stripe dashboard — safe for pre-launch

---

## Contract Acceptance Criteria — 18/20 Complete

| # | Criteria | Status | Commit |
|---|----------|--------|--------|
| 1 | Register/login with MFA (TOTP) | DONE | prior sessions |
| 2 | Create estate + add assets | DONE | prior sessions |
| 3 | Upload docs to encrypted vault | DONE | prior sessions |
| 4 | YouTube video memorials | DONE | 692b96d |
| 5 | Designate executors/heirs | DONE | prior sessions |
| 6 | PII encrypted (Cloud SQL + AES-256-GCM) | DONE | prior sessions |
| 7 | Royal Neo-Deco UI (shadcn) | DONE | a5b4f20 |
| 8 | 3-tier identity verification | DONE | prior sessions |
| 9 | CI/CD pipeline | DONE | prior sessions |
| 10 | Production deployed | DONE | multiple |
| 11 | Shepherd AI guidance (Genkit) | DONE | 692b96d |
| 12 | Digital lockbox (KMS encrypted) | DONE | 692b96d |
| 13 | Ethical wills + directives (PDF) | DONE | 692b96d |
| 14 | Time capsule delivery (Cloud Tasks) | DONE | 692b96d |
| 15 | E2E tests (Playwright) | DONE | b1d24c9 |
| 16 | Frontend coverage >80% | DONE | a2c9614 |
| 17 | Staging environment | DONE | infra agent |
| 18 | SOC 2 evidence | DONE | infra agent |
| 19 | DNS switchover (finalwishes.app) | **PENDING** | Cloud DNS configured, awaiting GoDaddy NS change |
| 20 | 99.9% uptime launch week | **MONITORING** | Uptime check active |

---

## What's Next

### Immediate (requires user action)
1. **GoDaddy nameserver switch** — Change from `ns07/ns08.domaincontrol.com` to:
   ```
   ns-cloud-b1.googledomains.com
   ns-cloud-b2.googledomains.com
   ns-cloud-b3.googledomains.com
   ns-cloud-b4.googledomains.com
   ```
2. **After DNS propagation** — Update `web/.env.production` to `VITE_API_URL=https://api.finalwishes.app`, rebuild and deploy
3. **Stripe webhook endpoint** — Register `https://api.finalwishes.app/api/v1/payments/webhook` (or current Cloud Run URL) in Stripe Dashboard
4. **Cloud Armor** — Provision Global External Application Load Balancer + Serverless NEG to attach the `finalwishes-waf` policy to Cloud Run

### Technical Debt
- Dependabot: 29 Go module vulnerabilities (mostly transitive deps from GCP SDKs)
- `viz` chunk is 1.5MB (react-pdf renderer) — only loads on PDF export click, but consider lighter alternative
- Coverage `coverage/` directory triggers ESLint warnings — add to `.eslintignore`
- 14 `@typescript-eslint/no-explicit-any` warnings in `mfa.test.ts`

### Future Features (Tier 3 — not purchased)
- Estate Administration ($25K) — death certificate OCR, executor activation, multi-executor quorum
- Probate Engine MD/IL/MN ($35K) — state-specific court filing guidance
- Advanced AI ($15K) — RAG with legal corpus, document drafting, conversation memory
- Financial Integration ($20K) — direct Plaid for transactions, liabilities, investments

---

## Production URLs

| Service | URL |
|---------|-----|
| Frontend (current) | https://finalwishes-prod.web.app |
| Frontend (post-DNS) | https://finalwishes.app |
| API | https://finalwishes-api-qyjuke2xea-uc.a.run.app |
| API (post-DNS) | https://api.finalwishes.app |
| Staging | https://finalwishes-prod--staging-5givr132.web.app |
| GCP Console | https://console.firebase.google.com/project/finalwishes-prod |

## Key File Locations

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Operational directive (rules, stack, design system) |
| `docs/CANONICAL_DEVELOPMENT_PLAN.md` | Contract-aligned dev plan with acceptance criteria |
| `CHANGELOG.md` | Full change history |
| `docs/soc2-evidence/` | SOC 2 compliance evidence (9 files) |
| `api/cmd/api/main.go` | Go API entry point (all route registration) |
| `api/internal/guidance/genkit.go` | Genkit AI Shepherd v2 |
| `api/internal/capsules/handler.go` | Cloud Tasks delivery engine |
| `api/internal/lockbox/handler.go` | KMS-encrypted credential storage |
| `api/internal/youtube/handler.go` | YouTube Data API video uploads |
| `web/src/styles/globals.css` | Royal Neo-Deco CSS variables |
| `web/src/components/ui/` | 20 shadcn components |
| `web/src/components/pdf/DirectivePDF.tsx` | PDF export component |
| `firestore.rules` | Firestore security rules v5.1.0 |

---

**Updated:** April 8, 2026 (Claude Opus 4.6)
