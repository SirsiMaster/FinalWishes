# ADR-048: iOS App via Capacitor (Web-to-Native Shell)

- **Status:** Accepted
- **Date:** 2026-06-16
- **Supersedes:** The April-2026 "Mobile (Expo) scaffold deleted — premature" note in `CLAUDE.md §3`. Mobile is no longer premature (web is live in production); the platform choice changes from Expo/React Native to Capacitor.

## Context

FinalWishes ships as a React 19 + Vite 8 SPA, live at `finalwishes-prod.web.app`. The owner directed a native **iOS** app and activated the **Apple Developer Program** (Team ID `9D382WV988`, 2026-06-16) to enable code-signing, TestFlight, and App Store distribution.

The product philosophy is explicit: **"web app first, then convert to Apple."** The web product is now stable (production-deployed, 129 tests passing, 0 first-party vulns), which satisfies the canon precondition (`§5 No Dead Scaffolds`: build native "when the web product is stable"). In April 2026 the earlier Expo and Tauri scaffolds were deleted as premature; this ADR records the deliberate, now-warranted re-introduction of a native target.

## Decision

Wrap the **existing Vite build** in a native iOS shell using **Capacitor 8** (SPM-based). The same `dist/` bundle that ships to the web is bundled into the app and served from `capacitor://localhost` (offline-capable, App-Store-acceptable — not a thin remote web-view). Config lives in `web/capacitor.config.ts`; the generated Xcode project lives in `web/ios/` (`appId: ai.sirsi.finalwishes`).

Pricing/paid-upgrade surfaces are **hidden inside the native shell for now** via a single runtime gate (`web/src/lib/platform.ts` → `isNative()` / `showPricing()`), because (a) pricing is undecided and (b) Apple Guideline 3.1.1 forbids billing digital subscriptions through Stripe in-app. The web bundle is byte-unaffected (`isNative()` is false on web).

## Alternatives Considered

- **React Native / Expo** — would discard the entire web UI (TanStack Router, shadcn/ui, Tailwind) and rewrite it. Months of work; not a "conversion." Rejected.
- **Native SwiftUI** — full ground-up rewrite, shares nothing with web. Highest cost/longest timeline. Rejected (reserved for the eventual native *payment* surface only).
- **PWA only** — no App Store presence; the owner activated the Apple Developer Program specifically for native distribution. Rejected.

## Justification

Capacitor reuses 100% of the production web codebase and adds native capability (Face ID, camera, APNs, native Apple sign-in) incrementally via plugins. It is the lowest-risk, additive (Rule 12) path that matches the stated "convert, don't rebuild" intent. One bundle, one gate keeps web and iOS in lockstep with no fork.

## Consequences

- **Positive:** Ship iOS from the existing bundle; web unchanged; native plugins available as needed; TestFlight unblocked by the active Apple Developer Program.
- **Negative / deferred:** Native payment (StoreKit/IAP, hybrid with web Stripe) is **out of scope** here — pricing is hidden until a pricing model is decided, then a follow-up ADR will cover IAP. Firebase Auth in WKWebView may need the native `@capacitor-firebase/authentication` plugin (follow-up). APNs push + App Store submission are follow-ups.
- **Canon:** `CLAUDE.md §3` updated to record the iOS/Capacitor target and supersede the Expo removal note.
