# FinalWishes — Complete Product Specification
## Every Screen, Every Feature, Every Flow
**Version:** 1.0.0 — **Date:** March 18, 2026 — **Contract:** $95K Living Legacy SOW

---

## 1. What We Are Building

**FinalWishes** is a vault-grade legacy curation platform that lets a person (the **Principal**) organize their life's memories, important documents, final instructions, and asset designations — then schedule and control exactly how, when, and to whom that legacy is delivered after they're gone.

**It is NOT a probate tool (that's Tier 3).** It is a **Living Legacy** — something you build while you're alive, not something executors scramble to assemble after death.

### The Human Story

> *"My grandmother died and we couldn't find her will, her bank accounts, her insurance policies, or her passwords. We didn't know her final wishes. We had boxes of photos but no context — who were these people? What did these moments mean to her? FinalWishes exists so that never happens again."*

### The Four Platforms

| Platform | Technology | Status |
|----------|-----------|:------:|
| **Web Dashboard** | React 18 + Vite + TanStack + shadcn/ui | ⚠️ UI shells built, no real data |
| **iOS App** | React Native + Expo | ⚠️ Stubs only |
| **Android App** | React Native + Expo | ⚠️ Stubs only |
| **macOS Desktop** | Tauri (Rust wrapper around web app) | ⚠️ Config only |

---

## 2. User Roles

| Role | Who | Access Level |
|------|-----|-------------|
| **Principal** | The person whose legacy this is | Full CRUD on their estate. Creates everything. |
| **Executor** | Trusted person designated to manage the estate post-death | Read-only while Principal is alive. Full access after death confirmation + cooling-off. |
| **Heir** | Person designated to receive assets/messages | Can view only what's been shared with them. Receives time capsules. |
| **Admin** | Sirsi internal (future) | System-level operations. Not in Tier 1 scope. |

### Role State Machine

```
Principal creates estate
    │
    ├──► Invites Executor(s) ──► Executor receives email ──► Accepts/Declines
    │
    ├──► Designates Heir(s) ──► Heirs notified when relevant
    │
    └──► Death reported (by Executor)
              │
              ├──► 72-hour cooling-off period (Cloud Tasks)
              │
              ├──► Multi-executor confirmation (if 2+ executors, requires quorum)
              │
              ├──► Executor access unlocked
              │
              ├──► Time capsules released (scheduled messages delivered)
              │
              └──► Estate enters "In Settlement" → eventually "Closed"
```

---

## 3. Feature-by-Feature Specification

### 3.1 Authentication & Onboarding

#### What the user sees:
- **Login page** with email/password, Google Sign-In, and Apple Sign-In
- **Registration flow** with name, email, password
- **MFA enrollment** (TOTP via authenticator app) — required for Concierge/White Glove tiers
- **Email verification** sent automatically on registration
- **Password reset** flow

#### What we build:

| Screen | Route | Google Service | Status |
|--------|-------|---------------|:------:|
| Login | `/login` | Firebase Auth | ✅ UI built (localStorage stub) |
| Register | `/register` | Firebase Auth | ❌ Not built |
| MFA Setup | `/mfa-setup` | Firebase Auth (Identity Platform) | ❌ Not built |
| Forgot Password | `/forgot-password` | Firebase Auth | ❌ Not built |
| Email Verification | `/verify-email` | Firebase Auth | ❌ Not built |

#### Data flow:
```
User submits credentials
  → Firebase Auth SDK (client-side)
    → Firebase issues JWT
      → JWT stored in httpOnly cookie (NOT localStorage)
        → All subsequent API calls include JWT
          → Cloud Run validates JWT via Firebase Admin SDK
```

#### What transitions from current state:
The current login uses `localStorage` for a mock session. This MUST be replaced with Firebase Auth SDK. The `estateClient` in `web/src/lib/client.ts` must be updated to attach the Firebase JWT to all requests.

---

### 3.2 Dashboard (Home)

#### What the user sees:
After login, the Principal lands on a **home dashboard** showing:
- **Estate completion score** (percentage of legacy organized, powered by The Shepherd AI)
- **Quick action cards**: "Upload a Document", "Record a Memory", "Add an Asset"
- **Recent activity feed** (real-time from Firestore `onSnapshot`)
- **Notification badges** (pending invitations, approaching deadlines)
- **Tier status** (Free / Concierge / White Glove)

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Dashboard Index | `/estates/:estateId/dashboard` | ✅ UI shell built |
| Global Dashboard (multi-estate) | `/dashboard` | ✅ UI shell built |

#### Data sources:
- `estates/{estateId}` — estate metadata (Firestore)
- `estates/{estateId}/assets` — asset count (Firestore)
- `estates/{estateId}/documents` — document count (Firestore)
- Shepherd AI completion score — Genkit flow (Vertex AI)
- Activity feed — `audit_logs` collection (Firestore, real-time)

---

### 3.3 Estate Management

#### What the user sees:
- **Create a new estate** — name it, set the Principal
- **View estate summary** — overview card with name, status, estimated value, completion %
- **Multi-estate support** — a user can be Principal on one estate and Executor/Heir on others
- **Estate status badge** — Active, Death Reported, Executor Confirmed, In Settlement, Closed

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Estate List | `/dashboard/estates` | ✅ UI shell built |
| Estate Detail | `/estates/:estateId/dashboard` | ✅ UI shell built |
| Create Estate | Modal on Estate List | ❌ Not built |

#### Data model: `estates/{estateId}` (see [DATA_MODEL_LOCK.md](file:///Users/thekryptodragon/Development/FinalWishes/docs/DATA_MODEL_LOCK.md))

#### Key behaviors:
- When a Principal creates an estate, an `estate_users` document is created with `role: 'principal'`
- Estate status follows the state machine: `active → death_reported → executor_confirmed → in_settlement → closed`
- `estimatedValue` is auto-calculated by summing all asset `estimatedValue` fields
- `coolingOffEndsAt` is set 72 hours after death confirmation (via Cloud Tasks)

---

### 3.4 Document Vault

#### What the user sees:
- **Upload documents** — drag-and-drop or file picker
- **Document categories** — Wills & Trusts, Insurance, Financial, Legal, Personal, Other
- **Folder organization** — create folders, move documents
- **Document viewer** — in-browser preview for PDFs and images
- **Download** — fetch encrypted document, decrypt client-side
- **Version history** — see when a document was uploaded/updated
- **Tags** — searchable labels
- **OCR status badge** — "Processed" or "Pending" (Document AI, Tier 3)

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Vault | `/estates/:estateId/vault` | ✅ UI shell built |
| Upload Modal | Overlay on Vault | ✅ UI built |
| Document Viewer | Overlay on Vault | ❌ Not built |

#### Data model: `estates/{estateId}/documents/{documentId}`

#### Encryption flow:
```
User selects file
  → Client generates DEK (AES-256-GCM) via Web Crypto API
    → File encrypted with DEK (client-side, shared/crypto/)
      → DEK wrapped (encrypted) by Cloud KMS KEK
        → Encrypted file → Cloud Storage (signed upload URL from Go API)
          → Encrypted DEK (base64) → Firestore document metadata
            → Download: fetch encrypted file → unwrap DEK via Cloud KMS → decrypt → display
```

#### Go API endpoints:
```
POST   /v1/estates/:estateId/documents/upload-url  → returns signed Cloud Storage URL
GET    /v1/estates/:estateId/documents/:docId/download-url → returns signed download URL
POST   /v1/estates/:estateId/documents/:docId/decrypt-key  → returns unwrapped DEK
```

---

### 3.5 Video Memorials (YouTube Integration)

#### What the user sees:
- **Video gallery** — grid of video thumbnails with play buttons
- **Cinema-grade player** — full-screen modal with video playback (YouTube embedded)
- **Upload video** — select file, add title, set visibility (Private Archive / Share with Heirs)
- **Record video** — (mobile only) open camera, record, upload directly
- **Video metadata** — title, date, who it's for, description

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Memoirs | `/estates/:estateId/memoirs` | ✅ UI built (VideoCard, PhotoCard, UploadModal) |
| Memoir Viewer | Modal overlay | ✅ UI built (cinema-grade modal) |

#### Technical flow:
```
Video Upload (Web):
  User selects video file
    → Call YouTube Data API v3: videos.insert (snippet + status: "unlisted")
      → YouTube processes video (transcoding, thumbnails — all automatic)
        → YouTube returns video ID
          → Store in Firestore: estates/{estateId}/memoirs/{memoirId}
            → { type: "video", youtubeVideoId: "xxx", title, dateAdded, visibility }

Video Playback:
  Load memoir from Firestore
    → Render YouTube IFrame Player: youtube.com/embed/{videoId}
      → YouTube handles streaming, adaptive bitrate, CDN — zero custom infra

Video Recording (Mobile):
  Expo Camera opens
    → User records video
      → File saved locally
        → Upload to YouTube API (unlisted)
          → Same storage flow as web
```

#### Collections needed:
```
estates/{estateId}/memoirs/{memoirId}
  type: "video" | "photo" | "audio"
  title: string
  youtubeVideoId?: string        // for videos
  googlePhotosMediaId?: string   // for photos
  cloudStorageUrl?: string       // for audio or fallback
  visibility: "private" | "shared"
  sharedWith: string[]           // heir IDs
  dateAdded: timestamp
  uploadedBy: string             // user ID
  description?: string
  tags?: string[]
```

---

### 3.6 Photo Galleries (Google Photos Integration)

#### What the user sees:
- **Photo grid** — masonry-style gallery of life photos
- **Albums** — organize photos by life chapter (Wedding, Family, Career, etc.)
- **Full-screen viewer** — click to enlarge with metadata
- **Batch upload** — select multiple photos at once
- **Caption/story** — attach a written story or context to each photo
- **Share with heirs** — select which photos specific heirs can see

#### Technical flow:
```
Photo Upload:
  User selects photos
    → Call Google Photos API: mediaItems.batchCreate
      → Google Photos stores, generates thumbnails, serves via CDN
        → Store mediaItemId in Firestore memoir document
          → Display via Google Photos base URL + parameters

Album Management:
  User creates album: "The Early Years"
    → Call Google Photos API: albums.create
      → Add photos to album: albums.batchAddMediaItems
        → Store albumId in Firestore
```

#### Fallback:
If user doesn't have Google account or declines Google Photos OAuth, photos fall back to **Cloud Storage** + **Firebase Extension: Resize Images** (auto-thumbnail generation).

---

### 3.7 Digital Lockbox

#### What the user sees:
- **Credential vault** — stored usernames, passwords, PINs for accounts (bank, email, social media)
- **Account transition instructions** — "When I die, close this account" / "Transfer to [Heir]" / "Memorialize this account"
- **Heirloom registry** — photos and descriptions of physical items (grandmother's ring, the family bible) with designated recipients

#### Screens:

| Screen | Component | Status |
|--------|-----------|:------:|
| Lockbox | Part of Vault or dedicated route | ❌ Not built |
| Heirloom Registry | Part of Assets | ❌ Not built |

#### Data model:
```
estates/{estateId}/lockbox/{entryId}
  service: string          // "Bank of America", "Gmail", "Facebook"
  username_encrypted: string   // encrypted via Cloud KMS
  password_encrypted: string   // encrypted via Cloud KMS  
  instructions: string     // "Close account, transfer balance to [Heir Name]"
  designatedHeirId?: string
  category: "financial" | "email" | "social" | "utility" | "other"
  notes?: string
  createdAt: timestamp
  updatedAt: timestamp
```

**Security**: All credential fields are encrypted **server-side** via Cloud KMS before storage. Only the Principal (and post-death Executor) can decrypt.

---

### 3.8 Final Directives & Ethical Wills

#### What the user sees:
- **Funeral preferences** — burial vs cremation, location, music, readings, attendees
- **Ethical will editor** — rich text document where the Principal writes their values, life lessons, and wishes
- **Video memoir recording** — record a personal message to heirs (uses YouTube API)
- **PDF export** — generate a formatted, printable PDF of all directives
- **Scheduling** — "Release this to my children on [specific date] or [on my death]"

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Obituary/Directives | `/estates/:estateId/obituary` | ✅ UI shell built |

#### Data model:
```
estates/{estateId}/directives/{directiveId}
  type: "funeral_preferences" | "ethical_will" | "final_message" | "letter"
  title: string
  content: string            // Rich text (HTML from tiptap editor)
  recipientHeirIds: string[] // Who should receive this
  deliveryTrigger: "on_death" | "on_date" | "immediate"
  scheduledDate?: timestamp  // if deliveryTrigger is "on_date"
  pdfUrl?: string            // Generated PDF in Cloud Storage
  status: "draft" | "finalized"
  createdAt: timestamp
  updatedAt: timestamp
```

#### PDF generation:
Uses `@react-pdf/renderer` client-side to create a formatted PDF of the directive, then uploads to Cloud Storage. The Shepherd AI can assist with drafting.

---

### 3.9 Time Capsules (Scheduled Delivery)

#### What the user sees:
- **Create a time capsule** — write a message, attach a video/photo, choose recipient, choose trigger
- **Triggers**: "On my death", "On [specific date]", "When [Heir] turns 18", "On [Heir]'s wedding day"
- **Capsule status** — Draft, Sealed (finalized), Delivered
- **Preview** — see what the recipient will receive
- **Cooling-off** — after sealing, 72-hour window to unseal/edit

#### Technical flow:
```
Principal creates time capsule
  → Store in Firestore: estates/{estateId}/capsules/{capsuleId}
    → If trigger = "on_date":
        → Cloud Tasks: schedule delivery for that date
          → At trigger time: Cloud Function fires
            → Sends FCM push notification to heir
            → Sends email via Firebase Extension: Trigger Email
            → Updates capsule status to "delivered"
    → If trigger = "on_death":
        → Capsule queued — released when estate status changes to "executor_confirmed"
          → Cloud Function listens to Firestore onUpdate(estates/{estateId})
            → When status = "executor_confirmed": release all "on_death" capsules
```

#### Data model:
```
estates/{estateId}/capsules/{capsuleId}
  title: string
  message: string              // Rich text
  attachedMemoirIds: string[]  // Video/photo memoir references
  attachedDocumentIds: string[] // Document vault references
  recipientHeirId: string
  deliveryTrigger: "on_death" | "on_date" | "on_heir_birthday" | "custom"
  triggerDate?: timestamp
  triggerCondition?: string    // e.g. "When Sarah turns 18"
  status: "draft" | "sealed" | "delivered"
  sealedAt?: timestamp
  deliveredAt?: timestamp
  coolingOffEndsAt?: timestamp // 72 hours after sealed
  createdAt: timestamp
  updatedAt: timestamp
```

---

### 3.10 The Shepherd — AI Guidance Engine

#### What the user sees:
- **Completion score** — "Your legacy is 45% organized" with a visual progress ring
- **Next-best-action suggestions** — "You haven't uploaded a will yet", "Consider recording a video message for your children"
- **Chat interface** — ask questions: "What documents do I need?", "How do I write an ethical will?"
- **Obituary assistance** — AI-assisted obituary drafting
- **Smart recommendations** — based on what the user has already added

#### Technical flow:
```
User opens Dashboard
  → React calls Go API: GET /v1/estates/:estateId/shepherd/score
    → Go handler calls Genkit AI flow: "compute_completion_score"
      → Genkit sends structured prompt to Gemini Flash (Vertex AI):
          System: "You are The Shepherd, a compassionate legacy planning assistant..."
          User: "Estate has: 3 assets, 2 documents, 0 videos, 1 executor, 0 heirs, no funeral prefs"
          Output: { score: 45, missing: ["will", "video_memoir", "heir_designation", "funeral_preferences"], suggestions: [...] }
      → Response cached in Firestore for 24 hours
        → Dashboard renders score + suggestions

User asks a question (Chat)
  → React calls Go API: POST /v1/estates/:estateId/shepherd/ask
    → Go handler calls Genkit AI flow: "shepherd_chat"
      → Genkit sends conversational prompt to Gemini Pro:
          System: "You are The Shepherd... You are NOT a lawyer... always recommend professional legal counsel..."
          History: [previous messages]
          User: "What documents do I need to organize my estate?"
      → Response streamed back via Server-Sent Events (SSE)

Obituary Assistance:
  → Go API: POST /v1/estates/:estateId/shepherd/obituary
    → Genkit flow: "draft_obituary"
      → Input: Principal's name, date of birth, family info, career highlights, hobbies (from estate data)
      → Output: Draft obituary text
        → User edits in tiptap rich text editor
          → Saves to directives collection
```

#### Genkit flow definitions (Go):
```go
// Flows to be defined in api/genkit/
var ComputeCompletionScore = genkit.DefineFlow("compute_completion_score", ...)
var ShepherdChat         = genkit.DefineFlow("shepherd_chat", ...)
var DraftObituary        = genkit.DefineFlow("draft_obituary", ...)
var SuggestNextAction    = genkit.DefineFlow("suggest_next_action", ...)
```

---

### 3.11 Asset Inventory

#### What the user sees:
- **Asset list** with 5 categories: Financial, Real Estate, Vehicles, Digital, Personal Property
- **Add asset** — form with category-specific fields
- **Asset valuation** — estimated value per asset, total estate value
- **Asset-to-heir designation** — "Leave the house to Sarah, the car to Michael"
- **Linked documents** — attach vault documents to assets (deed, title, policy)
- **Status** — Active, Transferred, Archived

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Assets | `/estates/:estateId/assets` | ✅ UI shell built |

#### Data model: `estates/{estateId}/assets/{assetId}` (see DATA_MODEL_LOCK.md)

#### Category-specific metadata:
```
Financial:  { institution, accountType, accountNumber_piiRef }
Real Estate: { address, propertyType, parcelNumber, zestimate? }
Vehicle:    { make, model, year, vin_piiRef, mileage }
Digital:    { platform, url, accountType }
Personal:   { physicalLocation, sentimentalValue, condition }
```

---

### 3.12 Beneficiary Management (Executors & Heirs)

#### What the user sees:
- **Executor list** — who is designated to manage the estate
- **Heir list** — who receives what
- **Invite executor/heir** — send email invitation
- **Pending invitations** — track who has accepted/declined
- **Priority ordering** — primary executor, backup executor
- **Minor protection** — if heir is a minor, require guardian designation
- **Residuary distribution** — percentage-based split of remaining estate

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Beneficiaries | `/estates/:estateId/beneficiaries` | ✅ UI shell built |

#### Data models: 
- `estates/{estateId}/executors/{executorId}`
- `estates/{estateId}/heirs/{heirId}`

#### Invitation flow:
```
Principal adds executor email
  → Firestore document created (status: "pending")
    → Firebase Extension: Trigger Email sends invitation
      → Executor clicks link → lands on /register or /login
        → After auth, executor sees pending invitation
          → Accepts → status: "accepted", estate_users doc created
          → Declines → status: "declined"
```

---

### 3.13 Notifications & Activity

#### What the user sees:
- **Notification center** — bell icon with badge count
- **Activity types**: document uploaded, asset added, invitation sent/received, death reported, time capsule delivered
- **Real-time updates** — new notifications appear without page refresh (Firestore onSnapshot)
- **Email notifications** — critical events also sent via email
- **Push notifications** — mobile devices receive FCM push for critical events

#### Screens:

| Screen | Route | Status |
|--------|-------|:------:|
| Notifications | `/estates/:estateId/notifications` | ✅ UI shell built |

#### Data model: `audit_logs/{logId}` (see DATA_MODEL_LOCK.md)

#### Push notification (mobile):
```
Critical event occurs (e.g., death reported)
  → Cloud Function triggers on Firestore write
    → FCM sends push to all relevant users
      → Mobile app receives push → navigates to relevant screen
```

---

### 3.14 Payments & Tiers

#### What the user sees:
- **Tier comparison** — Free vs Concierge ($29/mo) vs White Glove ($99/mo)
- **Upgrade button** — opens Sirsi Sign payment flow
- **Payment history** — list of past transactions
- **Subscription management** — cancel, change tier

#### Technical flow:
```
User clicks "Upgrade to Concierge"
  → React calls Sirsi Sign API: POST /api/payments/create-session
    → Sirsi Sign creates Stripe Checkout session
      → User redirected to Stripe payment page
        → Payment succeeds → Stripe webhook → Sirsi Sign → Firestore
          → `payments/{paymentId}` created
          → `users/{userId}.tier` updated to "concierge"
          → Firebase Custom Claim updated (for security rules)
```

---

### 3.15 Settings

#### What the user sees:
- **Profile** — edit name, email, phone, address
- **Security** — change password, manage MFA, view active sessions
- **Notifications** — toggle email/push for different event types
- **Privacy** — data export (GDPR), account deletion
- **Subscription** — view/manage tier

#### Screen:

| Screen | Route | Status |
|--------|-------|:------:|
| Settings | `/estates/:estateId/settings` | ✅ UI shell built |

---

### 3.16 E-Signatures (via Sirsi Sign)

#### What the user sees:
- **Sign a directive** — legal ack when finalizing ethical will or funeral preferences
- **Embedded signing** — signing flow appears within FinalWishes UI (OpenSign iframe)
- **Signed document** — stored in vault with digital evidence (hash + timestamp)

#### Technical flow:
```
User finalizes a directive
  → React calls Go API: POST /v1/directives/:id/sign
    → Go API calls Sirsi Sign: POST /api/envelopes (creates signing envelope)
      → Sirsi Sign returns signing URL
        → React embeds signing iframe
          → User signs → OpenSign webhook → Sirsi Sign → Firestore
            → Directive status: "finalized"
            → Signed PDF stored in Cloud Storage
```

---

## 4. Mobile-Specific Features

| Feature | iOS/Android Only | Notes |
|---------|:----------------:|-------|
| **Biometric login** | ✅ | FaceID (iOS), Fingerprint (Android) via Expo SecureStore |
| **Camera recording** | ✅ | Record video memoir directly in app |
| **Document scanner** | ✅ | Camera → Document AI OCR (Tier 3) |
| **Push notifications** | ✅ | FCM for time capsule delivery, death alerts |
| **Offline mode** | ✅ | View cached data when offline (Firestore persistence) |
| **Share sheet** | ✅ | Share memoir photos/videos via native share |

---

## 5. Desktop-Specific Features

| Feature | macOS Only | Notes |
|---------|:---------:|-------|
| **Native menu bar** | ✅ | File, Edit, View menus |
| **Dock icon with badge** | ✅ | Notification count |
| **System notifications** | ✅ | macOS native notifications |
| **Keyboard shortcuts** | ✅ | ⌘N (new asset), ⌘U (upload), etc. |
| **Drag from Finder** | ✅ | Drag files directly into vault |

---

## 6. Current Build Status Summary

| Component | Status | What Exists | What's Missing |
|-----------|:------:|-------------|---------------|
| **Landing page** | ✅ Done | Full marketing page, deployed | Nothing |
| **Login** | ⚠️ 40% | UI built | Real Firebase Auth (uses localStorage) |
| **Dashboard** | ⚠️ 30% | UI shells for all 9 pages | Real data, API integration |
| **Vault** | ⚠️ 20% | Upload modal UI | Cloud Storage, KMS encryption |
| **Memoirs** | ⚠️ 25% | Video/photo cards, upload modal | YouTube API, Google Photos API |
| **Assets** | ⚠️ 20% | List UI | Real CRUD, category-specific forms |
| **Beneficiaries** | ⚠️ 15% | List UI | Invitation flow, email triggers |
| **Obituary** | ⚠️ 10% | Basic UI | Tiptap editor, Genkit integration |
| **Notifications** | ⚠️ 10% | List UI | Real-time Firestore, FCM |
| **Settings** | ⚠️ 10% | Basic UI | Profile edit, MFA management |
| **Go API** | ❌ 5% | Project structure only | All handlers, middleware, DB |
| **Genkit AI** | ❌ 0% | Not started | Flows, prompts, Vertex AI config |
| **Time Capsules** | ❌ 0% | Not started | UI + Cloud Tasks + triggers |
| **Digital Lockbox** | ❌ 0% | Not started | UI + encrypted storage |
| **Directives/Ethical Wills** | ❌ 0% | Not started | Editor + PDF + signing |
| **Mobile (iOS/Android)** | ❌ 5% | Expo stubs | All screens, camera, biometric |
| **Desktop (macOS)** | ❌ 5% | Tauri config | Build integration, native menus |

---

## 7. Go API Route Map

```
/v1
├── /auth
│   ├── POST   /register        → Create user + Firebase Auth
│   ├── POST   /login           → Verify credentials, return JWT
│   └── POST   /mfa/setup       → Enroll TOTP
│
├── /users
│   ├── GET    /me              → Current user profile
│   ├── PUT    /me              → Update profile
│   └── DELETE /me              → Delete account (GDPR)
│
├── /estates
│   ├── POST   /                → Create estate
│   ├── GET    /                → List user's estates
│   ├── GET    /:estateId       → Estate detail
│   ├── PUT    /:estateId       → Update estate
│   │
│   ├── /assets
│   │   ├── POST   /            → Add asset
│   │   ├── GET    /            → List assets
│   │   ├── GET    /:assetId    → Asset detail
│   │   ├── PUT    /:assetId    → Update asset
│   │   └── DELETE /:assetId    → Remove asset
│   │
│   ├── /documents
│   │   ├── POST   /upload-url  → Get signed upload URL
│   │   ├── GET    /            → List documents
│   │   ├── GET    /:docId      → Document detail
│   │   ├── GET    /:docId/download-url → Signed download URL
│   │   ├── POST   /:docId/decrypt-key  → Unwrap DEK
│   │   └── DELETE /:docId      → Soft-delete
│   │
│   ├── /memoirs
│   │   ├── POST   /            → Create memoir (video/photo/audio)
│   │   ├── GET    /            → List memoirs
│   │   ├── POST   /youtube-upload → Upload to YouTube API
│   │   └── DELETE /:memoirId   → Remove memoir
│   │
│   ├── /executors
│   │   ├── POST   /            → Designate executor
│   │   ├── GET    /            → List executors
│   │   ├── POST   /:execId/invite → Send invitation email
│   │   └── DELETE /:execId     → Remove executor
│   │
│   ├── /heirs
│   │   ├── POST   /            → Designate heir
│   │   ├── GET    /            → List heirs
│   │   └── DELETE /:heirId     → Remove heir
│   │
│   ├── /lockbox
│   │   ├── POST   /            → Add credential (encrypted)
│   │   ├── GET    /            → List credentials (titles only)
│   │   ├── GET    /:entryId    → Decrypt and return credential
│   │   └── DELETE /:entryId    → Remove
│   │
│   ├── /directives
│   │   ├── POST   /            → Create directive
│   │   ├── GET    /            → List directives
│   │   ├── PUT    /:id         → Update directive
│   │   ├── POST   /:id/pdf     → Generate PDF
│   │   └── POST   /:id/sign    → Send to Sirsi Sign
│   │
│   ├── /capsules
│   │   ├── POST   /            → Create time capsule
│   │   ├── GET    /            → List capsules
│   │   ├── PUT    /:id         → Update capsule
│   │   ├── POST   /:id/seal    → Seal capsule (72hr cooling-off)
│   │   └── POST   /:id/unseal  → Unseal during cooling-off
│   │
│   └── /shepherd
│       ├── GET    /score       → Completion score (Genkit)
│       ├── POST   /ask         → Chat with Shepherd (Genkit)
│       └── POST   /obituary    → Draft obituary (Genkit)
│
└── /webhooks
    ├── POST   /sirsi-sign      → OpenSign/Stripe events
    └── POST   /fcm             → FCM delivery receipts
```

---

## 8. Firestore Collections (Complete)

```
users/{userId}                           ← User profile
estates/{estateId}                       ← Estate metadata
estate_users/{userId_estateId}           ← Role mapping (Principal/Executor/Heir)
estates/{estateId}/assets/{assetId}      ← Asset inventory
estates/{estateId}/documents/{docId}     ← Document vault metadata
estates/{estateId}/executors/{execId}    ← Executor designations
estates/{estateId}/heirs/{heirId}        ← Heir designations
estates/{estateId}/memoirs/{memoirId}    ← Video/photo/audio memorials
estates/{estateId}/lockbox/{entryId}     ← Encrypted credentials
estates/{estateId}/directives/{dirId}    ← Final wishes, ethical wills
estates/{estateId}/capsules/{capsId}     ← Time capsules
audit_logs/{logId}                       ← Immutable audit trail
payments/{paymentId}                     ← Payment records
mail/{mailId}                            ← Trigger Email extension writes here
```

---

**This is exactly what we're building.**

**Signed,**
**Antigravity (The Agent)**
**March 18, 2026**
