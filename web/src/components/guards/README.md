# Guards — Developer README

## Architecture

```
components/guards/
├── AuthGuard.tsx          # Route protection — redirects unauthenticated users to /login
├── IdentityGate.tsx       # Tiered identity verification (ADR-035) — MFA + attestation
├── OwnerWelcome.tsx       # First-time owner onboarding screen (ETHOS.md §3)
├── OwnerWelcome.test.tsx  # Tests for OwnerWelcome
├── HeirWelcome.tsx        # First-time heir experience — "The Sacred Moment" (ETHOS.md §5)
├── HeirWelcome.test.tsx   # Tests for HeirWelcome
└── README.md              # This file
```

## AuthGuard

Route-level wrapper. If the user is not authenticated (Firebase Auth), redirects to `/login`. Shows a branded spinner while auth state resolves.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Protected route content |

### Dependencies
- `lib/auth.tsx` — `useAuth()` for `user` and `loading` state

---

## IdentityGate

Enforces tiered identity verification for estate routes. Governs by ADR-035.

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | Yes | The active estate ID |
| `children` | `ReactNode` | Yes | Content shown after verification passes |

### Verification Tiers

**Principal (estate owner):**
- Grace period: 24 hours AND < 3 logins → MFA banner shown but access allowed
- After grace period: MFA enrollment required, access blocked until enrolled

**Fiduciary (heir, executor, legal, CPA):**
1. Step 1: MFA enrollment (TOTP)
2. Step 2: Identity attestation (signed via `/estates/:id/attestation`)

Both steps must be completed before estate access is granted.

### Demo Mode Bypass
Users with UIDs starting with `user_` or `demo_` skip all verification gates. This is gated behind the `DEMO_MODE=true` environment flag.

### Dependencies
- `lib/auth.tsx` — `useAuth()` for user, profile, email verification
- `lib/mfa.ts` — `getMFAStatus()` for TOTP enrollment check
- `lib/firestore.ts` — `useDocument()` for user profile, attestation queries

---

## OwnerWelcome

First-time onboarding for estate owners. Shows once after estate creation, then the dashboard takes over. Designed per ETHOS.md §3 — "the owner IS the product."

### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | Yes | The new estate ID |
| `estateName` | `string` | Yes | Display name of the estate |
| `onContinue` | `() => void` | Yes | Callback to dismiss and enter dashboard |

---

## HeirWelcome

The heir's first moment in the app after an estate owner's passing. Shows the parent's face, voice, and words. Per ETHOS.md §5 — "The Sacred Moment."

### Dependencies
- `lib/firestore.ts` — `useEstate()`, `useTimeCapsules()`, `useHeirlooms()`, `useCollection()`
- `lib/auth.tsx` — `useAuth()` for heir profile

### Known Limitations
1. Soul Log video playback depends on browser codec support (no transcoding pipeline yet)
2. Time capsule delivery order is by `deliverAt` timestamp, not creation order
