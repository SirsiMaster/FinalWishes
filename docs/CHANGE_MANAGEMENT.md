# Change Management Plan
## Sirsi Sign — The Professional Document Vault
**Version:** 2.0.0 | **Date:** February 9, 2026

---

## 1. Change Control Process

### 1.1 Change Request Workflow
1. Issue identified or feature requested
2. Agent (Antigravity) performs critical analysis (Architecture, Security, Business impact)
3. ADR created for significant decisions (Rule 8)
4. Implementation executed: Plan → Build → Verify → Document (Rule 4)
5. Deploy via verified pipeline: `vite build` → `rsync` → `firebase deploy`
6. Git push to `origin main` with descriptive commit message
7. Canonical docs updated in `111-Venture-Projects`

### 1.2 Approval Authority
| Change Size | Approver |
|:---|:---|
| Bug fix / alignment | Antigravity (auto-deploy) |
| Feature addition | CEO approval required |
| Financial / legal changes | CEO + canonical doc review |
| Architecture changes | ADR required before execution |

## 2. Version Control

### 2.1 Repository Structure
| Repository | Purpose |
|:---|:---|
| `SirsiNexusApp` | Monorepo — all application code |
| `111-Venture-Projects` | Governance — canonical docs, ADRs, proposals |

### 2.2 Branching Strategy
- `main` — Production-ready code (direct push, no staging branch)
- All changes committed directly after local verification

### 2.3 Commit Standards
- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Descriptive multi-line commit messages explaining BEFORE/AFTER
- Immediate push to `origin main` after verification

## 3. Release Management

### 3.1 Release Cadence
| Type | Cadence | Process |
|:---|:---|:---|
| Hotfix | Immediate | Fix → Build → Deploy → Push |
| Feature | As needed | ADR → Implement → Verify → Deploy → Push |
| Governance | On change | Update canonical docs → Push to 111-Venture-Projects |

### 3.2 Deployment Checklist
- [ ] `npx vite build` succeeds
- [ ] `rsync` artifacts to `sirsi-opensign/public/`
- [ ] `firebase deploy --only hosting` succeeds
- [ ] Git commit and push to `origin main`
- [ ] Verify at `https://sign.sirsi.ai`
- [ ] Update governance docs if scope/architecture affected

## 4. Rollback Procedures

### 4.1 Frontend Rollback
```bash
git revert HEAD
npx vite build
rsync -av --delete dist/ ../sirsi-opensign/public/
npx firebase deploy --only hosting
```

### 4.2 Backend Rollback
```bash
gcloud run services update-traffic contracts-grpc \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region us-east4
```

### 4.3 Firebase Hosting Rollback
Via Firebase Console → Hosting → Release History → Roll back to previous version.

---

## Document Control
| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0.0 | 2025-11-26 | Legacy Team | Initial draft (ECS/AWS rollback) |
| 2.0.0 | 2026-02-09 | Antigravity | Rewrite for Stack V4 (GCP/Firebase pipeline) |
