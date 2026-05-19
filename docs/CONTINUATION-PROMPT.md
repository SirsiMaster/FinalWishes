# FinalWishes — Continuation Prompt
**Version:** 21.0 — **Date:** May 19, 2026 — **Session:** C3 Sprint (Documentation, Tests, Gantt, Quorum, GCP Eval)

---

## Current State

FinalWishes is **demoable and deployed** at `https://finalwishes-prod.web.app`. Demo mode works end-to-end at `/login?demo=true`. Go API on Cloud Run rev 33. 168 vitest + 19 Go probate + 24 Cloud Function tests pass. 0 TS errors.

---

## What Was Done (May 19 Session — C3 Sprint)

### 1. Developer READMEs (10 new, 25 total)
Created per Rule 30 for: guards (AuthGuard, IdentityGate, OwnerWelcome, HeirWelcome), landing (ProductShowcase, ScrollVideoCanvas), layout (AdminHeader, Sidebar, NotificationBell), search (SearchResults), skeletons (5 lazy-route loading states), styles (Royal Neo-Deco design tokens), gen (protobuf types), functions (4 Cloud Functions), shared (TypeScript types), api (top-level Go API).

### 2. User Guides (3 new, 25 total)
- `soul-log.md` — video/audio/text recording, visibility, sealed delivery, Shepherd prompts
- `estate-settlement.md` — IL probate phases, death cert review, executor activation, checklists, court forms
- `events-broadcasting.md` — funeral/memorial/repast event creation, RSVP tracking, sharing

### 3. Cloud Function Tests (24 tests, Jest)
`functions/index.test.js` — mocked Firestore, Gmail API, Secret Manager. Covers:
- `autoMatchInvitation`: skip empty, skip no email, match + batch commit, email normalization
- `sendMail`: skip processed, error on missing fields, send + mark SUCCESS, multiple recipients, template resolution, error handling
- `sendSMS`: skip processed, validate E.164, validate body length, queue with PENDING_PROVIDER
- `guardianInactivityCheck`: calls Go API, handles error/network failure gracefully

### 4. Settlement Gantt Timeline (recharts)
`web/src/components/estate/SettlementGantt.tsx` — horizontal stacked bar chart using invisible start offset + visible duration bar. Color-coded: red (overdue), amber (≤14d), blue (≤60d), green (>60d). ReferenceLine at "Today." Integrated into probate page between deadlines and checklist.

### 5. Multi-Executor Quorum (2-of-3)
**Go API** (`api/internal/probate/quorum.go`):
- `QuorumConfig`: enabled, requiredVotes, totalExecutors, executorUIDs
- `QuorumAction`: propose → vote → resolve (early rejection when approval impossible)
- 4 handlers: GetConfig, ListActions, ProposeAction, VoteAction
- Email notification to co-executors on new proposals

**Frontend** (`web/src/components/estate/QuorumPanel.tsx`):
- Lists pending/resolved actions with vote indicators
- Approve/reject buttons with optional rejection reason
- Propose dialog for new actions (phase transition, asset distribution, document signing)
- Integrated into probate page

**TypeScript** (`web/src/lib/probate.ts`): 4 API client functions + QuorumConfig, QuorumAction, QuorumVote types

### 6. Cloud Storage Retention & Legal Holds
**Go API** (`api/internal/service/estate/retention.go` + `retention_handler.go`):
- `ApplyEstateHolds(estateID)` — places event-based holds on all vault docs (prevents deletion during probate)
- `ReleaseEstateHolds(estateID)` — releases holds when estate is closing
- `SetDocumentHold(estateID, objectPath, hold)` — per-document hold control
- `GetDocumentRetention(estateID, objectPath)` — retention metadata
- 2 HTTP routes: `POST /api/v1/vault/holds/{apply,release}`

### 7. GCP Native Services Evaluation
`docs/GCP-NATIVE-SERVICES-EVALUATION.md`:
- **E-Signatures**: Keep OpenSign (GCP has no e-sign API)
- **Form Builders**: Keep current React + probate engine
- **Vault Storage**: Augment with retention policies + legal holds (free, done)
- **Appointment Booking**: Defer, embed Calendar booking pages later

---

## Architecture Decisions

- **Quorum model**: Propose → Vote → Resolve (not consensus). Early rejection when approval is mathematically impossible (2 rejections in 2-of-3 = auto-reject). Decoupled from executor activation.
- **Gantt chart**: Recharts stacked bar hack (invisible offset bar + visible duration bar). No dedicated Gantt library needed.
- **Retention**: Event-based holds (not time-based retention). Applied per-estate on all vault objects. Released on estate close.
- **Cloud Function tests**: Jest (not vitest) since functions are Node.js CommonJS. Tests run via `cd functions && npm test`.

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Vitest (web) | 168 | All pass (run from `web/` directory) |
| Go probate | 19 | All pass |
| Cloud Functions (Jest) | 24 | All pass |
| TypeScript | 0 errors | Clean |
| Go build | 0 errors | Clean |

---

## Remaining Items

### C4 TODO
1. Deploy C3 changes to production (Cloud Run + Firebase Hosting)
2. Enable bucket-level retention policy on `finalwishes-vault` (`gsutil retention set 7y gs://finalwishes-vault`)
3. Wire `ApplyEstateHolds` call into probate phase transition (when death_reported)
4. Vitest root-level config to exclude `functions/` (currently must run from `web/`)
5. Update README.md badges / version

### Owner-Only Items
1. Custom domain `finalwishes.app` → Firebase Hosting DNS
2. Gemini billing credits (depleted)
3. Stripe Customer Portal toggle
4. OpenSign templates (4 directives)
5. Brand video (Runway/Kling)

---

## Key Files (C3 additions)

| File | Purpose |
|------|---------|
| `web/src/components/estate/SettlementGantt.tsx` | Recharts Gantt timeline |
| `web/src/components/estate/QuorumPanel.tsx` | Multi-executor approval UI |
| `api/internal/probate/quorum.go` | Quorum API (propose/vote/list/config) |
| `api/internal/service/estate/retention.go` | Cloud Storage holds |
| `api/internal/service/estate/retention_handler.go` | Hold HTTP handlers |
| `functions/index.test.js` | 24 Cloud Function unit tests |
| `docs/GCP-NATIVE-SERVICES-EVALUATION.md` | GCP services evaluation |

---

## Start Next Session

```bash
cd ~/Development/FinalWishes
# App: finalwishes-prod.web.app
# Demo: /login?demo=true
# Tests: cd web && npx vitest run
# Go: cd api && go test ./...
# CF: cd functions && npm test
```
