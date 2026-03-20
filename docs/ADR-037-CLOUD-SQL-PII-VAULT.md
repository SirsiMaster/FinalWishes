# ADR-037: Cloud SQL PII Vault — Estate-Grade Encryption Architecture

**Status:** Accepted  
**Date:** 2026-03-20  
**Author:** Antigravity  
**Supersedes:** None  
**Related:** ADR-001 (SOC 2 + KMS), ADR-031 (Secure Enclave), ADR-036 (Firestore Direct Reads)

---

## Context

FinalWishes stores highly sensitive data — Social Security Numbers, dates of birth, financial account numbers, VINs, and potentially HIPAA-governed health records. The SOW (§2.2) and COST_PROPOSAL (Phase 1) mandate a "Multi-Tenant, Zero-Knowledge" architecture with "Bank-Grade" security.

Per ADR-036, Firestore handles real-time UI data (estates, assets metadata, document metadata). But **PII must never reside in Firestore** (GEMINI.md Rule 26). A physically isolated, server-side-only relational database is required.

The SECURITY_COMPLIANCE.md specifies:
- AES-256 encryption at rest via Cloud KMS CMEK
- TLS 1.3 (with ECDHE key exchange) for all transit
- Per-estate encryption keys
- SOC 2 Type II readiness
- HIPAA/PCI DSS data separation

## Decision

### 1. Cloud SQL PostgreSQL 15 as PII Vault

Provision a dedicated **Cloud SQL PostgreSQL 15** instance (`finalwishes-pii-vault`) in `us-central1` within the `finalwishes-prod` GCP project. This instance is exclusively for PII/HIPAA data — no application metadata, no session data, no caching.

### 2. Cloud KMS Envelope Encryption (AES-256-GCM)

Implement **envelope encryption** using Google Cloud KMS:

```
┌─────────────────────────────────────────────────┐
│             ENVELOPE ENCRYPTION                  │
├─────────────────────────────────────────────────┤
│                                                   │
│  Cloud KMS (us-central1)                          │
│  └── finalwishes-keyring                          │
│      ├── pii-vault-key (KEK)                      │
│      │   ├── Encrypts/decrypts DEKs               │
│      │   ├── Auto-rotates every 365 days           │
│      │   └── Never leaves Google's HSM boundary    │
│      └── document-vault-key                        │
│          └── For future Cloud Storage CMEK         │
│                                                   │
│  Go API (Vault Service)                            │
│  └── For each PII record:                          │
│      1. Generate random 256-bit DEK                │
│      2. Encrypt PII field with DEK (AES-256-GCM)   │
│      3. Encrypt DEK with KEK (via KMS API)          │
│      4. Store: encrypted_data + encrypted_dek       │
│      5. Discard plaintext DEK from memory           │
│                                                   │
│  Result: Even with full DB dump, data is useless    │
│  without KMS access (which requires IAM auth)       │
└─────────────────────────────────────────────────┘
```

### 3. Per-Estate Key Context

Each estate gets a unique **Additional Authenticated Data (AAD)** context passed to KMS during encryption. This means:
- A DEK encrypted for Estate A cannot decrypt data for Estate B
- Cross-estate data leakage is cryptographically impossible
- Estate deletion can revoke all associated encryption contexts

### 4. Schema Design

Three tables matching DATA_MODEL.md §9:

| Table | Contents | Encrypted Columns |
|-------|----------|-------------------|
| `user_pii` | User SSN, DOB | `ssn_encrypted`, `dob_encrypted` |
| `asset_pii` | Account numbers, routing numbers, VINs | `account_number_encrypted`, `routing_number_encrypted`, `vin_encrypted` |
| `heir_pii` | Heir SSN, DOB | `ssn_encrypted`, `dob_encrypted` |

Each table includes:
- `encrypted_dek` — the envelope-encrypted data encryption key
- `estate_id` — for estate-scoped access control
- `created_at` / `updated_at` — audit timestamps
- `accessed_at` — last read timestamp (SOC 2 evidence)

### 5. Access Control

- **Only the Go API** can connect to Cloud SQL (no client-side access, ever)
- Cloud SQL uses **IAM database authentication** where possible
- The Go API service account gets `roles/cloudsql.client` and `roles/cloudkms.cryptoKeyEncrypterDecrypter`
- Every PII read/write generates an audit log entry

## Alternatives Considered

### A. Firestore with field-level encryption
**Rejected.** Firestore's security rules cannot enforce server-only field access. Client-side SDKs could potentially read encrypted blobs, increasing attack surface. Physical isolation is superior.

### B. Secret Manager for PII
**Rejected.** Secret Manager is designed for configuration secrets (API keys), not high-volume structured data. No query capability, no relational integrity.

### C. AlloyDB
**Rejected.** Overkill for current scale. Cloud SQL PostgreSQL provides identical encryption and compliance at ~10% the cost.

### D. Cloud SQL with Google-managed encryption only (no CMEK)
**Rejected.** Google-managed encryption is AES-256 at rest, which satisfies the basic requirement. However, CMEK via Cloud KMS gives us:
- Key rotation control
- Key access auditing
- Key revocation capability
- Per-estate AAD context
- SOC 2 evidence of key management

## Consequences

### Positive
- PII is physically isolated from operational data
- Envelope encryption means a database breach doesn't expose plaintext PII
- Per-estate AAD prevents cross-estate data leakage
- Cloud KMS audit trail provides SOC 2 evidence
- TLS 1.3 + ECDHE for all transit (Cloud Run → Cloud SQL)

### Negative
- Slight latency increase (~5-15ms) for KMS encrypt/decrypt per PII operation
- Cloud SQL adds ~$9-25/month to infrastructure cost
- Go API becomes a mandatory intermediary for all PII access (but this is by design)

### Risks
- Cloud KMS key ring names are immutable — chosen carefully as `finalwishes-keyring`
- If KMS key is disabled/destroyed, all PII becomes permanently unrecoverable
- Must configure proper IAM to prevent accidental key deletion

## Security Guarantees

| Property | Implementation |
|----------|---------------|
| **Encryption at Rest** | AES-256 (Cloud SQL disk) + AES-256-GCM (column-level via KMS) |
| **Encryption in Transit** | TLS 1.3 with ECDHE (Cloud Run ↔ Cloud SQL) |
| **Key Management** | Cloud KMS with auto-rotation, IAM-gated |
| **PII Isolation** | Separate PostgreSQL instance, server-only access |
| **Audit Trail** | Every PII access logged with user, estate, timestamp, IP |
| **Estate Isolation** | Per-estate AAD context, cryptographic cross-estate prevention |
| **HIPAA Readiness** | Physical isolation + encryption + audit = BAA eligible |
| **SOC 2 Readiness** | Key rotation, access logging, least-privilege IAM |

---

## Infrastructure Provisioned

| Resource | Value |
|----------|-------|
| **KMS Key Ring** | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring` |
| **PII Vault Key** | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring/cryptoKeys/pii-vault-key` |
| **Document Key** | `projects/finalwishes-prod/locations/us-central1/keyRings/finalwishes-keyring/cryptoKeys/document-vault-key` |
| **Cloud SQL** | `finalwishes-pii-vault` (PostgreSQL 15, us-central1) |
| **Database** | `pii_vault` |
