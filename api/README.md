# Go API — Developer README

## Architecture

```
api/
├── cmd/api/
│   ├── main.go           # Entrypoint — Chi router, middleware, Cloud Run port binding
│   └── main_test.go      # Server startup test
├── api/                   # (reserved for generated API spec artifacts)
├── internal/              # All business logic packages
│   ├── auth/              # Firebase Auth middleware — JWT extraction + verification
│   ├── capsules/          # Time capsule scheduling via Cloud Tasks
│   ├── crypto/            # Cloud KMS envelope encryption (AES-256-GCM, per-estate AAD)
│   ├── docintell/         # Document intelligence — AI analysis of uploaded docs (death certs)
│   ├── gen/               # Protobuf/ConnectRPC generated Go code
│   ├── guardian/          # Guardian Protocol — inactivity detection + escalation
│   ├── guidance/          # The Shepherd — completion scoring + AI insights
│   ├── lockbox/           # KMS-encrypted credential storage
│   ├── middleware/        # Common HTTP middleware (CORS, rate limiting, logging)
│   ├── opensign/          # Proxy to Sirsi Sign (sign.sirsi.ai) for e-signatures
│   ├── payments/          # Stripe checkout sessions + webhook handling
│   ├── probate/           # Illinois probate engine — state machine, checklists, forms
│   ├── ratelimit/         # Token-bucket rate limiter
│   ├── service/           # ConnectRPC estate service (Firestore + Cloud Storage)
│   ├── tiergate/          # Subscription tier enforcement middleware
│   ├── transcription/     # Audio/video transcription for Soul Log entries
│   ├── vault/             # Document vault — Cloud Storage uploads + Firestore metadata
│   └── youtube/           # YouTube Data API v3 uploads (unlisted memoir videos)
├── packages/
│   └── sirsi-ai/          # Multi-model AI SDK (Claude Opus → Sonnet → Gemini Flash Lite)
├── scripts/               # Build and deployment scripts
├── Dockerfile             # Multi-stage Go build for Cloud Run
├── cloudbuild.yaml        # Cloud Build pipeline
├── go.mod / go.sum        # Go 1.26.2 module files
└── README.md              # This file
```

## Stack

| Layer | Technology |
|-------|-----------|
| Router | Chi v5 |
| RPC | ConnectRPC (gRPC + Protobuf over HTTP) |
| Auth | Firebase Auth JWT verification |
| Database | Firestore (real-time) + Cloud SQL PostgreSQL 15 (PII vault) |
| Encryption | Cloud KMS envelope encryption (AES-256-GCM) |
| Storage | Cloud Storage (signed URLs for vault uploads) |
| AI | sirsi-ai SDK: Claude Opus → Sonnet → Gemini 3.1 Flash Lite |
| Payments | Stripe Go SDK |
| Deploy | Cloud Run (rev 33) via Cloud Build |

## Key Endpoints

| Method | Path | Package | Description |
|--------|------|---------|-------------|
| POST | `/api/v1/opensign/*` | `opensign` | Proxy to Sirsi Sign |
| POST | `/api/v1/guardian/run-inactivity-check` | `guardian` | Daily inactivity escalation |
| POST | `/api/v1/payments/create-checkout` | `payments` | Stripe checkout session |
| POST | `/api/v1/payments/webhook` | `payments` | Stripe webhook handler |
| * | `/estate.v1.EstateService/*` | `service/estate` | ConnectRPC estate service |
| POST | `/api/v1/vault/upload` | `vault` | Cloud Storage signed URL generation |
| POST | `/api/v1/probate/*` | `probate` | Probate engine (18 endpoints) |

## Running Locally

```bash
cd api && go run ./cmd/api
```

Requires environment variables for Firebase, Cloud KMS, Cloud SQL, and Stripe. See `.env.example`.

## Testing

```bash
cd api && go test ./...
```

The probate package has 19 tests covering the Illinois state machine and checklist generation. `main_test.go` covers server startup.

## Deployment

```bash
gcloud builds submit --config api/cloudbuild.yaml
```

Or via GitHub push trigger → Cloud Build → Cloud Run.
