# ADR-038: Life-First Reframe — Product Pivot from Estate Mechanics to Living Companion

**Status:** Accepted
**Date:** 2026-04-14
**Decision Makers:** Cylton Collymore (Founder), Claude (Architecture)

## Context

FinalWishes was originally organized around estate mechanics: assets, vault, lockbox, beneficiary designations, directives. The navigation reflected this structure — users encountered a dashboard with completion percentages, asset categories, and document upload workflows. While functionally correct, this framing positioned the product as a chore about death. Users experienced it as something to fill out because they should, not something to open because they want to.

User research and product reflection revealed that this framing contradicted the product's actual value proposition. The people who need FinalWishes most — young parents, service members, first responders, truck drivers — are not motivated by estate completion scores. They are motivated by the desire to preserve their voice, their stories, and their love for the people who matter to them.

The existing architecture treated media (video memorials, photo galleries, heirlooms) as secondary features within an estate management framework. The emotional core of the product — a parent's voice, a sealed letter, a family recipe — was buried under legal and financial scaffolding.

## Decision

Restructure the entire product around emotional intent rather than estate mechanics. The application pivots from "estate planning software" to "living companion with estate planning built in."

### Navigation Restructure — Six Emotional Groups

Replace the current estate-mechanics navigation with six groups organized by human intent:

| Group | Purpose | Contains |
|-------|---------|----------|
| **Soul Log** | Daily-use diary (the heartbeat) | Video diary, audio diary, written reflections, visibility modes (private/shared/sealed) |
| **My Legacy** | Intentional life curation | Time capsules, ethical wills, final directives, obituary drafts |
| **Memories** | Life preservation | Photo galleries, video memorials, heirlooms, family recipes, stories |
| **Letters** | Direct messages to loved ones | Sealed letters, future-dated messages, per-beneficiary correspondence |
| **My People** | Relationships and roles | Beneficiaries, executors, guardians, role management, invitations |
| **The Vault** | Estate mechanics (important but secondary) | Assets, documents, lockbox credentials, financial records, legal filings |

### Soul Log — New Core Feature

Introduce the Soul Log as the primary daily-use feature. It is a personal video/audio/text diary with three visibility modes:

- **Private** — for the user alone (a diary nobody reads)
- **Shared** — tagged for specific beneficiaries (becomes part of their heir experience)
- **Sealed** — delivered on a future date or trigger event (a time capsule)

The Soul Log is what makes someone open FinalWishes tomorrow, not next year.

### Legacy Timeline — Replaces Completion Dashboard

Replace the completion-percentage dashboard with a Legacy Timeline that shows the user's life as a chronological narrative: entries, memories, letters, milestones. Progress toward estate completeness is shown as a secondary indicator, not the primary view.

### Heir Welcome Screen — The Sacred Moment

Build the heir's first-login experience as the product's defining screen. When an heir opens FinalWishes after activation, they see their loved one's face, voice, and personal message — not a dashboard, not an asset list, not a completion percentage. The practical matters (assets, documents, legal filings) come after. First, the love.

### Shepherd AI Reframe

The Shepherd AI shifts from "estate completion assistant" to "life companion." It suggests recording moments, notices milestones, and helps curate the user's legacy. Estate guidance becomes one of its capabilities, not its identity.

## Alternatives Considered

### Alternative 1: Incremental Feature Addition
- **Pros:** Lower risk, no navigation disruption, can A/B test
- **Cons:** Doesn't solve the fundamental framing problem; users still experience the app as estate planning with extra features bolted on
- **Cost:** Same development cost spread over longer timeline with weaker product positioning

### Alternative 2: Separate "Life" and "Estate" Apps
- **Pros:** Clean separation of concerns, could market differently
- **Cons:** Fragments the user experience, doubles infrastructure cost, loses the core insight that estate planning should be embedded in life preservation
- **Cost:** 2x infrastructure, 2x maintenance, weaker product thesis

## Justification

### Industry Comparisons
| Company | Approach | Notes |
|---------|----------|-------|
| Everplans | Estate-first with media bolted on | Low engagement, feels like a chore |
| StoryWorth | Life stories only, no estate planning | High engagement, no practical utility |
| Trust & Will | Pure legal automation | Transactional, zero emotional connection |
| FinalWishes (Life-First) | Life companion with estate planning built in | Unique positioning — daily engagement + practical protection |

### Technical Factors
- **Performance:** No degradation — navigation restructure is a routing/UI change, not an infrastructure change
- **Security:** No impact — same encryption, same RBAC, same vault architecture
- **Maintainability:** Improved — emotional grouping maps more naturally to feature modules
- **Future scalability:** Soul Log creates a daily-use surface for future AI features (transcription, summarization, memory curation)

## Consequences

### Positive
- Users have a reason to open the app daily (Soul Log), not annually (estate update)
- The heir experience becomes the product's strongest differentiator
- Navigation reflects how humans think about their lives, not how databases organize estate data
- The Shepherd AI has richer context for suggestions (diary entries, not just asset lists)
- Marketing shifts from "plan for death" to "live with intention" — dramatically broader appeal

### Negative
- Existing users (if any in beta) will experience a navigation change
- Soul Log is a net-new feature requiring video/audio recording, storage, and transcription infrastructure
- Documentation and marketing materials need full rewrite
- More complex onboarding — must communicate both life-companion and estate-planning value

### Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Soul Log storage costs at scale | Medium | Medium | Use YouTube (unlisted) for video, Cloud Storage for audio, Firestore for text; tier-gated limits |
| Users confused by pivot from estate app | Low | Low | Beta user base is minimal; clean slate for launch positioning |
| Feature scope creep from "companion" framing | High | High | Scope freeze: Soul Log + nav restructure + heir screen first, then iterate |
| Voice/video recording quality on mobile web | Medium | Medium | Progressive enhancement — text always available, media requires capable browser |

## References

- [ETHOS.md](/ETHOS.md) — The soul of the application (permanent, non-versioned)
- [CANONICAL_DEVELOPMENT_PLAN.md](/docs/CANONICAL_DEVELOPMENT_PLAN.md) — Phase 4 addition
- [ADR-031](/docs/ADR-031-SECURE-ENCLAVE-DASHBOARD-STANDARD.md) — Dashboard standard (updated by this reframe)

---

*ADR-038 — Accepted April 14, 2026*
