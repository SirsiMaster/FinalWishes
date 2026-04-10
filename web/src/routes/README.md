# Route Architecture

> TanStack Router file-based routing with estate layout wrapper and auth guards.

## Architecture

Routes use TanStack Router's file-based convention. The `estates.$estateId.tsx` layout wraps all estate sub-routes with `AuthGuard` + `IdentityGate` + Sidebar + AdminHeader. Estate ID comes from the URL param `$estateId`.

## Route Map

| File | Route | Purpose |
|------|-------|---------|
| `__root.tsx` | `/` | Root layout |
| `index.tsx` | `/` | Landing page |
| `login.tsx` | `/login` | Authentication |
| `dashboard.tsx` | `/dashboard` | Estate selector |
| `estates.create.tsx` | `/estates/create` | New estate wizard |
| `estates.$estateId.tsx` | `/estates/:id` | Estate layout (auth + sidebar) |
| `estates.$estateId.index.tsx` | `/estates/:id/` | Estate overview redirect |
| `estates.$estateId.dashboard.tsx` | `.../dashboard` | Estate dashboard |
| `estates.$estateId.assets.tsx` | `.../assets` | Asset inventory |
| `estates.$estateId.beneficiaries.tsx` | `.../beneficiaries` | Heirs + executors |
| `estates.$estateId.directives.tsx` | `.../directives` | Ethical wills, funeral prefs |
| `estates.$estateId.vault.tsx` | `.../vault` | Document vault |
| `estates.$estateId.lockbox.tsx` | `.../lockbox` | Encrypted credentials |
| `estates.$estateId.memoirs.tsx` | `.../memoirs` | Video/photo memories |
| `estates.$estateId.timecapsule.tsx` | `.../timecapsule` | Scheduled messages |
| `estates.$estateId.obituary.tsx` | `.../obituary` | AI-assisted obituary |
| `estates.$estateId.heirlooms.tsx` | `.../heirlooms` | Physical item catalog |
| `estates.$estateId.notifications.tsx` | `.../notifications` | Activity feed |
| `estates.$estateId.settings.tsx` | `.../settings` | Estate configuration |
| `estates.$estateId.pricing.tsx` | `.../pricing` | Stripe checkout |
| `estates.$estateId.attestation.tsx` | `.../attestation` | Identity verification |
| `estates.$estateId.estates.tsx` | `.../estates` | Multi-estate management |

## Guards

- **AuthGuard**: Redirects unauthenticated users to `/login`
- **IdentityGate**: Blocks access until identity verification is complete

## Known Limitations

- Demo mode uses query param `?demo=true` with hardcoded `lockhart` estate ID
- No route-level code splitting yet — all estate routes load with the layout
