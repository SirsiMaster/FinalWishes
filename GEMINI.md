# GEMINI.md
**Operational Directive for Gemini Agent (FinalWishes)**
**Version:** 1.1.0 (Secure Enclave Hardened)
**Date:** March 18, 2026

---

## 0. Identity
This is the **FinalWishes** repository — "The Estate Operating System."
An AI-powered estate planning and settlement platform that helps families organize assets, documents, and beneficiary designations.

- **GitHub**: `https://github.com/SirsiMaster/FinalWishes`
- **Local Path**: `/Users/thekryptodragon/Development/FinalWishes`

**This repo is NOT SirsiNexusApp. This repo is NOT Assiduous.**
Rules, design tokens, and stack decisions from other repositories do NOT apply here unless explicitly imported from the Universal Rules (§1).

---

## 1. Universal Rules (Apply to ALL Sirsi Portfolio Repos)

> These rules are inherited from the Sirsi Portfolio Standard and are identical across every repo.

0.  **Minimal Code** (Rule 0): Write the smallest amount of clean, correct code per page/file. If you're layering fixes on top of hacks, **DELETE AND REWRITE**. Band-aids are technical debt. Simplicity is non-negotiable.
1.  **Challenge, Don't Just Please**: If a user request is suboptimal, dangerous, or regressive, you MUST challenge it. Provide the "Better Way" before executing the "Requested Way".
2.  **Critical Analysis First**: Before writing a line of code, analyze the *Architecture*, *Security*, and *Business* impact.
3.  **Solve the "How"**: The user provides the "What". You own the "How". Do not ask for permission on trivial implementation details; use your expertise.
4.  **Agentic Ownership**: You are responsible for the entire lifecycle of a task: Plan -> Build -> Verify -> Document.
5.  **Sirsi First (Rule 1)**: Before building, check if it exists in the Sirsi UCS (Universal Component System) component library. We build assets, not disposable code.
6.  **Implement, Don't Instruct (Rule 2)**: Build working code end-to-end. No "here's how to set it up" responses.
7.  **Test in Browser (Rule 3)**: Verify zero errors in DevTools. If you haven't verified it technically, it's not done.
8.  **Follow the Pipeline (Rule 4)**: Local -> GitHub -> Production. Never skip CI/CD.
9.  **Always Push & Verify (Rule 5)**: ALWAYS push changes to production via git. Verify the push status immediately.
10. **ADRs are Mandatory (Rule 8)**: Every significant decision requires an Architecture Decision Record.
11. **Do No Harm (Rule 14)**: You MUST NOT break any working process. A regression is worse than a missing feature.
12. **Additive-Only Changes (Rule 15)**: You may ADD or IMPROVE functionality, but MUST NOT recode any page in a way that disrupts the current working state.
13. **Mandatory Canon Review (Rule 16)**: Before writing code, re-read this file, relevant ADRs, and the files you intend to modify.
14. **Sprint Planning is Mandatory (Rule 17)**: Before ANY code change, present a detailed sprint plan. No code is written until the USER approves.
15. **Living Canon (Rule 18)**: These canonical documents are living documents. When new rules emerge, they MUST be codified immediately.
16. **Identity Integrity (Rule 19)**: All GitHub and Firebase identities MUST use the `SirsiMaster` account exclusively.

## 2. FinalWishes-Specific Rules

*   **Full Fidelity for Legal Documents (Rule 9)**: You are **NOT** permitted to abridge, truncate, summarize, or otherwise shorten any element of the Contracts, SOW, MSA, or Proposals. All approved legal language MUST be displayed and printed in full.
*   **Dynamic Financial Integrity (Rule 12)**: Hardcoded financial values in legal documents or UI are strictly prohibited. All pricing, discounts, and valuations MUST be computed dynamically.
*   **Standardized Valuations (Rule 13)**: The "Sirsi Multiplier" for market valuation realization: **Internal Rate: $125/hr**, **Blended Market Rate: $250/hr** (2.0x Valuation Factor).
*   **Secure Enclave Dashboard Standard (Rule 25/ADR-031)**: All dashboard routes must use session-based estate identification (the "Secure Shroud"). URL-based slugs for sensitive data are strictly prohibited. 
*   **PII/HIPAA Siloing (Rule 26)**: Raw PII, HIPAA, or PCI DSS data MUST NEVER be exposed in public-facing state, URLs, or client-side telemetry. Use anonymized Shard Aliases (e.g., `Enclave-XXXX`) for all logging.
*   **Royal Neo-Deco Fidelity (Rule 27)**: Dashboard components must adhere to 24px/32px rounded glass cards, Royal Blue headers (`#133378`), and Metallic Gold accents (`#C8A951`). Slate/Grey text is strictly forbidden for primary and secondary content.
*   **Launch Scope**: Maryland, Illinois, Minnesota (Priority). DC/VA deferred.

## 3. Technology Stack (FinalWishes)

| Layer | Technology | Decision |
| :--- | :--- | :--- |
| **Web** | **React 18 + Vite** | TailwindCSS, Glassmorphism, Zustand |
| **Mobile** | **React Native + Expo** | iOS/Android, shared logic with Web |
| **Backend** | **Go (Golang)** | Cloud Run, **gRPC + Protobuf** |
| **Database** | **Cloud SQL + Firestore** | Hybrid: SQL for PII/Vault, NoSQL for real-time |
| **Auth** | **Firebase Auth** | MFA (TOTP) Required |
| **Security** | **SOC 2 + KMS** | Software Keys, AES-256 |
| **AI** | **Gemini (Vertex AI)** | The "Guidance Engine" |
| **E-Sign** | **Sirsi Sign** (consumed as service) | Via gRPC/API from SirsiNexusApp |
| **Payments** | **Sirsi Sign → Stripe** | Payment rails via Sirsi Sign component |

## 4. Design System: "Royal Neo-Deco"
*   **Aesthetic**: "Opulent, Permanent, Guardian-Like"
*   **Derived From**: Swiss Neo-Deco (SirsiNexusApp parent design) — same structural patterns, different color palette
*   **Colors**:
    *   Background: Deep Royal Blue Gradient (NOT black, NOT emerald).
    *   Primary Accent: **Royal Blue** (`#1E3A5F`, `#2563EB`) — this is what differentiates FinalWishes from Sirsi's emerald.
    *   Secondary Accent: Solid Metallic Gold (`#C8A951`). NO gradients on buttons.
    *   Success: Green indicators where needed.
*   **Typography**:
    *   Headings: `Cinzel` (Serif, Uppercase tracking)
    *   Body: `Inter` (Sans-serif, clean)
*   **Components**: Glass panels, Gold borders, Film grain overlay.

> ⚠️ **FIREWALL**: Royal Neo-Deco is EXCLUSIVE to FinalWishes. Sirsi brand uses **Emerald + Gold** (Swiss Neo-Deco). Never apply Emerald as primary accent here — that's the Sirsi brand, not FinalWishes.

## 5. Architecture Rules
*   **The Vault Concept**: All sensitive documents are stored in Cloud Storage with metadata in Cloud SQL. We do not just "store files"; we "maintain legal evidence".
*   **Defense in Depth**: Security is not an afterthought. Every API endpoint must have AuthZ checks. PII is always encrypted at rest.
*   **Sirsi Sign Integration**: FinalWishes consumes Sirsi Sign (from SirsiNexusApp) as a service for contract signing, payment processing, and catalog management. FinalWishes does NOT contain its own signing or payment infrastructure.
*   **UCS Components**: Shared UI components are imported from the Sirsi UCS (`SirsiNexusApp/packages/sirsi-ui/`). FinalWishes may contribute components back to UCS.

## 6. Canonical Documents (FinalWishes)
These documents are the source of truth for this repo:

### 🏛 The Financial Trinity (3)
1.  `proposals/CONTRACT.md`
2.  `proposals/SOW.md`
3.  `proposals/COST_PROPOSAL.md`

### 📋 Governance (2)
4.  `GEMINI.md` (this file)
5.  `docs/PROJECT_SCOPE.md`

### 🏗 Architecture & Design (4)
6.  `docs/ARCHITECTURE_DESIGN.md`
7.  `docs/TECHNICAL_DESIGN.md`
8.  `docs/DATA_MODEL.md`
9.  `docs/API_SPECIFICATION.md`

### ⚖️ Compliance & Security (3)
10. `docs/SECURITY_COMPLIANCE.md`
11. `docs/RISK_MANAGEMENT.md`
12. `docs/QA_PLAN.md`

### 🔬 Requirements (3)
13. `docs/REQUIREMENTS_SPECIFICATION.md`
14. `docs/USER_STORIES.md`
15. `docs/MARKET_JUSTIFICATION.md`

### 🚀 Operations (5)
16. `docs/DEPLOYMENT_GUIDE.md`
17. `docs/MAINTENANCE_SUPPORT.md`
18. `docs/CHANGE_MANAGEMENT.md`
19. `docs/TEST_PLAN.md`
20. `docs/TRAINING_DOCUMENTATION.md`

### 🧠 Knowledge (3)
21. `docs/ADR-INDEX.md`
22. `docs/ADR-TEMPLATE.md`
23. `docs/POST_IMPLEMENTATION_REVIEW.md`

## 7. Interaction Protocol
*   **User**: "I want X."
*   **Gemini Response**: "I see you want X. However, analyzing the ADRs, Y might be better because [Reason]. Should we do Y?"
*   **Artifacts**: Use `implementation_plan.md` to structure complex thought.

## 8. Agent Capabilities
*   **CLI Access**: Full CLI access to GitHub and Firebase.
*   **Push Protocol**: ALWAYS run `git status` -> `git add` -> `git commit` -> `git push`.
*   **Identity**: `SirsiMaster` account exclusively.
*   **Browser Profile (Rule 28)**: ALL browser subagent work MUST execute in the **`ccollymo@alumni.chicagobooth.edu`** Chrome profile. No exceptions. Every browser_subagent task prompt MUST include instructions to use this profile. See `.agent/workflows/browser-testing.md` for full protocol.

## 9. Shared Services Map
| Service | Provider | Repo |
| :--- | :--- | :--- |
| E-Signing | Sirsi Sign (OpenSign) | SirsiNexusApp |
| Payments | Sirsi Sign (Stripe) | SirsiNexusApp |
| UI Components | Sirsi UCS | SirsiNexusApp/packages/sirsi-ui |
| Auth | Firebase Auth | Configured per-repo |
| Email | SendGrid | Configured per-repo |

## 10. Test Credentials
*   **Name**: Cylton Collymore
*   **Email**: cylton@sirsi.ai

---
**Signed,**
**Antigravity (The Agent)**
