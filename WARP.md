# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## ⚠️ CRITICAL DEVELOPMENT GOVERNANCE RULES (MUST FOLLOW)

### **RULE 0: CHALLENGE BAD IDEAS**
If my approach is flawed, tell me immediately. Product quality > accommodation.

---

### **RULE 1: CHECK SIRSI FIRST, THEN MYSHEPHERD**
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

### **RULE 8: DOCUMENT ARCHITECTURE DECISIONS AS ADRS**
Every significant technology, security, or infrastructure decision MUST be documented as an Architecture Decision Record (ADR) in `docs/ADR-XXX-*.md`. Include:
- **Context:** What problem are we solving?
- **Decision:** What did we choose?
- **Alternatives:** What else was considered?
- **Justification:** Why this choice? Include industry comparisons, cost analysis, and trade-offs.
- **Consequences:** What are the implications?

ADRs are immutable once accepted. To change a decision, create a new ADR that supersedes the old one.

**ADR Index:** `docs/ADR-INDEX.md`

---

## THE META-RULE

**If any rule conflicts with delivering a world-class product, challenge the rule and propose a better approach.**

These rules exist to ensure quality and efficiency, not to create bureaucracy. If a rule is getting in the way of excellence, speak up and explain why a different approach would be better.

The goal is a world-class product. Everything else is negotiable.

---

## Project Overview
**MyShepherd** is "The Estate Operating System" - an end-of-life estate management and settlement platform with web and native mobile applications. The project uses AI-assisted development (Claude + AI tools).

**Core Mission:** Shepherd users through every step of the estate settlement journey—whether manual or automated. Where government systems lack digital interfaces, we BUILD THE CONNECTOR and become the benchmark for eventual state adoption.

**Platform Status:** Phase 1 - Foundation (Auth + Core DB)

**Development Model:** AI-Assisted (Claude + Warp + Cursor)

**Timeline:** 5 months (20 weeks) - See `proposals/SOW.md`

**Launch States (Priority Order):**
1. Maryland (MDEC e-filing statewide)
2. Illinois (e-filing available)
3. Minnesota (MNCIS statewide, UPC simplified)
4. DC (build connector for limited e-filing)
5. Virginia (build connector for partial e-filing)

**Market Justification:** See `docs/MARKET_JUSTIFICATION.md`

## Technology Stack (GCP)
- **Web Frontend:** React 18 + Vite + TailwindCSS
- **Mobile Apps:** React Native + Expo (iOS + Android)
- **Backend API:** Go (Golang) on Cloud Run
- **Database:** Firestore (real-time) + Cloud SQL (PII)
- **Auth:** Firebase Authentication (with MFA)
- **Storage:** Cloud Storage (client-side AES-256 encryption)
- **Key Management:** Cloud KMS (software keys)
- **Hosting:** Firebase Hosting (web), App Store / Play Store (mobile)
- **AI/LLM:** Vertex AI for intelligent process guidance
- **CI/CD:** GitHub Actions → Cloud Run + Firebase

**Architecture Decisions:** See `docs/ADR-001-ARCHITECTURE-DECISIONS.md`

## Design Aesthetic: "Opulent, Permanent, Guardian-Like"
- Deep Royal Blue Gradient background (NOT black) - Dark theme default
- Light theme available via toggle (white background)
- Solid Metallic Gold (`#C8A951`) buttons with hover brightening (NO gradients on buttons)
- High-contrast text (`text-gray-100` or white)
- Compact footer (`py-8`)
- "Alive UI" with green pulse dots on cards
- Tech borders/glowing frames

## Theme System (Light/Dark)

### How It Works
- Theme toggle button in nav (sun/moon icon)
- Preference stored in `localStorage` key `myshepherd-theme`
- Falls back to system preference (`prefers-color-scheme`)
- Default: dark theme

### Key Files (Marketing Site - Current)
- `public/assets/js/theme-toggle.js` - Theme application logic
- `src/input.css` - Tailwind theme variables in `@layer base`
- Build CSS: `npm run build:css`

### Key Files (React App - Future)
- `web/src/styles/theme.ts` - Theme configuration
- `web/tailwind.config.js` - Tailwind setup

### ⚠️ CRITICAL: Photo Sections Must Stay White
Photo sections (`.photo-section`) have image backgrounds. Text MUST remain white regardless of theme.

**DO NOT:**
- Set `body.style.color` in JavaScript (cascades to children)
- Apply theme text colors to elements inside `.photo-section`

**DO:**
- Use inline `style="color: #FFFFFF !important"` on photo section text
- Check `isInPhotoSection()` before applying text colors
- Only modify: body background, nav, logo, non-photo content

### Theme Colors
```javascript
// Dark theme
bodyBg: '#0f172a'
bodyBgImage: 'radial-gradient(circle at 50% 0%, #2563eb 0%, #1e3a8a 40%, #0f172a 80%)'
navBg: 'rgba(0, 0, 0, 0.2)'
navLink: 'rgba(255, 255, 255, 0.7)'

// Light theme  
bodyBg: '#FFFFFF'
bodyBgImage: 'none'
navBg: 'rgba(255, 255, 255, 0.95)'
navLink: '#4B5563'
```

## File Structure
```
MyShepherd/
├── public/                 # ⚠️ Marketing site - Firebase Hosting
│   ├── index.html          # Marketing landing page
│   ├── proposals/          # Cost proposal & SOW pages
│   ├── docs/               # Public documentation
│   └── assets/             # Static assets
├── web/                    # React 18 web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Zustand state
│   │   └── lib/            # Utilities
│   ├── vite.config.ts
│   └── package.json
├── mobile/                 # React Native + Expo
│   ├── src/
│   ├── app.json
│   └── package.json
├── api/                    # Go backend
│   ├── cmd/api/            # Entry point
│   ├── internal/           # Domain logic
│   ├── pkg/                # Shared packages
│   ├── Dockerfile
│   └── go.mod
├── docs/                   # Platform documentation
│   ├── ADR-*.md            # Architecture Decision Records
│   └── *.md                # Technical docs
├── proposals/              # Business proposals
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
Live site: https://legacy-estate-os.web.app (will migrate to myshepherd.app)

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

## Key Components (React App - Future)
- `<Button variant="gold">` - Primary action button
- `<GlassCard>` - Frosted glass container
- `<StatusIndicator>` - Alive pulse indicator
- `<DocumentUploader>` - Encrypted file upload

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
- **Cost estimate:** `proposals/COST_PROPOSAL.md` ($95K)
- **Timeline:** 5 months (see `docs/PROJECT_SCOPE.md`)
- **Documentation index:** `docs/DOCUMENTATION_INDEX.md`

## Launch States
Maryland, Illinois, Minnesota, DC, Virginia
