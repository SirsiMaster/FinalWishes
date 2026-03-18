---
description: DevOps and CI/CD pipeline workflow for FinalWishes
---
// turbo-all

# DevOps Pipeline Workflow

## Git Workflow
- Branch: `develop` (primary development branch)
- Push protocol: `git status` → `git add -A` → `git commit -m "type: message"` → `git push origin develop`
- Identity: SirsiMaster account ONLY

## Commit Message Convention
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructure
- `docs:` — Documentation
- `style:` — Visual/CSS changes
- `rule:` — Governance rule changes
- `chore:` — Maintenance

## Deploy Pipeline
1. Web: `cd web && npm run build && cd .. && firebase deploy --only hosting`
2. Rules: `firebase deploy --only firestore:rules,storage`
3. API: `cd api && docker build -t finalwishes-api . && gcloud run deploy`
4. Full: `firebase deploy`

## Verification Checklist
- [ ] `npm run build` exits with 0 errors
- [ ] `firebase deploy` succeeds
- [ ] `git push` succeeds
- [ ] Production site loads: https://legacy-estate-os.web.app
