# Deployment Guide
## Sirsi Sign — The Professional Document Vault
**Version:** 2.0.0 | **Date:** February 9, 2026

---

## 1. Overview

This guide documents the **verified deployment procedures** for the Sirsi Sign platform. All infrastructure runs on Google Cloud, with Firebase Hosting as the CDN edge and Cloud Run as the backend compute layer.

**Live Domain:** `https://sign.sirsi.ai`
**Firebase Project:** `sirsi-nexus-live`
**Backend Service:** `contracts-grpc` on Cloud Run (`us-east4`)

---

## 2. Repository Architecture

| Repository | Purpose | Branch |
|:---|:---|:---|
| `SirsiNexusApp` (Monorepo) | Core engine, gRPC services, UI packages | `main` |
| `111-Venture-Projects` | Studio governance, tenant configs, canonical docs | `main` |

### Key Packages (within SirsiNexusApp)

| Package | Role |
|:---|:---|
| `packages/finalwishes-contracts` | React 18 + Vite contract workflow application |
| `packages/sirsi-opensign` | Firebase Hosting + Cloud Functions deployment target |
| `packages/sirsi-ui` | Shared component library (Sirsi First — Rule 1) |

---

## 3. Frontend Deployment Pipeline

### 3.1 Build → Sync → Deploy (Manual)

The verified deployment sequence for the contract workflow UI:

```bash
# Step 1: Build the React application
cd packages/finalwishes-contracts
npx vite build

# Step 2: Sync build artifacts to hosting target
rsync -av --delete dist/ ../sirsi-opensign/public/

# Step 3: Deploy to Firebase Hosting
cd ../sirsi-opensign
npx firebase deploy --only hosting
```

**Result:** `sirsi-sign.web.app` (served via `sign.sirsi.ai`)

### 3.2 Critical Asset Sync Points

Static assets must be synchronized across these paths to prevent "technical drift":

| Source | Target |
|:---|:---|
| `finalwishes-contracts/public/assets/js/security-init.js` | `sirsi-opensign/public/assets/js/security-init.js` |
| `finalwishes-contracts/public/finalwishes/contracts/printable-msa.html` | `sirsi-opensign/public/finalwishes/contracts/printable-msa.html` |

The `rsync --delete` in Step 2 handles this automatically when syncing from the Vite `dist/` output.

### 3.3 Domain Mapping

| Domain | Target | Method |
|:---|:---|:---|
| `sign.sirsi.ai` | `sirsi-sign.web.app` | Firebase Hosting custom domain (DNS A/TXT verified) |

---

## 4. Backend Deployment (Cloud Run)

### 4.1 gRPC Service (`contracts-grpc`)

```bash
# From packages/sirsi-opensign/services/contracts-grpc
gcloud run deploy contracts-grpc \
  --source . \
  --region us-east4 \
  --project sirsi-nexus-live \
  --allow-unauthenticated
```

**Live Endpoint:** `https://contracts-grpc-210890802638.us-east4.run.app`

### 4.2 Service Capabilities

| Endpoint | Method | Purpose |
|:---|:---|:---|
| `CreateContract` | gRPC | Create new agreement in Firestore |
| `UpdateContract` | gRPC | Update status, amounts, signatures |
| `ListContracts` | gRPC | Query agreements by user/status |
| `DeleteContract` | gRPC | Remove agreement (admin) |
| `/stripe/create-checkout` | REST | Initialize Stripe Checkout Session |
| `/webhook` | REST | Stripe webhook receiver (payment confirmation) |

### 4.3 Environment Configuration

Secrets are managed via Cloud Run environment variables and Firestore vault:

| Variable | Source | Purpose |
|:---|:---|:---|
| `STRIPE_SECRET_KEY` | Cloud Run env | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | Cloud Run env | Webhook signature verification |
| `FIREBASE_PROJECT_ID` | Cloud Run env | Firestore connection |

---

## 5. Financial Rails

### 5.1 Stripe (Card Payments)

| Item | Status |
|:---|:---|
| Checkout Integration | ✅ Live |
| Webhook Registration | ✅ Active (11 events) |
| Live Mode | ✅ Enabled |
| Payment Methods | Card, Apple Pay (pending domain verification) |

### 5.2 Wire Transfer (Out-of-Band)

| Item | Status |
|:---|:---|
| Chase Instructions | ✅ Embedded in printable MSA |
| Settlement | Out-of-band, manual reconciliation |

### 5.3 Plaid ACH (Deferred)

| Item | Status |
|:---|:---|
| Link Infrastructure | 🔲 Scaffolded, not wired |
| Target | Weeks out |

---

## 6. Authentication & Security

| Component | Implementation | Status |
|:---|:---|:---|
| Firebase Auth | `browserLocalPersistence` | ✅ Live |
| MFA (TOTP) | Gate component exists | ⏳ Known issues (deferred) |
| CSP Headers | Stripe + Firebase whitelisted | ✅ Hardened |
| E-Signatures | SHA-256 hash + timestamp + envelopeId | ✅ Rule 18 compliant |

---

## 7. Rollback Procedures

### 7.1 Frontend Rollback

```bash
# Revert to previous commit
cd packages/finalwishes-contracts
git revert HEAD
npx vite build
rsync -av --delete dist/ ../sirsi-opensign/public/
cd ../sirsi-opensign
npx firebase deploy --only hosting
```

### 7.2 Backend Rollback

```bash
# Revert to previous Cloud Run revision
gcloud run services update-traffic contracts-grpc \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region us-east4 \
  --project sirsi-nexus-live
```

### 7.3 Firebase Hosting Rollback

```bash
# Roll back to previous hosting version via Console
# Firebase Console → Hosting → Release History → Roll back
```

---

## 8. Pre-Deployment Checklist

- [ ] `npx vite build` succeeds with zero errors
- [ ] `rsync` from `dist/` to `sirsi-opensign/public/`
- [ ] `firebase deploy --only hosting` succeeds
- [ ] Git commit with descriptive message
- [ ] Git push to `origin main`
- [ ] Verify live at `https://sign.sirsi.ai`

## 9. Post-Deployment Verification

- [ ] Landing page renders at `sign.sirsi.ai`
- [ ] Contract workflow loads at `/contracts/finalwishes`
- [ ] Printable MSA hydrates from URL params
- [ ] No console errors in DevTools
- [ ] Stripe Checkout redirects correctly
- [ ] Vault Dashboard loads at `/vault`

---

## Document Control

| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft (AWS/Terraform) |
| 2.0.0 | 2026-02-09 | Antigravity | **Complete rewrite** for Stack V4 (GCP/Firebase/Cloud Run) |
