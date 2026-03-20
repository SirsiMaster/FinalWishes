# Identity Components — Developer README

## Overview
Identity verification components for FinalWishes' tiered security model (ADR-035).

## Architecture

```
components/identity/
├── AttestationForm.tsx    # Canvas signature + legal declaration
├── MFAEnrollment.tsx      # Shared TOTP enrollment UI (QR + verify)
└── README.md              # This file

components/guards/
├── AuthGuard.tsx           # Login gate (all authenticated routes)
└── IdentityGate.tsx        # MFA + attestation gate (fiduciary routes)
```

## Components

### `IdentityGate` (`guards/IdentityGate.tsx`)
**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | Yes | The estate ID to check attestation against |
| `children` | `ReactNode` | Yes | Content to render when gate passes |

**Behavior:**
- Tier 1 roles (`principal`, `admin`) → children rendered immediately
- Tier 2 roles (`heir`, `executor`, `legal`, `cpa`) → checks MFA enrollment AND attestation status
- Shows step-by-step wizard if either is incomplete
- Queries `attestations` Firestore collection for verification status

**Dependencies:**
- `useAuth()` hook → user profile and role
- `getMFAStatus()` → Firebase Auth MFA check
- Firestore `attestations/{uid}_{estateId}` → attestation lookup

### `AttestationForm` (`identity/AttestationForm.tsx`)
**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `estateId` | `string` | Yes | Estate being attested for |
| `estateName` | `string` | Yes | Human-readable estate name (for legal text) |
| `onComplete` | `() => void` | No | Callback after successful submission |

**Behavior:**
- Renders legal declaration text dynamically (fullName, role, estateName)
- Canvas-based signature pad (supports mouse + touch)
- Acknowledgment checkbox required
- Stores to Firestore `attestations/{uid}_{estateId}` with base64 signature data
- Shows success confirmation with verification details

**Firestore Document Schema:**
```typescript
{
  uid: string;              // Firebase Auth UID
  estateId: string;         // Estate identifier
  role: string;             // heir | executor | legal | cpa
  fullLegalName: string;    // From user profile
  attestationText: string;  // Full legal declaration
  signatureData: string;    // Base64 PNG of canvas signature
  signedAt: Timestamp;      // Server timestamp
  userAgent: string;        // Browser user agent
  status: 'verified';       // Auto-verified in v1
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## MFA Service (`lib/mfa.ts`)
| Function | Purpose |
|----------|---------|
| `startTotpEnrollment(user)` | Generate TOTP secret + QR URL |
| `finalizeTotpEnrollment(user, secret, code)` | Verify code and activate MFA |
| `resolveTotpChallenge(resolver, code)` | Handle login MFA challenge |
| `getMFAStatus(user)` | Check if MFA is enrolled |
| `unenrollTotp(user)` | Remove MFA from account |
| `getMFAResolver(error)` | Extract resolver from auth error |

## Firestore Rules
```
attestations/{attestationId}
├── read: own uid OR estate principal
├── create: own uid, required fields, fiduciary role
├── update: admin OR estate principal (revocation)
└── delete: NEVER (permanent records)
```

## Known Limitations
- Attestation is auto-verified (v1) — future: principal approval flow
- Signature pad is client-side canvas — not a formal KYC/identity verification
- IP address recording should be moved to server-side (Go API) for tampering resistance
- No notarization support yet (future: state-specific notary integration)

## Related ADRs
- [ADR-034: Firebase Authentication](../../docs/ADR-034-FIREBASE-AUTH.md)
- [ADR-035: Tiered Identity Verification](../../docs/ADR-035-TIERED-IDENTITY-VERIFICATION.md)

## Related Diagrams
- [§5: Identity Gate Flow](../../docs/IDENTITY-WORKFLOW-DIAGRAMS.md)
- [§6: Attestation Signing Flow](../../docs/IDENTITY-WORKFLOW-DIAGRAMS.md)
- [§10: End-to-End Fiduciary Onboarding](../../docs/IDENTITY-WORKFLOW-DIAGRAMS.md)
