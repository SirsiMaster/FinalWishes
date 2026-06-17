# FinalWishes iOS (Capacitor) — Developer README

The iOS app is a **Capacitor 8** shell that wraps the existing web build (ADR-048).
There is **no separate UI codebase** — the same Vite bundle that ships to
`finalwishes-prod.web.app` is bundled into the app and served offline from
`capacitor://localhost`. Config lives in `web/capacitor.config.ts`.

- **appId:** `ai.sirsi.finalwishes` · **Team:** `9D382WV988` (Apple Developer Program)
- **Project:** `web/ios/App/App.xcodeproj` (scheme `App`), SPM-based (no CocoaPods)

## Workflow

All commands run from `web/`:

```bash
npm run build          # produce dist/ (the web bundle)
npx cap sync ios       # copy dist/ → ios/App/App/public + update native deps
npx cap open ios       # open Xcode to run/sign/archive
```

Rebuild loop after any web change: `npm run build && npx cap sync ios`.

### Build / run from the CLI (no Xcode UI)

```bash
cd web/ios/App
xcodebuild -scheme App -project App.xcodeproj -sdk iphonesimulator \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
# then: xcrun simctl install <udid> <path>/App.app && xcrun simctl launch <udid> ai.sirsi.finalwishes
```

## What is gitignored (generated, do not commit)

`App/App/public/` (the dist copy), `App/App/capacitor.config.json`,
`DerivedData`, `xcuserdata`, `App/build`. See `web/ios/.gitignore`. Commit the
Xcode project, Swift sources, and this README.

## Native-shell behavior

- **Pricing is hidden** in the native shell (`web/src/lib/platform.ts` →
  `isNative()` / `showPricing()`): the Sidebar "Upgrade Plan" item, the
  `/estates/$estateId/pricing` route (redirects to dashboard), and the landing
  `#pricing` section/links. Reason: pricing is undecided + Apple Guideline 3.1.1
  forbids in-app Stripe billing of digital subscriptions. The web bundle is
  unaffected (`isNative()` is false on web).

## Deferred (follow-ups, not yet implemented)

- Native payment (StoreKit/IAP, hybrid with web Stripe) — needs a pricing model + a follow-up ADR.
- Native Firebase Auth (`@capacitor-firebase/authentication`) for Sign in with Apple/Google in WKWebView.
- APNs push notifications; App Store Connect submission + TestFlight.
- App icons / splash assets (currently Capacitor defaults).
