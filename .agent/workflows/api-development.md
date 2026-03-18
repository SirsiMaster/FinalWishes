---
description: Go API backend development workflow for FinalWishes
---
// turbo-all

# API Development Workflow

## Pre-Flight
1. Read `GEMINI.md` — confirm FinalWishes repo
2. Read `docs/DATA_MODEL_LOCK.md` — schemas are LOCKED
3. Read `proto/estate/v1/estate.proto` — canonical message definitions
4. Check Go version: `go version` (requires Go 1.21+)

## Project Structure
```
api/
├── cmd/api/main.go           # Entry point
├── internal/
│   ├── handlers/             # HTTP/gRPC handlers
│   ├── service/              # Business logic
│   ├── repository/           # Firestore + Cloud SQL
│   ├── middleware/            # Auth, rate limit, logging
│   └── gen/                  # Generated proto code
├── Dockerfile
└── go.mod
```

## Development Cycle
1. Generate protos: `cd /Users/thekryptodragon/Development/FinalWishes && buf generate`
2. Run locally: `cd /Users/thekryptodragon/Development/FinalWishes/api && go run cmd/api/main.go`
3. Run tests: `cd /Users/thekryptodragon/Development/FinalWishes/api && go test ./...`
4. Build Docker: `cd /Users/thekryptodragon/Development/FinalWishes/api && docker build -t finalwishes-api .`

## API Design Rules
- All endpoints scoped to estate: `/v1/estates/:id/...`
- Firebase Auth token validation on all routes
- Rate limiting: 100 req/min general, 10/min auth, 50/hr uploads
- Error format: `{ "error": { "code": "...", "message": "...", "details": [] } }`
- PII NEVER in Firestore — always Cloud SQL with `piiRef` pointer
