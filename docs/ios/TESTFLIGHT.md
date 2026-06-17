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

## Deferred (future ADRs — NOT in this runbook)

- Native payment (StoreKit/IAP hybrid) — pricing undecided; pricing UI is hidden in-shell today via `web/src/lib/platform.ts`.
- Native Firebase Auth plugin (current email/password auth works in the WKWebView as-is; no Google/Apple OAuth, so Guideline 4.8 "Sign in with Apple" does not trigger).
- APNs push notifications (invitation matching, reminders).

## Notes

- **No CocoaPods** — Capacitor 8 uses Swift Package Manager. No `pod install`.
- **Privacy strings** — none added yet, because no native capability (camera/Face ID/location) is used. Add the matching `NS*UsageDescription` to `Info.plist` *only* when a native plugin that needs it is introduced — Apple rejects unused/insincere permission strings.
