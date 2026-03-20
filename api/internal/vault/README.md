# PII Vault — Developer Documentation

## Architecture (ADR-037)

The PII Vault is the physically isolated encryption enclave for all sensitive data in FinalWishes. It runs on Cloud SQL PostgreSQL 15, protected by Cloud KMS envelope encryption.

```
┌──────────────────────────────────────────────────┐
│                  PII VAULT STACK                  │
├──────────────────────────────────────────────────┤
│  HTTP Handlers    (vault/handlers.go)             │
│  ├── POST /api/v1/vault/user-pii                 │
│  ├── GET  /api/v1/vault/user-pii                 │
│  ├── POST /api/v1/vault/asset-pii                │
│  ├── GET  /api/v1/vault/asset-pii                │
│  ├── POST /api/v1/vault/heir-pii                 │
│  └── GET  /api/v1/vault/heir-pii                 │
├──────────────────────────────────────────────────┤
│  Repository       (vault/repository.go)           │
│  ├── StoreUserPII / RetrieveUserPII              │
│  ├── StoreAssetPII / RetrieveAssetPII            │
│  ├── StoreHeirPII / RetrieveHeirPII              │
│  └── LogAccess (audit trail)                      │
├──────────────────────────────────────────────────┤
│  Crypto Service   (crypto/kms.go)                 │
│  ├── Encrypt (envelope encryption)                │
│  └── Decrypt (envelope decryption)                │
├──────────────────────────────────────────────────┤
│  Cloud KMS        finalwishes-keyring             │
│  ├── pii-vault-key (AES-256, auto-rotate)        │
│  └── document-vault-key (for future doc vault)   │
├──────────────────────────────────────────────────┤
│  Cloud SQL        finalwishes-pii-vault           │
│  └── Database: pii_vault                          │
└──────────────────────────────────────────────────┘
```

## File Structure

```
api/internal/
├── crypto/
│   └── kms.go              # Cloud KMS envelope encryption
├── vault/
│   ├── repository.go       # Cloud SQL CRUD + migrations
│   └── handlers.go         # HTTP handlers + validation
└── auth/
    └── middleware.go        # Firebase Auth (required for all vault routes)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | — | GCP project ID (`finalwishes-prod`) |
| `CLOUD_SQL_CONNECTION` | Prod | — | Cloud SQL instance connection name |
| `VAULT_DB_HOST` | Dev | — | Direct TCP host (for Cloud SQL Proxy) |
| `VAULT_DB_PORT` | No | `5432` | Database port |
| `VAULT_DB_NAME` | No | `pii_vault` | Database name |
| `VAULT_DB_USER` | No | `vault_admin` | Database user |
| `VAULT_DB_PASSWORD` | Yes | — | Database password |

## Local Development

### 1. Start Cloud SQL Proxy

```bash
# Install Cloud SQL Proxy (one time)
brew install cloud-sql-proxy

# Start proxy
cloud-sql-proxy finalwishes-prod:us-central1:finalwishes-pii-vault \
  --port=5432
```

### 2. Run the API with Vault

```bash
cd api

export GOOGLE_CLOUD_PROJECT=finalwishes-prod
export VAULT_DB_HOST=127.0.0.1
export VAULT_DB_PORT=5432
export VAULT_DB_NAME=pii_vault
export VAULT_DB_USER=vault_admin
export VAULT_DB_PASSWORD=<your-password>

go run ./cmd/api/
```

### 3. Test Vault Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Store user PII (requires Firebase Auth token)
curl -X POST http://localhost:8080/api/v1/vault/user-pii \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"estate_id":"estate_lockhart","ssn":"123-45-6789","date_of_birth":"1985-03-15"}'

# Retrieve user PII (masked by default)
curl http://localhost:8080/api/v1/vault/user-pii?estate_id=estate_lockhart \
  -H "Authorization: Bearer <firebase-id-token>"

# Retrieve with full disclosure
curl http://localhost:8080/api/v1/vault/user-pii?estate_id=estate_lockhart&full=true \
  -H "Authorization: Bearer <firebase-id-token>"
```

## Encryption Flow

### Store PII

1. Client sends plaintext PII → Go API (via TLS 1.3 + ECDHE)
2. Go API generates random 256-bit DEK
3. Go API encrypts PII with DEK using AES-256-GCM
4. Go API calls Cloud KMS to encrypt DEK with KEK (with estate-scoped AAD)
5. Go API stores: `encrypted_data + encrypted_dek + nonce` in Cloud SQL
6. Plaintext DEK is zeroed out from memory
7. Go API logs access in vault_audit_log

### Retrieve PII

1. Client requests PII with estate_id → Go API (via TLS 1.3 + ECDHE)
2. Go API reads encrypted record from Cloud SQL
3. Go API calls Cloud KMS to decrypt DEK (with estate-scoped AAD verification)
4. Go API decrypts data with DEK using AES-256-GCM
5. Go API updates `accessed_at` timestamp
6. Go API returns masked data (default) or full data (if `full=true`)
7. Go API logs access in vault_audit_log

## Database Schema

### Tables

- **user_pii** — User SSN, DOB (keyed by firebase_uid + estate_id)
- **asset_pii** — Account numbers, routing numbers, VINs (keyed by asset_id + estate_id)
- **heir_pii** — Heir SSN, DOB (keyed by heir_id + estate_id)
- **vault_audit_log** — Immutable access log for SOC 2 compliance

### Encryption Columns

Each encrypted field has 3 columns:
- `{field}_encrypted` — AES-256-GCM ciphertext (base64)
- `{field}_dek` — KMS-encrypted DEK (base64)
- `{field}_nonce` — GCM nonce (base64)

## Security Guarantees

| Property | Implementation |
|----------|---------------|
| Encryption at Rest | AES-256 (disk) + AES-256-GCM (column) |
| Encryption in Transit | TLS 1.3 with ECDHE |
| Key Management | Cloud KMS, auto-rotate 365d |
| Estate Isolation | Per-estate AAD in KMS operations |
| Access Control | Firebase Auth required for all endpoints |
| Audit Trail | Every read/write logged with user, IP, timestamp |
| Data Masking | SSN last4, account last4, VIN last6 by default |

## Known Limitations

1. **No batch operations** — Each PII field is encrypted individually (by design, for auditability)
2. **KMS latency** — ~5-15ms per encrypt/decrypt operation
3. **No search on encrypted fields** — You cannot query by SSN. Lookup is by firebase_uid/asset_id/heir_id + estate_id
4. **Key ring is immutable** — `finalwishes-keyring` cannot be renamed or moved
