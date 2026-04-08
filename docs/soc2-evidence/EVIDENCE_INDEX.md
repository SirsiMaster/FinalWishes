# SOC 2 Evidence Collection — FinalWishes

**Collected:** 2026-04-08
**GCP Project:** finalwishes-prod
**Region:** us-central1

## Evidence Files

| File | Description |
|------|-------------|
| `iam-policy.json` | GCP IAM policy — all role bindings for the project |
| `enabled-apis.json` | All enabled Google Cloud APIs |
| `cloud-run-config.json` | Cloud Run service config (env vars, secrets, networking, scaling) |
| `cloud-sql-config.json` | Cloud SQL instance config (finalwishes-pii-vault) |
| `firestore-rules.txt` | Firestore security rules (from local — `firebase firestore:rules:get` is not a valid CLI command) |
| `storage-rules.txt` | Cloud Storage security rules |
| `secrets-inventory.json` | Secret Manager inventory (names only, no values) |
| `cloud-armor-waf.json` | Cloud Armor WAF policy with SQLi, XSS, and rate limiting rules |
| `uptime-check.json` | Cloud Monitoring uptime check configuration |

## Security Controls Documented

1. **Authentication**: Firebase Auth with MFA (TOTP), verified via auth middleware on all protected routes
2. **Encryption at Rest**: Cloud KMS AES-256-GCM envelope encryption for PII vault
3. **Encryption in Transit**: HTTPS enforced (Cloud Run managed TLS)
4. **Rate Limiting**: Application-level (100 req/60s/IP, 10min ban) + Cloud Armor WAF policy
5. **WAF**: Cloud Armor policy with OWASP ModSecurity CRS (SQLi + XSS)
6. **Monitoring**: Uptime check every 5 minutes on API health endpoint
7. **Secret Management**: All secrets stored in Secret Manager, mounted as env vars in Cloud Run
8. **Network Isolation**: Cloud SQL with private IP, IAM-authenticated connections
