#!/usr/bin/env bash
# Apply CORS to the vault storage bucket so browser signed-URL uploads work.
# Without this, cross-origin PUTs from the web app are blocked and uploads fail
# "most of the way through". Re-run after any bucket recreation.
#   bash infra/storage/apply-cors.sh
set -euo pipefail
BUCKET="${VAULT_BUCKET:-finalwishes-vault}"
DIR="$(cd "$(dirname "$0")" && pwd)"
gcloud storage buckets update "gs://${BUCKET}" --cors-file="${DIR}/vault-cors.json"
echo "Applied CORS to gs://${BUCKET}:"
gcloud storage buckets describe "gs://${BUCKET}" --format="value(cors_config)"
