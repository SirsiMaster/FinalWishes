/**
 * Analytics & Performance Instrumentation — FinalWishes
 *
 * Thin wrapper around Firebase Analytics (GA4) and Performance Monitoring.
 * Import only in key conversion points — not every component.
 *
 * Firebase Performance auto-collects LCP, FID, CLS, and network traces.
 * This file adds custom events for business-critical actions only.
 *
 * @version 1.0.0
 */

import { logEvent } from 'firebase/analytics';
import { trace, type PerformanceTrace } from 'firebase/performance';
import { analytics, perf } from './firebase';

// ─── GA4 Event Helpers ─────────────────────────────────────────────────────

/** Track estate creation — key onboarding conversion */
export function trackEstateCreated(estateId: string) {
  if (analytics) logEvent(analytics, 'estate_created', { estate_id: estateId });
}

/** Track document upload to vault */
export function trackDocumentUploaded(estateId: string, fileType: string) {
  if (analytics) logEvent(analytics, 'document_uploaded', { estate_id: estateId, file_type: fileType });
}

/** Track Stripe checkout initiation — revenue conversion */
export function trackCheckoutStarted(tierId: string) {
  if (analytics) logEvent(analytics, 'begin_checkout', { tier_id: tierId });
}

/** Track successful payment */
export function trackPaymentSuccess(tierId: string) {
  if (analytics) logEvent(analytics, 'purchase', { tier_id: tierId });
}

// ─── Performance Trace Helpers ─────────────────────────────────────────────

/** Start a custom performance trace for vault upload operations */
export function startVaultTrace(): PerformanceTrace | null {
  if (perf) {
    const t = trace(perf, 'vault_upload');
    t.start();
    return t;
  }
  return null;
}

/** Start a custom performance trace for estate creation */
export function startEstateCreateTrace(): PerformanceTrace | null {
  if (perf) {
    const t = trace(perf, 'estate_create');
    t.start();
    return t;
  }
  return null;
}
