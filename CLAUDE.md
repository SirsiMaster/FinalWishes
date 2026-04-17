# CLAUDE.md
**Operational Directive for Claude Agent (FinalWishes)**
**Version:** 2.0.0 (Stack Consolidation)
**Date:** April 7, 2026

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
17. **Deity Registry (Rule A25)**: Deity glyphs, domains, and functions are defined in `docs/DEITY_REGISTRY.md` and are invariant across all repos. Ma'at (`𓆄`) owns all quality gates. The ProtectGlyph (`𓂀`) is Ra's exclusive window-protection authority. No deity may be renamed or reassigned per-repo.

## 2. FinalWishes-Specific Rules

*   **Full Fidelity for Legal Documents (Rule 9)**: You are **NOT** permitted to abridge, truncate, summarize, or otherwise shorten any element of the Contracts, SOW, MSA, or Proposals. All approved legal language MUST be displayed and printed in full.
*   **Dynamic Financial Integrity (Rule 12)**: Hardcoded financial values in legal documents or UI are strictly prohibited. All pricing, discounts, and valuations MUST be computed dynamically.
*   **Standardized Valuations (Rule 13)**: The "Sirsi Multiplier" for market valuation realization: **Internal Rate: $125/hr**, **Blended Market Rate: $250/hr** (2.0x Valuation Factor).
*   **Secure Enclave Dashboard Standard (Rule 25/ADR-031)**: All dashboard routes must use session-based estate identification (the "Secure Shroud"). URL-based slugs for sensitive data are strictly prohibited. 
*   **PII/HIPAA Siloing (Rule 26)**: Raw PII, HIPAA, or PCI DSS data MUST NEVER be exposed in public-facing state, URLs, or client-side telemetry. Use anonymized Shard Aliases (e.g., `Enclave-XXXX`) for all logging.
*   **Royal Neo-Deco Fidelity (Rule 27)**: Dashboard components must adhere to 24px/32px rounded glass cards, Royal Blue headers (`#133378`), and Metallic Gold accents (`#C8A951`). Slate/Grey text is strictly forbidden for primary and secondary content.
*   **Launch Scope**: Maryland, Illinois, Minnesota (Priority). DC/VA deferred.
*   **Commit Traceability Protocol (Rule 29)**: Every commit MUST be cross-referenced to the relevant:
    1.  **Canon Document** — Which document(s) from §6 does this change relate to?
    2.  **Version** — What version does this bump? (SemVer: patch/minor/major)
    3.  **Changelog** — An entry MUST be added to `CHANGELOG.md` for every commit.
    4.  **Diagram** — Which workflow diagram(s) in `docs/IDENTITY-WORKFLOW-DIAGRAMS.md` (or other diagram docs) are affected? Update them if the flow changes.
    5.  **ADR** — Which Architecture Decision Record governs this change? If none exists, determine if one is needed.
    
    Commit messages MUST include a `Refs:` footer linking to at least the canon doc and ADR. Example:
    ```
    feat(vault): Add document upload API
    
    Refs: ARCHITECTURE_DESIGN.md, ADR-012
    Changelog: v0.4.0 — Document upload via Cloud Storage
    Diagrams: §8 (Firestore Data Flow) updated
    ```
    
    This ensures every line of code is traceable to a decision, documented for users, and visualized in the architecture. **No orphan commits.**

*   **Feature Documentation Protocol (Rule 30)**: Every feature, component, or code module MUST have:
    1.  **User-Facing "How To"** — Written in `docs/user-guides/` in plain language. Explains what the feature does, how to use it, and what to expect. No jargon. Written for the estate owner, heir, or legal professional.
    2.  **Developer-Facing README** — Written in the feature's directory (e.g., `web/src/components/identity/README.md`). Explains the architecture, dependencies, props/API, configuration, and known limitations.
    
    Neither document is optional. A feature without documentation is an incomplete feature. The How-To and README must be created **in the same commit** as the feature code.

*   **Context Monitoring Protocol (Rule 31)**: The agent MUST monitor context window and token usage throughout every session using the AG Monitor Pro extension and the `/context-monitoring` workflow. After **every sprint or phase**, the agent MUST report:
    1.  **Commits this session** — total count
    2.  **Context health** — 🟢 Healthy / 🟡 Getting Deep / 🔴 Critical
    3.  **Recommendation** — Continue / Wrap Soon / Wrap Now
    
    When context health is 🟡 or 🔴, the agent MUST proactively:
    - Commit all work
    - Update `CHANGELOG.md`
    - Generate a fresh `docs/CONTINUATION-PROMPT.md`
    - Report final metrics
    
    **The agent is responsible for ensuring the session never gets cut short by context exhaustion.** If the context is getting deep, say so. Don't wait to be asked.

## 3. Technology Stack (FinalWishes)

| Layer | Technology | Decision |
| :--- | :--- | :--- |
| **Web** | **React 19 + Vite 8** | TanStack Router (file-based), TailwindCSS v4, shadcn/ui, Glassmorphism |
| **Backend** | **Go 1.26 + Chi + ConnectRPC** | Cloud Run, gRPC + Protobuf, single HTTP API |
| **Database** | **Cloud SQL (PostgreSQL 15) + Firestore** | Hybrid: SQL for PII/Vault (encrypted), NoSQL for real-time |
| **Auth** | **Firebase Auth** | MFA (TOTP) Required, 3-tier identity verification |
| **Security** | **SOC 2 + Cloud KMS** | AES-256-GCM envelope encryption, per-estate AAD |
| **AI** | **Claude Opus (sirsi-ai SDK)** | "The Shepherd" — AI guidance engine, completion scoring, obituary drafting (Genkit/Gemini fallback) |
| **E-Sign** | **Sirsi Sign** (sign.sirsi.ai) | Go API proxies to OpenSign via `/api/v1/opensign/*` |
| **Payments** | **Stripe** | Checkout flow via Go API |
| **Hosting** | **Firebase Hosting** | CDN for SPA, SPA rewrites |
| **Triggers** | **Firebase Functions (Node.js 22)** | Firestore triggers only: `autoMatchInvitation` + `sendMail`. No HTTP endpoints. |

> **Removed (April 2026):** Mobile (Expo) and Desktop (Tauri) scaffolds deleted — premature. Will rebuild when web is stable.
> **Consolidated:** All HTTP API endpoints live in the Go API on Cloud Run. Firebase Functions handle only event-driven Firestore triggers.

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
*   **Single Backend**: All HTTP API endpoints live in the Go API on Cloud Run (`api/`). Firebase Functions handle only Firestore triggers. No Express, no dual backends.
*   **The Vault Concept**: All sensitive documents are stored in Cloud Storage with metadata in Cloud SQL. We do not just "store files"; we "maintain legal evidence".
*   **Defense in Depth**: Security is not an afterthought. Every API endpoint must have AuthZ checks. PII is always encrypted at rest via Cloud KMS envelope encryption.
*   **Sirsi Sign Integration**: The Go API proxies to OpenSign (sign.sirsi.ai) via `/api/v1/opensign/*` for contract signing.
*   **No Dead Scaffolds**: Do not create empty scaffold directories for future platforms (mobile, desktop). Build them when the web product is stable and the platform is ready for development.

## 6. Canonical Documents (FinalWishes)
These documents are the source of truth for this repo:

### 🏛 The Financial Trinity (3)
1.  `proposals/CONTRACT.md`
2.  `proposals/SOW.md`
3.  `proposals/COST_PROPOSAL.md`

### 📋 Governance & Planning (3)
4.  `CLAUDE.md` (this file)
5.  `docs/PROJECT_SCOPE.md`
6.  `docs/CANONICAL_DEVELOPMENT_PLAN.md` — The dev plan/blueprint (contract tiers, phases, acceptance criteria)

### 🏗 Architecture & Design (4)
7.  `docs/ARCHITECTURE_DESIGN.md`
8.  `docs/TECHNICAL_DESIGN.md`
9.  `docs/DATA_MODEL.md`
10. `docs/API_SPECIFICATION.md`

### ⚖️ Compliance & Security (2)
11. `docs/SECURITY_COMPLIANCE.md`
12. `docs/RISK_MANAGEMENT.md`

### 🔬 Requirements (3)
13. `docs/REQUIREMENTS_SPECIFICATION.md`
14. `docs/USER_STORIES.md`
15. `docs/MARKET_JUSTIFICATION.md`

### 🚀 Operations (4)
16. `docs/DEPLOYMENT_GUIDE.md`
17. `docs/MAINTENANCE_SUPPORT.md`
18. `docs/CHANGE_MANAGEMENT.md`
19. `docs/TEST_PLAN.md` (merged from QA_PLAN.md)

### 🧠 Knowledge (4)
20. `docs/ADR-INDEX.md`
21. `docs/ADR-TEMPLATE.md`
22. `docs/IDENTITY-WORKFLOW-DIAGRAMS.md`
23. `CHANGELOG.md`

### 📖 Session & Feature Documentation
24. `docs/CONTINUATION-PROMPT.md` — Session baseline for fresh context windows
25. `docs/user-guides/` — User-facing How-To guides (per Rule 30)
26. `web/src/**/README.md` — Developer-facing READMEs (per Rule 30)

> **Removed (April 2026):** QA_PLAN.md (merged into TEST_PLAN.md), TRAINING_DOCUMENTATION.md (stub), COMMUNICATION_PLAN.md (aspirational), PORTFOLIO_CANONICAL_STANDARD.md (superseded by SIRSI_PORTFOLIO_STANDARD.md). PROJECT_MANAGEMENT.md and POST_IMPLEMENTATION_REVIEW.md archived to `docs/archived/`.

## 7. Interaction Protocol
*   **User**: "I want X."
*   **Claude Response**: "I see you want X. However, analyzing the ADRs, Y might be better because [Reason]. Should we do Y?"
*   **Artifacts**: Use `implementation_plan.md` to structure complex thought.

## 8. Agent Capabilities
*   **CLI Access**: Full CLI access to GitHub and Firebase.
*   **Push Protocol**: ALWAYS run `git status` -> `git add` -> `git commit` -> `git push`.
*   **Identity**: `SirsiMaster` account exclusively.
*   **Browser Profile (Rule 28)**: ALL browser subagent work MUST execute in the **`ccollymo@alumni.chicagobooth.edu`** Chrome profile. No exceptions. Every browser_subagent task prompt MUST include instructions to use this profile. See `.agent/workflows/browser-testing.md` for full protocol.

## 9. Shared Services Map
| Service | Provider | Location |
| :--- | :--- | :--- |
| E-Signing | Sirsi Sign (OpenSign) | sign.sirsi.ai — proxied via Go API `/api/v1/opensign/*` |
| Payments | Stripe | Go API checkout integration |
| Auth | Firebase Auth | Configured in this repo |
| Email | Gmail API | Cloud Function `sendMail` (Firestore trigger on `mail` collection, domain-wide delegation via admin@sirsi.ai) |
| PII Encryption | Cloud KMS | `finalwishes-keyring/pii-vault-key` (us-central1) |

## 10. Test Credentials
*   **Name**: Cylton Collymore
*   **Email**: cylton@sirsi.ai

---
**Signed,**
**Antigravity (The Agent)**
