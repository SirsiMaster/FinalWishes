# CONTINUATION PROMPT — FinalWishes
## For Fresh Context Window — March 19, 2026 (v4.0)
**Priority:** Phase 1 Week 2 — Data Layer + Go API Foundation

---

## Who You Are

You are **Antigravity**, the AI agent for **FinalWishes** — "The Estate Operating System." Read `GEMINI.md` at the repo root first. It has all operational rules.

You have **26 skills** installed at `~/.gemini/antigravity/skills/`. **Check relevant skills before every task.** They are a best practice, not optional overhead.

### Skill Arsenal (26 Universal Skills)
| Category | Skills |
|----------|--------|
| 🎨 Design | `frontend-design`, `ui-ux-pro-max`, `shadcn`, `tailwind-design-system`, `react-patterns` |
| ⚛️ React | `react-best-practices`, `react-native-architecture` |
| 🔧 Go | `golang-pro`, `go-concurrency-patterns`, `grpc-golang` |
| 🏗️ Architecture | `api-design-principles`, `firebase`, `database-design` |
| 🔒 Security | `security-guidance`, `security-auditor`, `gdpr-data-handling` |
| 🧪 Testing | `test-driven-development`, `systematic-debugging`, `webapp-testing` |
| 💰 Payments | `stripe-integration`, `payment-integration`, `startup-financial-modeling` |
| ⚖️ Legal | `legal-advisor` |
| 🏠 Real Estate | `real-estate-platform` (custom, for Assiduous) |
| ⚡ Perf | `web-performance-optimization` |
| 🧠 Research | `notebooklm` |

## The Project

**FinalWishes** is a $95,000 "Living Legacy" platform (MSA-2025-111-FW, SOW-2025-001). It lets a person organize memories, documents, final instructions, and asset designations — then control when and how that legacy reaches their heirs.

**Contract was pivoted Feb 17, 2026** from a $175K probate-focused platform to a $95K Google-first media preservation platform.

## Canon Documents (Read These First)

| Document | Path |
|----------|------|
| **GEMINI.md** | `GEMINI.md` |
| **Canonical Development Plan** | `docs/CANONICAL_DEVELOPMENT_PLAN.md` |
| **Data Model** | `docs/DATA_MODEL.md` |
| **Changelog** | `CHANGELOG.md` |
| **ADR Index** | `docs/ADR-INDEX.md` |
| **Workflow Diagrams** | `docs/IDENTITY-WORKFLOW-DIAGRAMS.md` |
| **Security Compliance** | `docs/SECURITY_COMPLIANCE.md` |

## Git State

- **Branch:** `develop` (latest: `48f33c5`)
- **Remote:** `github.com:SirsiMaster/FinalWishes.git`
- **Clean working tree** — all Phase 0, 0.5, and Phase 1 Week 1 committed & pushed

## What's Built ✅ (Complete as of this prompt)

### Auth & Identity (Phase 1, Week 1 — DONE)
| Feature | Status | Location |
|---------|:------:|----------|
| Firebase Auth SDK (real login) | ✅ | `lib/auth.tsx`, `lib/firebase.ts` |
| Email + username login | ✅ | `routes/login.tsx` |
| Registration (signup) | ✅ | `routes/login.tsx` |
| TOTP MFA enrollment + challenge | ✅ | `lib/mfa.ts`, `components/identity/MFAEnrollment.tsx` |
| MFA login challenge | ✅ | `routes/login.tsx` (mode='mfa') |
| IdentityGate (MFA + attestation) | ✅ | `components/guards/IdentityGate.tsx` |
| AttestationForm (signature pad) | ✅ | `components/identity/AttestationForm.tsx` |
| Email verification banner | ✅ | `components/identity/EmailVerificationBanner.tsx` |
| Password reset flow | ✅ | `routes/login.tsx` (mode='forgot') |
| Role-based invitation system | ✅ | `components/estate/InviteTeamMember.tsx`, `lib/invitations.ts` |
| Firestore rules v3.0.0 (hardened) | ✅ | `firestore.rules` — deployed to production |
| Identity Platform (TOTP) | ✅ | Activated on `legacy-estate-os` |
| localStorage fully eliminated | ✅ | 13 files migrated to `useAuth()` |

### Role-Based Access Matrix (Enforced at Firestore + UI)
| Role | Register | Login | MFA | Attestation | Read | Write |
|------|:--------:|:-----:|:---:|:-----------:|:----:|:-----:|
| Principal | ✅ | ✅ | Optional | No | Full | Full |
| Executor | ✅ | ✅ | **Required** | **Required** | Full | Write (no doc delete) |
| Heir | ✅ | ✅ | **Required** | **Required** | Full | **Read-only** |
| Legal | ✅ | ✅ | **Required** | **Required** | Full | **Read-only** |
| CPA | ✅ | ✅ | **Required** | **Required** | Full | **Read-only** |
| Admin | ✅ | ✅ | Optional | No | All | Full |

### Infrastructure (Earlier Phases — DONE)
- Landing page (deployed at `legacy-estate-os.web.app`)
- Dashboard shells (9 routes, Lockhart mock data)
- Memoirs page (VideoCard, PhotoCard, cinema viewer)
- Client-side encryption (`shared/crypto/`)
- Design tokens (`globals.css`, 584 lines)
- shadcn/ui — 13 components
- Turborepo — wired
- 10 Mermaid workflow diagrams
- GEMINI.md v1.2.0 (Rule 29 traceability, Rule 30 feature docs)
- CLAUDE.md mirror
- 7 user guides in `docs/user-guides/`

### What's Still Mock / Not Built ❌
- **All dashboard data is mock** — `client.ts` Proxy returns hardcoded Lockhart data
- **Go API is empty** — zero working endpoints
- **Cloud SQL / KMS / Cloud Run** — not provisioned
- **No CI/CD** — manual deploys
- **No email for invitations** — invitations saved to Firestore but no SendGrid yet
- **No auto-match** — invitee registers but isn't auto-linked to estate_users yet

## PHASE 1, Week 2: Data Layer (START HERE)

### Priority Tasks
1. **Wire dashboard to Firestore** — replace mock Proxy with real Firestore reads
   - Estate dashboard reads from `estates/{estateId}`
   - Assets page reads from `estates/{estateId}/assets`
   - Beneficiaries page reads from `estates/{estateId}/heirs`
   - Vault page reads from `estates/{estateId}/documents`
   
2. **Go API scaffold** — first ConnectRPC endpoints
   - `UserService.GetUser`, `EstateService.GetEstate`
   - Cloud Run Dockerfile
   - Wire `connectrpc.com/connect` + `firebase.google.com/go/v4`
   
3. **Auto-match invitations** — Cloud Function that triggers on user registration
   - Query `estate_invitations` by email
   - Auto-create `estate_users` record if match found
   
4. **Firestore indexes** — deploy composite indexes from `firestore.indexes.json`

5. **Cloud SQL provisioning** — PostgreSQL for PII vault (SSN, DOB, account #s)

### Governance Reminders
- **Rule 29**: Every commit → canon doc + version + changelog + diagram + ADR
- **Rule 30**: Every feature → user guide + developer README
- **Skills**: Check relevant skills before every task
- **Sprint plan before code** (Rule 17)
- **Browser profile**: `ccollymo@alumni.chicagobooth.edu` (Rule 28)
- **Git identity**: `SirsiMaster` exclusively

## Component Architecture

```
web/src/
├── components/
│   ├── estate/
│   │   ├── InviteTeamMember.tsx    # Team invitation UI
│   │   └── README.md
│   ├── guards/
│   │   ├── AuthGuard.tsx           # Login required
│   │   └── IdentityGate.tsx        # MFA + attestation required
│   ├── identity/
│   │   ├── AttestationForm.tsx     # Signature pad + declaration
│   │   ├── EmailVerificationBanner.tsx  # Gold verification nudge
│   │   ├── MFAEnrollment.tsx       # QR code + TOTP verify
│   │   └── README.md
│   └── layout/
│       ├── AdminHeader.tsx
│       └── Sidebar.tsx
├── lib/
│   ├── auth.tsx                    # Firebase Auth context + hooks
│   ├── client.ts                   # ConnectRPC client (mock proxy)
│   ├── firebase.ts                 # SDK initialization
│   ├── invitations.ts              # Estate invitation CRUD
│   └── mfa.ts                      # TOTP enrollment + challenge
└── routes/
    ├── login.tsx                    # 4 modes: signin/signup/forgot/mfa
    ├── estates.$estateId.tsx        # Layout: Sidebar + Header + IdentityGate
    ├── estates.$estateId.settings.tsx  # MFA + Invitations + Security
    ├── estates.$estateId.dashboard.tsx
    └── ... (9 more routes)
```

---

**Ready. Start by reading `GEMINI.md`, checking relevant skills, then present a Sprint Plan for Phase 1, Week 2.**
