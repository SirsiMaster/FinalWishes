# 𓁟 Engineering Journal
# Running commentary and insights — the WHY behind every decision.

---

## Entry 001 — 2026-03-22 — Thoth Initialized

**Context**: Thoth knowledge system installed from Sirsi Anubis canonical template.

**Decision**: Starter memory created. Will be populated with full architecture, decisions, and file map during first working session.

---

## Entry 002 — 2026-04-16 — Session 9: Investor Polish + Deep Audit

**Context**: Cylton requested investor-demo readiness for Sequoia/a16z. Initial surface audit said "ready." Cylton pushed back — rightfully. Deep audits revealed major infrastructure and completeness gaps.

### Decisions Made:
1. **False social proof removed** — "Trusted by Families Across America" replaced with honest "Built with Enterprise-Grade Security." Rationale: VCs Google you. Fake traction = instant blacklist.
2. **Pricing aligned** — Landing page was $2,997/$9,997 one-time. Stripe API charges $29/$99/mo. Fixed to match reality.
3. **Compliance language corrected** — "SOC 2 Compliant" → "SOC 2 Architecture." No certification = no claim.
4. **5 rogue color palettes normalized** — Purple, rose, teal, green buttons → Royal Blue across 7 files. Section decorations kept per-theme; interactive controls unified.
5. **SendGrid eliminated** — SMTP password was a placeholder (never worked). Replaced with Gmail API Cloud Function using domain-wide delegation. Zero vendor cost.
6. **Storage rules deployed** — Was deny-all (blocking all reads). Now authenticated reads per estate path, writes via signed URLs.
7. **Email verification gate** — IdentityGate now blocks estate access until email verified. Was aspirational nudge banner.
8. **API client hardened** — ConnectRPC transport now has auth interceptor + retry with exponential backoff.

### What the Deep Audit Revealed:
- Document signing backend exists (OpenSign), frontend never calls it
- User guide claims signing + 72hr unseal — neither implemented
- No public shareable links, no QR codes, no multi-channel invitations
- Dashboard is checklist-first (contradicts ETHOS life-first vision)
- Heir welcome may not deliver the "sacred moment" from ETHOS
- No broadcasting/event capability for funerals/services
- No auto-save on directives

### Key Lesson:
Surface-level audits miss infrastructure issues. Always deep audit before declaring anything ready: security rules, external service configs, end-to-end user flows, credential verification.

---

## Entry 003 — 2026-04-17 — Session 10: Full Gap Remediation (Starting)

**Context**: Cylton reviewed the gap analysis and said "fix it all." This session will address every identified gap from the spiritual ethos through technical operations to invitation/sharing features.

### Work Queue (Priority Order):
1. Fix false user guide claims (directives.md)
2. Wire OpenSign signing ceremony to directives UI
3. Auto-save for directives
4. Heir Welcome Screen — verify/fix sacred moment
5. Dashboard life-first redesign
6. Public memorial links with QR codes
7. Multi-channel invitations (SMS via Firebase Auth)
8. Broadcasting/event pages
9. Granular per-person content permissions
10. Document version history

---

## Entry 004 — 2026-04-17 — Session 11: Full Gap Remediation (10 Items)

**Context**: Cylton said "fix it all" after Session 10's deep audit. This session addressed 10 of the 13 identified gaps.

### Completed:
1. **False user guide claims fixed** — Removed lies about digital signing + 72hr unseal from directives.md
2. **Auto-save for directives** — Debounced 1.5s TipTap onUpdate → Firestore, with saving/saved indicator
3. **OpenSign signing ceremony wired** — Finalized directives get "Sign Document" button → POST /api/v1/opensign/create-envelope → opens signing URL in new tab, tracks envelope ID + signing status
4. **Estate Owner Welcome** — New OwnerWelcome component shows once after estate creation. Life-first emotional tone: "This is where your life lives." Three pillars: Record your voice, Organize what matters, Protect your people.
5. **Heir Welcome verified** — Component already solid: portrait, messages, heirlooms, video/audio players. Wired properly in estate layout.
6. **Public memorial links + QR codes** — New `/memorial/$memorialId` public route (no auth), `ShareMemorial` component with QR code generation (qrcode.react), Firestore `public_memorials` collection with public read rules, DOMPurify for obituary content sanitization
7. **Broadcasting/event pages** — New `/estates/$estateId/events` route with create modal (6 event types), event cards with date/time/location/RSVP, sidebar nav integration, Firestore rules for events collection
8. **SMS invitations** — Phone number field added to InviteTeamMember form, `sms_queue` Firestore collection for Cloud Function processing, phone stored on invitation record
9. **Granular per-person permissions** — `visibleTo` array field on directives, visibility picker in editor (Everyone vs. specific heirs), instant Firestore persist on selection change
10. **Document version history** — Version badge in vault UI (shows "v2", "v3" etc.), `previousVersions` array field on VaultDocument type

### Architecture Decisions:
- DOMPurify installed for HTML sanitization on public pages (security requirement)
- Public memorial uses estateId as memorialId (one memorial per estate)
- SMS queue pattern matches email queue pattern (write to collection → Cloud Function processes)
- Owner Welcome uses same guard pattern as Heir Welcome (localStorage-based seen tracking)
- Events are a subcollection under estates (same access pattern as all estate data)
- Firestore rules updated: public_memorials (§11), events (§3o), sms_queue (§9b)

### Still Remaining:
- Shepherd proactivity improvements (inline nudges)
- Per-document role assignment for vault documents
- SMS Cloud Function implementation (queue exists, processor needed)

---

## Entry 005 — 2026-04-17 00:04 — Session Compact (COMPACT)

> Persisted via `thoth compact` before context compression.

**Decisions**:
- {"session_id":"a8f39bec-1cfb-4805-9bec-384b33f0fdd1","transcript_path":"/Users/thekryptodragon/.claude/projects/-Users-thekryptodragon/a8f39bec-1cfb-4805-9bec-384b33f0fdd1.jsonl","cwd":"/Users/thekryptodragon/Development/FinalWishes","hook_event_name":"PreCompact","trigger":"manual","custom_instructions":""}

---
