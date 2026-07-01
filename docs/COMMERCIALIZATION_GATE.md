# FinalWishes Commercialization Gate

This repo inherits `/Users/thekryptodragon/Development/COMMERCIALIZATION_GATE.md`. Where this
file is stricter, the stricter rule wins (unless an ADR changes commercial strategy).

## Product Classification

Default classification: `commercial-product`.

FinalWishes ("The Estate Operating System") is a shipped estate-planning and estate-settlement
SaaS, LIVE at `finalwishes-prod.web.app`. Agents must treat new work as production-affecting
unless explicitly scoped as `prototype`, `internal-tool`, or `platform-foundation`. Cylton
Collymore is the contracted architect/developer; the product is a Sirsi offering — the buyer
and operator roles below are the commercial owners, not the builder.

## Buyer/User

- **Primary buyer:** an estate owner (the "principal") planning ahead, or a family settling an
  estate after a loss. Launch jurisdictions: Maryland, Illinois, Minnesota (DC/VA deferred).
- **Daily users (roles, estate-scoped):** principal, heir, executor, trustee, legal advisor,
  CPA/tax advisor — each with a distinct, permission-gated surface.
- **Commercial promise:** a dignified, guided place to organize assets, documents, beneficiary
  designations, and final wishes; and, after a loss, a calmer path through settlement — so
  nothing critical is lost, contested, or missed.

## Primary Workflows

Every feature must name at least one:

- Create/onboard an estate and inventory assets, beneficiaries, and executors.
- Preserve legal-evidence documents in the encrypted Vault; store access instructions (Lockbox).
- Author directives, an obituary/memorial ("tell me what happened" Shepherd), and time capsules.
- Sign directives/documents via Sirsi Sign (OpenSign) and flip the directive to verified.
- Run the after-loss settlement path: probate readiness, beneficiary/executor coordination,
  memorial distribution (print / email / public memorial).
- Operate admin, guidance-scoring, notification, and subscription/billing workflows.

## Willingness To Pay

Tie work to acquisition, retention, expansion, or priced plans (Stripe checkout via the Go API):

- **Free:** heir/participant access and light planning.
- **Concierge:** full principal + fiduciary planning and settlement workflows.
- **White-glove:** assisted onboarding, legal-form generation, and priority support.

## Trust Boundary

FinalWishes handles the most sensitive data in the portfolio: raw PII, legal documents, e-sign
evidence, beneficiary/financial data, and paid-subscription state. Production work MUST address
Firebase Auth + MFA (TOTP), estate-scoped Firestore/Storage rules (`estate.principalId`, role
gating), Cloud KMS envelope encryption for PII/Vault, per-estate AAD, audit trails where
relevant, and graceful degradation when AI or external services (Sirsi Sign, guidance, Photos)
fail. No raw PII in URLs, client state, or logs (use Shard Aliases).

## Done Evidence

Completion evidence must include: relevant tests (web vitest, api go test, functions jest),
build output, **per-role browser verification** for any UX change (the persona × surface
matrix — a passing build alone is insufficient), the deploy target if touched, a committed-
secrets scan result, and updated user-guide / developer-README when a workflow changes.
