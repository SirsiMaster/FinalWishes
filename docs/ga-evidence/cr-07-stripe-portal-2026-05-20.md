# CR-07 Stripe Portal Evidence - 2026-05-20

## Criterion

CR-07: Stripe Customer Portal enabled.

Bar: Stripe API `GET /v1/billing_portal/configurations` returns at least one active configuration with `is_default=true` covering both $29 Concierge and $99 White Glove products.

## Verdict

`NOT MET / OWNER-GATED`

The repository already has the authenticated Billing Portal endpoint and the estate settings page already calls it. The remaining blocker is Stripe Dashboard configuration in live mode and an authenticated Stripe API verification run from an environment with the live secret key.

## Capture

- Author: `codex-finalwishes`
- Captured at: `2026-05-20T20:31:21Z`
- Head commit at capture: `a473bd9`
- Governing router plan: `/Users/thekryptodragon/Development/sirsi-pantheon/.agents/idea-router/proposals/20260520-claude-finalwishes-owner-readiness-plan.md`
- Governing review conditions: `/Users/thekryptodragon/Development/sirsi-pantheon/.agents/idea-router/reviews/20260520-codex-finalwishes-ga-workstream-plan-batch-review.md`

## Owner Checklist

1. Open Stripe Dashboard in live mode.
2. Go to Settings -> Billing -> Customer portal.
3. Enable customer portal access.
4. Allow payment method updates.
5. Allow subscription cancellation.
6. Allow invoice history viewing.
7. Configure product selection for:
   - Concierge: `$29/mo`
   - White Glove: `$99/mo`
8. Save the configuration and record the default Billing Portal configuration ID.

## Code-Side Readiness

- API route registered: `POST /api/v1/payments/portal`.
- Handler: `api/internal/payments/handlers.go` -> `HandleCreatePortalSession`.
- Frontend button: `web/src/routes/estates.$estateId.settings.tsx` -> `Manage Subscription`.
- This pass added `APP_BASE_URL` support for the portal return URL after `finalwishes.app` DNS + TLS are live.

## Verification Commands Still Required

Run from a secure environment with the live Stripe secret key. Do not commit the secret or raw customer data.

```bash
curl -sS https://api.stripe.com/v1/billing_portal/configurations \
  -u "$STRIPE_SECRET_KEY:" \
  | jq '.data[] | {id, active, is_default, features, business_profile}'
```

Expected final state:

- At least one returned configuration has `active: true`.
- At least one returned configuration has `is_default: true`.
- The dashboard configuration covers Concierge and White Glove subscriptions.

## Required Final Evidence

The MET artifact must include:

1. Sanitized Stripe API response with secrets and customer data redacted.
2. Default Billing Portal configuration ID.
3. Dashboard screenshot reference or operator note.
4. Sample portal-session creation against a test paid estate, with session URL redacted to host/path only.

Create a new dated `docs/ga-evidence/cr-07-stripe-portal-<YYYY-MM-DD>.md` when the dashboard and API checks pass. Do not mutate this blocked capture into a MET artifact.
