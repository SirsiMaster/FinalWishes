#!/usr/bin/env bash
# Fix the two failing FinalWishes CI deploy jobs (Firestore/Storage Rules +
# Firebase Functions) by granting the CI deploy service account the IAM roles
# it is missing on the finalwishes-prod project.
#
# WHY THESE ARE NEEDED (from the actual CI failures):
#   - Functions: "Missing permissions ... iam.serviceAccounts.ActAs on
#     finalwishes-prod@appspot.gserviceaccount.com"  -> needs Service Account User
#   - Rules: "403 Permission denied to get service firestore.googleapis.com"
#     (serviceusage.services.get)                    -> needs Service Usage Consumer
#   Functions (Gen2) also needs Cloud Functions + build/registry roles to deploy.
#
# PREREQUISITES (you, once — the agent cannot do this; all local gcloud tokens
# for finalwishes-prod are expired and re-auth is interactive):
#   gcloud auth login                 # use the finalwishes-prod OWNER account
#   gcloud config set project finalwishes-prod
#
# Then run:  bash scripts/fix-ci-deploy-permissions.sh
#
# The CI deploy SA is the identity inside the GitHub secret used by the Functions
# and Rules jobs (FIREBASE_SERVICE_ACCOUNT_FINALWISHES_PROD). If you don't know
# its email, this script will list the project service accounts so you can pick
# it; set DEPLOY_SA to that email and re-run.
set -euo pipefail

PROJECT="${PROJECT:-finalwishes-prod}"
DEPLOY_SA="${DEPLOY_SA:-}"

echo "Project: $PROJECT"

if [[ -z "$DEPLOY_SA" ]]; then
  echo
  echo "DEPLOY_SA not set. Service accounts in $PROJECT:"
  gcloud iam service-accounts list --project="$PROJECT" --format="table(email,displayName)"
  echo
  echo "Re-run with the CI deploy SA, e.g.:"
  echo "  DEPLOY_SA=firebase-adminsdk-xxxxx@${PROJECT}.iam.gserviceaccount.com bash scripts/fix-ci-deploy-permissions.sh"
  echo
  echo "(It is the service account whose JSON key is stored in the GitHub secret"
  echo " FIREBASE_SERVICE_ACCOUNT_FINALWISHES_PROD — the Firebase Hosting/admin SA.)"
  exit 1
fi

MEMBER="serviceAccount:${DEPLOY_SA}"
APPSPOT="${PROJECT}@appspot.gserviceaccount.com"

echo "Granting deploy roles to ${DEPLOY_SA} on ${PROJECT} ..."

# Rules deploy: read service config (fixes the 403 serviceusage.services.get).
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="$MEMBER" --role="roles/serviceusage.serviceUsageConsumer" --condition=None --quiet

# Rules deploy: manage Firebase Security Rules.
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="$MEMBER" --role="roles/firebaserules.admin" --condition=None --quiet

# Functions deploy (Gen2): functions, the underlying Cloud Run, builds, images.
for ROLE in \
  roles/cloudfunctions.admin \
  roles/run.admin \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountUser ; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="$MEMBER" --role="$ROLE" --condition=None --quiet
done

# Functions deploy: explicit ActAs on the App Engine runtime SA (the exact
# resource named in the failure), in case project-level binding is scoped.
gcloud iam service-accounts add-iam-policy-binding "$APPSPOT" \
  --project="$PROJECT" \
  --member="$MEMBER" --role="roles/iam.serviceAccountUser" --quiet || true

echo
echo "Done. Re-run the deploy by pushing to main, or replay the last run:"
echo "  gh run rerun --failed \$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')"
