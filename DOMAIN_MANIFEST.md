# Domain Manifest — FinalWishes Parallel Development
**Version:** 1.0.0
**Date:** March 17, 2026
**Purpose:** Maps every file and directory to exactly ONE agent domain. Two sessions NEVER touch the same file.

---

## Domain Ownership Map

### DOMAIN-API (Session A: Go Backend)
**Owner:** Session A
**Branch:** `feat/api-core`

```
api/                           ← ENTIRE directory
├── cmd/api/main.go
├── internal/
│   ├── api/handlers/          ← NEW: HTTP handlers
│   ├── api/middleware/        ← NEW: Auth, CORS, rate limiting
│   ├── api/routes.go          ← NEW: Route registration
│   ├── domain/                ← NEW: Business logic
│   │   ├── user/
│   │   ├── estate/
│   │   ├── asset/
│   │   ├── document/
│   │   └── notification/
│   ├── repository/            ← NEW: Data access layer
│   │   ├── firestore/
│   │   └── cloudsql/
│   ├── service/               ← NEW: External integrations
│   │   ├── auth/
│   │   ├── storage/
│   │   ├── kms/
│   │   ├── payment/
│   │   └── email/
│   ├── config/                ← NEW: Configuration
│   └── opensign/              ← EXISTING: OpenSign handler
├── go.mod
├── go.sum
└── Dockerfile
```

**Does NOT touch:** `web/`, `mobile/`, `functions/`, `public/`, `docs/`, `.github/`

---

### DOMAIN-WEB (Session B: React Frontend)
**Owner:** Session B
**Branch:** `feat/web-app`

```
web/                           ← ENTIRE directory
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           ← Landing/Home
│   │   ├── (auth)/            ← NEW: Login, Register, Forgot
│   │   ├── (dashboard)/       ← NEW: Protected routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       ← Dashboard home
│   │   │   ├── estates/       ← Estate CRUD
│   │   │   ├── vault/         ← Document vault
│   │   │   ├── beneficiaries/ ← Heirs & executors
│   │   │   └── settings/      ← User settings
│   │   └── (portals)/         ← NEW: Role-specific portals
│   │       ├── principal/
│   │       ├── executor/
│   │       └── heir/
│   ├── components/
│   │   ├── ui/                ← Design system primitives
│   │   ├── forms/             ← Form components
│   │   ├── layouts/           ← Shell, sidebar, header
│   │   └── features/         ← Feature-specific
│   ├── lib/
│   │   ├── api.ts             ← API client
│   │   ├── auth.ts            ← Firebase Auth
│   │   ├── crypto.ts          ← Client-side encryption
│   │   └── utils.ts
│   ├── hooks/                 ← Custom React hooks
│   ├── stores/                ← Zustand stores
│   └── styles/
├── public/
└── package.json
```

**Does NOT touch:** `api/`, `functions/`, `mobile/`, `public/` (root), `.github/`

---

### DOMAIN-FIREBASE (Session C: Cloud Functions + Rules)
**Owner:** Session C
**Branch:** `feat/firebase-infra`

```
functions/                     ← ENTIRE directory
├── index.js                   ← EXISTING: OpenSign endpoints
├── triggers/                  ← NEW: Firestore triggers
│   ├── onEstateCreate.js
│   ├── onDocumentUpload.js
│   └── onDeathReport.js
├── webhooks/                  ← NEW: Stripe webhooks
│   └── stripe.js
├── email/                     ← NEW: SendGrid templates
│   └── transactional.js
└── package.json

firestore.rules                ← Security rules
firestore.indexes.json         ← Compound indexes
storage.rules                  ← Storage security rules
```

**Does NOT touch:** `api/`, `web/`, `mobile/`, `public/`, `.github/`

---

### DOMAIN-OPS (Session D: DevOps + CI/CD)
**Owner:** Session D
**Branch:** `feat/devops-pipeline`

```
.github/                       ← ENTIRE directory (NEW)
├── workflows/
│   ├── ci.yml                 ← Lint + Test + Build
│   ├── deploy-api.yml         ← Cloud Run deploy
│   ├── deploy-web.yml         ← Firebase Hosting deploy
│   └── deploy-functions.yml   ← Firebase Functions deploy
├── CODEOWNERS
└── pull_request_template.md

scripts/                       ← ENTIRE directory
├── deploy-api.sh
├── deploy-web.sh
├── deploy-functions.sh
└── setup-local.sh

firebase.json                  ← Hosting config
```

**Does NOT touch:** Application code in `api/`, `web/`, `functions/`

---

## Shared / Read-Only Resources

These files are **read-only** reference material for all sessions:

```
docs/                          ← Reference only (no edits during parallel sprint)
├── DATA_MODEL.md              ← All sessions read this
├── API_SPECIFICATION.md       ← Sessions A & B read this
├── ARCHITECTURE_DESIGN.md     ← All sessions read this
├── TECHNICAL_DESIGN.md        ← Sessions A & B read this
└── USER_STORIES.md            ← Session B reads this

GEMINI.md                      ← All sessions read this
DOMAIN_MANIFEST.md             ← This file (all sessions read)
```

---

## Conflict Resolution Rules

1. **If you need to touch a file outside your domain:** STOP. Document the need and defer to the owning session.
2. **If two sessions need a shared type:** Define it in `docs/SHARED_TYPES.md` and both sessions import from there.
3. **Merge order:** Session C (Firebase) → Session A (API) → Session B (Web) → Session D (DevOps)
4. **Integration branch:** All feature branches merge to `develop` first, then `develop` → `main`.
