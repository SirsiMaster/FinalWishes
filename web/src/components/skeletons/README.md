# Skeletons — Developer README

## Architecture

```
components/skeletons/
├── CardGridSkeleton.tsx     # Grid of card placeholders (assets, beneficiaries, heirlooms)
├── DashboardSkeleton.tsx    # Full dashboard loading state (hero, stats, cards)
├── EditorSkeleton.tsx       # Rich text editor placeholder (directives, memoirs)
├── TableSkeleton.tsx        # Table rows placeholder (vault, lockbox)
├── VaultSkeleton.tsx        # Document vault grid placeholder
└── README.md                # This file
```

## Purpose

Loading skeletons for lazy-loaded routes. Each route that uses `React.lazy()` or TanStack Router's `.lazy.tsx` convention renders its corresponding skeleton while the code chunk downloads.

All skeletons use the shadcn `Skeleton` component (`components/ui/skeleton.tsx`) for consistent shimmer animation.

## Usage

Skeletons are referenced in `.lazy.tsx` route files:

```tsx
// estates.$estateId.vault.lazy.tsx
export const pendingComponent = () => <VaultSkeleton />
```

## Design Rules
- Match the final layout's spacing and proportions (3rem rounded corners, 12px gaps)
- Use `role="status"` and `aria-label="Loading..."` for accessibility
- Follow Royal Neo-Deco dimensions (24px/32px cards, wide padding)
- No color — neutral grays only (`slate-100`, `slate-200`)

## Route ↔ Skeleton Map

| Route | Skeleton |
|-------|----------|
| `dashboard.lazy.tsx` | `DashboardSkeleton` |
| `vault.lazy.tsx` | `VaultSkeleton` |
| `lockbox.lazy.tsx` | `TableSkeleton` |
| `soul-log.lazy.tsx` | `EditorSkeleton` |
| `memoirs.lazy.tsx` | `CardGridSkeleton` |
| `timecapsule.lazy.tsx` | `CardGridSkeleton` |
