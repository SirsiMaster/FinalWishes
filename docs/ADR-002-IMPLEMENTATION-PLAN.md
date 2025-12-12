# Architecture Decision Record (ADR-002)
## Implementation Plan: DocuSeal, Gemini 3.0 & Launch Scope

**Document Version:** 3.0.0
**Date:** December 11, 2025
**Status:** ACCEPTED
**Decision Makers:** Project Leadership, AI Stack Leader (Gemini)

---

## Executive Summary

This ADR documents the **refined implementation plan** for FinalWishes. It solidifies the decision to self-host key infrastructure (DocuSeal) and leverage the latest AI models (Gemini 3.0) to maximize efficiency and reduce operating costs.

**The Reality:** Most estate settlement is still paper-based. There are no unified government APIs. Financial institutions have proprietary or non-existent programmatic interfaces. Court systems vary by county, not just state.

**The Innovation:** Where connectors don't exist, we BUILD THEM. We become the benchmark for state adoption of automated estate settlement.

This document provides:
1. Complete inventory of all document types in estate settlement
2. All government agencies and their integration status
3. All financial institution integration pathways
4. State-specific requirements for MD, DC, VA, IL, MN (5 launch states)
5. Data containerization/sequestration architecture
6. Innovation strategy: connector-building for states without e-filing

### Strategic Approach

**The $95K/5-month scope includes:**
- Full automation for states WITH e-filing (MD, IL, MN)
- Form library covering ~45 probate forms across 3 states
- Complete user guidance through every step (manual or automated)
- Self-hosted DocuSeal for e-signatures (Postgres compatible, Cost saving vs DocuSign)

---

## Part 1: Complete Document Inventory

### 1.1 Death & Identity Documents

| Document | Source | API Available | Integration Approach |
|----------|--------|---------------|---------------------|
| Death Certificate | State Vital Records Office | **NO** (most states) | Manual upload, OCR extraction |
| Social Security Card | SSA | **NO** | Reference only |
| Birth Certificate | State Vital Records | **NO** | Manual upload |
| Marriage Certificate | County Clerk | **NO** | Manual upload |
| Divorce Decree | County Court | **NO** | Manual upload |
| Government ID (Driver's License) | State DMV | **NO** | Identity verification services (Persona/Jumio) |
| Passport | State Department | **NO** | Manual upload |
| Military Discharge (DD-214) | DoD/NPRC | **LIMITED** (DPRIS for some) | Manual upload |

**Integration Reality:** All identity documents require manual upload. OCR can extract data, but source APIs don't exist.

### 1.2 Estate Planning Documents

| Document | Source | API Available | Integration Approach |
|----------|--------|---------------|---------------------|
| Last Will & Testament | Decedent's records | **NO** | Manual upload, vault storage |
| Trust Documents | Decedent's records | **NO** | Manual upload |
| Codicils (Will Amendments) | Decedent's records | **NO** | Manual upload |
| Power of Attorney | Decedent's records | **NO** | Manual upload |
| Healthcare Directive | Decedent's records | **NO** | Manual upload |
| Living Will | Decedent's records | **NO** | Manual upload |
| Funeral/Burial Instructions | Decedent's records | **NO** | Manual upload |
| Letter of Instruction | Decedent's records | **NO** | Manual upload |

**Integration Reality:** These are personal documents. No external systems to integrate.

### 1.3 Probate Court Documents

| Document | Filed With | API Available | Integration Approach |
|----------|-----------|---------------|---------------------|
| Petition for Probate | County Probate Court | **VARIES BY STATE** | Template generation, manual filing |
| Letters Testamentary | Probate Court | **NO** | Track status manually |
| Letters of Administration | Probate Court | **NO** | Track status manually |
| Inventory & Appraisal | Probate Court | **NO** | Template generation |
| Creditor Notice | Newspaper + Court | **NO** | Template generation |
| Final Accounting | Probate Court | **NO** | Template generation |
| Distribution Petition | Probate Court | **NO** | Template generation |
| Order of Distribution | Probate Court | **NO** | Track status |
| Estate Closure Documents | Probate Court | **NO** | Template generation |

**E-Filing Status by Launch State:**

| State | E-Filing Available | System | Notes |
|-------|-------------------|--------|-------|
| **Maryland** | ✅ Yes (MDEC) | Tyler Odyssey | Statewide as of May 2024 |
| **DC** | ⚠️ Limited | DC Courts Portal | Probate division has limited e-filing |
| **Virginia** | ⚠️ Partial | VACIS | 35 of 120 circuit courts |
| **Illinois** | ✅ Yes | Multiple systems | Cook County uses eCourt |
| **Minnesota** | ✅ Yes | MNCIS/Odyssey | Statewide |

**Integration Approach:** Build template library for all probate forms. E-filing APIs are proprietary per vendor (Tyler Technologies). No universal API.

### 1.4 Tax Documents

| Document | Filed With | API Available | Integration Approach |
|----------|-----------|---------------|---------------------|
| **Federal Form 706** (Estate Tax) | IRS | **NO** (paper only) | PDF generation, no e-file for 706 |
| **Federal Form 1041** (Estate Income) | IRS | ⚠️ Limited (MeF) | Could integrate, but complex |
| **Final Form 1040** (Decedent's) | IRS | ⚠️ Limited (MeF) | Refer to CPA |
| State Estate Tax Return | State Revenue | **VARIES** | PDF generation |
| State Income Tax (Final) | State Revenue | **VARIES** | Refer to CPA |
| EIN Application (SS-4) | IRS | ✅ Yes | Can apply online |
| Property Tax Records | County Assessor | **NO** | Manual lookup |

**IRS Integration Reality:**
- Form 706 (Estate Tax) **cannot be e-filed**. Must be mailed to IRS Kansas City.
- Form 1041 can be e-filed through Modernized e-File (MeF), but requires becoming an Authorized IRS e-file Provider.
- EFTPS (Electronic Federal Tax Payment System) available for payments.

### 1.5 Financial Account Documents

| Document Type | Source | API Available | Integration Approach |
|---------------|--------|---------------|---------------------|
| Bank Statements | Banks | **Plaid** (read) | Plaid Transactions API |
| Investment Statements | Brokerages | **Plaid** (read) | Plaid Investments API |
| Retirement Account (401k) | Plan Administrators | **NO** | Manual upload, claim forms |
| Pension Statements | Pension Funds | **NO** | Manual upload |
| Life Insurance Policies | Insurance Cos | **NO** | Manual upload, claim forms |
| Annuity Contracts | Insurance Cos | **NO** | Manual upload |
| Mortgage Statements | Lenders | **Plaid** (liabilities) | Plaid Liabilities API |
| Credit Card Statements | Card Issuers | **Plaid** (read) | Plaid Transactions API |
| Loan Documents | Lenders | **Plaid** (liabilities) | Plaid Liabilities API |
| HSA/FSA Accounts | Administrators | **LIMITED** | Some Plaid coverage |
| 529 Plans | Plan Administrators | **LIMITED** | Some Plaid coverage |

**Plaid Capabilities:**
- **Supported:** 12,000+ financial institutions for read access
- **Data Available:** Balances, transactions, holdings, liabilities
- **NOT Supported:** Initiating transfers, closing accounts, claim filing
- **Cost:** $0.30-$1.50 per link/month (varies by product)

### 1.6 Real Property Documents

| Document | Source | API Available | Integration Approach |
|----------|--------|---------------|---------------------|
| Property Deed | County Recorder | **NO** | Manual upload |
| Mortgage Documents | Lender | **Plaid** (partial) | Some data available |
| Title Insurance | Title Company | **NO** | Manual upload |
| Property Tax Bill | County Assessor | **NO** | Manual upload |
| Homeowners Insurance | Insurance Co | **NO** | Manual upload |
| HOA Documents | HOA | **NO** | Manual upload |
| Lease Agreements | Decedent's records | **NO** | Manual upload |
| Vehicle Titles | State DMV | **NO** | Manual upload |

### 1.7 Business Documents (If Applicable)

| Document | Source | API Available | Integration Approach |
|----------|--------|---------------|---------------------|
| Business Formation Docs | Secretary of State | **VARIES** | Some states have APIs |
| Operating Agreement | Business records | **NO** | Manual upload |
| Shareholder Agreement | Business records | **NO** | Manual upload |
| Buy-Sell Agreement | Business records | **NO** | Manual upload |
| Business Tax Returns | Business records | **NO** | Manual upload |
| Business Licenses | Various agencies | **NO** | Manual upload |
| Intellectual Property | USPTO | ✅ Yes (read) | USPTO API for patents/trademarks |

---

## Part 2: Government Agency Integration Analysis

### 2.1 Federal Agencies

| Agency | Purpose | API/Integration | Status | Notes |
|--------|---------|-----------------|--------|-------|
| **Social Security Administration (SSA)** | Death report, benefits stop, survivor benefits | **NO API** | Phone/in-person only | Funeral homes often report automatically |
| **Internal Revenue Service (IRS)** | EIN, final taxes, estate tax | **Limited** | EIN online; Form 706 paper only | EFTPS for payments |
| **Centers for Medicare & Medicaid (CMS)** | Medicare termination | **NO API** | SSA notifies automatically | Part C/D plans need separate notification |
| **Department of Veterans Affairs (VA)** | Benefits stop, burial benefits, survivor benefits | **eBenefits** (limited) | Some online, mostly phone | DD-214 lookup possible |
| **Department of Defense (DFAS)** | Military retirement pay | **NO API** | Phone/mail | myPay for some functions |
| **Office of Personnel Management (OPM)** | Federal employee benefits | **NO API** | Phone/mail | Annuity survivor processing |
| **State Department** | Passport cancellation | **NO API** | Mail | Low priority |
| **Pension Benefit Guaranty Corp (PBGC)** | Terminated pension plans | **NO API** | Phone/mail | Only for failed pension plans |
| **Railroad Retirement Board** | Railroad worker benefits | **NO API** | Phone/mail | Niche |

**Federal Agency Reality:** Zero useful APIs. All require phone, mail, or in-person interaction.

### 2.2 State Agencies (Per Launch State)

#### Maryland
| Agency | Purpose | API/Integration |
|--------|---------|-----------------|
| Register of Wills | Probate filing | **MDEC** (e-filing available) |
| MVA | Vehicle title transfer | **NO API** |
| Comptroller | State taxes | **Limited online** |
| Vital Records | Death certificates | **NO API** |

#### District of Columbia
| Agency | Purpose | API/Integration |
|--------|---------|-----------------|
| Superior Court (Probate) | Probate filing | **Limited e-filing** |
| DMV | Vehicle title transfer | **NO API** |
| Office of Tax & Revenue | DC taxes | **Limited online** |
| Vital Records | Death certificates | **NO API** |

#### Virginia
| Agency | Purpose | API/Integration |
|--------|---------|-----------------|
| Circuit Court (by locality) | Probate filing | **VACIS** (partial coverage) |
| DMV | Vehicle title transfer | **NO API** |
| Dept of Taxation | State taxes | **Limited online** |
| Vital Records | Death certificates | **NO API** |

#### Illinois
| Agency | Purpose | API/Integration |
|--------|---------|-----------------|
| Circuit Court (by county) | Probate filing | **eCourt** (Cook County) |
| Secretary of State | Vehicle title transfer | **NO API** |
| Dept of Revenue | State taxes | **MyTax Illinois** |
| Vital Records | Death certificates | **NO API** |

#### Minnesota
| Agency | Purpose | API/Integration |
|--------|---------|-----------------|
| District Court | Probate filing | **MNCIS** (statewide e-filing) |
| DVS | Vehicle title transfer | **NO API** |
| Dept of Revenue | State taxes | **Limited online** |
| Vital Statistics | Death certificates | **NO API** |

### 2.3 Credit Bureaus

| Bureau | Purpose | API Available | Notes |
|--------|---------|---------------|-------|
| **Equifax** | Credit freeze/alert | ⚠️ Requires certification | Deceased alert program |
| **Experian** | Credit freeze/alert | ⚠️ Requires certification | Deceased reporting |
| **TransUnion** | Credit freeze/alert | ⚠️ Requires certification | Deceased notification |

**Credit Bureau Integration:** Requires becoming a data furnisher or working through a certified provider. Not MVP scope.

---

## Part 3: Financial Institution Integration

### 3.1 Banking & Investments (Plaid)

**What Plaid CAN Do:**
- Account discovery (link accounts)
- Balance retrieval
- Transaction history (up to 24 months)
- Investment holdings
- Liability details (mortgages, loans)
- Asset reports (PDF generation)

**What Plaid CANNOT Do:**
- Close accounts
- Transfer funds (requires separate integration)
- File beneficiary claims
- Submit death certificates
- Initiate wire transfers

**Plaid Coverage:**
- 12,000+ institutions
- ~95% of US banking coverage
- Major brokerages included
- Some retirement plan providers

**Plaid Cost Estimate:**
| Product | Cost | Use Case |
|---------|------|----------|
| Transactions | $0.30/link/month | Account history |
| Investments | $0.50/link/month | Holdings |
| Liabilities | $0.50/link/month | Debts |
| Assets | Variable | Asset reports |
| **Estimated MVP** | **$500-1,500/month** | 1,000-2,000 linked accounts |

### 3.2 Other Financial Aggregators

| Provider | Strengths | Weaknesses | Cost |
|----------|-----------|------------|------|
| **Yodlee** | Large coverage, enterprise | Complex integration | Higher |
| **Finicity** (Mastercard) | Strong verification | Smaller coverage | Mid-range |
| **MX** | Good UX, fast | Smaller coverage | Mid-range |
| **Akoya** | Bank-owned, secure | Limited coverage | Variable |

**Recommendation:** Plaid for MVP due to coverage and documentation quality.

### 3.3 Life Insurance

**No Universal API.** Each carrier has its own claims process.

| Major Carriers | Online Claims | API |
|----------------|---------------|-----|
| MetLife | ✅ Online portal | **NO** |
| Prudential | ✅ Online portal | **NO** |
| Northwestern Mutual | ⚠️ Phone/mail | **NO** |
| New York Life | ✅ Online portal | **NO** |
| State Farm | ✅ Online portal | **NO** |
| Lincoln Financial | ✅ Online portal | **NO** |

**Integration Approach:** Generate claim letters with required information. User files manually.

### 3.4 Retirement Plans

**401(k) Plans:**
- No universal API
- Each plan administrator different
- Fidelity, Vanguard, Schwab, etc. have online portals
- Beneficiary claims always require paper forms + death certificate

**Pension Plans:**
- Entirely paper-based
- No standardization
- Many are with small administrators

**Integration Approach:** Template library for beneficiary claim forms. User files manually.

---

## Part 4: Document Generation & Processing

### 4.1 E-Signature & Notarization

| Service | Capability | API | Cost |
|---------|-----------|-----|------|
| **DocuSeal** | E-signature | ✅ Full API | ~$50/mo (Cloud Run) |
| **OpenSign** | E-signature | ✅ Yes | ~$50/mo (Requires MongoDB) |
| **DocuSign** | E-signature | ✅ Yes | $25-65/user/month |

**Decision:** Use **DocuSeal** (Self-Hosted).
- **Architecture Synergy:** DocuSeal supports **PostgreSQL**. We are already running Cloud SQL (PostgreSQL). OpenSign requires MongoDB, which would add a new database engine and cost.
- **Control:** Data stays in our infrastructure (Cloud SQL/Storage).
- **Cost:** Fixed infrastructure cost vs per-envelope pricing.
- **Licensing:** Open Source.

**Remote Online Notarization (RON) Status by State:**

| State | RON Legal | Notes |
|-------|-----------|-------|
| **Maryland** | ✅ Yes | Permanent legislation |
| **DC** | ✅ Yes | Permanent legislation |
| **Virginia** | ✅ Yes | Pioneer state for RON |
| **Illinois** | ✅ Yes | Permanent legislation |
| **Minnesota** | ✅ Yes | Permanent legislation |

**Note:** Some estate documents (wills) may require in-person notarization depending on state.

### 4.2 Document Processing

| Service | Capability | API | Cost |
|---------|-----------|-----|------|
| **Google Document AI** | OCR, entity extraction | ✅ Full API | $1.50/1000 pages |
| **AWS Textract** | OCR, forms, tables | ✅ Full API | $1.50/1000 pages |
| **Azure Form Recognizer** | OCR, custom models | ✅ Full API | $1.50/1000 pages |
| **ABBYY** | High-accuracy OCR | ✅ API | Higher |

**Recommendation:** Google Document AI (already on GCP).

### 4.3 Certified Mail

| Service | Capability | API | Cost |
|---------|-----------|-----|------|
| **Lob** | Certified mail, tracking | ✅ Full API | $1.50-3.00/letter |
| **Click2Mail** | USPS mail | ✅ API | $1.00-2.50/letter |
| **PostGrid** | Certified mail | ✅ API | $1.50-3.00/letter |

**Lob Capabilities:**
- Address verification
- Certified mail with return receipt
- First class mail
- Tracking integration
- Webhooks for delivery status

**Critical for Estate Settlement:** Many notifications to creditors and institutions MUST be sent via certified mail.

---

## Part 5: State-Specific Requirements

### 5.1 Maryland

**Probate Basics:**
- **Court:** Register of Wills (each county)
- **Timeline:** 12-24 months typical
- **Creditor Period:** 6 months from first publication
- **Small Estate Threshold:** $50,000 (no real property), $100,000 (surviving spouse)

**Required Filings:**
1. Petition for Administration
2. Information Report
3. Inventory (within 90 days)
4. First Administration Account (within 12 months)
5. Final Distribution

**Unique Requirements:**
- Register of Wills (not Probate Court)
- Inheritance tax (collateral heirs: 10%)
- No estate tax (repealed 2019)

**Forms Required:** ~15-20 forms for full administration

### 5.2 District of Columbia

**Probate Basics:**
- **Court:** DC Superior Court, Probate Division
- **Timeline:** 12-18 months typical
- **Creditor Period:** 6 months
- **Small Estate Threshold:** $40,000

**Required Filings:**
1. Petition for Probate
2. Inventory (within 90 days)
3. Account (annually)
4. Final Account

**Unique Requirements:**
- No state inheritance or estate tax
- All probate through DC Superior Court
- Simpler than Maryland

**Forms Required:** ~12-15 forms

### 5.3 Virginia

**Probate Basics:**
- **Court:** Circuit Court (Clerk of Court, each locality)
- **Timeline:** 12-24 months typical
- **Creditor Period:** 1 year from death
- **Small Estate Threshold:** $50,000 (affidavit allowed)

**Required Filings:**
1. Probate of Will
2. Qualification of Executor
3. Inventory (within 4 months)
4. Accounting (within 16 months)
5. Final Distribution

**Unique Requirements:**
- Commissioner of Accounts oversees filings
- No state estate tax
- Separate from Maryland/DC despite proximity

**Forms Required:** ~15-18 forms

### 5.4 Illinois

**Probate Basics:**
- **Court:** Circuit Court, Probate Division (each county)
- **Timeline:** 12-24 months typical
- **Creditor Period:** 6 months from publication
- **Small Estate Threshold:** $100,000 (affidavit)

**Required Filings:**
1. Petition for Letters
2. Inventory (within 60 days)
3. Claims Report
4. Final Account
5. Receipt and Release

**Unique Requirements:**
- Estate tax for estates > $4 million
- Independent administration common
- Cook County has specific rules

**Forms Required:** ~15-20 forms

### 5.5 Minnesota

**Probate Basics:**
- **Court:** District Court (each county)
- **Timeline:** 12-24 months typical
- **Creditor Period:** 4 months
- **Small Estate Threshold:** $75,000 (collection by affidavit)

**Required Filings:**
1. Application for Informal Probate
2. Inventory (within 6 months)
3. Final Account
4. Order for Distribution

**Unique Requirements:**
- Uses Uniform Probate Code (simplified)
- Informal probate available (simpler)
- No state estate tax
- e-Filing statewide (MNCIS)

**Forms Required:** ~10-15 forms (simplest of launch states)

---

## Part 6: Data Architecture & Sequestration

### 6.1 Multi-Tenant Data Isolation

**Requirement:** Each estate's data must be completely isolated from other estates.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FinalWishes Data Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FIRESTORE (NoSQL)                                               │
│  ├── /users/{userId}                                            │
│  │   ├── profile                                                │
│  │   └── settings                                               │
│  │                                                              │
│  ├── /estates/{estateId}                   [TENANT BOUNDARY]    │
│  │   ├── meta (owner, status, state)                           │
│  │   ├── /assets/{assetId}                                     │
│  │   ├── /documents/{docId}                                    │
│  │   ├── /beneficiaries/{benefId}                              │
│  │   ├── /tasks/{taskId}                                       │
│  │   ├── /notifications/{notifId}                              │
│  │   └── /audit/{auditId}                                      │
│  │                                                              │
│  └── Firestore Security Rules enforce tenant isolation         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLOUD SQL (PostgreSQL) - PII VAULT                             │
│  ├── Table: persons                                             │
│  │   ├── estate_id (partition key)         [TENANT BOUNDARY]   │
│  │   ├── ssn (encrypted)                                       │
│  │   ├── date_of_birth (encrypted)                             │
│  │   └── encrypted_fields                                      │
│  │                                                              │
│  ├── Table: financial_accounts                                  │
│  │   ├── estate_id (partition key)         [TENANT BOUNDARY]   │
│  │   ├── account_number (encrypted)                            │
│  │   └── routing_number (encrypted)                            │
│  │                                                              │
│  └── Row-Level Security (RLS) enforces tenant isolation        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLOUD STORAGE (Documents)                                       │
│  ├── Bucket: finalwishes-vault-{env}                            │
│  │   ├── /{estateId}/                      [TENANT BOUNDARY]   │
│  │   │   ├── death-certificates/                               │
│  │   │   ├── wills/                                            │
│  │   │   ├── financial/                                        │
│  │   │   └── generated/                                        │
│  │   │                                                         │
│  │   └── ALL FILES: Client-side AES-256-GCM encryption        │
│  │                                                              │
│  └── Signed URLs for access (estate-scoped)                    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLOUD KMS (Key Management)                                      │
│  ├── Key Ring: finalwishes-{env}                                │
│  │   ├── document-encryption-key (AES-256)                     │
│  │   ├── pii-encryption-key (AES-256)                          │
│  │   └── Automatic rotation (90 days)                          │
│  │                                                              │
│  └── Per-estate key derivation (future)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Firestore Security Rules (Example)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Estate documents - only accessible by authorized roles
    match /estates/{estateId}/{document=**} {
      allow read, write: if isAuthorizedForEstate(estateId);
    }
    
    function isAuthorizedForEstate(estateId) {
      let estate = get(/databases/$(database)/documents/estates/$(estateId));
      let userId = request.auth.uid;
      
      return userId == estate.data.principalId ||
             userId in estate.data.executorIds ||
             userId in estate.data.heirIds;
    }
  }
}
```

### 6.3 Per-Estate Encryption (Future Enhancement)

For maximum isolation, each estate could have its own derived encryption key:

```go
// Key derivation for per-estate encryption
func DeriveEstateKey(masterKey []byte, estateID string) ([]byte, error) {
    // HKDF to derive estate-specific key from master
    hkdf := hkdf.New(sha256.New, masterKey, []byte(estateID), []byte("estate-encryption"))
    estateKey := make([]byte, 32) // AES-256
    _, err := io.ReadFull(hkdf, estateKey)
    return estateKey, err
}
```

This ensures that even a database breach doesn't expose all estates' data with a single key.

---

## Part 7: Scope Assessment & Recommendations

### 7.1 What CAN Be Automated (MVP)

| Capability | Effort | Value |
|------------|--------|-------|
| Document vault (upload, organize, encrypt) | Low | High |
| Asset inventory tracking | Low | High |
| Beneficiary management | Low | High |
| State-specific form generation (PDF) | Medium | High |
| Probate timeline/checklist guidance | Medium | High |
| Institution notification letter generation | Medium | High |
| Certified mail via Lob | Low | Medium |
| Account discovery via Plaid | Medium | Medium |
| Progress tracking dashboard | Low | High |
| Multi-executor collaboration | Medium | High |
| Audit trail logging | Low | High (compliance) |

### 7.2 What CANNOT Be Automated (Requires Human Action)

| Task | Reason |
|------|--------|
| Death certificate ordering | State vital records - no API |
| Social Security notification | Phone/in-person only |
| Court filings (most states) | Paper or proprietary e-file systems |
| Bank account closures | Requires in-branch or phone |
| Life insurance claims | Each carrier different |
| 401k/pension claims | Paper forms required |
| Real property title transfer | County recorder - no API |
| Vehicle title transfer | DMV - no API |
| Credit bureau deceased alert | Requires certification |
| IRS Form 706 filing | Paper only |

### 7.3 Full Scope for $95K / 5 Months

**INCLUDED IN INITIAL RELEASE:**

1. **Core Platform**
   - User authentication (Firebase Auth + MFA)
   - Estate management (CRUD)
   - Asset inventory
   - Document vault (encrypted)
   - Beneficiary tracking
   - Multi-user roles (Principal, Executor, Heir)

2. **Guidance System (The Shepherd)**
   - State-specific probate checklists (5 states)
   - Form template library (~75 forms total)
   - Timeline guidance per state
   - Task tracking
   - **Every step mapped** - manual or automated

3. **Document Generation & Connectors**
   - Notification letter templates
   - Court form auto-fill (PDF)
   - Certified mail via Lob
   - **For states with e-filing:** Guide through their systems (MD, IL, MN)
   - Certified mail via Lob

5. **Full Integrations (Day One)**
   - Plaid for account discovery (all products)
   - **DocuSeal** for e-signature (Self-hosted)
   - Lob for certified mail automation
   - SendGrid for email
   - **Vertex AI (Gemini 3.0)** for intelligent process guidance

5. **Mobile Apps**
   - React Native iOS + Android
   - Document camera capture
   - Full vault access
   - Push notifications

6. **Innovation: Connector Strategy**
   - DC: Build complete connector (limited e-filing)
   - Virginia: Build connector (35 of 120 courts have e-filing)
   - Paper forms digitized → auto-filled → print-ready output
   - Position as benchmark for state adoption

**FUTURE EXPANSION (Post-Launch):**

| Feature | Reason | Target |
|---------|--------|--------|
| Additional states (45) | Research/legal review per state | v1.1+ |
| Credit bureau integration | Certification process | v1.2 |
| Court e-filing API partnerships | Business development | v1.3 |
| Tax software integration | Partnership required | v1.3 |

### 7.4 Cost Impact Analysis

**Original $95K Budget Breakdown:**

| Category | Allocated | Still Achievable |
|----------|-----------|------------------|
| AI Tools (Claude, Cursor, etc.) | $4,295 | ✅ Yes |
| Cloud Infrastructure | $5,500 | ✅ Yes |
| Third-party Services | $4,225 | ⚠️ Tight |
| Security/Compliance | $30,000 | ✅ Yes |
| LLM Knowledge Base | $13,000 | ✅ Yes |
| Contingency | $20,000 | ⚠️ May need |

**Additional Costs Identified:**

| Item | Cost | When |
|------|------|------|
| Plaid (MVP tier) | $500-1,000/month | Month 3+ |
| Lob (certified mail) | $1-3/letter | Post-launch |
| DocuSign API | $25-65/user/month | Month 4+ |
| Legal review (forms) | $5,000-10,000 | Month 2-4 |
| Penetration test | $8,000-15,000 | Month 5 |

**Revised Total:** $95K is achievable IF:
1. Plaid integration is minimal (account viewing only)
2. Legal review uses contingency budget
3. Pen test stays at lower end ($8K)
4. No scope creep

### 7.5 Timeline Feasibility

**5 Months is ACHIEVABLE for MVP scope defined above.**

**NOT achievable in 5 months:**
- Full 50-state coverage
- Direct court e-filing
- Financial institution integrations beyond Plaid read
- Credit bureau integration
- Tax software integration

---

## Part 8: Decision & Recommendations

### 8.1 Decision: Full Platform with Connector Innovation

**FinalWishes will be a complete estate settlement platform that builds connectors where none exist.**

The competitive moat is:
1. **State-specific expertise** (5 states at launch, expandable)
2. **Form template library** (~75 forms, professionally researched)
3. **Connector strategy** (we build what government doesn't provide)
4. **Progress tracking** (visibility into 18-month process)
5. **Certified mail automation** (Lob)
6. **Full financial discovery** (Plaid)
7. **Secure document vault** (zero-knowledge)

### 8.2 Integration Tiers

**Tier 1 (MVP - Included):**
- Firebase Authentication
- Cloud Storage (documents)
- Plaid (basic account view)
- Lob (certified mail)
- SendGrid (email)
- Google Document AI (OCR)

**Tier 2 (v1.1 - Post-MVP):**
- Full Plaid products
- DocuSign Notary
- Additional state templates

**Tier 3 (v1.2+):**
- Credit bureau integration
- Court e-filing (state by state)
- Tax software partnerships

### 8.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Legal review delays | Medium | High | Start Week 1, parallelize |
| Plaid integration complexity | Low | Medium | Use sandbox extensively |
| State form accuracy | Medium | High | Legal review mandatory |
| User expectations vs. reality | High | Medium | Clear messaging on manual steps |
| Cost overrun | Medium | Medium | Weekly budget tracking |

---

## Summary

**Can we build a functional estate settlement platform for $95K in 5 months?**

**YES**, but with clear scope boundaries:

✅ **What we CAN deliver:**
- Secure document vault
- Asset inventory
- State-specific guidance (5 states)
- Form generation
- Progress tracking
- Certified mail automation
- Basic account discovery
- Mobile apps

❌ **What we CANNOT deliver in MVP:**
- Direct government API integrations (don't exist)
- Automatic account closures
- Court e-filing (proprietary systems)
- Full financial aggregation
- 50-state coverage

**The honest reality:** Estate settlement is fundamentally a paper-based process in 2025. Our value is reducing the cognitive load and organizing the chaos—not replacing human interaction with institutions.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-05 | Claude (AI Stack Leader) | Initial external integration analysis |
| 2.0.0 | 2025-12-05 | Claude | Updated integration strategy |
| 3.0.0 | 2025-12-11 | MyShepherd Team | Implementation Plan: OpenSign, Gemini 2.0, 3-State Scope |
| **4.0.0** | **2025-12-11** | **MyShepherd Team** | **Refinement: Gemini 3.0 & DocuSeal (PostgreSQL)** |

---

## Approval

**Status:** PROPOSED - Requires Business Stakeholder Review

This ADR requires review and approval before proceeding with implementation. Key questions for stakeholders:

1. Is the scoped MVP acceptable given integration limitations?
2. Should budget be increased for legal form review?
3. What is the priority order for post-MVP integrations?
4. Is messaging clear that many steps require manual user action?

**Next Steps:**
1. Stakeholder review
2. Legal engagement for form templates
3. Update PROJECT_SCOPE.md if approved
4. Begin implementation
