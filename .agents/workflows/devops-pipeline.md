---
description: DevOps and CI/CD pipeline workflow for FinalWishes
---

# Session D: DevOps & CI/CD Pipeline

## Prerequisites
- GitHub access to `SirsiMaster/FinalWishes`
- Firebase CLI installed
- gcloud CLI installed
- Access to `.github/`, `scripts/`, `firebase.json`

## Domain Scope
**ONLY touch files in:** `.github/**`, `scripts/**`, `firebase.json`
**Branch:** `feat/devops-pipeline`

## Step 1: Create Feature Branch
```bash
git checkout -b feat/devops-pipeline
```

## Step 2: Create GitHub Actions Workflows

### CI Pipeline (`.github/workflows/ci.yml`)
Triggers on: push to any `feat/*` branch, PR to `develop` and `main`
```yaml
Jobs:
  lint-api:
    - go vet ./...
    - golangci-lint run

  lint-web:
    - cd web && npm ci && npm run lint

  test-api:
    - go test ./... -v -cover

  test-functions:
    - cd functions && npm ci && npm test

  build-web:
    - cd web && npm ci && npm run build

  build-api:
    - docker build -t finalwishes-api ./api
```

### Deploy API (`.github/workflows/deploy-api.yml`)
Triggers on: push to `main` (path: `api/**`)
```yaml
Jobs:
  deploy:
    - Authenticate to GCP (Workload Identity Federation)
    - Build Docker image
    - Push to Google Artifact Registry
    - Deploy to Cloud Run
    - Verify health check
```

### Deploy Web (`.github/workflows/deploy-web.yml`)
Triggers on: push to `main` (path: `web/**`)
```yaml
Jobs:
  deploy:
    - npm ci && npm run build
    - firebase deploy --only hosting
```

### Deploy Functions (`.github/workflows/deploy-functions.yml`)
Triggers on: push to `main` (path: `functions/**`)
```yaml
Jobs:
  deploy:
    - cd functions && npm ci
    - firebase deploy --only functions
```

## Step 3: Create Deploy Scripts

### `scripts/deploy-api.sh`
```bash
#!/bin/bash
set -euo pipefail

PROJECT_ID="legacy-estate-os"
SERVICE_NAME="finalwishes-api"
REGION="us-east4"

echo "Building API..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME ./api

echo "Pushing to registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10

echo "Verifying..."
URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')
curl -f "$URL/health" || echo "Health check failed!"
```

### `scripts/deploy-web.sh`
```bash
#!/bin/bash
set -euo pipefail

echo "Building web app..."
cd web && npm ci && npm run build

echo "Deploying to Firebase Hosting..."
cd .. && firebase deploy --only hosting

echo "Done."
```

### `scripts/deploy-functions.sh`
```bash
#!/bin/bash
set -euo pipefail

echo "Installing dependencies..."
cd functions && npm ci

echo "Deploying Cloud Functions..."
cd .. && firebase deploy --only functions

echo "Done."
```

### `scripts/setup-local.sh`
```bash
#!/bin/bash
set -euo pipefail

echo "=== FinalWishes Local Setup ==="

echo "1. Installing web dependencies..."
cd web && npm install && cd ..

echo "2. Installing function dependencies..."
cd functions && npm install && cd ..

echo "3. Installing API dependencies..."
cd api && go mod download && cd ..

echo "4. Starting Firebase emulators..."
firebase emulators:start --only firestore,functions,storage,hosting &

echo "5. Starting web dev server..."
cd web && npm run dev &

echo "6. Starting API server..."
cd api && go run cmd/api/main.go &

echo "=== All services starting ==="
echo "Web:       http://localhost:3000"
echo "API:       http://localhost:8080"
echo "Emulators: http://localhost:4000"
```

## Step 4: Update firebase.json
Add SPA rewrite for web app, update hosting config:
```json
{
  "hosting": {
    "public": "web/out",
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

## Step 5: Create CODEOWNERS
```
# .github/CODEOWNERS
* @SirsiMaster

api/            @SirsiMaster
web/            @SirsiMaster
functions/      @SirsiMaster
docs/           @SirsiMaster
```

## Step 6: Create PR Template
`.github/pull_request_template.md`

## Step 7: Make Scripts Executable
```bash
chmod +x scripts/*.sh
```

## Step 8: Commit & Push
```bash
git add .github/ scripts/ firebase.json
git commit -m "feat(devops): CI/CD pipeline, deploy scripts, local setup"
git push origin feat/devops-pipeline
```

## DO NOT
- Touch application code in `api/`, `web/`, `functions/`, `mobile/`
- Modify `firestore.rules` or `storage.rules` (Session C)
- Change `GEMINI.md` or `docs/`
