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
| `estates.$estateId.dashboard.tsx` ⚡ | `.../dashboard` | Estate dashboard |
| `estates.$estateId.assets.tsx` | `.../assets` | Asset inventory |
| `estates.$estateId.beneficiaries.tsx` | `.../beneficiaries` | Heirs + executors |
| `estates.$estateId.directives.tsx` ⚡ | `.../directives` | Ethical wills, funeral prefs |
| `estates.$estateId.vault.tsx` ⚡ | `.../vault` | Document vault |
| `estates.$estateId.lockbox.tsx` ⚡ | `.../lockbox` | Encrypted credentials |
| `estates.$estateId.memoirs.tsx` ⚡ | `.../memoirs` | Video/photo memories |
| `estates.$estateId.timecapsule.tsx` ⚡ | `.../timecapsule` | Scheduled messages |
| `estates.$estateId.obituary.tsx` ⚡ | `.../obituary` | AI-assisted obituary |
| `estates.$estateId.soul-log.tsx` ⚡ | `.../soul-log` | Soul Log — per-recipient legacy entries |
| `estates.$estateId.life-chapters.tsx` | `.../life-chapters` | Life chapters / legacy timeline |
| `estates.$estateId.probate.tsx` | `.../probate` | Probate / estate settlement workflow |
| `estates.$estateId.forms.tsx` | `.../forms` | Statutory legal forms (coordinate-overlay fill) |
| `estates.$estateId.heirlooms.tsx` | `.../heirlooms` | Physical item catalog |
| `estates.$estateId.events.tsx` | `.../events` | Funeral / memorial / repast pages |
| `estates.$estateId.notifications.tsx` | `.../notifications` | Activity feed |
| `estates.$estateId.settings.tsx` | `.../settings` | Estate configuration |
| `estates.$estateId.pricing.tsx` | `.../pricing` | Stripe checkout |
| `estates.$estateId.attestation.tsx` | `.../attestation` | Identity verification |
| `estates.$estateId.estates.tsx` | `.../estates` | Multi-estate management |

> ⚡ = route has a `.lazy.tsx` companion and is code-split (loaded on demand). The eager
> `.tsx` file holds the route definition + loader; the `.lazy.tsx` file holds the heavy
> component. Currently code-split: `dashboard`, `directives`, `lockbox`, `memoirs`,
> `obituary`, `soul-log`, `timecapsule`, `vault`.

## Guards

- **AuthGuard**: Redirects unauthenticated users to `/login`
- **IdentityGate**: Blocks access until identity verification is complete

## Known Limitations

- Demo mode uses query param `?demo=true` with hardcoded `lockhart` estate ID
- Code splitting is partial: the heaviest routes (see ⚡ above) ship `.lazy.tsx` companions,
  but lighter estate routes still load eagerly with the layout
