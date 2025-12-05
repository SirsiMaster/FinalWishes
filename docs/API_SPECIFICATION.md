# API Specification
## FinalWishes - The Estate Operating System
**Version:** 2.0.0
**Date:** December 5, 2025
**Base URL:** `https://api.finalwishes.app/v1`

---

## 1. Overview

### 1.1 API Standards
- **Protocol:** HTTPS only
- **Format:** JSON (application/json)
- **Authentication:** Bearer token (JWT)
- **Versioning:** URL path (/v1, /v2)
- **Rate Limiting:** 1000 requests/hour per user

### 1.2 Common Headers

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <uuid>
```

**Response Headers:**
```
X-Request-ID: <uuid>
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

### 1.3 Response Format

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "abc123",
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ ... ]
  },
  "meta": {
    "request_id": "abc123",
    "timestamp": "2025-11-26T10:00:00Z"
  }
}
```

**Paginated Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  },
  "meta": { ... }
}
```

---

## 2. Authentication Endpoints

### 2.1 Register User
```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "email_verified": false
    },
    "message": "Verification email sent"
  }
}
```

### 2.2 Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "mfa_enabled": false
    }
  }
}
```

### 2.3 Refresh Token
```
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

### 2.4 Setup MFA
```
POST /auth/mfa/setup
```

**Response (200 OK):**
```json
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,...",
    "backup_codes": [
      "abc123", "def456", "ghi789", ...
    ]
  }
}
```

### 2.5 Verify MFA
```
POST /auth/mfa/verify
```

**Request Body:**
```json
{
  "code": "123456"
}
```

---

## 3. User Endpoints

### 3.1 Get Current User
```
GET /users/me
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "date_of_birth": "1970-01-01",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip_code": "10001",
      "country": "US"
    },
    "id_verified": true,
    "tier": "concierge",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 3.2 Update User Profile
```
PUT /users/me
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001"
  }
}
```

### 3.3 Initiate Identity Verification
```
POST /users/me/identity/verify
```

**Response (200 OK):**
```json
{
  "data": {
    "verification_url": "https://verify.persona.com/...",
    "session_token": "abc123"
  }
}
```

---

## 4. Estate Endpoints

### 4.1 Create Estate
```
POST /estates
```

**Request Body:**
```json
{
  "name": "John's Estate"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "name": "John's Estate",
    "principal_id": "uuid",
    "status": "active",
    "estimated_value": null,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 4.2 List Estates
```
GET /estates
```

**Query Parameters:**
- `page` (int, default: 1)
- `per_page` (int, default: 20, max: 100)
- `role` (string): Filter by role (principal, executor, heir)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John's Estate",
      "role": "principal",
      "status": "active",
      "estimated_value": 500000.00,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 4.3 Get Estate
```
GET /estates/:id
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "John's Estate",
    "principal": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe"
    },
    "status": "active",
    "estimated_value": 500000.00,
    "death_info": null,
    "stats": {
      "assets_count": 15,
      "documents_count": 23,
      "executors_count": 2,
      "heirs_count": 3,
      "completion_percentage": 75
    },
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 4.4 Update Estate
```
PUT /estates/:id
```

**Request Body:**
```json
{
  "name": "Updated Estate Name",
  "estimated_value": 600000.00
}
```

---

## 5. Asset Endpoints

### 5.1 Create Asset
```
POST /estates/:estateId/assets
```

**Request Body:**
```json
{
  "category": "financial",
  "name": "Chase Checking Account",
  "description": "Primary checking account",
  "estimated_value": 50000.00,
  "metadata": {
    "institution_name": "Chase Bank",
    "account_type": "checking",
    "account_number_last4": "1234",
    "is_primary": true
  },
  "notes": "Online banking enabled"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "estate_id": "uuid",
    "category": "financial",
    "name": "Chase Checking Account",
    "description": "Primary checking account",
    "estimated_value": 50000.00,
    "metadata": { ... },
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 5.2 List Assets
```
GET /estates/:estateId/assets
```

**Query Parameters:**
- `category` (string): Filter by category
- `page`, `per_page`

### 5.3 Get Asset
```
GET /estates/:estateId/assets/:assetId
```

### 5.4 Update Asset
```
PUT /estates/:estateId/assets/:assetId
```

### 5.5 Delete Asset
```
DELETE /estates/:estateId/assets/:assetId
```

**Response (204 No Content)**

---

## 6. Document Endpoints

### 6.1 Get Upload URL
```
POST /estates/:estateId/documents/upload-url
```

**Request Body:**
```json
{
  "filename": "deed.pdf",
  "content_type": "application/pdf",
  "file_size": 1024000
}
```

**Response (200 OK):**
```json
{
  "data": {
    "upload_url": "https://storage.googleapis.com/...",
    "document_id": "uuid",
    "plaintext_dek": "base64-encoded-key",
    "expires_at": "2025-01-01T00:15:00Z"
  }
}
```

**Note:** Client must encrypt file with `plaintext_dek` (AES-256-GCM) before uploading.

### 6.2 Confirm Upload
```
POST /estates/:estateId/documents/:docId/confirm
```

**Request Body:**
```json
{
  "display_name": "Property Deed",
  "folder_id": "uuid",
  "tags": ["property", "legal"]
}
```

### 6.3 List Documents
```
GET /estates/:estateId/documents
```

**Query Parameters:**
- `folder_id` (uuid)
- `tags` (string, comma-separated)
- `search` (string, full-text search)

### 6.4 Get Document
```
GET /estates/:estateId/documents/:docId
```

### 6.5 Download Document
```
GET /estates/:estateId/documents/:docId/download
```

**Response (200 OK):**
```json
{
  "data": {
    "download_url": "https://storage.googleapis.com/...",
    "plaintext_dek": "base64-encoded-key",
    "expires_at": "2025-01-01T00:15:00Z"
  }
}
```

**Note:** Client must decrypt file with `plaintext_dek` (AES-256-GCM) after downloading.

### 6.6 Delete Document
```
DELETE /estates/:estateId/documents/:docId
```

---

## 7. Executor Endpoints

### 7.1 Add Executor
```
POST /estates/:estateId/executors
```

**Request Body:**
```json
{
  "email": "executor@example.com",
  "full_name": "Jane Doe",
  "phone": "+1234567890",
  "relationship": "daughter",
  "priority": 1
}
```

### 7.2 List Executors
```
GET /estates/:estateId/executors
```

### 7.3 Remove Executor
```
DELETE /estates/:estateId/executors/:execId
```

### 7.4 Accept Executor Invitation
```
POST /estates/:estateId/executors/:execId/accept
```

**Request Body:**
```json
{
  "invitation_token": "abc123"
}
```

### 7.5 Confirm Death (Executor)
```
POST /estates/:estateId/executors/:execId/confirm-death
```

**Request Body:**
```json
{
  "confirmed": true,
  "acknowledgement": "I confirm this death report is accurate"
}
```

---

## 8. Heir Endpoints

### 8.1 Add Heir
```
POST /estates/:estateId/heirs
```

**Request Body:**
```json
{
  "full_name": "John Jr.",
  "email": "jr@example.com",
  "date_of_birth": "2000-01-01",
  "relationship": "son",
  "is_residuary": false
}
```

### 8.2 List Heirs
```
GET /estates/:estateId/heirs
```

### 8.3 Remove Heir
```
DELETE /estates/:estateId/heirs/:heirId
```

### 8.4 Allocate Asset to Heir
```
POST /estates/:estateId/assets/:assetId/allocations
```

**Request Body:**
```json
{
  "heir_id": "uuid",
  "percentage": 50.00,
  "condition_type": "age",
  "condition_value": {
    "age": 25
  },
  "notes": "Upon reaching 25 years of age"
}
```

---

## 9. Notification Endpoints

### 9.1 Generate Notification
```
POST /estates/:estateId/notifications/generate
```

**Request Body:**
```json
{
  "asset_id": "uuid",
  "institution_name": "Chase Bank",
  "request_type": "close"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "institution_name": "Chase Bank",
    "status": "generated",
    "generated_letter_doc_id": "uuid",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 9.2 List Notifications
```
GET /estates/:estateId/notifications
```

**Query Parameters:**
- `status` (string)
- `institution_type` (string)

### 9.3 Update Notification Status
```
PUT /estates/:estateId/notifications/:notifId
```

**Request Body:**
```json
{
  "status": "sent",
  "sent_at": "2025-01-01T00:00:00Z",
  "sent_method": "certified_mail",
  "tracking_number": "9400111899223385738000"
}
```

---

## 10. Payment Endpoints

### 10.1 Create Checkout Session
```
POST /payments/checkout
```

**Request Body:**
```json
{
  "tier": "concierge"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "checkout_url": "https://checkout.stripe.com/...",
    "session_id": "cs_..."
  }
}
```

### 10.2 Get Payment Status
```
GET /payments/status?session_id=cs_...
```

---

## 11. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft |
| 2.0.0 | 2025-12-05 | Claude | FinalWishes branding, Cloud Storage URLs, client-side encryption |
