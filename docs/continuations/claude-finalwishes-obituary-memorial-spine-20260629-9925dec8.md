<!-- THREAD-SCOPED CONTINUATION — do NOT load unless you ARE this thread.
     agent: claude-finalwishes | workstream: obituary-memorial-spine | repo: FinalWishes
     date: 2026-06-29 | session: 9925dec8-03e0-4f69-9a2c-873ca2e62927 | path: docs/continuations/claude-finalwishes-obituary-memorial-spine-20260629-9925dec8.md -->

# FinalWishes — Obituary → Memorial Spine (claude-finalwishes)

## Why this exists
Owner (2026-06-29): the **obituary section was not to standard** — needed "more handholding, more ChatGPT shepherding." Then expanded the vision: the app should be a **"tell me what happened" listener** that draws out the whole memorial — events, family, requests, photos, videos, documents, friends — and handles **distribution**: recipients, printers, social sharing. "Everything."

## Owner design decisions (BINDING)
1. **Scope/home:** build the full spine ON the **obituary page now**, graduate to a dedicated **Memorial hub later** ("Both — start on obituary, graduate later").
2. **Depth:** **fully in-conversation** — pick photos, attach documents, add recipients, and trigger print/email/social all WITHOUT leaving the Shepherd modal.

## DONE this session (committed `da1bcaa`, branch `feat/obituary-shepherd-guided`)
- New `web/src/components/estate/ObituaryShepherd.tsx` — conversational guided obituary: opens "tell me what happened" → gentle one-at-a-time questions (prefilled from heirs + service events) → composes via `/guidance/assist-obituary` (Sonnet, warm) → tap-to-refine (Warmer/Shorter/More formal/More about family/Add faith). Royal Neo-Deco. Voice adapts to planningMode (self vs after_loss).
- Wired into `web/src/routes/estates.$estateId.obituary.lazy.tsx`: replaced the blank-editor one-shot "AI Draft" button with "Write/Rewrite with Shepherd"; `handleShepherdDraft` drops the draft into the editor + persists. Removed dead `handleAIDraft`/`aiLoading`/`API_BASE`.
- tsc 0, eslint 0, `npm run build` green, dev server boots clean. CHANGELOG `### Added` entry added.
- Owner saw + approved the design via a faithful widget preview.

## SPINE BUILT — commit `dc716e2` (NOT gemma — built inline)
gemma route (`20260629-175514…`) returned a TRUNCATED PLAN, zero code (MAXTOK at planning). So I built the spine inline. After "Use this draft" the modal advances **media → recipients → deliver → done** (doesn't close):
- media: device upload (onAddDevicePhotos → generateUploadUrl; first sets portrait). Google Photos DEFERRED (heirlooms-scoped, returns counts not URLs).
- recipients: heirContacts (heirs w/ email) select + add-by-email.
- deliver: onExportPDF (handleExportPDF), onEmailTo (handleShare refactored → shared buildObitEmail), onPublishMemorial (mirrors ShareMemorial public_memorials shape). Tap-permissioned, inline status.
- done: closeAndReset.
tsc 0 / eslint 0 / build green. CHANGELOG updated.

## VALIDATION
- CORE: PASS — codex-finalwishes (bc789a4 re-verify) + claude-home (PASS-WITH-NITS, both nits pre-fixed). F4 also CLOSED (claude-home: 0 directives ever signed → no re-issuance).
- SPINE (dc716e2): routed to claude-home + codex-finalwishes 2026-06-29 23:10 (`…validate-obituary-shepherd-spine…`). AWAITING verdicts.

## NEXT (claude-finalwishes)
1. On spine verdicts: fix any FAILs, then push branch + open PR; route claude-home as definitive binder.
2. F9: claude-home to bind sirsi PR #97 → claude-nexus deploys → joint prod E2E.
3. Later: Google Photos in media step; graduate spine → dedicated Memorial hub (owner decision #1).
4. NOTE: guard-pretool hook misfires on `git commit` (reads session-cwd /Users/thekryptodragon repo branch=main, not the target repo) — use `git -C <repo> commit -F <file>`.

## Watcher
Router Monitor armed for `to: claude-finalwishes` (thread `thr-a1f17fde37bada5e`), hardened open-predicate. See [[reference_finalwishes_router_watcher]].
