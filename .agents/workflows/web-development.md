---
description: React web dashboard development workflow for FinalWishes
---

# Session B: React Web Dashboard Development

## Prerequisites
- Node.js 20+ installed
- Access to `web/` directory
- Read `docs/DATA_MODEL_LOCK.md`, `docs/API_SPECIFICATION.md`, `docs/USER_STORIES.md`

## Domain Scope
**ONLY touch files in:** `web/**`
**Branch:** `feat/web-app`

## Design System: Royal Neo-Deco
- **Background:** Deep Royal Blue Gradient (`#0f172a` → `#1e3a5f`)
- **Primary:** Royal Blue (`#1E3A5F`, `#2563EB`)
- **Accent:** Metallic Gold (`#C8A951`) — NO gradients on buttons
- **Headings:** `Cinzel` (serif, uppercase tracking)
- **Body:** `Inter` (sans-serif)
- **Components:** Glass panels, gold borders, film grain overlay
- **Framework:** TailwindCSS 4 + custom design tokens

## Step 1: Create Feature Branch
```bash
git checkout -b feat/web-app
```

## Step 2: Install Dependencies
```bash
cd web
npm install zustand @tanstack/react-query firebase react-hook-form zod framer-motion
npm install -D @types/node
```

## Step 3: Set Up Design System
1. Update `src/app/globals.css` with Royal Neo-Deco tokens
2. Add Google Fonts: Cinzel + Inter
3. Create `src/components/ui/` primitives:
   - `Button.tsx`
   - `GlassCard.tsx`
   - `Input.tsx`
   - `Modal.tsx`
   - `Badge.tsx`
   - `StatusDot.tsx`
   - `GoldBorder.tsx`

## Step 4: Set Up Firebase Auth
Create `src/lib/firebase.ts`:
- Firebase app initialization
- Auth instance
- Firestore instance (for client-side reads)

Create `src/lib/auth.ts`:
- `signIn(email, password)`
- `signUp(email, password, profile)`
- `signOut()`
- `onAuthStateChanged` listener
- `useAuth()` hook

## Step 5: Set Up API Client
Create `src/lib/api.ts`:
- Base URL configuration
- Auth token injection
- Request/response interceptors
- Error handling

Create `src/hooks/` with TanStack Query hooks:
- `useEstates()` — List user's estates
- `useEstate(id)` — Get single estate
- `useAssets(estateId)` — List assets
- `useDocuments(estateId)` — List documents
- Mutation hooks for CRUD operations

## Step 6: Build Pages (Priority Order)

### P0 — Must Have
1. **Auth pages** (`src/app/(auth)/`)
   - Login page
   - Register page
   - Forgot password page

2. **Dashboard shell** (`src/app/(dashboard)/layout.tsx`)
   - Sidebar navigation
   - Header with user menu
   - Mobile responsive

3. **Principal Dashboard** (`src/app/(dashboard)/page.tsx`)
   - Completion percentage
   - Category breakdown
   - Recent activity
   - Quick actions

4. **Estate Management** (`src/app/(dashboard)/estates/`)
   - Create estate wizard
   - Estate detail view
   - Estate settings

5. **Asset Inventory** (`src/app/(dashboard)/estates/[id]/assets/`)
   - Add asset flow (by category)
   - Asset list view
   - Asset detail/edit

6. **Document Vault** (`src/app/(dashboard)/vault/`)
   - Upload with client-side encryption
   - Folder organization
   - Document preview

7. **Beneficiary Management** (`src/app/(dashboard)/beneficiaries/`)
   - Add executor
   - Add heir
   - Asset allocation

### P1 — Should Have
8. **Executor Dashboard** (`src/app/(portals)/executor/`)
9. **Heir Portal** (`src/app/(portals)/heir/`)
10. **Settings** (`src/app/(dashboard)/settings/`)

## Step 7: Zustand Stores
Create `src/stores/`:
- `useAuthStore.ts` — Current user, auth state
- `useEstateStore.ts` — Active estate, sidebar state
- `useUIStore.ts` — Theme, modals, notifications

## Step 8: Test
```bash
npm run dev     # Verify in browser
npm run build   # Ensure production build works
npm run lint    # Zero lint errors
```

## Step 9: Commit & Push
```bash
git add web/
git commit -m "feat(web): implement core dashboard with Royal Neo-Deco design"
git push origin feat/web-app
```

## DO NOT
- Touch `api/`, `functions/`, `mobile/`, `public/` (root)
- Modify `firebase.json`, `firestore.rules`
- Implement backend logic — use API client to call Session A's endpoints
