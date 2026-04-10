# Go API Internal Packages

> Package map for the FinalWishes Go API (`api/`).

## Packages

| Package | Purpose |
|---------|---------|
| `auth` | Firebase Auth middleware — extracts and verifies JWT from requests |
| `capsules` | Time capsule scheduling and delivery via Cloud Tasks |
| `crypto` | Cloud KMS envelope encryption (AES-256-GCM, per-estate AAD) |
| `gen` | Protobuf/ConnectRPC generated code (estate service) |
| `guidance` | The Shepherd — estate completion scoring + Genkit/Gemini AI insights |
| `lockbox` | KMS-encrypted credential storage (password, pin, notes) |
| `opensign` | Proxy to Sirsi Sign (sign.sirsi.ai) for e-signature envelopes |
| `payments` | Stripe checkout sessions and webhook handling |
| `ratelimit` | Token-bucket rate limiter for API endpoints |
| `service/estate` | ConnectRPC estate service (Cloud Storage signed URLs, Firestore) |
| `vault` | Document vault — Cloud Storage uploads with Firestore metadata |
| `youtube` | YouTube Data API v3 uploads for memoir videos (unlisted, 256MB max) |

## Configuration

| Env Var | Description | Required |
|---------|-------------|----------|
| `GEMINI_API_KEY` | Gemini Flash for AI guidance | No (falls back to deterministic) |
| `STRIPE_SECRET_KEY` | Stripe payment processing | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Yes |
| `OPENSIGN_API_URL` | Sirsi Sign base URL | Yes |
| `GCP_PROJECT_ID` | Google Cloud project | Yes |

## Running Locally

```bash
go run ./cmd/api
go test ./...
```

See CLAUDE.md for full stack context.
