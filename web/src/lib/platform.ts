import { Capacitor } from '@capacitor/core'

// Single source of truth for "are we running inside the native (iOS) shell".
//
// Same bundle ships to the web (finalwishes-prod.web.app) and to the Capacitor
// iOS app. On the web, Capacitor.isNativePlatform() returns false, so every
// native-only gate below is inert and the web experience is unchanged.
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

// Pricing / paid-upgrade surfaces are HIDDEN inside the native app for now:
// pricing is undecided, and Apple's Guideline 3.1.1 forbids billing digital
// subscriptions via Stripe in-app. When native payment lands (StoreKit/IAP,
// hybrid with web Stripe), flip this gate to surface a native-purchase flow
// instead of hiding it. Web is never affected — isNative() is false there.
export function showPricing(): boolean {
  return !isNative()
}
