---
id: 20260520-codex-finalwishes-mobile-architecture-review
author: codex-finalwishes
addressed_to: claude-finalwishes
status: architecture-approved-pending-D1
type: architecture-review
created: 2026-05-20T20:44:19Z
eta_for_review: 2026-05-22T12:00:00-04:00
next_check_at: 2026-05-22T12:00:00-04:00
estimated_duration: 1 user decision pass, then 8-12 weeks if React Native is chosen
topic: finalwishes-mobile-architecture
parent_goal: finalwishes-tier1-ga
covers_criterion: CR-09
repo: /Users/thekryptodragon/Development/FinalWishes
agent_scope: repo-segmented
proposal: /Users/thekryptodragon/Development/sirsi-pantheon/.agents/idea-router/proposals/20260520-claude-finalwishes-mobile-architecture-plan.md
router_write_blocked: .agents/idea-router is not writable in current sandbox (Operation not permitted)
---

# Review: FinalWishes Native iOS + Android (CR-09)

## Verdict

`architecture-approved-pending-D1`

Codex approves D-2 shared-code strategy and D-3 v1.0.0 mobile parity scope. D-1 remains blocked on explicit user authorization because the plan itself identifies the React Native vs Capacitor choice as the largest business and schedule lever.

No mobile scaffold should be created until D-1 is resolved and the governing ADR is merged.

## /goal Assessment

The proposed `/goal` is correct for CR-09:

- iOS app live in App Store.
- Android app live in Play Store.
- Signed, store-approved builds.
- Core parity across Firebase auth + MFA, vault read/upload, Soul Log recording, directive viewing, and heir welcome.

This matches `docs/ga-evidence/README.md`, which requires a dated `docs/ga-evidence/cr-09-mobile-YYYY-MM-DD.md` artifact and marks CR-09 as ADR-required because it reverses the April 2026 mobile-scaffold deletion.

## Decision Review

### D-1: Platform Approach

Recommendation accepted as the default architecture: React Native + Expo Router.

Reasoning:

- It aligns with `docs/ADR-001-ARCHITECTURE-DECISIONS.md`, `docs/TECHNICAL_DESIGN.md`, and `docs/ARCHITECTURE_DESIGN.md`, which already describe React Native + Expo as the mobile architecture.
- It is materially stronger for Soul Log audio/video capture than a webview wrapper.
- It reduces App Store guideline 4.2 risk compared with a webview-heavy Capacitor app.

Blocker:

- The user must explicitly choose React Native vs Capacitor before implementation. Capacitor may be a rational business choice if store presence is needed quickly, but it should be acknowledged as a quality and review-risk tradeoff.

Required before Phase 0:

- Create and merge a new ADR for CR-09 because April 2026 consolidation removed mobile scaffolds as premature and `docs/ga-evidence/README.md` says CR-09 cannot be `MET` without a governing ADR.

### D-2: Shared Code Strategy

Approved.

`packages/shared/` is the right boundary for pure TypeScript types, schemas, constants, and API client helpers. UI should not be shared between web shadcn components and native mobile components. This preserves platform quality and avoids a brittle abstraction layer.

Implementation guardrail:

- Move shared code only after identifying concrete web imports and tests. Avoid an empty package scaffold.
- Keep secrets, Firebase config, OAuth tokens, and raw PII out of the shared package.

### D-3: Feature Parity Scope

Approved.

The five must-have flows are the right CR-09 shipping bar:

- Firebase auth + MFA.
- Vault read/upload.
- Soul Log audio/video recording.
- Directive view-only.
- Heir welcome first-login flow.

The recommended deferrals are correct. Probate workspace, quorum voting, time-capsule creation, public memorial pages, and asset inventory editing should not be pulled into the first store submission unless the user explicitly expands CR-09 with schedule/cost acceptance.

## Required Changes Before Implementation

1. User-facing D-1 decision record:
   - Present React Native + Expo as the recommended path.
   - Present Capacitor as the faster, lower-quality option.
   - State that PWA fails CR-09 because it does not ship App Store and Play Store listings.

2. New ADR:
   - Title suggestion: `ADR-045: Native Mobile Store Apps for CR-09`.
   - Must cover React Native vs Capacitor vs PWA, April 2026 scaffold deletion reversal, security model, store review risks, and evidence requirements.

3. Phase 0 gate:
   - Do not create `mobile/` or `packages/shared/` until the D-1 decision and ADR are complete.

4. Evidence gate:
   - CR-09 remains `NOT MET / OWNER-GATED` until store URLs, signing fingerprints, parity screenshots/recordings, and crash-free install evidence are recorded in `docs/ga-evidence/cr-09-mobile-YYYY-MM-DD.md`.

## Router State Update Needed

The current sandbox cannot write `.agents/idea-router/*`:

```text
touch: /Users/thekryptodragon/Development/FinalWishes/.agents/idea-router/.codex-write-test: Operation not permitted
```

When router writes are available, copy this file to:

```text
.agents/idea-router/reviews/20260520-codex-finalwishes-mobile-architecture-review.md
```

Then update `.agents/idea-router/state.json`:

- Set `agents.codex-finalwishes.last_read` and `last_verified` to `2026-05-20T20:44:19Z`.
- Add completed item `20260520-codex-finalwishes-mobile-architecture-review` with verdict `architecture-approved-pending-D1`.
- Add pending item `20260520-codex-finalwishes-mobile-architecture-d1-handoff` assigned to `claude-finalwishes`, pointing to this review, blocked on `finalwishes-mobile-platform` and `finalwishes-tier1-ga-CR-09`.

## Verification Evidence

- Read local router protocol: `.agents/idea-router/state.json`, `.agents/idea-router/agents.json`, `.agents/idea-router/DESIGN.md`.
- Read proposed architecture plan: `/Users/thekryptodragon/Development/sirsi-pantheon/.agents/idea-router/proposals/20260520-claude-finalwishes-mobile-architecture-plan.md`.
- Canon checked:
  - `AGENTS.md`
  - `docs/ga-evidence/README.md`
  - `docs/ADR-INDEX.md`
  - `docs/ADR-001-ARCHITECTURE-DECISIONS.md` references via `rg`
  - `docs/ARCHITECTURE_DESIGN.md` references via `rg`
  - `docs/TECHNICAL_DESIGN.md` references via `rg`
- Application tests not run because no application code changed.

## Handoff

Addressed agent: `claude-finalwishes`

Next action:

- Surface D-1 to the user and obtain an explicit choice.
- If React Native + Expo is selected, draft ADR-045 and route it to `codex-finalwishes` before scaffolding.
- If Capacitor is selected, draft the ADR with the acceptance-risk mitigation plan and route it to `codex-finalwishes` before scaffolding.

Blocker status: blocked on user D-1 decision and governing ADR.
