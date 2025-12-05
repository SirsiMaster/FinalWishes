# User Stories
## MyShepherd - The Estate Operating System
**Version:** 1.0.0
**Date:** November 26, 2025

---

## 1. User Personas

### 1.1 Principal (Estate Owner)
**Name:** Margaret Johnson
**Age:** 68
**Profile:** Retired teacher, recently widowed, wants to ensure her two adult children don't face the same administrative nightmare she experienced when her husband passed.

**Goals:**
- Organize all assets in one secure place
- Designate clear beneficiaries for each asset
- Ensure smooth transition for her children
- Maintain control until she's ready to share

**Frustrations:**
- Paper documents scattered across file cabinets
- Unsure what accounts her husband even had
- Worried about digital accounts (email, photos)
- Doesn't trust "the cloud" with sensitive info

**Tech Comfort:** Basic - uses iPhone, email, Facebook

---

### 1.2 Executor
**Name:** David Williams
**Age:** 45
**Profile:** Margaret's eldest son, attorney, recently named executor of his mother's estate. Previously served as executor for his father and found it overwhelming despite his legal background.

**Goals:**
- Understand exactly what needs to be done
- Track progress on all required tasks
- Communicate with his sister (co-executor)
- Complete settlement as quickly as possible

**Frustrations:**
- No single source of truth for dad's estate
- Endless phone calls to institutions
- Coordinating with siblings on decisions
- Balancing estate work with full-time job

**Tech Comfort:** High - uses multiple devices, comfortable with apps

---

### 1.3 Heir (Beneficiary)
**Name:** Sarah Williams-Chen
**Age:** 41
**Profile:** Margaret's daughter, lives across the country, works in healthcare. Named as beneficiary and co-executor but defers most decisions to her brother.

**Goals:**
- Stay informed without being overwhelmed
- Know when action is required from her
- Receive her inheritance without complications
- Honor her mother's wishes

**Frustrations:**
- Distance makes involvement difficult
- Feels out of the loop on progress
- Paperwork requires physical signatures
- Emotional toll of estate discussions

**Tech Comfort:** Medium - uses iPhone, prefers mobile apps

---

### 1.4 Administrator (Internal)
**Name:** Alex Rivera
**Age:** 32
**Profile:** Legacy customer success manager, handles escalated support tickets and White Glove tier accounts.

**Goals:**
- Resolve customer issues quickly
- Monitor system health
- Generate reports for management
- Maintain data integrity

**Tech Comfort:** Expert - internal power user

---

## 2. User Stories by Epic

### Epic 1: User Onboarding

#### US-001: Account Registration
**As a** potential Principal
**I want to** create an account with my email
**So that** I can begin organizing my estate

**Acceptance Criteria:**
- Can register with email/password
- Can register with Google OAuth
- Can register with Apple Sign-In
- Email verification required
- Password strength requirements enforced
- Terms of Service acceptance required

**Priority:** P0 | **Points:** 5

---

#### US-002: Identity Verification
**As a** registered Principal
**I want to** verify my identity
**So that** my estate information is protected and legally valid

**Acceptance Criteria:**
- Can upload government-issued ID (driver's license, passport)
- Can take selfie for liveness check
- Verification status displayed in profile
- Can retry if verification fails
- Support for 50 US states

**Priority:** P1 | **Points:** 8

---

#### US-003: Profile Completion
**As a** new Principal
**I want to** complete my profile
**So that** my estate has accurate personal information

**Acceptance Criteria:**
- Can enter legal name
- Can enter date of birth
- Can enter address
- Can enter phone number
- Can upload profile photo (optional)
- Progress indicator shows completion

**Priority:** P0 | **Points:** 3

---

### Epic 2: Estate Profile

#### US-010: Create Estate
**As a** verified Principal
**I want to** create my estate profile
**So that** I have a central place for all my information

**Acceptance Criteria:**
- Estate created automatically upon verification
- Estate name defaults to "{First Name}'s Estate"
- Can customize estate name
- Unique estate ID generated
- Creation date recorded

**Priority:** P0 | **Points:** 2

---

#### US-011: Add Financial Asset
**As a** Principal
**I want to** add a financial account to my estate
**So that** my beneficiaries know it exists

**Acceptance Criteria:**
- Can select institution from searchable list
- Can enter account type (checking, savings, investment, etc.)
- Can enter approximate value (optional)
- Can add notes
- Can attach statement document
- Can mark as primary account

**Priority:** P0 | **Points:** 5

---

#### US-012: Add Real Estate Asset
**As a** Principal
**I want to** add real estate to my estate
**So that** property ownership is documented

**Acceptance Criteria:**
- Can enter property address
- Can select property type (home, condo, land, commercial)
- Can enter approximate value
- Can attach deed document
- Can note mortgage holder
- Can specify ownership type (sole, joint, trust)

**Priority:** P0 | **Points:** 5

---

#### US-013: Add Vehicle Asset
**As a** Principal
**I want to** add vehicles to my estate
**So that** titles can be transferred properly

**Acceptance Criteria:**
- Can enter make, model, year
- Can enter VIN
- Can attach title document
- Can note if leased or financed
- Can enter approximate value

**Priority:** P1 | **Points:** 3

---

#### US-014: Add Digital Asset
**As a** Principal
**I want to** document my digital accounts
**So that** they can be managed after I pass

**Acceptance Criteria:**
- Can select category (email, social media, subscription, crypto)
- Can enter service name
- Can enter username/email for account
- Can specify desired action (delete, memorialize, transfer)
- Can enter backup/recovery codes (encrypted)
- Crypto: can enter wallet address (view-only)

**Priority:** P1 | **Points:** 5

---

#### US-015: Add Personal Property
**As a** Principal
**I want to** document valuable personal items
**So that** they are distributed according to my wishes

**Acceptance Criteria:**
- Can enter item description
- Can enter approximate value
- Can attach photo(s)
- Can add provenance/history notes
- Can specify intended recipient directly

**Priority:** P2 | **Points:** 3

---

### Epic 3: Document Vault

#### US-020: Upload Document
**As a** Principal
**I want to** upload important documents
**So that** they are securely stored and accessible

**Acceptance Criteria:**
- Can upload PDF, JPG, PNG, HEIC
- Maximum file size: 50MB
- Can name/rename document
- Can add description
- Upload progress indicator shown
- Virus scan performed on upload

**Priority:** P0 | **Points:** 5

---

#### US-021: Organize Documents
**As a** Principal
**I want to** organize my documents into folders
**So that** they are easy to find

**Acceptance Criteria:**
- Can create folders
- Can move documents between folders
- Can rename folders
- Can delete empty folders
- Default folders provided (Wills, Insurance, Financial, Property, Medical)

**Priority:** P1 | **Points:** 3

---

#### US-022: Document Capture (Mobile)
**As a** Principal using the mobile app
**I want to** scan documents with my camera
**So that** I don't need a separate scanner

**Acceptance Criteria:**
- Can capture document with camera
- Auto-edge detection
- Can capture multiple pages
- Auto-converts to PDF
- Can retry/retake
- Works in low light (flash option)

**Priority:** P1 | **Points:** 8

---

#### US-023: Document Search
**As a** Principal
**I want to** search my documents
**So that** I can find specific items quickly

**Acceptance Criteria:**
- Can search by document name
- Can search by document content (OCR text)
- Can filter by folder
- Can filter by upload date
- Can filter by file type

**Priority:** P2 | **Points:** 5

---

### Epic 4: Beneficiary Management

#### US-030: Designate Executor
**As a** Principal
**I want to** designate executors for my estate
**So that** someone can manage it when I'm gone

**Acceptance Criteria:**
- Can add up to 3 executors
- Must enter executor's full legal name
- Must enter executor's email
- Can enter executor's phone (optional)
- Can specify primary vs. alternate executor
- Executor receives invitation email
- Executor can accept/decline designation

**Priority:** P0 | **Points:** 8

---

#### US-031: Designate Heir
**As a** Principal
**I want to** designate heirs for my estate
**So that** they receive my assets

**Acceptance Criteria:**
- Can add unlimited heirs
- Must enter heir's full legal name
- Can enter heir's email (optional)
- Can enter heir's relationship
- Can enter heir's date of birth
- Can note if heir is a minor

**Priority:** P0 | **Points:** 5

---

#### US-032: Assign Asset to Heir
**As a** Principal
**I want to** assign specific assets to specific heirs
**So that** distribution is clear

**Acceptance Criteria:**
- Can select asset from inventory
- Can assign to one or more heirs
- Can specify percentage split
- Can add conditions (e.g., "upon reaching age 25")
- Can add distribution notes
- Total allocation cannot exceed 100%

**Priority:** P0 | **Points:** 5

---

#### US-033: Create Residuary Clause
**As a** Principal
**I want to** specify what happens to unassigned assets
**So that** everything is accounted for

**Acceptance Criteria:**
- Can specify "everything else goes to X"
- Can specify percentage split of residuary
- Warning shown if no residuary clause set

**Priority:** P1 | **Points:** 3

---

### Epic 5: Verify Phase (Post-Death)

#### US-040: Report Death
**As an** Executor
**I want to** report the Principal's death
**So that** the estate settlement process begins

**Acceptance Criteria:**
- Can upload death certificate
- Must enter date of death
- Must confirm understanding of legal responsibility
- System validates death certificate format
- Notification sent to all designated Executors

**Priority:** P0 | **Points:** 8

---

#### US-041: Executor Confirmation
**As an** Executor
**I want to** confirm my acceptance of executor role
**So that** I can access estate information

**Acceptance Criteria:**
- Can view estate summary before accepting
- Must verify own identity
- Must acknowledge legal responsibilities
- For estates >$100K, requires 2-of-3 executor confirmation
- 72-hour cooling-off period begins after all confirmations

**Priority:** P0 | **Points:** 8

---

#### US-042: Heir Notification
**As a** system
**I want to** notify heirs of their designation
**So that** they know an inheritance is coming

**Acceptance Criteria:**
- Email sent to heirs with email addresses
- Notification includes estate name (not details)
- Heir can create account to view details
- Heir must verify identity to claim inheritance
- Notification respects cooling-off period

**Priority:** P0 | **Points:** 5

---

### Epic 6: Notify Phase

#### US-050: Generate Notification Letter
**As an** Executor
**I want to** generate death notification letters
**So that** institutions are informed

**Acceptance Criteria:**
- Can select institution from asset list
- Letter template auto-populated
- Can preview letter before generating
- PDF generated with proper formatting
- Letter includes death certificate reference
- Tracking number assigned

**Priority:** P0 | **Points:** 8

---

#### US-051: Track Notification Status
**As an** Executor
**I want to** track notification status
**So that** I know what's been done

**Acceptance Criteria:**
- Can mark notification as "sent"
- Can record sent date
- Can record response received
- Can upload response document
- Status visible in dashboard
- Overdue notifications highlighted

**Priority:** P1 | **Points:** 5

---

#### US-052: Credit Bureau Notification
**As an** Executor
**I want to** notify credit bureaus
**So that** identity theft is prevented

**Acceptance Criteria:**
- Can generate letters for Equifax, Experian, TransUnion
- Letters request deceased indicator
- Can request credit freeze
- Instructions provided for each bureau

**Priority:** P1 | **Points:** 3

---

### Epic 7: Mobile Experience

#### US-060: Biometric Login
**As a** mobile user
**I want to** log in with Face ID / Touch ID / Fingerprint
**So that** access is quick and secure

**Acceptance Criteria:**
- Can enable biometric authentication in settings
- Works on iOS (Face ID, Touch ID)
- Works on Android (Fingerprint)
- Falls back to PIN/password if biometric fails
- Biometric required for sensitive actions

**Priority:** P1 | **Points:** 5

---

#### US-061: Push Notifications
**As a** mobile user
**I want to** receive push notifications
**So that** I'm aware of important updates

**Acceptance Criteria:**
- Notification when executor invitation received
- Notification when estate requires action
- Notification for document upload completion
- Notification for approaching deadlines
- Can customize notification preferences

**Priority:** P1 | **Points:** 5

---

#### US-062: Offline Access
**As a** mobile user
**I want to** view basic estate info offline
**So that** I have access when connectivity is limited

**Acceptance Criteria:**
- Asset list viewable offline
- Contact list viewable offline
- Cached data syncs when online
- Clear indicator when viewing cached data
- Can queue document uploads for later

**Priority:** P2 | **Points:** 8

---

### Epic 8: Dashboard & Reporting

#### US-070: Principal Dashboard
**As a** Principal
**I want to** see my estate completion status
**So that** I know what still needs to be done

**Acceptance Criteria:**
- Overall completion percentage shown
- Breakdown by category (assets, documents, beneficiaries)
- Suggested next actions
- Recent activity feed
- Quick links to common actions

**Priority:** P0 | **Points:** 5

---

#### US-071: Executor Dashboard
**As an** Executor
**I want to** see settlement progress
**So that** I can manage the process efficiently

**Acceptance Criteria:**
- Phase indicator (Verify, Notify, Distribute)
- Task checklist with completion status
- Notifications requiring attention
- Timeline of key dates
- Quick access to generate letters

**Priority:** P0 | **Points:** 5

---

#### US-072: Export Estate Summary
**As a** Principal or Executor
**I want to** export estate summary
**So that** I have a printable record

**Acceptance Criteria:**
- Can export as PDF
- Includes asset inventory
- Includes beneficiary designations
- Includes contact list
- Date/time stamp on export
- Excludes sensitive data (account numbers redacted)

**Priority:** P2 | **Points:** 5

---

### Epic 9: Settings & Preferences

#### US-080: Enable MFA
**As a** user
**I want to** enable multi-factor authentication
**So that** my account is more secure

**Acceptance Criteria:**
- Can enable TOTP (Google Authenticator, Authy)
- Backup codes provided
- MFA required for sensitive actions
- Can disable MFA with re-authentication

**Priority:** P0 | **Points:** 5

---

#### US-081: Notification Preferences
**As a** user
**I want to** control my notification preferences
**So that** I'm not overwhelmed

**Acceptance Criteria:**
- Can enable/disable email notifications
- Can enable/disable SMS notifications
- Can enable/disable push notifications
- Can set quiet hours
- Different preferences per notification type

**Priority:** P1 | **Points:** 3

---

#### US-082: Delete Account
**As a** user
**I want to** delete my account
**So that** my data is removed

**Acceptance Criteria:**
- Must confirm via password
- Must type "DELETE" to confirm
- Cannot delete if active Executor of another's estate
- Data removed within 30 days
- Confirmation email sent
- Cannot be undone

**Priority:** P2 | **Points:** 3

---

### Epic 10: Payment & Subscription

#### US-090: View Pricing Plans
**As a** user
**I want to** view available plans
**So that** I can choose the right tier

**Acceptance Criteria:**
- Free tier features displayed
- Concierge tier features displayed ($2,997)
- White Glove tier displayed ($9,997) - "Contact Us"
- Feature comparison table
- FAQs about pricing

**Priority:** P0 | **Points:** 2

---

#### US-091: Purchase Concierge Plan
**As a** Principal
**I want to** upgrade to Concierge
**So that** I get premium features

**Acceptance Criteria:**
- Can enter credit card via Stripe
- One-time payment processed
- Receipt emailed
- Features unlocked immediately
- Upgrade confirmation shown

**Priority:** P0 | **Points:** 5

---

#### US-092: Request White Glove
**As a** Principal
**I want to** inquire about White Glove service
**So that** I can get human assistance

**Acceptance Criteria:**
- Contact form submitted
- Sales team notified
- Confirmation message shown
- Follow-up within 24 hours promised

**Priority:** P2 | **Points:** 2

---

## 3. Story Map

```
                    PRINCIPAL JOURNEY
    ┌─────────────────────────────────────────────────────────┐
    │  DISCOVER    │   SETUP     │   BUILD    │   MAINTAIN   │
    ├─────────────────────────────────────────────────────────┤
    │  Landing     │  Register   │  Add       │  Update      │
    │  Page        │  Account    │  Assets    │  Info        │
    │              │             │            │              │
    │  Learn       │  Verify     │  Upload    │  Review      │
    │  About       │  Identity   │  Docs      │  Annually    │
    │              │             │            │              │
    │  View        │  Create     │  Assign    │  Manage      │
    │  Pricing     │  Estate     │  Heirs     │  Executors   │
    │              │             │            │              │
    │  Sign Up     │  Add        │  Purchase  │  Share       │
    │              │  Executors  │  Plan      │  Access      │
    └─────────────────────────────────────────────────────────┘

                    EXECUTOR JOURNEY
    ┌─────────────────────────────────────────────────────────┐
    │  ACTIVATION  │   VERIFY    │   NOTIFY   │   COMPLETE   │
    ├─────────────────────────────────────────────────────────┤
    │  Receive     │  Upload     │  Generate  │  Track       │
    │  Invite      │  Death Cert │  Letters   │  Progress    │
    │              │             │            │              │
    │  Create      │  Confirm    │  Send to   │  Mark        │
    │  Account     │  Role       │  Instit.   │  Complete    │
    │              │             │            │              │
    │  Accept      │  Wait       │  Track     │  Export      │
    │  Role        │  Cool-off   │  Responses │  Records     │
    │              │             │            │              │
    │  View        │  Notify     │  Freeze    │  Archive     │
    │  Estate      │  Co-Execs   │  Credit    │  Estate      │
    └─────────────────────────────────────────────────────────┘
```

---

## 4. Story Priority Matrix

### MVP (Must Have) - P0
- US-001, US-003, US-010, US-011, US-012, US-020
- US-030, US-031, US-032, US-040, US-041, US-042
- US-050, US-070, US-071, US-080, US-090, US-091

### Should Have - P1
- US-002, US-013, US-014, US-021, US-022, US-033
- US-051, US-052, US-060, US-061, US-081

### Nice to Have - P2
- US-015, US-023, US-062, US-072, US-082, US-092

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-26 | MyShepherd Team | Initial draft |
