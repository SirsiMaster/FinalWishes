# GCP-Native Services Evaluation
**Date:** 2026-05-19 | **Sprint:** C3 | **Author:** Claude (Agent)

Evaluation of GCP-native alternatives to OpenSign for FinalWishes e-signatures, form builders, vault enhancements, and appointment booking.

---

## 1. E-Signatures

**Best GCP-native option:** Google Workspace eSignature (included in Business Standard at $14/user/mo). SOC 2 Type II compliant.

**Problem:** No programmatic API. Workspace eSignature is interactive-only (Docs/Drive UI). Cannot trigger envelope creation from the Go API the way OpenSign currently works. Dealbreaker for automated signing flows.

**API-accessible alternatives:**
- **Dropbox Sign (HelloSign)** -- $25/mo Standard (100 envelopes). Clean API, maps well to existing `internal/opensign/` handler pattern.
- **DocuSign** -- ~$50/mo API plans. Overkill for current volume.
- **Sign.Plus** (GCP Marketplace) -- Workspace integration, audit trails, HIPAA/SOC 2.

**Cost (200 envelopes/mo):** Dropbox Sign ~$25-50/mo. OpenSign = $0.

| Verdict | **Keep OpenSign** |
|---------|-------------------|
| Why | $0 API fees, working handler + webhook code. Switch only if maintenance burden becomes unsustainable. |

---

## 2. Form Builders

**Best GCP-native option:** Google Forms -- free.

**Problem:** Cannot handle legal document workflows (witnessed signatures, notarization tracking, conditional multi-party signing). No Firebase Extensions for legal forms.

| Verdict | **Keep Current** |
|---------|-----------------|
| Why | React frontend + IL probate engine (`internal/probate/`) already generates 35+ IL forms. Google Forms adds nothing. |

---

## 3. Vault / Document Storage

**Best GCP-native option:** Already using the correct architecture (Cloud Storage + Cloud KMS envelope encryption). Available enhancements:

| Feature | Description | Cost |
|---------|-------------|------|
| **Bucket Lock / Retention Policies** | Minimum retention periods (e.g., 7-year tax docs). Objects cannot be deleted until retention expires. | Free |
| **Object Holds** | Legal holds during probate disputes. Independent of retention. | Free |
| **Object Versioning** | Track document revisions (will amendments, codicils). | Storage cost only |
| **Event-Based Holds** | Start retention clock from a business event (death certificate filed). | Free |

| Verdict | **Augment** -- enable now |
|---------|--------------------------|
| Why | Free features, low integration effort (enable on existing buckets + add hold logic to `internal/vault/`). Strengthens SOC 2 compliance. |

---

## 4. Appointment Booking

**Best GCP-native option:** Google Calendar Appointment Scheduling (included in Workspace). Supports booking pages, Stripe payment, email reminders, Google Meet links.

**Problem:** No dedicated developer API. Standard Calendar API requires building booking logic (availability, conflict detection) yourself.

**Alternative:** Cal.com (open source, self-hostable) or Calendly API ($8-12/mo).

| Verdict | **Augment** -- defer to post-v0.10.0 |
|---------|--------------------------------------|
| Why | Not in sprint scope. When needed, embed Google Calendar booking page links. |

---

## Summary

| Category | GCP Option | Monthly Cost | Complexity | Verdict |
|----------|-----------|-------------|-----------|---------|
| E-Signatures | Workspace eSignature (no API) | $0 | N/A | **Keep OpenSign** |
| Form Builders | Google Forms | $0 | N/A | **Keep Current** |
| Vault Storage | Retention + Holds | $0 | Low | **Augment now** |
| Booking | Calendar booking pages | $0 | Low | **Augment later** |

**Bottom line:** GCP has no native e-signature API. OpenSign remains the best option. The highest-value, lowest-cost action is enabling Cloud Storage retention policies and legal holds on existing vault buckets -- free and strengthens compliance immediately.
