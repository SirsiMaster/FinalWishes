---
description: Go API backend development workflow for FinalWishes
---

# Session A: Go API Backend Development

## Prerequisites
- Go 1.21+ installed
- Access to `api/` directory
- Read `docs/DATA_MODEL_LOCK.md` and `docs/API_SPECIFICATION.md`

## Domain Scope
**ONLY touch files in:** `api/**`
**Branch:** `feat/api-core`

## Step 1: Create Feature Branch
```bash
git checkout -b feat/api-core
```

## Step 2: Scaffold Domain Structure
Create the following directory structure under `api/internal/`:
```
api/internal/
├── api/
│   ├── handlers/
│   │   ├── auth.go
│   │   ├── estate.go
│   │   ├── asset.go
│   │   ├── document.go
│   │   ├── executor.go
│   │   ├── heir.go
│   │   ├── notification.go
│   │   └── payment.go
│   ├── middleware/
│   │   ├── auth.go        # Firebase token validation
│   │   ├── cors.go        # CORS config
│   │   ├── ratelimit.go   # Rate limiting
│   │   └── logging.go     # Structured logging
│   └── routes.go          # All route registration
├── domain/
│   ├── user/
│   │   ├── model.go       # User struct
│   │   ├── service.go     # Business logic
│   │   └── repository.go  # Interface
│   ├── estate/
│   │   ├── model.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   └── state_machine.go  # Estate state transitions
│   ├── asset/
│   │   ├── model.go
│   │   ├── service.go
│   │   └── repository.go
│   ├── document/
│   │   ├── model.go
│   │   ├── service.go
│   │   └── repository.go
│   └── notification/
│       ├── model.go
│       ├── service.go
│       └── repository.go
├── repository/
│   ├── firestore/
│   │   ├── user.go
│   │   ├── estate.go
│   │   ├── asset.go
│   │   └── document.go
│   └── cloudsql/
│       └── pii.go
├── service/
│   ├── auth/firebase.go
│   ├── storage/gcs.go
│   ├── kms/kms.go
│   ├── payment/stripe.go
│   └── email/sendgrid.go
├── config/
│   └── config.go
└── pkg/
    ├── validator/validator.go
    ├── crypto/aes.go
    └── logger/zerolog.go
```

## Step 3: Implement in Order
1. `config/config.go` — Environment variable loading
2. `domain/*/model.go` — All domain models (match DATA_MODEL_LOCK.md exactly)
3. `domain/*/repository.go` — Repository interfaces
4. `repository/firestore/*.go` — Firestore implementations
5. `api/middleware/auth.go` — Firebase Auth middleware
6. `api/handlers/*.go` — HTTP handlers
7. `api/routes.go` — Wire everything together
8. Update `cmd/api/main.go` — Initialize and start

## Step 4: API Contract Compliance
Every handler MUST match `docs/API_SPECIFICATION.md`:
- Response format: `{ "data": {...}, "meta": {...} }`
- Error format: `{ "error": { "code": "...", "message": "..." } }`
- Status codes: match spec exactly

## Step 5: Test
```bash
go build ./...
go vet ./...
go test ./...
```

## Step 6: Commit & Push
```bash
git add api/
git commit -m "feat(api): implement core API handlers and domain logic"
git push origin feat/api-core
```

## DO NOT
- Touch `web/`, `functions/`, `mobile/`, `public/`
- Modify `firebase.json` or `firestore.rules`
- Add new dependencies to root `package.json`
