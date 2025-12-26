#!/bin/bash
set -e

echo "Deploying DocuSeal to Cloud Run (Project: sirsi-nexus-live)..."

gcloud run deploy docuseal-signer \
  --image docuseal/docuseal:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances sirsi-nexus-live:us-central1:sirsi-vault-sql \
  --set-env-vars "DATABASE_URL=postgresql://postgres:SirsiVaultSecure2025!@localhost/postgres?host=/cloudsql/sirsi-nexus-live:us-central1:sirsi-vault-sql" \
  --set-env-vars "DOCUSEAL_URL=https://sign.sirsi.ai" \
  --set-env-vars "GCS_PROJECT=sirsi-nexus-live" \
  --set-env-vars "GCS_BUCKET=sirsi-vault-storage" \
  --port 3000

echo "Deployment complete. Map domain 'sign.sirsi.ai' to the Cloud Run service via Cloud Console -> Cloud Run -> Manage Custom Domains."
