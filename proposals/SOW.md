# Statement of Work (SOW)
**Project Name:** MyShepherd Platform Development  
**SOW Reference:** SOW-2025-001  
**Associated MSA:** MSA-2025-111-FW  
**Date:** December 11, 2025  

---

## 1. Executive Overview

This Statement of Work ("SOW") outlines the specific scope, schedule, and deliverables for the development of the **MyShepherd / FinalWishes Estate Operating System**.

**Objective:** To build and launch a SOC 2-ready, AI-assisted estate settlement platform serving Web, iOS, and Android users across three launch states (MD, IL, MN).

**Engagement Term:** 20 Weeks (5 Months)  
**Total Contract Value:** $95,000 USD  
**Development Method:** AI-Assisted Agile (Gemini 3.0 + 111 Venture Studio Team)

---

## 2. Resource Plan & Roles

The following key personnel are assigned to this project:

| Role | Responsibility | Est. Hours |
| :--- | :--- | :--- |
| **Lead Architect (Human)** | System design, code review, security audits, final sign-off. | 120 hrs |
| **Product Manager (Human)** | Scope management, acceptance testing, stakeholder comms. | 80 hrs |
| **AI Stack Leader (Claude)** | Full-stack implementation, test generation, documentation. | Continuous |
| **DevOps Agent** | CI/CD pipeline, infrastructure management, monitoring. | Continuous |
| **QA Agent** | Automated regression testing, E2E test scripts. | Continuous |

---

## 3. Work Breakdown Structure (WBS)

### **PHASE 1: FOUNDATION & VAULT ARCHITECTURE**
**Duration:** Weeks 1-4  
**Focus:** Infrastructure, Security, Auth, Data Sovereignty

| Task ID | Task Description | Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **1.1** | **GCP Infrastructure Setup**<br>Provision Cloud Run, Cloud SQL (PostgreSQL), Firestore, VPC, Cloud Armor. | Architect | Terraform Scripts |
| **1.2** | **Repo & CI/CD Pipeline**<br>Setup GitHub Actions for dual deployment (API + Web). Linting/Security scan gates. | DevOps | `git` workflows |
| **1.3** | **Identity & Auth System**<br>Implement Firebase Auth, Custom Claims (Principal/Executor), MFA flows. | AI Leader | Auth Service API |
| **1.4** | **Database Schema Design**<br>Design SQL Relational models (Heirs, Assets) and NoSQL Document stores. | Architect | `schema.sql` |
| **1.5** | **The Vault (Core)**<br>Encryption service (Cloud KMS integration). AES-256 logic for file uploads. | AI Leader | `pkg/crypto` |
| **1.6** | **Initial Frontend Scaffold**<br>React + Vite setup. Install "Royal Neo-Deco" Design System / Tailwind theme. | AI Leader | `web/` initialized |
| **1.7** | **DocuSeal Self-Hosting**<br>Deploy DocuSeal container to Cloud Run. Configure SQL storage. | DevOps | DocuSeal Instance |

**Deliverable D1:** "Walking Skeleton" – Valid login, encrypted file upload/download, deployed to Staging.

---

### **PHASE 2: CORE ESTATE LOGIC & AI GUIDANCE**
**Duration:** Weeks 5-10  
**Focus:** Probate Engine, Gemini Integration, Intake Flows

| Task ID | Task Description | Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **2.1** | **Asset Inventory Module**<br>CRUD for Financial, Real Estate, Digital assets. Plaid Link scaffolding. | AI Leader | Asset API + UI |
| **2.2** | **Probate State Machine (MD)**<br>Encode Maryland probate rules/deadlines into Logic Engine. | Architect | `pkg/probate/md` |
| **2.3** | **Probate State Machine (IL)**<br>Encode Illinois probate rules/deadlines into Logic Engine. | Architect | `pkg/probate/il` |
| **2.4** | **Probate State Machine (MN)**<br>Encode Minnesota probate rules/deadlines into Logic Engine. | Architect | `pkg/probate/mn` |
| **2.5** | **Gemini Context Engine**<br>Build RAG pipeline manually feeding State Law context to Gemini 3.0. | AI Leader | AI Chatbot API |
| **2.6** | **Document Generator**<br>PDF generation service (Go). Map database fields to Court Forms. | AI Leader | PDF Gen Service |
| **2.7** | **E-Sign Workflow**<br>Integration with DocuSeal API. Trigger signature requests from Intake. | AI Leader | Sign Flow UI |

**Deliverable D2:** Alpha Release – End-to-end flow for a Maryland estate (Intake -> Auto-fill Form -> E-Sign).

---

### **PHASE 3: MOBILE & DEEP INTEGRATIONS**
**Duration:** Weeks 11-16  
**Focus:** Native Experience, External APIs

| Task ID | Task Description | Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **3.1** | **React Native Shell**<br>Initialize Expo project. Configure Native Navigation. Share Logic layer. | AI Leader | `mobile/` init |
| **3.2** | **Mobile Auth & Bio**<br>Implement FaceID/TouchID integration for login. | AI Leader | Bio-Auth screen |
| **3.3** | **Document Scanner**<br>Native Camera implementation with edge detection for receipt scanning. | AI Leader | Scan Component |
| **3.4** | **Plaid Integration**<br>Full Plaid API connection. Webhook handling for balance updates. | Backend | Banking Sync |
| **3.5** | **Lob Integration**<br>Address verification API + Snail Mail printing trigger logic. | Backend | Mail Service |
| **3.6** | **Offline Sync Engine**<br>Local SQLite cache for mobile. Sync logic for reliable uploads. | Architect | Sync Protocol |

**Deliverable D3:** Beta Release – Feature parity on Web & Mobile. Beta Testers invited.

---

### **PHASE 4: AUDIT, SECURITY & LAUNCH**
**Duration:** Weeks 17-20  
**Focus:** Hardening, Compliance, Polish

| Task ID | Task Description | Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **4.1** | **Penetration Testing**<br>Coordinate with 3rd party vendor. Remediate findings. | Architect | Security Report |
| **4.2** | **SOC 2 Evidence**<br>Configure Cloud Logging/Audit trails. Generate compliance artifacts. | DevOps | Compliance Pack |
| **4.3** | **Load Testing**<br>k6 script generation. Stress test API to 1000 concurrent users. | QA Agent | Load Report |
| **4.4** | **App Store Submission**<br>Prepare screenshots, metadata, privacy policy links. Submit for review. | PM | Store Listings |
| **4.5** | **Production Migration**<br>Final DB migration scripts. DNS switchover. | DevOps | Live Site |

**Deliverable D4:** Gold Master – Production Launch.

---

## 4. Acceptance Criteria

Client shall evaluate Deliverables based on the following criteria:

1.  **Functional Correctness:** Feature performs exactly as described in User Stories.
2.  **Code Quality:** Pass linting (golangci-lint, eslint), 0 Critical Vulnerabilities.
3.  **Performance:** API P95 latency < 200ms. LH Score > 90.
4.  **Design:** Pixel-perfect match to "Royal Neo-Deco" Figma/CSS tokens.

---

## 5. Assumptions & Dependencies

*   Client will provide Apple Developer & Google Play Console accounts by Week 10.
*   Client legal counsel will validate final text of generated Court Forms.
*   "Launch States" are strictly MD, IL, and MN for V1.
*   Third-party API costs (Plaid, Lob, OpenAI/Google) are billed directly to Client.

---

## 6. Signatures

**Client:** _______________________  **Date:** ___________  
**Provider:** _______________________  **Date:** ___________
