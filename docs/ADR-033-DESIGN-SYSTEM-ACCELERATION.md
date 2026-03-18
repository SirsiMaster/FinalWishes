# ADR-033: Design System Acceleration & Cross-Portfolio Reuse Strategy
## Status: Accepted
## Date: 2026-03-18

---

## Context

FinalWishes is a portfolio company under the Sirsi ecosystem. Currently:
1. The web UI is built with **raw Tailwind CSS** — every component hand-coded from scratch
2. The Sirsi UCS (Universal Component System) at `SirsiNexusApp/packages/sirsi-ui/` exists but FinalWishes doesn't consume it
3. There's no shared component pattern between FinalWishes and SirsiNexusApp
4. The landing page and dashboard already use Framer Motion, Lucide icons, and TailwindCSS
5. Writing every button, modal, dropdown, toast, and table from scratch wastes engineering time and introduces inconsistency

The user requires "Apple-level quality" design with minimum hand-coding — leveraging open-source, GCP, and Firebase tools to their fullest.

---

## Decision

### 1. Adopt shadcn/ui as the FinalWishes Component Foundation

**Choice: shadcn/ui** (not MUI, not Chakra, not Ant Design)

**Why shadcn/ui over alternatives:**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **shadcn/ui** | Copy-paste components, full ownership, Radix primitives, Tailwind native, no vendor lock-in | Must maintain copied code | ✅ **CHOSEN** |
| Chakra UI | Good DX, accessible | Opinionated runtime, heavy bundle, fights Tailwind | ❌ |
| MUI | Comprehensive, enterprise | Material Design aesthetic, not Neo-Deco compatible | ❌ |
| Ant Design | Rich component set | Chinese design language, massive bundle | ❌ |
| Headless UI | Tailwind Labs official | Limited component count | ❌ Subset — Radix covers more |

**Implementation:**
- Components copied into `web/src/components/ui/` (shadcn pattern)
- Themed with Royal Neo-Deco tokens (Royal Blue, Gold, Cinzel + Inter)
- Radix primitives for accessibility (WAI-ARIA compliant)
- Extends, does NOT replace, existing custom components

### 2. Animation & Micro-Interaction Stack

| Tool | Already Installed | Purpose |
|------|:-:|---------|
| **Framer Motion** | ✅ `^12.38.0` | Page transitions, layout animations, gestures |
| **Tailwind CSS v4** | ✅ `^4` | Utility-first styling, design tokens |
| **Lucide React** | ✅ `^0.577.0` | Icon system (consistent, tree-shakeable) |

**Additional to add:**
- `@radix-ui/react-*` primitives (installed automatically with shadcn components)
- `class-variance-authority` (CVA) — for variant-based component styling
- `tailwind-merge` — ✅ already installed

### 3. Cross-Portfolio Reuse Strategy (Sirsi UCS Alignment)

**The "Contribute-Up, Consume-Down" Pattern:**

```
┌─────────────────────────────────────────────────┐
│              Sirsi UCS (packages/sirsi-ui/)       │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│   │ Button  │  │ Modal   │  │ Toast   │  ...    │
│   └─────────┘  └─────────┘  └─────────┘        │
│                 ▲                                 │
│    Contribute   │                                 │
│    (vetted)     │                                 │
├─────────────────┼───────────────────────────────┤
│                 │                                 │
│  FinalWishes    │     SirsiNexusApp               │
│  ┌───────────┐  │     ┌───────────┐              │
│  │ fw-button │──┘     │ sn-button │              │
│  │ (Royal    │        │ (Emerald  │              │
│  │  Blue)    │        │  + Gold)  │              │
│  └───────────┘        └───────────┘              │
└─────────────────────────────────────────────────┘
```

**Rules:**
1. **FinalWishes components** live in `web/src/components/ui/` — themed Royal Blue
2. **When a component is mature**, it's "contributed up" to UCS with theme-agnostic tokens
3. **UCS components** are consumed by both FinalWishes and SirsiNexusApp
4. **Contamination firewall**: FinalWishes NEVER imports directly from SirsiNexusApp — only from UCS
5. **Theme tokens** are injected at the app level, not baked into components
6. **Color namespacing**: `--fw-primary` (FinalWishes), `--sn-primary` (SirsiNexus), `--ucs-primary` (UCS defaults)

### 4. Google/GCP Tools to Leverage (Zero Custom Code)

| Service | Use Case | Replaces Custom Code |
|---------|----------|---------------------|
| **Firebase Auth** | Login, MFA, OAuth | Custom auth system |
| **Firestore** | Real-time data, offline sync | Custom DB layer |
| **Firebase Extensions** | Resize images, send emails, stripe sync | Custom Cloud Functions |
| **Firebase Genkit** | AI flows (Guidance Engine) | Custom Vertex AI integration |
| **Cloud KMS** | Document encryption keys | Custom key management |
| **Firebase Hosting** | CDN, SSL, preview channels | Custom deploy pipeline |
| **Firebase App Check** | Bot/abuse protection | Custom rate limiting |
| **Cloud Tasks** | Deferred jobs (cooling-off period) | Custom cron |
| **Google Identity Platform** | Advanced auth features | Custom identity |

### 5. Open Source Tools (Don't Build What Exists)

| Category | Tool | Replaces |
|----------|------|----------|
| **PDF Generation** | `@react-pdf/renderer` | Custom letter generation |
| **Rich Text Editor** | `tiptap` (prosemirror) | Custom memoir editor |
| **Date Handling** | `date-fns` | Custom date formatting |
| **Form Validation** | `zod` + `react-hook-form` | Custom form logic |
| **Data Tables** | `@tanstack/react-table` | Custom table components |
| **Charts** | `recharts` or `tremor` | Custom dashboard charts |
| **Toast/Notifications** | `sonner` | Custom toast system |
| **File Upload** | `react-dropzone` | Custom upload UI |
| **E2E Testing** | `Playwright` | Manual browser testing |

---

## Consequences

### Positive
1. **10x development velocity** — no more hand-coding buttons, modals, dropdowns
2. **Apple-level polish** — Radix + Framer Motion + shadcn = premium by default
3. **Portfolio-safe reuse** — components flow up to UCS without contamination
4. **Theme isolation** — FinalWishes stays Royal Blue, Sirsi stays Emerald
5. **Maximum Google leverage** — Firebase Extensions replace 5+ custom services

### Negative
1. **Initial setup cost** — ~4 hours to install shadcn, configure theme tokens
2. **Dependency surface** — more packages to maintain (mitigated by copy-paste pattern)
3. **UCS contribution overhead** — extra step to generalize components for reuse

### Risk Mitigation
- shadcn components are COPIED, not installed — no supply chain risk
- UCS contributions are VETTED before merge — no contamination
- Theme tokens are CSS custom properties — framework-agnostic

---

## Implementation Plan

### Immediate (This Sprint)
1. Initialize shadcn/ui in FinalWishes web project
2. Install core Radix primitives + CVA
3. Create theme config with Royal Neo-Deco tokens
4. Replace hand-coded components with shadcn equivalents

### Phase 1 (Weeks 1-4)
1. Migrate all dashboard pages to shadcn components
2. Implement sonner for toasts, react-dropzone for uploads
3. Install tiptap for memoir editor

### Phase 2 (Weeks 5-8)
1. Contribute mature components to Sirsi UCS
2. Integrate Firebase Genkit for Guidance Engine
3. Install Playwright for E2E testing

---

*Recorded by: Antigravity*
*Date: March 18, 2026*
