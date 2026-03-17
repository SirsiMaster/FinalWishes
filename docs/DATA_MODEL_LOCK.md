# Data Model Lock — FinalWishes v1.0
**Status:** 🔒 LOCKED — All parallel sessions MUST build against these schemas
**Date:** March 17, 2026
**Source of Truth:** `docs/DATA_MODEL.md` v3.0.0

---

## Firestore Collections (Canonical)

### `users/{userId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Firebase Auth UID |
| `email` | string | ✅ | |
| `emailVerified` | boolean | ✅ | |
| `firstName` | string | ✅ | |
| `lastName` | string | ✅ | |
| `phone` | string | ❌ | |
| `address` | map | ❌ | `{line1, line2?, city, state, zipCode, country}` |
| `idVerified` | boolean | ✅ | Default: false |
| `piiRef` | string | ❌ | Cloud SQL UUID reference |
| `tier` | string | ✅ | `'free' \| 'concierge' \| 'white_glove'` |
| `stripeCustomerId` | string | ❌ | |
| `status` | string | ✅ | `'active' \| 'suspended' \| 'deleted'` |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estates/{estateId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Auto-generated |
| `name` | string | ✅ | |
| `principalId` | string | ✅ | User ID |
| `status` | string | ✅ | `'active' \| 'death_reported' \| 'executor_confirmed' \| 'in_settlement' \| 'closed'` |
| `deathInfo` | map | ❌ | `{reportedAt, reportedBy, dateOfDeath, deathCertificateDocId?}` |
| `executorConfirmedAt` | timestamp | ❌ | |
| `coolingOffEndsAt` | timestamp | ❌ | |
| `estimatedValue` | number | ❌ | |
| `settledAt` | timestamp | ❌ | |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estate_users/{userId_estateId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | Format: `{userId}_{estateId}` |
| `estateId` | string | ✅ | |
| `userId` | string | ✅ | |
| `role` | string | ✅ | `'principal' \| 'executor' \| 'heir'` |
| `accessGranted` | boolean | ✅ | |
| `invitedAt` | timestamp | ❌ | |
| `invitationAcceptedAt` | timestamp | ❌ | |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estates/{estateId}/assets/{assetId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `estateId` | string | ✅ | |
| `category` | string | ✅ | `'financial' \| 'real_estate' \| 'vehicle' \| 'digital' \| 'personal_property'` |
| `name` | string | ✅ | |
| `description` | string | ❌ | |
| `estimatedValue` | number | ❌ | |
| `notes` | string | ❌ | |
| `metadata` | map | ✅ | Category-specific (see DATA_MODEL.md §4.1) |
| `piiRef` | string | ❌ | Cloud SQL UUID |
| `primaryDocumentId` | string | ❌ | |
| `status` | string | ✅ | `'active' \| 'transferred' \| 'archived'` |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estates/{estateId}/documents/{documentId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `estateId` | string | ✅ | |
| `originalName` | string | ✅ | |
| `displayName` | string | ❌ | |
| `mimeType` | string | ✅ | |
| `fileSize` | number | ✅ | bytes |
| `storageKey` | string | ✅ | Cloud Storage path |
| `storageBucket` | string | ✅ | |
| `encryptedDEK` | string | ✅ | Base64 encoded |
| `folderId` | string | ❌ | |
| `tags` | array | ❌ | string[] |
| `ocrProcessed` | boolean | ✅ | Default: false |
| `version` | number | ✅ | Default: 1 |
| `status` | string | ✅ | `'pending' \| 'active' \| 'archived' \| 'deleted'` |
| `uploadedBy` | string | ✅ | User ID |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estates/{estateId}/executors/{executorId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `estateId` | string | ✅ | |
| `userId` | string | ❌ | If they have an account |
| `email` | string | ✅ | |
| `fullName` | string | ✅ | |
| `phone` | string | ❌ | |
| `relationship` | string | ❌ | |
| `priority` | number | ✅ | 1 = primary |
| `confirmedDeath` | boolean | ✅ | Default: false |
| `status` | string | ✅ | `'pending' \| 'invited' \| 'accepted' \| 'declined' \| 'active' \| 'removed'` |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `estates/{estateId}/heirs/{heirId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `estateId` | string | ✅ | |
| `userId` | string | ❌ | |
| `email` | string | ❌ | |
| `fullName` | string | ✅ | |
| `relationship` | string | ❌ | |
| `isMinor` | boolean | ✅ | |
| `piiRef` | string | ❌ | |
| `guardian` | map | ❌ | `{name, email, phone?}` |
| `isResiduary` | boolean | ✅ | |
| `residuaryPercentage` | number | ❌ | |
| `status` | string | ✅ | `'active' \| 'removed'` |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

### `audit_logs/{logId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `estateId` | string | ❌ | |
| `userId` | string | ❌ | |
| `action` | string | ✅ | `'create' \| 'read' \| 'update' \| 'delete' \| 'login' \| 'logout' \| 'export'` |
| `resourceType` | string | ✅ | `'user' \| 'estate' \| 'asset' \| 'document' \| 'executor' \| 'heir'` |
| `resourceId` | string | ❌ | |
| `oldValues` | map | ❌ | |
| `newValues` | map | ❌ | |
| `ipAddress` | string | ❌ | |
| `userAgent` | string | ❌ | |
| `createdAt` | timestamp | ✅ | |

### `payments/{paymentId}`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✅ | |
| `userId` | string | ✅ | |
| `stripePaymentIntentId` | string | ❌ | |
| `amountCents` | number | ✅ | |
| `currency` | string | ✅ | `'USD'` |
| `productType` | string | ✅ | `'concierge' \| 'white_glove'` |
| `status` | string | ✅ | `'pending' \| 'succeeded' \| 'failed' \| 'refunded'` |
| `createdAt` | timestamp | ✅ | |
| `updatedAt` | timestamp | ✅ | |

---

## Cloud SQL Tables (PII)

```sql
-- LOCKED: Do not modify without a new ADR

CREATE TABLE user_pii (
    id UUID PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    date_of_birth DATE,
    ssn_encrypted BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_pii (
    id UUID PRIMARY KEY,
    asset_id VARCHAR(128) NOT NULL,
    account_number_encrypted BYTEA,
    routing_number_encrypted BYTEA,
    vin_encrypted BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE heir_pii (
    id UUID PRIMARY KEY,
    heir_id VARCHAR(128) NOT NULL,
    date_of_birth DATE,
    ssn_encrypted BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_pii_firebase ON user_pii(firebase_uid);
CREATE INDEX idx_asset_pii_asset ON asset_pii(asset_id);
CREATE INDEX idx_heir_pii_heir ON heir_pii(heir_id);
```

---

## API Response Envelope (Standard)

All API responses MUST follow this format:

```json
// Success
{ "data": { ... }, "meta": { "request_id": "uuid", "timestamp": "ISO8601" } }

// Error
{ "error": { "code": "ERROR_CODE", "message": "...", "details": [] }, "meta": { ... } }

// Paginated
{ "data": [...], "pagination": { "page": 1, "per_page": 20, "total": 100, "total_pages": 5 }, "meta": { ... } }
```

---

⚠️ **LOCK NOTICE**: Any changes to this data model require a new ADR and approval before implementation. Sessions A, B, and C MUST coordinate before modifying schemas.
