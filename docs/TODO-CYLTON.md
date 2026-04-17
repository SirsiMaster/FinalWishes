# Tomorrow's Checklist — Cylton Only

These items require your credentials, accounts, or decisions. Claude cannot do them.

---

## 1. Custom Domain (finalwishes.app)
**Why:** Still on `finalwishes-prod.web.app`. Custom domain is table stakes for credibility.

```bash
# In terminal:
firebase hosting:sites:list
firebase hosting:channel:deploy production

# Then in Firebase Console → Hosting → Add custom domain:
# 1. Enter: finalwishes.app
# 2. Firebase gives you DNS records (A records + TXT verification)
# 3. Add those records in your domain registrar (GoDaddy/Google Domains/etc.)
# 4. Wait for DNS propagation (~1-4 hours)
# 5. Firebase auto-provisions SSL certificate
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

## 3. FIREBASE_TOKEN GitHub Secret
**Why:** The CI/CD pipeline now deploys Functions + Firestore/Storage rules, but needs auth.

```bash
# Generate a CI token:
firebase login:ci

# Copy the token, then:
# Go to https://github.com/SirsiMaster/FinalWishes/settings/secrets/actions
# Add new secret: FIREBASE_TOKEN = (paste token)
```

---

## 4. Privacy Policy + Terms of Service
**Why:** Current pages at `/privacy` and `/terms` are placeholder stubs. Real legal documents needed.

Options:
- Use Termly.io or iubenda.com to generate ($10-20/mo)
- Have an attorney draft (recommended for estate planning product)
- Files to update: `web/src/routes/privacy.tsx` and `web/src/routes/terms.tsx`

Key sections needed:
- Data retention policy
- Third-party services (Firebase, Stripe, Google Cloud)
- CCPA/state privacy rights
- Cookie usage
- Limitation of liability
- Dispute resolution

---

## 5. OpenSign Template Verification
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

## 6. npm Vulnerabilities
**Why:** GitHub flagged 11 vulnerabilities (3 critical, 4 high).

```bash
cd /Users/thekryptodragon/Development/FinalWishes
npm audit
npm audit fix
# If that doesn't resolve all: npm audit fix --force (review changes carefully)
```

---

## What's Running Overnight (4 agents)

These will auto-commit when you return:
1. **Stripe subscription management** — "Manage Subscription" button + Go API portal endpoint
2. **Account deletion flow** — Settings danger zone + confirmation + cleanup
3. **Tier-gating enforcement** — Friendly upgrade prompts on gated features
4. **Critical path tests** — ShepherdNudge, OwnerWelcome, HeirWelcome, invitation tests

---

*Generated April 17, 2026 by Claude — FinalWishes Session 11*
