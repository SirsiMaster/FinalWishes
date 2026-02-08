# ADR-014: Bipartite Contract Execution Protocol

**Status:** Accepted  
**Date:** 2026-02-07  
**Decision Makers:** Cylton Collymore (CTO), Antigravity (Agent)  
**Supersedes:** Partial content in `SIGNING_PAYMENT_FLOW.md` v1.0.0

## Context

The Sirsi Vault's original contract execution flow (v1.0.0) was designed as a **unilateral ceremony** — a single signer (the client) signs, pays, and the contract is "executed." This model has two critical legal shortcomings:

1. **No Provider Countersignature**: A Master Services Agreement (MSA) requires mutual assent. A single signature does not constitute a fully executed contract under contract law (Restatement (Second) of Contracts § 17).
2. **No Provable Dual Evidence**: The original flow produced one SHA-256 hash for one signature. A fully executed agreement requires independent cryptographic evidence from both parties to establish a tamper-proof audit trail.
3. **No Role Separation**: The UI treated every authenticated user identically, regardless of whether they were the service provider (Sirsi Technologies) or the client.

The Bipartite Contract Execution Protocol introduces a **dual-signature ceremony** with role-aware workflows, independent evidence chains, and a legally complete status lifecycle.

## Decision

Implement a **Bipartite (Two-Party) Contract Execution Protocol** with the following architecture:

### 1. Role Detection & Resolution

The system resolves the authenticated user's role at component mount:

| Condition | Resolved Role | UI Path |
|:---|:---|:---|
| `userEmail === 'cylton@sirsi.ai'` or matches `countersignerEmail` | `provider` | Designate → Review → Countersign → Finalize |
| `userEmail === clientEmail` on record | `client` | Verify Identity → Review → Sign → Execute |
| `clientEmail` is empty AND email is `cylton@sirsi.ai` | `provider` | Provider path (first-time contract creation) |
| `clientEmail` is empty AND email is NOT `cylton@sirsi.ai` | `client` | Client path (first-time access) |
| Email matches neither party | `viewer` | Read-only access |

### 2. Dual-Signature Ceremony

#### Client Path (4 Steps)
| Step | Label | Action |
|:---|:---|:---|
| 1 | Verify Identity | Pre-fill name/email from Firebase Auth |
| 2 | Review Documents | Review MSA + SOW, confirm legal acknowledgment |
| 3 | Sign Agreement | Capture signature (draw/type), ESIGN acknowledgment |
| 4 | Execute Agreement | View evidence, select payment method, execute & deploy |

#### Provider Path (4 Steps)
| Step | Label | Action |
|:---|:---|:---|
| 1 | Designate Client | Enter client name/email/title, create draft contract |
| 2 | Review Documents | Review MSA + SOW, confirm legal acknowledgment |
| 3 | Countersign Agreement | View client's signature evidence, capture countersignature (or await client if not yet signed) |
| 4 | Finalize Agreement | View dual signatures, finalize & countersign (no payment) |

### 3. Contract Status Lifecycle

```
DRAFT (1) → ACTIVE (2) → SIGNED (3) → WAITING_FOR_COUNTERSIGN (6) → FULLY_EXECUTED (7)
                                   ↘ PAID (4)
                                   ↘ ARCHIVED (5)
```

| Status | Value | Meaning |
|:---|:---|:---|
| `CONTRACT_STATUS_DRAFT` | 1 | Contract created, not yet reviewed |
| `CONTRACT_STATUS_ACTIVE` | 2 | Contract active, in review |
| `CONTRACT_STATUS_SIGNED` | 3 | Client has signed |
| `CONTRACT_STATUS_PAID` | 4 | Payment confirmed |
| `CONTRACT_STATUS_ARCHIVED` | 5 | Archived/inactive |
| `CONTRACT_STATUS_WAITING_FOR_COUNTERSIGN` | 6 | Client signed, awaiting provider countersignature |
| `CONTRACT_STATUS_FULLY_EXECUTED` | 7 | Both parties have signed — contract is legally binding |

### 4. Cryptographic Evidence Chain

Each signature produces an independent evidence record:

| Evidence Field | Client | Provider (Countersigner) |
|:---|:---|:---|
| Signature Image | `signatureImageData` | `countersignerSignatureImageData` |
| SHA-256 Hash | `signatureHash` | `countersignerSignatureHash` |
| Timestamp | `signedAt` (via `updatedAt`) | `countersignerSignedAt` |
| Envelope ID | `contractId` (shared) | `contractId` (shared) |

**Hash Algorithm:** SHA-256 via `crypto.subtle.digest()` — computed client-side on the Base64 signature image data.

### 5. Status Guard (Countersign Gate)

When the provider reaches Step 3, the system checks the contract's current status:

- **If status < `WAITING_FOR_COUNTERSIGN` (6)**: Display "Awaiting Client Signature" guard with a "Refresh Status" button. The provider cannot countersign until the client has signed.
- **If status ≥ `WAITING_FOR_COUNTERSIGN` (6)**: Display the client's signature as evidence and present the countersignature pad.

### 6. Backend Status Normalization

The gRPC server (`server.js`) normalizes status values across string and numeric formats:

```javascript
// Accepts: 'FULLY_EXECUTED', 7, 'CONTRACT_STATUS_FULLY_EXECUTED'
if (updateData.status === 'FULLY_EXECUTED' || updateData.status === 7 || 
    updateData.status === 'CONTRACT_STATUS_FULLY_EXECUTED') {
    updateData.status = 'FULLY_EXECUTED';
    updateData.countersignedAt = updateData.countersignerSignedAt || Date.now();
}
```

### 7. Email Notifications

| Event | Recipient | Subject Pattern |
|:---|:---|:---|
| Client signs | Provider | `✍️ New Signature: {projectName}` |
| Provider countersigns | Client | `✅ Agreement Fully Executed: {projectName}` |

## Alternatives Considered

### Alternative 1: Third-Party E-Sign (DocuSign/HelloSign)
- **Pros:** Industry-standard, legally tested, built-in dual-signature routing
- **Cons:** $25-50/envelope cost, vendor lock-in, no control over evidence format, external dependency for core business logic
- **Cost:** ~$3,000-6,000/year at projected volume
- **Verdict:** Rejected — violates "Integrated Independence" (ADR-011) and Rule 10

### Alternative 2: Sequential Email-Based Signing
- **Pros:** Simple, no UI changes needed
- **Cons:** Poor UX, no real-time status, no in-app evidence chain, disjointed from Vault
- **Verdict:** Rejected — undermines the "Living Record" architecture

### Alternative 3: Single-Signer with Auto-Countersign
- **Pros:** Fastest to implement, minimal UI changes
- **Cons:** Legally questionable — auto-signing removes genuine assent, no independent evidence
- **Verdict:** Rejected — does not satisfy mutual assent requirement

## Justification

The in-house Bipartite Protocol was chosen because:

1. **Legal Completeness**: Produces two independent, cryptographically hashed signatures with timestamps — satisfying ESIGN Act and UETA requirements for electronic contracts.
2. **Cost Efficiency**: Zero per-envelope cost vs. $25-50 with DocuSign.
3. **Architectural Alignment**: Keeps all signing logic within the Sirsi Vault ecosystem, maintaining the "Integrated Independence" principle.
4. **Audit Trail Superiority**: SHA-256 evidence is permanently stored in Firestore alongside the contract record — no external API needed to verify.
5. **Role-Aware UX**: Provider and client see purpose-built workflows, reducing confusion and errors.

### Industry Comparison

| Company | Approach | Notes |
|:---|:---|:---|
| DocuSign | External SaaS | $25-50/envelope, industry standard |
| PandaDoc | External SaaS | Built-in dual-sign, $19-49/mo |
| Ironclad | In-house + API | Enterprise contract lifecycle |
| **Sirsi (ADR-014)** | **In-house Bipartite** | **Zero cost, full control, SHA-256 evidence** |

## Consequences

### Positive
- Legally complete dual-signature execution
- Zero marginal cost per contract
- Full audit trail with independent cryptographic evidence
- Role-aware UI reduces user error
- Status guards prevent out-of-order signing

### Negative
- Increased UI complexity (role-conditional rendering in `SirsiVault.tsx`)
- Additional proto fields and backend status handling
- Requires testing both role paths independently

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|:---|:---|:---|:---|
| Role detection fails for new users | Low | Medium | Default to `client` role; explicit `cylton@sirsi.ai` check for provider |
| Status desync between frontend and backend | Medium | Medium | "Refresh Status" button; `fetchContractStatus` polling |
| Browser cache serves stale build | Low | Low | Vite hash-based filenames; cache-busting query params |
| Signature image too large for Firestore | Low | High | Base64 size validation before storage |

## Implementation Artifacts

| Artifact | Location | Purpose |
|:---|:---|:---|
| Proto Schema | `packages/finalwishes-contracts/proto/contracts/v1/contracts.proto` | `FULLY_EXECUTED` status, countersigner fields |
| Frontend | `packages/finalwishes-contracts/src/components/tabs/SirsiVault.tsx` | Role detection, dual-step rendering, evidence computation |
| Backend | `packages/sirsi-opensign/services/contracts-grpc/src/server.js` | Status normalization, countersigner storage, email dispatch |
| gRPC Client | `packages/finalwishes-contracts/src/lib/grpc.ts` | Connect-based client with auth interceptor |

## References

- ESIGN Act (15 U.S.C. § 7001 et seq.) — Federal electronic signature validity
- UETA (Uniform Electronic Transactions Act) — State-level electronic signature framework
- Restatement (Second) of Contracts § 17 — Mutual assent requirement
- ADR-011: Infrastructure License & Services Model ("Integrated Independence")
- ADR-012: Dynamic Financial Calculation & Multipliers
- `SIGNING_PAYMENT_FLOW.md` v2.0.0 — Updated workflow documentation

---

*Accepted: 2026-02-07*
