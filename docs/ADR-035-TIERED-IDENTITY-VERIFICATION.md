# ADR-035: Tiered Identity Verification (MFA + Attestation by Role)
**Status:** Proposed  
**Date:** 2026-03-19  
**Author:** Antigravity  
**Supersedes:** None  
**Relates To:** ADR-034 (Firebase Auth), GEMINI.md Rule 26 (PII Siloing)

---

## Context

FinalWishes manages legally binding estate documents, beneficiary designations, and fiduciary access controls. Not all users represent the same risk profile:

- A **principal** (estate owner) is managing their own data — standard auth is sufficient.
- An **heir**, **executor**, **legal professional**, or **CPA** has fiduciary access to someone else's estate — they must prove they are who they claim to be.

## Decision

### Two-Tier Identity Verification Model

| | Tier 1: Principal | Tier 2: Fiduciary |
|---|---|---|
| **Roles** | `principal` | `heir`, `executor`, `legal`, `cpa` |
| **Email + Password** | ✅ Required | ✅ Required |
| **Email Verification** | ✅ Required | ✅ Required |
| **MFA (TOTP)** | ⭕ Optional | 🔒 **Mandatory** |
| **Identity Attestation** | ❌ Not required | 🔒 **Mandatory** |
| **Access Level** | Full access to own estate | Cannot view estate documents until MFA + attestation complete |

### Identity Attestation Flow

When a user is assigned a Tier 2 role (invited as heir/executor/legal/CPA by a principal):

```
1. Principal invites person → email sent
2. Invitee creates account (standard registration)
3. System assigns role (heir/executor/legal/cpa)
4. User sees "Identity Verification Required" gate
5. Step A: Enable MFA (TOTP enrollment)
6. Step B: Sign Identity Attestation Form
   └─ "I, [Full Legal Name], attest under penalty of perjury
       that I am the individual designated as [role] for the
       [Estate Name] estate. I understand that providing false
       information may result in legal consequences."
   └─ Digital signature (via Sirsi Sign integration when available,
       or in-app signature capture as interim)
   └─ Timestamp + IP address + device fingerprint recorded
7. Attestation stored in Firestore: attestations/{uid}_{estateId}
8. Principal notified: "[Name] has verified their identity"
9. User granted full role access
```

### Enforcement Points

| Layer | Mechanism |
|-------|-----------|
| **Frontend** | `IdentityGate` component wraps Tier 2 routes — shows enrollment wizard if MFA or attestation incomplete |
| **Backend** | Go middleware checks `users/{uid}.mfaEnrolled` and `attestations/{uid}_{estateId}.status === 'verified'` before serving fiduciary data |
| **Firestore Rules** | Estate subcollections (assets, documents, heirs) require attestation for non-principal access |

### Firestore Schema Additions

```
attestations/{attestationId}
├── uid: string
├── estateId: string
├── role: 'heir' | 'executor' | 'legal' | 'cpa'
├── fullLegalName: string
├── attestationText: string (full legal declaration)
├── signatureData: string (base64 signature image or Sirsi Sign reference)
├── signedAt: timestamp
├── ipAddress: string (server-recorded, not client-sent)
├── userAgent: string
├── status: 'pending' | 'verified' | 'revoked'
├── verifiedBy: string (principal uid who accepted)
├── createdAt: timestamp
├── updatedAt: timestamp

users/{uid}
├── ... existing fields ...
├── mfaEnrolled: boolean (synced from Firebase Auth MFA status)
├── attestations: string[] (list of attestation IDs)
```

## Implementation Sprint

| # | Task | Priority | Est |
|:-:|------|:--------:|:---:|
| 1 | MFA enrollment UI in Settings page (QR code + verify) | P0 | 45 min |
| 2 | `IdentityGate` component (checks role → gates on MFA + attestation) | P0 | 30 min |
| 3 | Attestation form UI (legal text + signature capture) | P1 | 60 min |
| 4 | Firestore rules for attestations collection | P1 | 15 min |
| 5 | Go API middleware for fiduciary access checks | P1 | 30 min |
| 6 | Principal notification: "X verified their identity" | P2 | 20 min |
| 7 | Sirsi Sign integration for attestation (when available) | P3 | Deferred |

## What We Build NOW (This Sprint)

### Ticket 1: MFA Enrollment in Settings
- Add "Account Security" section to Settings page
- QR code display via `qrcode.react`
- 6-digit verification input
- Status indicator (MFA active / not active)
- Uses existing `mfa.ts` service

### Ticket 2: IdentityGate Component
- Wraps estate routes for Tier 2 users
- Checks: role → is MFA enrolled? → is attestation signed?
- Shows step-by-step wizard if incomplete
- Allows Tier 1 users (principals) to pass through without gate

### Ticket 3: Attestation Form
- Legal declaration text (dynamically generated per role/estate)
- Signature pad (canvas-based signature capture)
- Confirmation checkbox: "I understand this is legally binding"
- Stored in Firestore attestations collection

## Consequences

### Positive
- Legal defensibility: fiduciary access is backed by signed attestation
- SOC 2 compliance: role-based access with MFA enforcement
- Audit trail: every fiduciary access is traceable to a verified identity

### Negative
- Onboarding friction for Tier 2 users (mitigated by clear wizard UX)
- Attestation ≠ formal identity verification (KYC). For v2, consider integrating a proper KYC provider (e.g., Stripe Identity, Persona)

### Risks
- Signature pad may not hold up legally in all states without a witnessing protocol
- Future enhancement: notarized attestation option for high-value estates
