# Cloud Functions — Developer README

## Architecture

```
functions/
├── index.js           # All 4 Cloud Functions (Firestore triggers + scheduler)
├── package.json       # Node.js 22, firebase-functions v7, googleapis
└── README.md          # This file
```

All HTTP API endpoints live in the Go API on Cloud Run. Cloud Functions handle **only** event-driven Firestore triggers and scheduled jobs.

---

## Functions

### 1. `autoMatchInvitation`
**Trigger:** `onDocumentCreated('users/{uid}')`

When a new user registers, checks `estate_invitations` for any pending invitations matching their email. If found, creates `estate_users` records (granting estate access) and marks invitations as `accepted`. Writes audit logs.

### 2. `sendMail`
**Trigger:** `onDocumentCreated('mail/{mailId}')`

Sends transactional email via Gmail API using domain-wide delegation (impersonates `admin@sirsi.ai`). Supports:
- Direct messages: `{ to, message: { subject, html } }`
- Templates: `{ to, template: { name, data } }` — fetches from `email_templates` collection, interpolates `{{variables}}`

Gmail auth: Service account key loaded from Secret Manager (`gmail-sa-key`), JWT with `gmail.send` scope.

### 3. `sendSMS`
**Trigger:** `onDocumentCreated('sms_queue/{smsId}')`

Validates SMS requests (E.164 phone format, body length ≤ 1600 chars). Currently logs for manual review — no SMS provider integrated yet. Sets delivery state to `PENDING_PROVIDER`.

**TODO:** Integrate Google Cloud Communication API (preferred), Twilio Firebase Extension, or direct Twilio SDK.

### 4. `guardianInactivityCheck`
**Trigger:** `onSchedule('0 6 * * *')` — daily at 6 AM EST

Calls the Go API's `/api/v1/guardian/run-inactivity-check` endpoint with a Firebase custom token. Escalation sequence:
- Day 90: Reminder email to owner
- Day 97: Notification to executor
- Day 104+: Manual settlement only

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `firebase-admin` | Firestore, Auth (custom tokens) |
| `firebase-functions` v7 | 2nd gen triggers + scheduler |
| `googleapis` | Gmail API client |
| `@google-cloud/secret-manager` | Load service account key for domain-wide delegation |

## Deployment

```bash
firebase deploy --only functions
```

Functions run on **Node.js 22** with **256MiB** memory and 30-60s timeouts.

## Testing

**No tests exist yet.** C3 sprint includes adding unit tests for all 4 functions with mocked Firestore and Gmail clients.

## Security Notes
- Gmail service account key is stored in Secret Manager, not in code
- `guardianInactivityCheck` authenticates to the Go API with a Firebase custom token (role: admin)
- `sendMail` validates required fields before sending; marks errors in Firestore
