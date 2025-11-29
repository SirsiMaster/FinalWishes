# Changelog

## [3.4.0] - 2025-11-29

### Complete Authentication & Payment System

#### Authentication Modal System
- Single modal with 3 panels (signin/signup/forgot password)
- Firebase Auth integration (email/password + Google OAuth)
- Role-based redirects (admin → admin dashboard, principal/executor/heir → portals)
- Password validation (12+ chars, uppercase, lowercase, numbers)
- Promo code capture from URL (`?promo=CODE`) and localStorage
- Subscription tier selection at signup (free/concierge/whiteglove)

#### New Pages
| Page | Path | Purpose |
|------|------|----------|
| Promo Landing | `/public/auth/promo.html` | Campaign landing with countdown, price comparison, code display |
| Subscription Mgmt | `/public/auth/unsubscribe.html` | Auth-gated plan management, cancel flow |
| Principal Portal | `/public/portals/principal/dashboard.html` | Estate planning dashboard |
| Executor Portal | `/public/portals/executor/dashboard.html` | Estate administration dashboard |
| Heir Portal | `/public/portals/heir/dashboard.html` | Inheritance tracking dashboard |

#### Firestore User Schema
```javascript
{
  email, displayName, role, photoURL,
  subscription: { plan, status, createdAt },
  promoCode, promoDiscount,
  profile: { firstName, lastName },
  mfaEnabled, emailVerified,
  createdAt, lastLoginAt
}
```

#### Test Accounts Created
| Role | Email | Plan |
|------|-------|------|
| Admin | admin@legacy.estate | whiteglove |
| Principal | principal@legacy.estate | concierge |
| Executor | executor@legacy.estate | concierge |
| Heir | heir@legacy.estate | free |

#### Stripe Integration (Stubbed)
- `redirectToStripeCheckout()` function ready
- Price IDs configured for concierge/whiteglove tiers
- Requires Firebase Function backend for production

#### Sirsi-Backportable Components
- `sm-card`, `sm-card-header`, `sm-card-body`, `sm-card-footer`
- `sm-btn`, `sm-btn-primary`, `sm-btn-secondary`, `sm-btn-danger`
- `sm-badge`, `sm-badge-success`, `sm-badge-warning`, `sm-badge-danger`
- `sm-alert`, `sm-alert-success`, `sm-alert-danger`
- `sm-loading`, `sm-spinner`

#### Removed
- `/public/auth/login.html` (replaced by modal)
- `/public/auth/register.html` (replaced by modal)

---

## [3.3.0] - 2025-11-26

### Domain-Specific Multi-Agent Architecture

#### Agent System Implementation
Created 6 specialized domain agents with pre-flight checklists and dependency management:

| Agent | Path | Domain |
|-------|------|--------|
| Auth | `agents/auth/AGENT.md` | Authentication, users, sessions, MFA |
| Estate | `agents/estate/AGENT.md` | Estates, assets, heirs, 4-phase protocol |
| Vault | `agents/vault/AGENT.md` | Documents, OCR, encryption, versioning |
| Compliance | `agents/compliance/AGENT.md` | 6-state probate rules (IL, MI, MN, DC, VA, MD) |
| Notify | `agents/notify/AGENT.md` | Email, push, SMS, letter generation |
| LLM | `agents/llm/AGENT.md` | Vertex AI, RAG, recommendations |

#### Agent Governance Protocol
Every agent now includes:
- Pre-flight checklist (MUST complete before coding)
- Cross-agent impact analysis
- Dependency verification
- State verification commands
- Changelog tracking

#### Updated Documents
- `WARP.md` - Added agentic development model and agent invocation instructions
- `proposals/COST_PROPOSAL.md` - Added state-of-the-art agentic architecture section (3.1-3.5)

#### Architecture Philosophy
- Modular context (each agent fits context window)
- State awareness (pre-flight verifies system state)
- Coordinated changes (dependency graph prevents conflicts)
- Domain expertise (specialized knowledge per agent)

---

## [3.2.0] - 2025-11-26

### Scope Refinement: 6-State MVP Launch

#### Geographic Scope
- **MVP States:** Illinois, Michigan, Minnesota, DC, Virginia, Maryland
- Midwest coverage (IL, MI, MN) + DC Metro coverage (DC, VA, MD)
- State-specific probate rules and institution templates per state
- Remaining 44 states targeted for v1.1+

#### Timeline Update
- Revised from 90 days to 4 months (16 weeks)
- Cost proposal updated: $80K-$100K

#### Updated Documents
- `docs/PROJECT_SCOPE.md` v1.1.0 - 6-state scope, 4-month timeline
- `docs/REQUIREMENTS_SPECIFICATION.md` v1.1.0 - State-specific requirements
- `proposals/COST_PROPOSAL.md` v3.0.0 - Realistic $80K MVP estimate

---

## [3.1.0] - 2025-11-26

### Architecture Revision: AI-Agentic + GCP/Firebase

#### Major Changes
- **Stack:** Switched from AWS to GCP/Firebase
- **Development Model:** AI-agentic (Claude + AI tools, no human dev team)
- **Budget:** Revised from $425K-$485K to $20K-$35K
- **Mobile Strategy:** PWA instead of native iOS/Android

#### Updated Documents
- `WARP.md` - Added governance rules from Assiduous
- `docs/ARCHITECTURE_DESIGN.md` - GCP/Firebase stack
- `proposals/COST_PROPOSAL.md` - AI-agentic pricing (<$100K)

#### Technology Stack (Revised)
- **Backend:** Firebase Functions
- **Database:** Firestore (NoSQL)
- **Auth:** Firebase Authentication
- **Storage:** Cloud Storage for Firebase
- **Hosting:** Firebase Hosting (PWA)
- **AI/LLM:** Vertex AI / Claude API
- **Integrations:** MCP (Model Context Protocol)

#### Governance Rules Added
- Rule 0: Challenge bad ideas
- Rule 1: Check Sirsi first, then Legacy
- Rule 2: Implement, don't instruct
- Rule 3: Test in browser before claiming complete
- Rule 4: Follow the pipeline (LOCAL → GITHUB → FIREBASE)
- Rule 5: Match existing design
- Rule 6: Measure by specs, not file counts
- Rule 7: Enhance, don't duplicate

---

## [3.0.0] - 2025-11-26

### Full Platform Architecture & Documentation

#### Platform Planning Complete
- Defined full-stack architecture: Go + Next.js + Flutter + AWS
- Created 18 comprehensive documentation files in `docs/`
- Created SOW and Cost Proposal in `proposals/`
- Established 90-day MVP timeline with 4 development phases

#### Technology Decisions
- **Backend:** Go 1.21+ with Gin framework
- **Database:** PostgreSQL 15+ with Redis caching
- **Web:** Next.js 14 with TypeScript
- **Mobile:** Flutter for iOS and Android
- **Infrastructure:** AWS (ECS Fargate, RDS, S3, CloudFront, Cognito)

#### Documentation Added
- `docs/REQUIREMENTS_SPECIFICATION.md` - Functional/non-functional requirements
- `docs/PROJECT_SCOPE.md` - MVP scope and deliverables
- `docs/USER_STORIES.md` - 4 personas, 30+ user stories
- `docs/PROJECT_MANAGEMENT.md` - Sprint structure and milestones
- `docs/RISK_MANAGEMENT.md` - 10 identified risks with mitigations
- `docs/ARCHITECTURE_DESIGN.md` - System architecture
- `docs/TECHNICAL_DESIGN.md` - Implementation patterns
- `docs/DATA_MODEL.md` - PostgreSQL schema
- `docs/API_SPECIFICATION.md` - REST API endpoints
- `docs/SECURITY_COMPLIANCE.md` - SOC2, encryption, compliance
- `docs/TEST_PLAN.md` - Testing strategy
- `docs/QA_PLAN.md` - Quality assurance
- `docs/DEPLOYMENT_GUIDE.md` - AWS deployment procedures
- `docs/MAINTENANCE_SUPPORT.md` - SLA and support tiers
- `docs/CHANGE_MANAGEMENT.md` - Release management
- `docs/COMMUNICATION_PLAN.md` - Stakeholder communication
- `docs/TRAINING_DOCUMENTATION.md` - User and developer guides
- `docs/POST_IMPLEMENTATION_REVIEW.md` - Review template

#### Proposals Added
- `proposals/SOW.md` - Statement of Work
- `proposals/COST_PROPOSAL.md` - $425,000-$485,000 estimate

#### AI Context Files
- Updated `WARP.md` for full platform context
- Added `claude.md` for Claude AI assistance

---

## [2.5.0] - 2025-11-26

### Visual Overhaul - Compact & Polished

#### Size Reductions (Global)
- Reduced all section padding from `py-16` to `py-10`
- Reduced card padding from `p-8` to `p-5`
- Reduced nav height from `h-20` to `h-14`
- Reduced button padding and font sizes
- Reduced heading sizes throughout (e.g., `text-6xl` → `text-4xl`)
- Reduced protocol photo height from `400px` to `280px`
- Reduced testimonial portrait height from `h-80` to `h-56`
- Reduced gaps from `gap-8` to `gap-5`
- Reduced footer padding from `py-8` to `py-6`

#### Hero Section Cleanup
- Moved subheadline, CTAs, and trust indicators to new "Value Proposition" section
- Hero now displays only the headline "Your Legacy Deserves a Guardian"
- Cleaner, more impactful first impression

#### New Value Proposition Section
- Added gold fractal texture pattern background
- Contains CTAs and trust indicators moved from hero
- Positioned after the 500-Hour Problem section

#### Protocol Section (From Grief to Greatness)
- Updated all 4 images to African American professionals in action poses
- Using Unsplash `crop=faces` API for proper face framing
- Step 1 INTAKE: Woman at laptop reviewing documents
- Step 2 VERIFY: Businessman in professional setting
- Step 3 NOTIFY: Woman professional
- Step 4 DISTRIBUTE: Family together

#### Testimonials Section (From Grief to Gratitude)
- All 3 portraits now African American headshots
- David M: Professional man portrait
- Angela W: Professional woman portrait (centered)
- Marcus T: Professional man portrait
- Consistent portrait-style framing across all cards

#### Final CTA Section
- Replaced mountain imagery with people imagery
- Now shows grandparent with grandchild moment
- Content properly centered vertically

#### Technical Fixes
- Added `object-position` to all images for proper face centering
- Protocol photos use flex centering with proper constraints
- Removed inline style conflicts
