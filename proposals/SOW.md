# Statement of Work (SOW)

**Project Name:** MyShepherd Platform Development  
**SOW Reference:** SOW-2025-001  
**Associated MSA:** MSA-2025-111-FW  
**Date:** December 11, 2025  

---

## 1. Executive Overview

This Statement of Work ("SOW") defines the comprehensive scope for the **MyShepherd / FinalWishes Estate Operating System**. This project aims to digitize and automate the estate settlement process, focusing on "Launch States" (Maryland, Illinois, Minnesota) where electronic filing or substantial digitization is possible.

**Objective:** deliver a "Vault-Grade" secure platform that guides users through the 18+ month probate process, automating form generation, asset discovery, and stakeholder communication.

---

## 2. Detailed Scope of Services

### 2.1 Core Vault & Data Architecture
Provider shall implement a **Multi-Tenant, Zero-Knowledge** architecture to ensure total data privacy.
*   **Storage Layer:** Hybrid approach using **Cloud SQL (PostgreSQL)** for structured PII (Encrypted) and **Firestore** for real-time document metadata.
*   **File Vault:** **Cloud Storage** buckets with per-tenant isolation boundaries. All files encrypted at rest using **Cloud KMS** (AES-256).
*   **Security:** Implementation of **SOC 2 Type II** controls, including strict IAM roles, audit logging, and encryption in transit (TLS 1.3).

### 2.2 Document Inventory & Automation Scope
Provider will build automation or manual guidance paths for the following specific document categories:

**A. Identity & Vital Records**
*   **Death Certificate:** Manual upload/OCR processing (No State API exists).
*   **Social Security/Gov ID:** Secure entry & validation.

**B. Probate Court Filings (Launch States)**
*   **Maryland:** Integration/Guidance for **MDEC** (Tyler Odyssey) system. Template generation for Petition for Administration, Inventory, and Accounts.
*   **Illinois:** Guidance for **eCourt** (Cook County) and standard circuit court forms.
*   **Minnesota:** Full guidance for **MNCIS** statewide e-filing system.
*   *Note: Where API filing is unavailable, the Platform will generate "Ready-to-Print" PDF packages.*

**C. Financial & Asset Documents**
*   **Asset Discovery:** Integration of **Plaid** for retrieving balances, transactions, and liabilities from 12,000+ financial institutions.
*   **Life Insurance/Retirement:** Generation of standard "Notice of Death & Claim" letters for major carriers (MetLife, Prudential, etc.).
*   **Real Estate:** Manual inventory tracking with integration to Zillow/Redfin APIs for valuation estimates (where available).

### 2.3 System Integrations
Provider shall integrate the following third-party services to achieve automation:

| Service | Purpose | Integration Level |
| :--- | :--- | :--- |
| **Plaid** | Financial Account Linking | **Deep Integration** (Transactions, Liabilities, Investments) |
| **DocuSeal** | E-Signatures | **Self-Hosted** (Full API, embedded signing) |
| **Lob** | Certified Mail / Physical Letters | **API Triggered** (Address verification, tracking) |
| **SendGrid** | Transactional Email | **API Triggered** (Notifications, summaries) |
| **Google Document AI** | OCR / Data Extraction | **API Integrated** (Receipts, Forms) |
| **Vertex AI (Gemini)** | Process Guidance | **Context-Aware** (RAG pipeline on Probate Code) |

### 2.4 "The Shepherd" Guidance Engine
Provider shall build a logic engine ("The Shepherd") that:
1.  **Ingests State Laws:** Encodes probate timing rules for MD, IL, and MN.
2.  **Generates Timeline:** Creates a dynamic, 18-month Gantt chart for the Executor.
3.  **Proactive Alerts:** Notifies users of upcoming court deadlines (Inventory due in 90 days, Taxes due in 9 mo).
4.  **AI Assistance:** Uses Gemini 3.0 to answer context-specific questions (e.g., "Is this expense deductible in Maryland?").

---

## 3. Work Breakdown Structure (WBS)

### **PHASE 1: FOUNDATION & VAULT ARCHITECTURE (Weeks 1-4)**
*   **1.1 GCP Infrastructure:** Provision Cloud Run, Cloud SQL, Firestore, VPC, Cloud Armor.
*   **1.2 Ops:** Setup GitHub Actions CI/CD.
*   **1.3 Auth:** Firebase Auth + MFA + Custom Claims.
*   **1.4 Schema:** Design Relational (Heirs) vs Document (Metadata) schemas.
*   **1.5 Vault:** Implement AES-256 crypto service and Signed URL logic.
*   **1.6 Web:** React + Vite + "Royal Neo-Deco" Design System.
*   **1.7 E-Sign:** Deploy Self-Hosted DocuSeal.

### **PHASE 2: CORE LOGIC & STATE ENGINES (Weeks 5-10)**
*   **2.1 Asset Module:** Plaid Link integration & manual asset overrides.
*   **2.2 Maryland Engine:** Encode MD Register of Wills rules & forms.
*   **2.3 Illinois Engine:** Encode IL Probate Division rules.
*   **2.4 Minnesota Engine:** Encode MN District Court rules.
*   **2.5 Gemini RAG:** Build vector store for legal context.
*   **2.6 PDF Service:** Go-based PDF stamper for court forms.

### **PHASE 3: MOBILE & DEEP INTEGRATIONS (Weeks 11-16)**
*   **3.1 Mobile:** React Native Expo shell (iOS/Android).
*   **3.2 Bio-Auth:** FaceID/TouchID wrapper.
*   **3.3 Scanner:** Native camera module for receipt capture.
*   **3.4 Plaid/Lob:** Full webhook handling and mail trigger logic.
*   **3.5 Offline:** SQLite sync engine for mobile resilience.

### **PHASE 4: AUDIT, SECURITY & LAUNCH (Weeks 17-20)**
*   **4.1 Pen Test:** Third-party security audit & remediation.
*   **4.2 Compliance:** SOC 2 evidence collection (logging, access controls).
*   **4.3 Load Test:** Stress testing (k6) to 1,000 concurrent users.
*   **4.4 Store Launch:** App Store & Play Store submission.
*   **4.5 Go-Live:** DNS switchover and Production migration.

---

## 4. Deliverables

| Deliverable | Description | Format |
| :--- | :--- | :--- |
| **D1: The Vault** | Security core, Auth, Encrypted Storage | Staging URL |
| **D2: State Engines** | Form generation for MD, IL, MN | API + UI |
| **D3: Mobile Apps** | iOS and Android binaries (TestFlight) | .ipa / .apk |
| **D4: The Platform** | Production release, fully tested | Live URL |
| **D5: Documentation** | API Specs, Admin Guide, Compliance Pack | PDF / Markdown |

---

## 5. Assumptions

1.  **Launch States Only:** Logic is strictly limited to Maryland, Illinois, and Minnesota for V1.
2.  **No Legal Advice:** The "Shepherd" provides procedural guidance, not legal advice. Disclaimer implementation is mandatory.
3.  **Third-Party Costs:** Client pays direct consumption costs for Plaid, Lob, and Cloud IDs.
4.  **Content:** Client is responsible for final validation of court form templates.

---

## 6. Signatures

**Client:** _______________________  **Date:** ___________  
**Provider:** _______________________  **Date:** ___________
