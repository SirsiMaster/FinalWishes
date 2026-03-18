# Continuation Prompt: Landing Page Polish + Dashboard Hardening Sprint
## FinalWishes — "The Estate Operating System"

## **Session Date:** March 18, 2026

---

## **Role & Mission**
You are **Antigravity**, the AI agent for the **FinalWishes** repository. Your mission is to complete the landing page polish, ensure full functional routing, and harden the admin dashboard for all test accounts.

**CRITICAL**: Read `GEMINI.md` before writing any code. This is the FinalWishes repo, NOT SirsiNexusApp.

---

## **What Was Built This Session (March 18)**

### Landing Page Overhaul (8 commits)
| Commit | Description |
|--------|-------------|
| `4204e51` | Restored 12+ missing CSS custom properties in `.royal-theme` and `.dashboard-theme` — fixed transparent glass-card/glass-panel rendering on landing page |
| `9437a0d` | Harmonized glass color system — aligned `--bg-secondary` with inline section backgrounds |
| `cb948c3` | Sparkling glass system — luminous cards with `saturate(1.4)`, inset highlights, gold glow hovers |
| `8585421` | Sapphire shift — purged all dark navy (`#0B1A3E`, `#0f172a`) for rich sapphire (`#1E3A8A`) |
| `e7b0bce` | Neutral image overlays (no blue tint) + removed color block sections |
| `971cbc0` | Reduced hero section from 100vh to 75vh |
| `f4c9616` | Compacted ALL sections — hero 65vh, images 280px, dividers 20px |
| `f8100d9` | Restored original Black family hero image (`photo-1551836022-d5d88e9218df`) |

### Admin Dashboard High-Fidelity Executive Refactor (4 pages)
| Page | File | Changes |
|------|------|---------|
| Dashboard | `estates.$estateId.dashboard.tsx` | Fixed stray `);` syntax error, consolidated TypeScript interfaces |
| Memoirs | `estates.$estateId.memoirs.tsx` | Cinema-grade viewer, clean white cards, refined upload modal |
| Assets | `estates.$estateId.assets.tsx` | Institutional ledger table, clean slate borders, refined modal |
| Estates | `estates.$estateId.estates.tsx` | Clean estate cards, understated badges, premium registration modal |

### Design Language Established
- **Heritage Royal** (`#133378`) for headers and accents
- **Dark Ink** (`#0F172A`) for body text — never bold blue
- **Slate palette** (`#64748B`, `#F8FAFC`, `#F1F5F9`) for supporting elements
- **Sentence case** descriptions — no more UPPERCASE SHOUTING
- **`font-bold`** instead of `font-black` for professional weight
- **Cinzel** for page titles, **Inter** for body text

---

## **🚨 P0: CRITICAL — Must Do First**

### 1. Hero Image Fix
**Status**: The Unsplash URL `photo-1551836022-d5d88e9218df` renders as TWO WOMEN AT A LAPTOP (wrong image). The user wants the **multi-generational Black family facing the camera** — the image that was originally stored as `images/hero-family.jpg` in the git history.

**The correct image** was confirmed visually by the user. It shows a multi-generational African American family (grandparents, parents, children) smiling and facing the camera with sun flare behind them.

**Action Required**:
- The original `hero-family.jpg` exists in git history at commit `8f23790` under path `images/hero-family.jpg` (124KB JPEG, 1024x683)
- Extract it: `git show 8f23790:images/hero-family.jpg > web/public/assets/images/hero-family.jpg`
- Update `web/src/routes/index.tsx` hero `<img>` src to `/assets/images/hero-family.jpg`
- The user explicitly confirmed the image content — this is the single most important visual fix

### 2. Landing Page Link Audit
**Every link on the landing page must work**:

| Element | Current Target | Status |
|---------|---------------|--------|
| Nav: "Problem" | `#problem` | ✅ Anchor link |
| Nav: "Protocol" | `#protocol` | ✅ Anchor link |
| Nav: "Security" | `#security` | ✅ Anchor link |
| Nav: "Stories" | `#stories` | ✅ Anchor link |
| Nav: "Sign In" | `/login` | ⚠️ Verify renders |
| Nav: "Get Started" | `/login` | ⚠️ Verify renders |
| CTA: "Begin Your Legacy" | `/login` | ⚠️ Verify renders |
| CTA: "See How It Works" | `#protocol` | ✅ Anchor link |
| Protocol: "Start Your Protocol" | `/login` | ⚠️ Verify renders |
| Final CTA: "Begin Your Legacy" | `/login` | ⚠️ Verify renders |
| Footer links | Various | ❌ Audit needed |

**Action**: Click every link in browser, verify no 404s, ensure login route works.

---

## **P1: Dashboard Role Hardening**

### Current Auth System (Stub — localStorage)
The login page (`web/src/routes/login.tsx`) currently hardcodes **one credential**:

```
Tameeka Lockhart (SuperAdmin):
  - Login: Tameeka116
  - Email: Tameekalockhart@gmail.com
  - Phone: 123-456-7890
  - Password: ML6824!
  - Primary Estate: estate_lockhart (Lockhart Estate)
```

### Required: Multi-Role Test Accounts
Per GEMINI.md test credentials and business requirements, implement these test accounts:

| User | Role | Estate Access | Login |
|------|------|--------------|-------|
| **Tameeka Lockhart** | SuperAdmin/Owner | Lockhart Estate (full access) | `Tameeka116` / `ML6824!` |
| **Cylton Collymore** | Admin | Lockhart Estate (admin) | `cylton@sirsi.ai` / `Sirsi2026!` |
| **Heir Account** | Beneficiary | Lockhart Estate (read-only) | `heir@test.com` / `Test123!` |
| **Attorney Account** | Executor | Lockhart Estate (legal) | `attorney@test.com` / `Test123!` |

### Per-Role Dashboard Routing
Each role should see different sidebar links and have appropriate access:

| Route | Owner | Admin | Beneficiary | Executor |
|-------|-------|-------|-------------|----------|
| `/estates/{id}/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/estates/{id}/assets` | ✅ | ✅ | ✅ (read) | ✅ (read) |
| `/estates/{id}/beneficiaries` | ✅ | ✅ | ❌ | ✅ |
| `/estates/{id}/memoirs` | ✅ | ✅ | ✅ | ❌ |
| `/estates/{id}/vault` | ✅ | ✅ | ❌ | ✅ |
| `/estates/{id}/obituary` | ✅ | ✅ | ✅ | ✅ |
| `/estates/{id}/notifications` | ✅ | ✅ | ✅ | ✅ |
| `/estates/{id}/settings` | ✅ | ✅ | ❌ | ❌ |
| `/estates/{id}/estates` | ✅ | ✅ | ❌ | ❌ |

---

## **P2: Dashboard Page Polish**

### Pages Already Refactored (High-Fidelity Executive)
- ✅ `estates.$estateId.dashboard.tsx`
- ✅ `estates.$estateId.memoirs.tsx`
- ✅ `estates.$estateId.assets.tsx`
- ✅ `estates.$estateId.estates.tsx`

### Pages Still Need Refactoring
Apply the same High-Fidelity Executive aesthetic:
- ❌ `estates.$estateId.beneficiaries.tsx`
- ❌ `estates.$estateId.obituary.tsx`
- ❌ `estates.$estateId.notifications.tsx`
- ❌ `estates.$estateId.settings.tsx`
- ❌ `estates.$estateId.vault.tsx`

### Design Rules for Refactoring
1. Headers: `text-5xl font-cinzel font-bold text-[#0F172A]` — NEVER uppercase
2. Descriptions: `text-[#64748B] text-lg font-medium` — sentence case
3. Cards: `bg-white rounded-[2.5rem] border border-slate-100 shadow-sm`
4. Buttons: `bg-[#133378] hover:bg-[#1E3A5F] text-white rounded-2xl font-bold`
5. Labels: `text-[11px] font-bold text-slate-400 uppercase tracking-widest`
6. Modals: `bg-white rounded-[3rem] p-16 shadow-2xl`
7. No `font-black`, no uppercase body text, no bold blue descriptions

---

## **P3: Duplicate Route Cleanup**

There are TWO parallel route trees that appear to serve similar purposes:

```
dashboard.*.tsx        — Legacy flat routes (/dashboard/assets, etc.)
estates.$estateId.*.tsx — Scoped estate routes (/estates/lockhart/assets, etc.)
```

### Decision Required
- Are both needed? (Multi-estate users may need the scoped routes)
- Does `/dashboard` redirect to `/estates/{primaryEstateId}/dashboard`?
- Currently `/dashboard` loads `dashboard.tsx` layout, while `/estates/{id}/*` loads `estates.$estateId.tsx` layout — they have separate sidebars.

---

## **Current File Map**

### Routes (24 files)
```
web/src/routes/
├── __root.tsx                          # Root layout (bare Outlet)
├── index.tsx                           # Public landing page (Royal theme)
├── login.tsx                           # Auth stub (localStorage, Tameeka only)
├── dashboard.tsx                       # Legacy dashboard layout (Sidebar + AdminHeader)
├── dashboard.index.tsx                 # Legacy dashboard home
├── dashboard.assets.tsx                # Legacy assets
├── dashboard.beneficiaries.tsx         # Legacy beneficiaries
├── dashboard.estates.tsx               # Legacy estates
├── dashboard.memoirs.tsx               # Legacy memoirs
├── dashboard.notifications.tsx         # Legacy notifications
├── dashboard.obituary.tsx              # Legacy obituary
├── dashboard.settings.tsx              # Legacy settings
├── dashboard.vault.tsx                 # Legacy vault
├── estates.$estateId.tsx               # Scoped estate layout
├── estates.$estateId.index.tsx         # Estate redirect
├── estates.$estateId.dashboard.tsx     # ✅ REFACTORED
├── estates.$estateId.assets.tsx        # ✅ REFACTORED
├── estates.$estateId.beneficiaries.tsx # Needs refactor
├── estates.$estateId.estates.tsx       # ✅ REFACTORED
├── estates.$estateId.memoirs.tsx       # ✅ REFACTORED
├── estates.$estateId.notifications.tsx # Needs refactor
├── estates.$estateId.obituary.tsx      # Needs refactor
├── estates.$estateId.settings.tsx      # Needs refactor
└── estates.$estateId.vault.tsx         # Needs refactor
```

### Components
```
web/src/components/layout/
├── Sidebar.tsx                         # Dashboard sidebar navigation
├── AdminHeader.tsx                     # Dashboard header bar
```

### Styles
```
web/src/styles/
├── globals.css                         # Global CSS + .royal-theme + .dashboard-theme
```

### Key Config
```
firebase.json                           # Hosting: web/dist → legacy-estate-os.web.app
GEMINI.md                               # Project governance (READ FIRST)
DOMAIN_MANIFEST.md                      # File ownership map
docs/DATA_MODEL_LOCK.md                 # Frozen data model
```

---

## **Deploy Pipeline**
```bash
# Build + Deploy
cd web && npm run build && cd .. && firebase deploy --only hosting

# Git Push
git add -A && git commit -m "message" && git push origin develop
```

**Production URL**: https://legacy-estate-os.web.app
**GitHub**: https://github.com/SirsiMaster/FinalWishes

---

## **Color Reference Card**

| Token | Hex | Usage |
|-------|-----|-------|
| Heritage Royal | `#133378` | Headers, accents, primary buttons |
| Royal Blue | `#1E3A5F` | Button hover states |
| Sapphire (landing bg) | `#1A347A` | Landing page base gradient |
| Bright Sapphire | `#2563EB` | Landing gradient top glow |
| Dark Ink | `#0F172A` | Body text color (dashboard) |
| Slate 500 | `#64748B` | Descriptions, supporting text |
| Slate 100 | `#F1F5F9` | Card borders, badges |
| Slate 50 | `#F8FAFC` | Background tint, empty states |
| Gold | `#C8A951` | Accent highlights, gold borders |

---

## **Sprint Execution Order**

1. **P0-A**: Extract `hero-family.jpg` from git, serve as local asset, update hero `<img>` src
2. **P0-B**: Audit and fix every link on the landing page
3. **P1-A**: Add multi-role test credentials to `login.tsx`
4. **P1-B**: Implement role-based sidebar visibility
5. **P1-C**: Verify Tameeka's full access end-to-end
6. **P2**: Refactor remaining dashboard pages (Beneficiaries, Obituary, Notifications, Settings, Vault)
7. **P3**: Decide on and resolve dashboard.* vs estates.$estateId.* route duplication
8. **Deploy + Verify**: Build, deploy, screenshot every page

---

**Signed,**
**Antigravity (The Agent)**
**Session: March 18, 2026**
