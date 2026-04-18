# Remaining Checklist — Cylton Only

These items require your credentials, accounts, or decisions. Claude cannot do them.

---

## 1. Custom Domain (finalwishes.app)
**Why:** Still on `finalwishes-prod.web.app`. Custom domain is table stakes for credibility.

```
1. Firebase Console → Hosting → Add custom domain → enter: finalwishes.app
2. Firebase gives you DNS records (A records + TXT verification)
3. Add those records in your domain registrar (GoDaddy/Google Domains/etc.)
4. Wait for DNS propagation (~1-4 hours)
5. Firebase auto-provisions SSL certificate
```

---

## 2. Stripe Customer Portal Configuration
**Why:** The "Manage Subscription" button in Settings needs the Customer Portal enabled.

```
1. Go to https://dashboard.stripe.com/settings/billing/portal
2. Enable the Customer Portal
3. Configure:
   - Allow customers to cancel subscriptions: YES
   - Allow customers to switch plans: YES  
   - Show invoice history: YES
4. Save
```

The code is already deployed — it calls `POST /api/v1/payments/portal` which creates a portal session. The Stripe Dashboard config is the only missing piece.

---

## 3. OpenSign Template Verification
**Why:** The signing ceremony calls OpenSign with template IDs like `directive-ethical_will`. These templates need to exist in your OpenSign instance.

```
1. Go to sign.sirsi.ai (or wherever OpenSign is hosted)
2. Create templates for each directive type:
   - directive-ethical_will
   - directive-funeral_preferences
   - directive-final_message
   - directive-care_instructions
3. Each template needs a signer role called "Signer"
4. Verify OPENSIGN_API_KEY and OPENSIGN_API_URL are set in Cloud Run env vars
```

---

## Completed (by Claude)

- ~~Privacy Policy + Terms of Service~~ — Full legal documents deployed (commit 38f51f3)
- ~~npm Vulnerabilities~~ — 0 remaining (protobufjs fixed)
- ~~FIREBASE_TOKEN GitHub Secret~~ — Not needed. CI/CD updated to use existing `FIREBASE_SERVICE_ACCOUNT_FINALWISHES_PROD` service account (the proper auth method)

---

*Updated April 18, 2026 by Claude — FinalWishes Session 12*
