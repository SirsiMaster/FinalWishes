# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## ⚠️ CRITICAL DEVELOPMENT GOVERNANCE RULES (MUST FOLLOW)

### **RULE 0: CHALLENGE BAD IDEAS**
If my approach is flawed, tell me immediately. Product quality > accommodation.

---

### **RULE 1: CHECK SIRSI FIRST, THEN LEGACY**
Before building anything, check if it exists in Sirsi's universal library (`/Users/thekryptodragon/Development/sirsimaster-component-library`) or Assiduous codebase (`/Users/thekryptodragon/Development/assiduous`). Everything we build flows back to Sirsi eventually - that's the virtuous cycle.

---

### **RULE 2: IMPLEMENT, DON'T INSTRUCT**
Build working code end-to-end. No "here's how to set it up" responses.

---

### **RULE 3: TEST IN BROWSER BEFORE CLAIMING COMPLETE**
Open DevTools, click through workflows, verify zero errors. If I haven't tested it in production, it's not done.

---

### **RULE 4: FOLLOW THE PIPELINE**
LOCAL → GITHUB → FIREBASE. Never skip GitHub. Always test in production immediately.

---

### **RULE 5: MATCH EXISTING DESIGN**
Copy CSS from existing pages. If design doesn't match, it's incomplete.

---

### **RULE 6: MEASURE BY SPECS, NOT FILE COUNTS**
Completion comes from USER_STORIES.md and REQUIREMENTS_SPECIFICATION.md, not arbitrary metrics.

---

### **RULE 7: ENHANCE, DON'T DUPLICATE**
Improve existing pages rather than creating new ones. Link to `/docs/`, don't copy.

---

## THE META-RULE

**If any rule conflicts with delivering a world-class product, challenge the rule and propose a better approach.**

These rules exist to ensure quality and efficiency, not to create bureaucracy. If a rule is getting in the way of excellence, speak up and explain why a different approach would be better.

The goal is a world-class product. Everything else is negotiable.

---

## Agentic Development Model

### Agent Architecture
Development is organized into **domain-specific agents**, each responsible for a discrete area of the codebase. When working on a feature, load the relevant agent's context file first.

| Agent | Domain | Context File |
|-------|--------|-------------|
| **Auth** | Authentication, users, sessions | `agents/auth/AGENT.md` |
| **Estate** | Estates, assets, beneficiaries, phases | `agents/estate/AGENT.md` |
| **Vault** | Document storage, OCR, encryption | `agents/vault/AGENT.md` |
| **Compliance** | 6-state probate rules, templates | `agents/compliance/AGENT.md` |
| **Notify** | Emails, push, SMS, letters | `agents/notify/AGENT.md` |
| **LLM** | Vertex AI, guidance, recommendations | `agents/llm/AGENT.md` |

### Working with Agents
1. **Before starting work:** Read the relevant `AGENT.md` file(s)
2. **Stay in domain:** Each agent owns specific Firestore collections, Functions, and UI components
3. **Update status:** Mark checkboxes in AGENT.md as features complete
4. **Cross-agent work:** When touching multiple domains, load all relevant agent contexts
5. **Add to changelog:** Update the agent's changelog when making changes

### Agent Dependencies
```
                    ┌─────────┐
                    │  Auth   │ (root - no dependencies)
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────────┐
    │ Estate  │◄───│  Vault  │    │ Compliance  │
    └────┬────┘    └────┬────┘    └──────┬──────┘
         │              │                │
         └──────────────┼────────────────┘
                        ▼
                  ┌─────────┐
                  │ Notify  │
                  └────┬────┘
                       ▼
                  ┌─────────┐
                  │   LLM   │ (depends on all)
                  └─────────┘
```

### Invoking an Agent
To work on a specific domain, say:
- "Work on Auth" → Load `agents/auth/AGENT.md`
- "Work on Estate" → Load `agents/estate/AGENT.md`
- "Work on Compliance for Illinois" → Load `agents/compliance/AGENT.md`

---

## Project Overview
**Legacy** is "The Estate Operating System" - an end-of-life estate management platform with web and PWA applications. The project uses AI-agentic development (Claude + AI tools) with no human developer team.

**Platform Status:** Phase 1 - Foundation (Auth + Core DB)

**Development Model:** AI-Agentic (Claude as Stack Leader)

## Technology Stack (GCP/Firebase)
- **Backend:** Firebase Functions (Cloud Functions)
- **Database:** Firestore (NoSQL with real-time sync)
- **Auth:** Firebase Authentication (with MFA)
- **Storage:** Cloud Storage for Firebase (encrypted documents)
- **Hosting:** Firebase Hosting
- **AI/LLM:** Vertex AI / Claude API for intelligent process guidance
- **Integrations:** MCP (Model Context Protocol) for tool automation
- **CI/CD:** GitHub Actions → Firebase

## Design Aesthetic: "Opulent, Permanent, Guardian-Like"
- Deep Royal Blue Gradient background (NOT black)
- Solid Metallic Gold (`#D4AF37`) buttons with hover brightening (NO gradients on buttons)
- High-contrast text (`text-gray-100` or white)
- Compact footer (`py-8`)
- "Alive UI" with green pulse dots on cards
- Tech borders/glowing frames
- `bg-grain` film overlay for texture

## File Structure
```
Legacy/
├── public/                 # ⚠️ DEPLOY TARGET - Firebase Hosting
│   ├── index.html          # Marketing site (edit here!)
│   ├── images/             # Marketing images
│   ├── admin/              # Admin dashboard
│   ├── auth/               # Promo/unsubscribe pages
│   ├── portals/            # Principal, Executor, Heir dashboards
│   ├── components/         # Shared UI components
│   ├── assets/             # Static assets
│   └── legacy.css          # Design system
├── agents/                 # Domain agent contexts (not deployed)
│   ├── auth/AGENT.md
│   ├── estate/AGENT.md
│   ├── vault/AGENT.md
│   ├── compliance/AGENT.md
│   ├── notify/AGENT.md
│   └── llm/AGENT.md
├── functions/              # Firebase Cloud Functions (separate deploy)
├── docs/                   # Platform documentation (not deployed)
├── proposals/              # Business proposals (not deployed)
├── scripts/                # Dev/test scripts (not deployed)
├── WARP.md
├── CHANGELOG.md
└── firebase.json
```

## Development Workflow

### Local Preview
```bash
cd "/Users/thekryptodragon/Development/111 Venture Studio/Legacy/public"
python3 -m http.server 8000
```
Then visit: http://localhost:8000

### Deployment
```bash
cd "/Users/thekryptodragon/Development/111 Venture Studio/Legacy"
git add -A && git commit -m "message" && git push origin main
firebase deploy --only hosting
```
Live site: https://legacy-estate-os.web.app

## Design Tokens (CSS Variables)
```css
--color-gold: #D4AF37;
--color-gold-bright: #FCD34D;
--color-blue-deep: #0f172a;
--color-blue-royal: #1e3a8a;
--glass-surface: rgba(15, 23, 42, 0.85);
--glass-border: rgba(255, 255, 255, 0.15);
```

## Typography
- **Headings**: `Cinzel` (serif, uppercase tracking)
- **Body**: `Inter` (sans-serif)

## Key Components (Marketing Site)
- `.btn-legacy` - Gold solid button with hover glow
- `.glass-panel` - Frosted glass surface
- `.active-card` - Card with gold hover border and tech line decorator
- `.status-dot` - Green pulsing "alive" indicator
- `.bg-grain` - Film grain texture overlay

## Rules & Guidelines

### Marketing Site
**DO:**
- Keep everything in a single `index.html` file (Tailwind CDN)
- Use the approved Royal Blue gradient background
- Use solid gold buttons that brighten on hover
- Maintain high text contrast (white/gray-100)
- Include the grain overlay for texture

**DO NOT:**
- Revert to dark/black backgrounds
- Use gradients on buttons
- Make the footer huge (keep `py-8`)
- Use low-contrast gray text
- Introduce build tools or frameworks without explicit request

### Platform Documentation
**DO:**
- Maintain consistency across all docs/
- Update CHANGELOG.md for significant changes
- Reference docs/ARCHITECTURE_DESIGN.md for system decisions
- Use docs/API_SPECIFICATION.md as the API contract source

**DO NOT:**
- Make technology changes without updating ARCHITECTURE_DESIGN.md
- Contradict established patterns in TECHNICAL_DESIGN.md

### Interaction Rules
- Always provide a link to the live page after completing a task
- Format code blocks with file path and start line

## Key Documents Reference
- **Architecture decisions:** `docs/ARCHITECTURE_DESIGN.md`
- **API contracts:** `docs/API_SPECIFICATION.md`
- **Data schema:** `docs/DATA_MODEL.md`
- **Cost estimate:** `proposals/COST_PROPOSAL.md` ($80K-$100K AI-agentic)
- **Timeline:** 4-month MVP (see `docs/PROJECT_SCOPE.md`)
- **Agent contexts:** `agents/*/AGENT.md`

## MVP Launch States
Illinois, Michigan, Minnesota, DC, Virginia, Maryland
