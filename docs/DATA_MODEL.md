# Data Model
## FinalWishes - The Estate Operating System
**Version:** 3.0.0
**Date:** December 5, 2025
**Database:** Firestore (NoSQL) + Cloud SQL (PII)

---

## 1. Database Strategy

### Firestore (Primary)
- Real-time sync for UI
- Nested subcollections for related data
- Security rules for client-side access control
- **Estate Siloing**: Every collection is parented by or indexed to a `secure_estate_id`.

### Cloud SQL (PII)
- Sensitive data: SSN, account numbers, DOB, HIPAA Health records.
- Referenced by ID from Firestore.
- Server-side access only via Go API.
- **Physical Isolation**: Sensitive PII/HIPAA data is stored in a separate relational enclave to minimize exposure.

### 1.3 Secure Enclave Architecture (ADR-031)
The data model follows the **Hierarchical Canon of Secure Enclaves**:
- **The Secure Shroud**: No estate data is accessible via public slugs. Access is exclusively granted through session-derived **Enclave Tokens** that map to a unique `estate_id`.
- **Identity Obfuscation**: Client-side logs and telemetry use anonymized **Shard Aliases** (e.g., `Enclave-A7F2`) rather than plain-text estate names to prevent PII leakage in debug streams.

---

## 2. Collection Structure

```
firestore/
├── users/
│   └── {userId}
├── estates/
│   └── {estateId}
│       ├── assets/
│       │   └── {assetId}
│       ├── documents/
│       │   └── {documentId}
│       ├── executors/
│       │   └── {executorId}
│       ├── heirs/
│       │   └── {heirId}
│       └── notifications/
│           └── {notificationId}
├── estate_users/
│   └── {userId_estateId}
├── notification_templates/
│   └── {templateId}
└── audit_logs/
    └── {logId}
```

---

## 3. Core Collections

### 3.1 Users

**Path:** `users/{userId}`

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  email: string;
  emailVerified: boolean;
  
  // Profile
  firstName: string;
  lastName: string;
  phone?: string;
  
  // Address
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Identity (reference to Cloud SQL)
  idVerified: boolean;
  idVerifiedAt?: Timestamp;
  piiRef?: string;               // Cloud SQL reference for DOB, SSN
  
  // Subscription
  tier: 'free' | 'concierge' | 'white_glove';
  stripeCustomerId?: string;
  
  // Status
  status: 'active' | 'suspended' | 'deleted';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.2 Estates

**Path:** `estates/{estateId}`

```typescript
interface Estate {
  id: string;
  name: string;
  
  // Principal (owner)
  principalId: string;           // User ID
  
  // Status
  status: 'active' | 'death_reported' | 'executor_confirmed' | 'in_settlement' | 'closed';
  
  // Death info (populated when death reported)
  deathInfo?: {
    reportedAt: Timestamp;
    reportedBy: string;          // User ID
    dateOfDeath: Timestamp;
    deathCertificateDocId?: string;
  };
  
  // Executor confirmation
  executorConfirmedAt?: Timestamp;
  coolingOffEndsAt?: Timestamp;
  
  // Valuation
  estimatedValue?: number;
  
  // Settlement
  settledAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.3 Estate Users (Access Control)

**Path:** `estate_users/{userId_estateId}`

```typescript
interface EstateUser {
  id: string;                    // Format: {userId}_{estateId}
  estateId: string;
  userId: string;
  
  role: 'principal' | 'executor' | 'heir';
  
  // Access status
  accessGranted: boolean;
  accessGrantedAt?: Timestamp;
  
  // Invitation
  invitedAt?: Timestamp;
  invitationAcceptedAt?: Timestamp;
  invitationDeclinedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 4. Asset Collections

### 4.1 Assets

**Path:** `estates/{estateId}/assets/{assetId}`

```typescript
interface Asset {
  id: string;
  estateId: string;
  
  // Classification
  category: 'financial' | 'real_estate' | 'vehicle' | 'digital' | 'personal_property';
  
  // Common fields
  name: string;
  description?: string;
  estimatedValue?: number;
  notes?: string;
  
  // Category-specific data
  metadata: FinancialMetadata | RealEstateMetadata | VehicleMetadata | DigitalMetadata | PersonalPropertyMetadata;
  
  // Related document
  primaryDocumentId?: string;
  
  // PII reference (Cloud SQL)
  piiRef?: string;               // For account numbers, etc.
  
  // Status
  status: 'active' | 'transferred' | 'archived';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Metadata Types
interface FinancialMetadata {
  institutionName: string;
  accountType: 'checking' | 'savings' | 'investment' | 'retirement' | 'insurance';
  accountNumberLast4?: string;   // Only last 4 digits
  isPrimary?: boolean;
}

interface RealEstateMetadata {
  address: {
    line1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  propertyType: 'single_family' | 'condo' | 'multi_family' | 'land' | 'commercial';
  ownershipType: 'sole' | 'joint' | 'trust';
  mortgageHolder?: string;
  hasHoa?: boolean;
}

interface VehicleMetadata {
  make: string;
  model: string;
  year: number;
  vinLast6?: string;             // Only last 6 of VIN
  isLeased: boolean;
  lienHolder?: string;
}

interface DigitalMetadata {
  serviceName: string;
  serviceType: 'email' | 'social' | 'financial' | 'storage' | 'other';
  username?: string;
  desiredAction: 'delete' | 'memorialize' | 'transfer';
  hasRecoveryCodes?: boolean;
}

interface PersonalPropertyMetadata {
  itemType: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  provenance?: string;
  appraisalDate?: Timestamp;
}
```

### 4.2 Asset Allocations

**Path:** `estates/{estateId}/assets/{assetId}/allocations/{allocationId}`

```typescript
interface AssetAllocation {
  id: string;
  assetId: string;
  heirId: string;
  
  // Allocation
  percentage: number;            // 0-100
  
  // Conditions
  conditionType?: 'none' | 'age' | 'date' | 'milestone';
  conditionValue?: {
    age?: number;
    date?: Timestamp;
    description?: string;
  };
  
  notes?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 5. Beneficiary Collections

### 5.1 Executors

**Path:** `estates/{estateId}/executors/{executorId}`

```typescript
interface Executor {
  id: string;
  estateId: string;
  
  // Executor info
  userId?: string;               // If they have an account
  email: string;
  fullName: string;
  phone?: string;
  relationship?: string;
  
  // Role
  priority: number;              // 1 = primary, 2+ = alternate
  
  // Invitation
  invitationToken?: string;
  invitationSentAt?: Timestamp;
  invitationAcceptedAt?: Timestamp;
  
  // Post-death confirmation
  confirmedDeath: boolean;
  confirmedDeathAt?: Timestamp;
  
  // Status
  status: 'pending' | 'invited' | 'accepted' | 'declined' | 'active' | 'removed';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.2 Heirs

**Path:** `estates/{estateId}/heirs/{heirId}`

```typescript
interface Heir {
  id: string;
  estateId: string;
  
  // Heir info
  userId?: string;               // If they have an account
  email?: string;
  fullName: string;
  relationship?: string;
  isMinor: boolean;
  
  // DOB stored in Cloud SQL via piiRef
  piiRef?: string;
  
  // Guardian (if minor)
  guardian?: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Residuary designation
  isResiduary: boolean;          // Receives unallocated assets
  residuaryPercentage?: number;
  
  // Notification
  notifiedAt?: Timestamp;
  
  // Status
  status: 'active' | 'removed';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 6. Document Collections

### 6.1 Documents

**Path:** `estates/{estateId}/documents/{documentId}`

```typescript
interface Document {
  id: string;
  estateId: string;
  
  // File info
  originalName: string;
  displayName?: string;
  mimeType: string;
  fileSize: number;              // bytes
  
  // Storage
  storageKey: string;            // Cloud Storage path
  storageBucket: string;
  
  // Encryption
  encryptedDEK: string;          // Base64 encoded, encrypted by KMS
  
  // Organization
  folderId?: string;
  tags?: string[];
  
  // OCR (future)
  ocrProcessed: boolean;
  ocrText?: string;
  ocrProcessedAt?: Timestamp;
  
  // Version
  version: number;
  previousVersionId?: string;
  
  // Status
  status: 'pending' | 'active' | 'archived' | 'deleted';
  
  // Timestamps
  uploadedBy: string;            // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.2 Document Folders

**Path:** `estates/{estateId}/folders/{folderId}`

```typescript
interface DocumentFolder {
  id: string;
  estateId: string;
  
  name: string;
  parentId?: string;             // For nested folders
  isSystem: boolean;             // System folders can't be deleted
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 7. Notification Collections

### 7.1 Notifications (Institutional)

**Path:** `estates/{estateId}/notifications/{notificationId}`

```typescript
interface Notification {
  id: string;
  estateId: string;
  assetId?: string;
  
  // Institution
  institutionName: string;
  institutionType: 'bank' | 'insurance' | 'utility' | 'government' | 'credit_bureau';
  
  // Letter
  letterTemplateId?: string;
  generatedLetterDocId?: string;
  
  // Tracking
  trackingNumber?: string;
  
  // Status
  status: 'pending' | 'generated' | 'sent' | 'delivered' | 'acknowledged' | 'completed' | 'failed';
  
  // Dates
  generatedAt?: Timestamp;
  sentAt?: Timestamp;
  sentMethod?: 'email' | 'mail' | 'certified_mail' | 'fax';
  deliveredAt?: Timestamp;
  responseReceivedAt?: Timestamp;
  responseDocId?: string;
  
  notes?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 7.2 Notification Templates

**Path:** `notification_templates/{templateId}`

```typescript
interface NotificationTemplate {
  id: string;
  
  institutionName: string;
  institutionType: string;
  
  // Template
  templateBody: string;          // Handlebars/Mustache template
  requiredFields: string[];      // Fields needed from estate/user
  
  // Contact info
  mailingAddress?: string;
  faxNumber?: string;
  email?: string;
  phone?: string;
  
  // State-specific
  states: string[];              // ['MD', 'IL', 'MN', 'DC', 'VA']
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 8. System Collections

### 8.1 Audit Logs

**Path:** `audit_logs/{logId}`

```typescript
interface AuditLog {
  id: string;
  
  // Context
  estateId?: string;
  userId?: string;
  
  // Action
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export';
  resourceType: 'user' | 'estate' | 'asset' | 'document' | 'executor' | 'heir';
  resourceId?: string;
  
  // Details
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Request info
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  
  // Timestamp
  createdAt: Timestamp;
}
```

### 8.2 Payments

**Path:** `payments/{paymentId}`

```typescript
interface Payment {
  id: string;
  userId: string;
  
  // Stripe
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  
  // Amount
  amountCents: number;
  currency: string;              // 'USD'
  
  // Product
  productType: 'concierge' | 'white_glove';
  
  // Status
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 9. Cloud SQL Schema (PII)

For sensitive PII that cannot be stored in Firestore. Implemented in `api/internal/vault/repository.go` (ADR-037).

**Instance:** `finalwishes-pii-vault` (PostgreSQL 15, us-central1)  
**Database:** `pii_vault`  
**Encryption:** AES-256-GCM envelope encryption via Cloud KMS (`finalwishes-keyring/pii-vault-key`)

Each encrypted field uses 3 columns:
- `{field}_encrypted` — AES-256-GCM ciphertext (base64)
- `{field}_dek` — KMS-encrypted Data Encryption Key (base64)
- `{field}_nonce` — GCM nonce (base64)

```sql
-- User PII (keyed by firebase_uid + estate_id)
CREATE TABLE user_pii (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) NOT NULL,
    estate_id VARCHAR(128) NOT NULL,
    ssn_encrypted TEXT,          -- AES-256-GCM ciphertext
    ssn_dek TEXT,                -- KMS-encrypted DEK
    ssn_nonce TEXT,              -- GCM nonce
    dob_encrypted TEXT,
    dob_dek TEXT,
    dob_nonce TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(firebase_uid, estate_id)
);

-- Asset PII (keyed by asset_id + estate_id)
CREATE TABLE asset_pii (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id VARCHAR(128) NOT NULL,
    estate_id VARCHAR(128) NOT NULL,
    account_number_encrypted TEXT,
    account_number_dek TEXT,
    account_number_nonce TEXT,
    routing_number_encrypted TEXT,
    routing_number_dek TEXT,
    routing_number_nonce TEXT,
    vin_encrypted TEXT,
    vin_dek TEXT,
    vin_nonce TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, estate_id)
);

-- Heir PII (keyed by heir_id + estate_id)
CREATE TABLE heir_pii (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    heir_id VARCHAR(128) NOT NULL,
    estate_id VARCHAR(128) NOT NULL,
    ssn_encrypted TEXT,
    ssn_dek TEXT,
    ssn_nonce TEXT,
    dob_encrypted TEXT,
    dob_dek TEXT,
    dob_nonce TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(heir_id, estate_id)
);

-- Vault Audit Log (immutable, SOC 2 evidence)
CREATE TABLE vault_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128) NOT NULL,
    estate_id VARCHAR(128) NOT NULL,
    action VARCHAR(32) NOT NULL,      -- 'store' | 'retrieve'
    resource_type VARCHAR(32) NOT NULL, -- 'user_pii' | 'asset_pii' | 'heir_pii'
    resource_id VARCHAR(128),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_pii_firebase ON user_pii(firebase_uid);
CREATE INDEX idx_user_pii_estate ON user_pii(estate_id);
CREATE INDEX idx_asset_pii_asset ON asset_pii(asset_id);
CREATE INDEX idx_asset_pii_estate ON asset_pii(estate_id);
CREATE INDEX idx_heir_pii_heir ON heir_pii(heir_id);
CREATE INDEX idx_heir_pii_estate ON heir_pii(estate_id);
CREATE INDEX idx_audit_estate ON vault_audit_log(estate_id, created_at DESC);
CREATE INDEX idx_audit_user ON vault_audit_log(user_id, created_at DESC);
```

---

## 10. Indexes

### Firestore Composite Indexes

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "estates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "principalId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "estate_users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "role", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assets",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audit_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "estateId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial PostgreSQL schema |
| 2.0.0 | 2025-12-05 | Claude | Complete rewrite for Firestore + Cloud SQL hybrid |
| 3.0.0 | 2025-12-05 | Claude | Rebranded to FinalWishes, updated to 5 launch states |
| **4.0.0** | **2026-03-20** | **Antigravity** | **Updated §9 Cloud SQL schema to match live implementation (ADR-037): envelope encryption columns, vault_audit_log, estate_id scoping** |
