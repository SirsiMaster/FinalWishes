# Deployment Guide
## FinalWishes — The Estate Operating System
**Version:** 3.0.0 | **Date:** April 2026

---

## 1. Overview

This guide documents the deployment procedures for the FinalWishes estate planning platform. All infrastructure runs on Google Cloud Platform, with Firebase Hosting as the CDN edge, Cloud Run as the backend compute layer, and Cloud SQL as the encrypted PII vault.

**Firebase Project:** `finalwishes-prod`
**Hosting URL:** `https://finalwishes-prod.web.app`
**Backend Service:** `finalwishes-api` on Cloud Run (`us-central1`)

---

## 2. Infrastructure

| Layer | Technology | Details |
|:---|:---|:---|
| **Frontend** | React 19 + Vite 8 SPA | Firebase Hosting at `finalwishes-prod.web.app` |
| **API Backend** | Go 1.26 (Chi + ConnectRPC) | Cloud Run service `finalwishes-api` in `us-central1` |
| **Database (Real-time)** | Firestore | Estate data, invitations, real-time sync |
| **Database (PII Vault)** | Cloud SQL PostgreSQL 15 | Envelope encryption via Cloud KMS |
| **Auth** | Firebase Auth + Identity Platform | MFA (TOTP) required |
| **Storage** | Cloud Storage | Signed URL uploads via Go API |
| **Functions** | Firebase Cloud Functions (Node.js 22) | `us-central1`, 2 triggers: `autoMatchInvitation` + `sendMail` |
| **Email** | Gmail API via Cloud Function | Domain-wide delegation, impersonates `admin@sirsi.ai` |
| **AI** | Claude Opus (sirsi-ai SDK) | Primary; Genkit fallback |
| **Payments** | Stripe | Checkout + Webhooks via Go API |
| **E-Signatures** | OpenSign proxy via Go API | `/api/v1/opensign/create-envelope` |
| **Encryption** | Cloud KMS | Keyring `finalwishes-keyring/pii-vault-key` (us-central1), AES-256-GCM |
| **CI/CD** | GitHub Actions | `firebase-hosting-merge.yml` (deploy on merge), `firebase-hosting-pull-request.yml` (preview on PR) |

---

## 3. Deployment Commands

### 3.1 Frontend (Firebase Hosting)

```bash
cd web && npm run build && firebase deploy --only hosting
```

### 3.2 Cloud Functions

```bash
firebase deploy --only functions
```

### 3.3 Go API (Cloud Run)

```bash
gcloud run deploy finalwishes-api --source api/ --region us-central1
```

### 3.4 Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3.5 Storage Rules

```bash
firebase deploy --only storage
```

---

## 4. CI/CD Pipelines

| Workflow | File | Trigger |
|:---|:---|:---|
| Production Deploy | `.github/workflows/firebase-hosting-merge.yml` | Merge to `main` |
| Preview Deploy | `.github/workflows/firebase-hosting-pull-request.yml` | Pull request opened/updated |

---

## 5. Environment Variables (Cloud Run)

| Variable | Source | Purpose |
|:---|:---|:---|
| `GOOGLE_CLOUD_PROJECT` | Set to `finalwishes-prod` | GCP project identification |
| `STRIPE_SECRET_KEY` | Secret Manager | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | Secret Manager | Webhook signature verification |
| `OPENSIGN_API_URL` | Secret Manager | OpenSign e-signature service URL |
| `OPENSIGN_API_KEY` | Secret Manager | OpenSign API authentication |
| `VAULT_DB_*` | Secret Manager / Cloud SQL | Cloud SQL connection parameters |
| `GEMINI_API_KEY` | Secret Manager | Fallback AI (Genkit) |
| `STRIPE_SUCCESS_URL` | Environment | `https://finalwishes-prod.web.app/estates/{estate_id}/pricing?success=true` |
| `STRIPE_CANCEL_URL` | Environment | `https://finalwishes-prod.web.app/estates/{estate_id}/pricing?cancelled=true` |
| `APP_BASE_URL` | Environment | Canonical web origin for generated Stripe checkout and portal return URLs. Leave unset before DNS cutover; set to `https://finalwishes.app` after CR-05 passes DNS + TLS verification. |

---

## 6. Secret Manager Secrets

| Secret Name | Purpose |
|:---|:---|
| `stripe-secret-key` | Stripe API key |
| `stripe-publishable-key` | Stripe client-side key |
| `stripe-webhook-secret` | Stripe webhook signature verification |
| `vault-db-password` | Cloud SQL PII vault database password |
| `opensign-api-url` | OpenSign service endpoint |
| `gemini-api-key` | Genkit fallback AI key |
| `gmail-sa-key` | Gmail service account key (domain-wide delegation) |

---

## 7. Firebase Project Configuration

| Setting | Value |
|:---|:---|
| **Project ID** | `finalwishes-prod` |
| **Hosting** | `finalwishes-prod.web.app` |
| **Functions Runtime** | Node.js 22 |
| **Functions Region** | `us-central1` |
| **Firestore Rules** | v5.0.0+ |
| **Storage Rules** | v2.0.0 |

---

## 8. Encryption

All PII is encrypted at rest using Cloud KMS envelope encryption:

- **Keyring:** `finalwishes-keyring` (us-central1)
- **Key:** `pii-vault-key`
- **Algorithm:** AES-256-GCM
- **Storage:** Cloud SQL PostgreSQL 15 (encrypted columns)
- **AAD:** Per-estate additional authenticated data

---

## 9. Rollback Procedures

### 9.1 Frontend Rollback

```bash
# Option A: Firebase Console → Hosting → Release History → Roll back
# Option B: Redeploy previous commit
cd web && git checkout <previous-sha> && npm run build && firebase deploy --only hosting
```

### 9.2 Backend Rollback (Cloud Run)

```bash
gcloud run services update-traffic finalwishes-api \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region us-central1 \
  --project finalwishes-prod
```

### 9.3 Cloud Functions Rollback

```bash
git checkout <previous-sha> -- functions/
firebase deploy --only functions
```

---

## 10. Pre-Deployment Checklist

- [ ] `npm run build` succeeds with zero errors (in `web/`)
- [ ] Firestore rules validated locally
- [ ] Storage rules validated locally
- [ ] Go API builds and passes tests (`cd api && go test ./...`)
- [ ] Git commit with traceability refs (per Rule 29)
- [ ] Git push to `origin main`

## 11. Post-Deployment Verification

- [ ] SPA loads at `https://finalwishes-prod.web.app`
- [ ] Authentication flow completes (login, MFA prompt)
- [ ] Estate dashboard renders with real-time data
- [ ] Stripe checkout redirects correctly
- [ ] Document upload via signed URL succeeds
- [ ] No console errors in DevTools
- [ ] Cloud Run logs show healthy API responses

---

## Document Control

| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft (AWS/Terraform) |
| 2.0.0 | 2026-02-09 | Antigravity | Rewrite for Sirsi Sign (GCP/Firebase/Cloud Run) |
| 3.0.0 | 2026-04-17 | Antigravity | Complete rewrite for FinalWishes estate platform |
