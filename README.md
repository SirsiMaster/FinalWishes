# FinalWishes (built by Sirsi Technologies)

**The Estate Operating System** — Shepherd users through every step of the estate settlement journey.

## Overview
FinalWishes transforms the chaotic 18-month estate settlement process into a streamlined, technology-assisted journey. Whether manual or automated, we guide executors and heirs through every step.

**Core Mission:** Where government systems lack digital interfaces, we BUILD THE CONNECTOR and become the benchmark for eventual state adoption.

## Live Site
🔗 **[View Live Site](https://finalwishes-prod.web.app)**

## Technology Stack
- **Backend:** Go 1.26 + Chi + ConnectRPC on Cloud Run
- **Frontend:** React 19 + Vite 8 + TailwindCSS v4 + TanStack Router
- **Database:** Firestore + Cloud SQL PostgreSQL 15 (AES-256-GCM encrypted PII vault)
- **Auth:** Firebase Authentication + MFA (TOTP)
- **AI:** sirsi-ai SDK (Claude Opus → Sonnet → Gemini Flash Lite)
- **Payments:** Stripe ($29 Concierge / $99 White Glove)
- **Infrastructure:** Google Cloud Platform (Cloud Run, Cloud KMS, Cloud Storage)

## Design
- **Palette**: Deep Royal Blue + Metallic Gold
- **Aesthetic**: Opulent, Permanent, Guardian-Like
- **Typography**: Cinzel (headings) + Inter (body)

## Local Development
```bash
# Marketing site
cd public && python3 -m http.server 8000

# Web app (after setup)
cd web && npm run dev

# API (after setup)
cd api && go run cmd/api/main.go
```

## Documentation
- Architecture: `docs/ARCHITECTURE_DESIGN.md`
- API Spec: `docs/API_SPECIFICATION.md`
- Data Model: `docs/DATA_MODEL.md`
- Security: `docs/SECURITY_COMPLIANCE.md`

## License
© 2025 FinalWishes Inc. All rights reserved.
