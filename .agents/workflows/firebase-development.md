---
description: Firebase infrastructure development workflow for FinalWishes
---

# Session C: Firebase Infrastructure Development

## Prerequisites
- Node.js 20+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Access to `functions/`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- Read `docs/DATA_MODEL_LOCK.md`

## Domain Scope
**ONLY touch files in:** `functions/**`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
**Branch:** `feat/firebase-infra`

## Step 1: Create Feature Branch
```bash
git checkout -b feat/firebase-infra
```

## Step 2: Restructure Cloud Functions
Refactor `functions/` from single `index.js` to modular structure:

```
functions/
├── index.js               # Entry point — imports all modules
├── api/
│   └── envelopes.js       # EXISTING: OpenSign envelope endpoints
├── triggers/
│   ├── onUserCreate.js    # NEW: Create user profile in Firestore
│   ├── onEstateCreate.js  # NEW: Initialize default folders, create audit log
│   ├── onDeathReport.js   # NEW: Notify executors, start cooling-off timer
│   └── onDocUpload.js     # NEW: Queue OCR processing, update metadata
├── webhooks/
│   └── stripe.js          # NEW: Handle payment events
├── scheduled/
│   └── coolingOff.js      # NEW: Check cooling-off period expiration
├── email/
│   └── transactional.js   # NEW: SendGrid email templates
├── utils/
│   └── firestore.js       # Shared Firestore helpers
├── package.json
└── .eslintrc.js
```

## Step 3: Implement Firestore Triggers

### onUserCreate
```javascript
exports.onUserCreate = onDocumentCreated('users/{userId}', async (event) => {
  // 1. Create default user preferences
  // 2. Send welcome email
  // 3. Log audit event
});
```

### onEstateCreate
```javascript
exports.onEstateCreate = onDocumentCreated('estates/{estateId}', async (event) => {
  // 1. Create estate_users entry for principal
  // 2. Create default document folders (Wills, Insurance, Financial, Property, Medical)
  // 3. Log audit event
});
```

### onDeathReport
```javascript
exports.onDeathReport = onDocumentUpdated('estates/{estateId}', async (event) => {
  // Only trigger when status changes to 'death_reported'
  // 1. Send email to all designated executors
  // 2. Create notification records
  // 3. Log audit event
});
```

## Step 4: Harden Firestore Security Rules
Update `firestore.rules` to match the RBAC matrix from TECHNICAL_DESIGN.md §2.3:

Key rules:
- Users can ONLY read/write their own profile
- Estate access requires `estate_users` entry
- Principals: full CRUD on own estate
- Executors: read pre-death, CRUD post-death
- Heirs: read-only after activation
- Audit logs: write-only (no reads from client)
- Payments: read-only from client

## Step 5: Update Firestore Indexes
Ensure `firestore.indexes.json` covers all queries:
- estates by principalId + createdAt
- estate_users by userId + role
- assets by category + createdAt (collection group)
- documents by status + createdAt (collection group)
- audit_logs by estateId + createdAt
- notifications by status + createdAt

## Step 6: Update Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /estates/{estateId}/documents/{allPaths=**} {
      allow read: if request.auth != null && hasEstateAccess(estateId);
      allow write: if request.auth != null && hasEstateAccess(estateId)
                   && request.resource.size < 50 * 1024 * 1024; // 50MB max
    }
  }
}
```

## Step 7: Implement Stripe Webhook Handler
```javascript
exports.stripeWebhook = onRequest(async (req, res) => {
  // 1. Verify Stripe signature
  // 2. Handle checkout.session.completed
  // 3. Handle payment_intent.payment_failed
  // 4. Handle async_payment_succeeded / async_payment_failed
  // 5. Update user tier in Firestore
  // 6. Create payment record
  // 7. Send confirmation email
});
```

## Step 8: Test Locally
```bash
cd functions
npm test
firebase emulators:start --only functions,firestore,storage
```

## Step 9: Commit & Push
```bash
git add functions/ firestore.rules firestore.indexes.json storage.rules
git commit -m "feat(firebase): modular functions, hardened rules, triggers"
git push origin feat/firebase-infra
```

## DO NOT
- Touch `api/`, `web/`, `mobile/`, `public/`
- Modify `firebase.json` (that's Session D)
- Add application logic — triggers should be thin wrappers
