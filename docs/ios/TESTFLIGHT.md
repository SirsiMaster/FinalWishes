# FinalWishes iOS — TestFlight & App Store Runbook

> Governs: ADR-048 (iOS Capacitor shell). Bundle id `ai.sirsi.finalwishes`. Apple Team `9D382WV988` (Sirsi, active 2026-06-16).

This is the exact path from the committed Capacitor shell to a build on a device / in TestFlight.
Everything the repo can do autonomously is **already done** (see "What's wired" below); the remaining
steps need the owner's Apple account in a browser / Xcode GUI and are marked **OWNER**.

---

## What's wired (in-repo, verified)

- **Capacitor shell** — `web/capacitor.config.ts`, `web/ios/`. Wraps the production Vite build; offline from `capacitor://localhost`.
- **Signing** — `DEVELOPMENT_TEAM = 9D382WV988`, `CODE_SIGN_STYLE = Automatic` on both Debug + Release (`web/ios/App/App.xcodeproj/project.pbxproj`).
- **Bundle id** — `ai.sirsi.finalwishes` (Sirsi reverse-DNS, matches `ai.sirsi.pantheon`).
- **App icon + splash** — branded gold guardian on Royal Blue (`#133378`), generated into `Assets.xcassets`. Sources: `web/assets/icon.png` (1024², opaque) + `web/assets/splash.png` (2732²). Regenerate ad-hoc with `npx @capacitor/assets generate --ios` (the tool is intentionally NOT a persistent devDependency — keeps the tree vuln-clean).
- **Export compliance** — `ITSAppUsesNonExemptEncryption = false` in `Info.plist` (standard HTTPS/Firebase only → exempt; no per-upload TestFlight prompt).
- **Display name** — `FinalWishes`.
- **Verified** — `xcodebuild ... -destination 'generic/platform=iOS Simulator' build` → **BUILD SUCCEEDED**.

## Build the web → native each time source changes

```bash
cd web
npm run build          # Vite → web/dist
npx cap sync ios       # copy dist into the iOS app + update SPM plugins
```

## OWNER — one-time App Store Connect setup

1. **App Store Connect → Apps → +** → New App. Platform iOS, name "FinalWishes", primary language English (U.S.), bundle id `ai.sirsi.finalwishes` (pick from the registered-ids list — it auto-registers on first signed Xcode build, or pre-register it at developer.apple.com → Identifiers), SKU `finalwishes-ios`.
2. Accept any pending **Paid/Free Apps agreements** (Business → Agreements) — uploads silently fail without them.
3. **TestFlight → Internal Testing** → add yourself (`cylton@sirsi.ai`) as an internal tester.

## OWNER — first signed build to TestFlight

```bash
cd web && npm run build && npx cap sync ios
open ios/App/App.xcodeproj
```

In Xcode:

1. Select the **App** scheme → destination **Any iOS Device (arm64)**.
2. **Product → Archive** (first archive prompts to let Xcode create the Developer ID / distribution cert + provisioning profile under Team `9D382WV988` — allow it).
3. **Organizer → Distribute App → App Store Connect → Upload**.
4. Bump build number for each upload: edit `CURRENT_PROJECT_VERSION` in `project.pbxproj` (or `agvtool next-version -all`).
5. After processing (~5–15 min), the build appears in TestFlight → install via the TestFlight app on device.

## ⚠️ MANDATORY pre-submission gate — walk the shell rendering (claude-home bind, Note 1)

**Before the first App Store / TestFlight submission you MUST actually render-walk the Capacitor
shell — do NOT assume "same bundle as web ⇒ same render."** That assumption is exactly what the
white-cards regression warned against ([[feedback_verify_in_browser_not_tests]]); WKWebView can
differ from desktop Chromium on fonts, safe-area insets, scroll, and `capacitor://localhost` SPA
routing. The web per-role matrix (`docs/verification/PERSONA_MATRIX.md`) verified the _bundle_; this
gate verifies the _native shell renders that bundle_.

**Already verified (renderer faithfulness):** the landing + Royal-Neo-Deco chrome render correctly in
the iPhone 17 Pro simulator (fonts, gradients, gold guardian, buttons) and the status bar is light/
legible (#31). That proves WKWebView renders the bundle faithfully — but is not a full route walk.

**Do this walk (simulator or device), per persona where practical:**

1. `cd web && npm run build && npx cap sync ios && open ios/App/App.xcodeproj` → Run on the simulator/device.
2. Sign in (the `persona-*@finalwishes.app` QA accounts work, or a real account). Fiduciaries need MFA — `scripts/enroll-persona-mfa.mjs` secrets, or enroll on first login.
3. Walk: dashboard, soul-log, memoirs, vault, lockbox, directives, settings, **+ a blocked route** (e.g. heir→vault) and confirm the RoleGuard "This isn't part of your role" gate renders.
4. For each: confirm **real content renders** (no white/blank card, no invisible text, no infinite spinner), **scroll works**, **safe-area insets** look right, and the **Web Inspector console** (Safari → Develop → Simulator) shows **no app errors**.
5. Any white/blank/crash/console-error → fix before submitting (same bar as the web matrix).

This is a SUBMISSION gate, not a web-deploy gate — the web app is already bound PASS.

## Deferred (future ADRs — NOT in this runbook)

- Native payment (StoreKit/IAP hybrid) — pricing undecided; pricing UI is hidden in-shell today via `web/src/lib/platform.ts`.
- Native Firebase Auth plugin (current email/password auth works in the WKWebView as-is; no Google/Apple OAuth, so Guideline 4.8 "Sign in with Apple" does not trigger).
- APNs push notifications (invitation matching, reminders).

## Notes

- **No CocoaPods** — Capacitor 8 uses Swift Package Manager. No `pod install`.
- **Privacy strings** — none added yet, because no native capability (camera/Face ID/location) is used. Add the matching `NS*UsageDescription` to `Info.plist` _only_ when a native plugin that needs it is introduced — Apple rejects unused/insincere permission strings.
