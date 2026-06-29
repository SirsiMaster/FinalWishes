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

## IN FLIGHT — routed to gemma 2026-06-29 (`20260629-175514-claude-finalwishes-gemma-build-obituary-memorial-spine...`)
Spec: `/tmp/gemma-obituary-spine-spec.md`. The full in-conversation spine: after "Use this draft", advance through phases **media → recipients → deliver → done** (don't close). Reuses existing page functions (handleExportPDF, handleShare→handleEmailTo, ShareMemorial publish, importFromGooglePhotos, estateClient.generateUploadUrl, useEstateHeirs). Page passes callbacks; Shepherd orchestrates. Each external action is tap-permissioned (no auto-send).

## NEXT (claude-finalwishes)
1. When gemma returns: review + bind the spine diff (tsc/eslint/build), browser-verify, commit on the branch, open PR.
2. Then: graduate the spine into a dedicated **Memorial hub** (owner decision #1, deferred).
3. Open the PR for the whole obituary overhaul; route to claude-home as definitive reviewer.

## Watcher
Router Monitor armed for `to: claude-finalwishes` (thread `thr-a1f17fde37bada5e`), hardened open-predicate. See [[reference_finalwishes_router_watcher]].
