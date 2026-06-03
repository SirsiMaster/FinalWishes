# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated.spec.ts >> FinalWishes Authenticated Flows — Demo Mode >> dashboard loads with Shepherd data
- Location: e2e/authenticated.spec.ts:49:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#login-identifier')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('#login-identifier')

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - navigation:
        - generic:
          - generic:
            - img
            - generic: FINALWISHES
          - generic:
            - link:
              - /url: "#scenarios"
              - text: Who It's For
            - link:
              - /url: "#how-it-works"
              - text: How It Works
            - link:
              - /url: "#security"
              - text: Security
            - link:
              - /url: "#pricing"
              - text: Pricing
            - link:
              - /url: "#faq"
              - text: FAQ
          - generic:
            - button: Sign In
            - button: Start Free
      - generic:
        - generic:
          - img
        - generic:
          - heading [level=1]: Your Family's Future Starts With a Plan.
          - paragraph: Organize your estate, preserve your voice, and protect the people you love — all in one secure vault. Free to start. Ready in 15 minutes.
          - generic:
            - button: Create Your Free Vault
            - link:
              - /url: "#scenarios"
              - text: See Who It's For
        - generic:
          - img
      - generic:
        - generic:
          - generic:
            - paragraph: Whatever brought you here, we can help
            - heading [level=2]: Life Doesn't Wait. Neither Should You.
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 🕊
                  - generic:
                    - heading [level=3]: I just lost someone
                    - paragraph: Organize their estate, notify heirs, settle accounts, and distribute assets — guided step by step.
                    - button: Start settlement →
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 🛡
                  - generic:
                    - heading [level=3]: I'm planning ahead
                    - paragraph: Secure your documents, record your wishes, designate beneficiaries, and give your family clarity.
                    - button: Create your vault →
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 👴
                  - generic:
                    - heading [level=3]: My parent is aging
                    - paragraph: Help them organize while they can. Capture their voice, their values, and their instructions.
                    - button: Set up together →
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: ⚖
                  - generic:
                    - heading [level=3]: Major life change
                    - paragraph: Divorce, remarriage, new child — update beneficiaries, restructure assets, protect what matters.
                    - button: Update your plan →
      - generic:
        - generic:
          - img
          - generic:
            - generic:
              - generic: $0 Billion
            - generic: In Unclaimed Assets Nationwide
        - generic:
          - generic:
            - heading [level=2]: The Cost of Not Being Ready
            - paragraph: When someone passes without a plan, families face frozen accounts, lost passwords, missing documents, and legal battles that can last years. FinalWishes eliminates that chaos — before it starts.
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 0%
                  - generic: No Will
              - generic:
                - generic:
                  - generic:
                    - generic: 0 mo
                  - generic: Avg Probate
              - generic:
                - generic:
                  - generic:
                    - generic: $0B+
                  - generic: Court Costs
      - generic:
        - generic:
          - generic:
            - paragraph: Everything in one place
            - heading [level=2]: Here's What You Can Do Today
            - paragraph: No lawyer needed. No paperwork. Just answers.
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 📋
                    - heading [level=3]: Organize Everything
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: Upload wills, trusts, deeds, policies
                      - listitem:
                        - generic: ✓
                        - text: Track assets, debts, insurance
                      - listitem:
                        - generic: ✓
                        - text: Store passwords and digital accounts
                      - listitem:
                        - generic: ✓
                        - text: Record funeral and burial preferences
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 🎙
                    - heading [level=3]: Preserve Your Voice
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: Record video and audio memoirs
                      - listitem:
                        - generic: ✓
                        - text: Write ethical wills and life stories
                      - listitem:
                        - generic: ✓
                        - text: Create sealed letters for loved ones
                      - listitem:
                        - generic: ✓
                        - text: Schedule time capsule deliveries
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: 👥
                    - heading [level=3]: Protect Your People
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: Invite heirs and executors securely
                      - listitem:
                        - generic: ✓
                        - text: Assign roles and access levels
                      - listitem:
                        - generic: ✓
                        - text: Auto-notify when the time comes
                      - listitem:
                        - generic: ✓
                        - text: Guide them through settlement
      - generic:
        - generic:
          - generic:
            - heading [level=2]: Three Steps. Fifteen Minutes.
            - paragraph: That's all it takes to protect everything you've built.
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic: "1"
                  - heading [level=4]: Create Your Vault
                  - paragraph: Sign up free. Add your first document, asset, or memoir. Takes 2 minutes.
            - generic:
              - generic:
                - generic:
                  - generic: "2"
                  - heading [level=4]: Invite Your Circle
                  - paragraph: Add heirs, executors, or your attorney. They get access only to what you allow.
            - generic:
              - generic:
                - generic:
                  - generic: "3"
                  - heading [level=4]: Live in Peace
                  - paragraph: We stand watch. When the time comes, your people receive everything they need — automatically.
      - generic:
        - generic:
          - generic:
            - paragraph: See it in action
            - heading [level=2]: This Is Your Dashboard
            - paragraph: Not a mockup. This is the actual product. Click through to see every feature.
          - generic:
            - generic:
              - generic:
                - button: Dashboard
                - button: Soul Log
                - button: Document Vault
                - button: Assets
                - button: Directives
                - button: My People
                - button: Time Capsules
                - button: Digital Lockbox
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: finalwishes.app/estates/soul-log
                  - generic:
                    - img
                    - img
                    - img
                    - img
                    - img
                    - img
                    - img
                    - img
                - generic:
                  - heading [level=3]: Record your story
                  - paragraph: Video, audio, or written entries. Your personal diary that becomes a gift to your family — transcribed and searchable.
      - generic:
        - generic:
          - generic:
            - paragraph: AI-Powered Guidance
            - heading [level=2]: The Shepherd Guides You
            - paragraph: Not sure where to start? Our AI engine analyzes your estate and tells you exactly what's missing, what's urgent, and what to do next. It's like having a personal estate advisor — available 24/7.
            - list:
              - listitem:
                - generic: ✓
                - text: Personalized completion checklist
              - listitem:
                - generic: ✓
                - text: Daily prompts to capture your story
              - listitem:
                - generic: ✓
                - text: Obituary drafting assistance
              - listitem:
                - generic: ✓
                - text: Smart suggestions based on your situation
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic: 🧭
                - generic:
                  - generic: The Shepherd
                  - generic: AI Estate Advisor
              - generic:
                - generic:
                  - text: Your estate is
                  - strong: 62% complete
                  - text: . You're missing funeral preferences and a beneficiary for your retirement account.
                - generic:
                  - strong: "Today's prompt:"
                  - text: What's one life lesson you'd want your children to remember?
                - generic:
                  - strong: "Action needed:"
                  - text: You have 3 assets without designated beneficiaries.
                  - button: Fix now →
      - generic:
        - generic:
          - generic:
            - heading [level=2]: Your Data. Fort Knox Security.
            - paragraph: Estate documents are the most sensitive data a family owns. We encrypt everything with the same technology banks use.
          - generic:
            - generic:
              - generic:
                - generic: AES-256 Encryption
                - generic: Military-grade at rest
            - generic:
              - generic:
                - generic: Cloud KMS
                - generic: Google-managed keys
            - generic:
              - generic:
                - generic: MFA Required
                - generic: For all sensitive access
            - generic:
              - generic:
                - generic: SOC 2 Architecture
                - generic: Enterprise audit trail
      - generic:
        - generic:
          - generic:
            - heading [level=2]: Built for Real Families
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - paragraph: “After my father passed, we spent 14 months in probate. I set up FinalWishes so my children never have to go through that.”
                    - generic:
                      - generic:
                        - generic: Margaret T.
                        - generic: Estate Owner, Maryland
            - generic:
              - generic:
                - generic:
                  - generic:
                    - paragraph: “I uploaded every document, recorded messages for my kids, and designated my executor — all in one Saturday afternoon.”
                    - generic:
                      - generic:
                        - generic: David K.
                        - generic: Estate Owner, Illinois
            - generic:
              - generic:
                - generic:
                  - generic:
                    - paragraph: “When my client's spouse passed suddenly, their FinalWishes vault had everything we needed. It saved months of discovery.”
                    - generic:
                      - generic:
                        - generic: Patricia M., Esq.
                        - generic: Estate Attorney, Minnesota
      - generic:
        - generic:
          - generic:
            - heading [level=2]: Start Free. Upgrade When Ready.
            - paragraph: No credit card required. Your vault is free forever. Upgrade for unlimited storage, video memoirs, and AI guidance.
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: Guardian
                    - generic: FREE
                    - generic: Forever
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: 1 estate plan
                      - listitem:
                        - generic: ✓
                        - text: 5 document uploads
                      - listitem:
                        - generic: ✓
                        - text: Basic asset inventory
                      - listitem:
                        - generic: ✓
                        - text: Heir invitations
                    - button: Start Free
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic: Concierge
                      - generic: Popular
                    - generic: $29/mo
                    - generic: Cancel Anytime
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: Unlimited documents
                      - listitem:
                        - generic: ✓
                        - text: PII encryption vault
                      - listitem:
                        - generic: ✓
                        - text: Video & audio memoirs
                      - listitem:
                        - generic: ✓
                        - text: Time capsules
                      - listitem:
                        - generic: ✓
                        - text: Digital lockbox
                      - listitem:
                        - generic: ✓
                        - text: Priority support
                    - button: Get Started
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic: White Glove
                    - generic: $99/mo
                    - generic: Cancel Anytime
                    - list:
                      - listitem:
                        - generic: ✓
                        - text: Everything in Concierge
                      - listitem:
                        - generic: ✓
                        - text: AI Shepherd guidance
                      - listitem:
                        - generic: ✓
                        - text: Legal document review
                      - listitem:
                        - generic: ✓
                        - text: Multi-executor coordination
                      - listitem:
                        - generic: ✓
                        - text: Probate preparation
                      - listitem:
                        - generic: ✓
                        - text: Phone support
                    - button: Get Started
      - generic:
        - generic:
          - generic:
            - heading [level=2]: Common Questions
          - generic:
            - generic:
              - button:
                - generic:
                  - heading [level=3]: Is FinalWishes a substitute for a will or trust?
                  - generic: +
            - generic:
              - button:
                - generic:
                  - heading [level=3]: What happens to my data if FinalWishes shuts down?
                  - generic: +
            - generic:
              - button:
                - generic:
                  - heading [level=3]: How do my heirs get access when I pass?
                  - generic: +
            - generic:
              - button:
                - generic:
                  - heading [level=3]: Is my data really secure?
                  - generic: +
            - generic:
              - button:
                - generic:
                  - heading [level=3]: Can I try it before paying?
                  - generic: +
            - generic:
              - button:
                - generic:
                  - heading [level=3]: What states do you support?
                  - generic: +
      - generic:
        - generic:
          - img
        - generic:
          - heading [level=2]: Don't Wait for the Moment You Wish You Had Started.
          - paragraph: 15 minutes today can save your family months of confusion tomorrow.
          - generic:
            - button: Create Your Free Vault
          - generic:
            - generic:
              - generic: Free Forever Plan
            - generic:
              - generic: No Credit Card
            - generic:
              - generic: Setup in 15 Minutes
      - generic:
        - generic:
          - generic:
            - generic:
              - generic:
                - img
                - generic: FINALWISHES
              - paragraph: The estate operating system. Organize your assets, preserve your voice, and give your family clarity when it matters most.
            - generic:
              - heading [level=4]: Product
              - list:
                - listitem:
                  - link:
                    - /url: "#scenarios"
                    - text: Who It's For
                - listitem:
                  - link:
                    - /url: "#how-it-works"
                    - text: How It Works
                - listitem:
                  - link:
                    - /url: "#security"
                    - text: Security
                - listitem:
                  - link:
                    - /url: "#pricing"
                    - text: Pricing
            - generic:
              - heading [level=4]: Company
              - list:
                - listitem:
                  - link:
                    - /url: /about
                    - text: About Us
                - listitem:
                  - link:
                    - /url: mailto:support@sirsi.ai
                    - text: Contact
            - generic:
              - heading [level=4]: Legal
              - list:
                - listitem:
                  - link:
                    - /url: /privacy
                    - text: Privacy
                - listitem:
                  - link:
                    - /url: /terms
                    - text: Terms
                - listitem:
                  - link:
                    - /url: "#faq"
                    - text: FAQ
          - generic:
            - generic:
              - text: © 2026 FinalWishes Inc. Powered by
              - strong: Sirsi Technologies
              - text: .
            - generic:
              - generic: AES-256
              - generic: Cloud KMS
              - generic: SOC 2
    - region "Notifications alt+T"
  - dialog "Sign In" [ref=e2]:
    - heading "Sign In" [level=2] [ref=e4]
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e12]: FINALWISHES
      - heading "Sign In" [level=2] [ref=e13]
      - paragraph [ref=e14]: Secure access to the Estate Operating System
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: Email or Username
        - textbox "Email or Username" [active] [ref=e19]:
          - /placeholder: e.g. jane@example.com
      - generic [ref=e20]:
        - generic [ref=e21]: Password
        - generic [ref=e22]:
          - textbox "Password" [ref=e23]:
            - /placeholder: ••••••••
          - button [ref=e24]:
            - img
      - button "Sign In" [ref=e25]
      - generic [ref=e26]:
        - button "Forgot password?" [ref=e27]
        - button "Create account" [ref=e28]
    - generic [ref=e30]:
      - generic [ref=e33]: AES-256
      - generic [ref=e36]: SOC 2 Architecture
    - button "Close" [ref=e37]:
      - img
      - generic [ref=e38]: Close
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test'
  2   | 
  3   | /**
  4   |  * Authenticated E2E Tests — Demo Mode
  5   |  *
  6   |  * These tests log in via the demo account (Tameeka116 / ML6824!)
  7   |  * and exercise the authenticated estate dashboard pages.
  8   |  *
  9   |  * Requires the auth provider demo mode support (loginDemo in auth.tsx).
  10  |  * Run against local dev server or production with `E2E_BASE_URL`.
  11  |  */
  12  | 
  13  | async function demoLogin(page: Page) {
  14  |   await page.goto('/login?demo=true')
> 15  |   await expect(page.locator('#login-identifier')).toBeVisible({ timeout: 15000 })
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  16  |   await page.locator('#login-identifier').fill('Tameeka116')
  17  |   await page.locator('#login-password').fill('ML6824!')
  18  |   await page.locator('#login-submit').click()
  19  |   // Wait for navigation to estate dashboard
  20  |   await page.waitForURL(/estates/, { timeout: 15000 })
  21  | }
  22  | 
  23  | /** Expand a collapsible sidebar group by clicking its label */
  24  | async function expandNavGroup(page: Page, groupLabel: string) {
  25  |   const group = page.locator('nav button').filter({ hasText: groupLabel })
  26  |   if (await group.isVisible()) {
  27  |     await group.click()
  28  |     // Wait for expand animation
  29  |     await page.waitForTimeout(200)
  30  |   }
  31  | }
  32  | 
  33  | /** Navigate to a nested sidebar item by expanding its parent group first */
  34  | async function navigateToNestedItem(page: Page, parentGroup: string, childLabel: string) {
  35  |   await expandNavGroup(page, parentGroup)
  36  |   await page.locator('nav').getByText(childLabel, { exact: true }).click()
  37  | }
  38  | 
  39  | test.describe('FinalWishes Authenticated Flows — Demo Mode', () => {
  40  |   // Increase test timeout for authenticated flows (network + Firebase init)
  41  |   test.setTimeout(60000)
  42  | 
  43  |   test.beforeEach(async ({ page }) => {
  44  |     await demoLogin(page)
  45  |   })
  46  | 
  47  |   // ─── 1. Dashboard loads with Shepherd data ──────────────────────────────
  48  | 
  49  |   test('dashboard loads with Shepherd data', async ({ page }) => {
  50  |     // "Estate Completion" label
  51  |     await expect(page.getByText('Estate Completion')).toBeVisible({ timeout: 10000 })
  52  | 
  53  |     // Stat card labels
  54  |     await expect(page.getByText('Total Assets')).toBeVisible({ timeout: 10000 })
  55  |     await expect(page.getByText('Stored Documents')).toBeVisible()
  56  |     await expect(page.getByText('Beneficiaries').first()).toBeVisible()
  57  | 
  58  |     // Checklist heading
  59  |     await expect(page.getByText('Estate Checklist')).toBeVisible()
  60  |   })
  61  | 
  62  |   // ─── 2. Navigate to all major pages ─────────────────────────────────────
  63  | 
  64  |   test('navigate to all major pages from sidebar', async ({ page }) => {
  65  |     // Direct nav items (no parent group)
  66  |     await page.locator('nav').getByText('Soul Log', { exact: true }).click()
  67  |     await expect(page.getByRole('heading', { name: /Soul Log/i }).first()).toBeVisible({ timeout: 10000 })
  68  | 
  69  |     await page.locator('nav').getByText('My People', { exact: true }).click()
  70  |     await expect(page.getByText(/Family|Heirs|Beneficiaries/i).first()).toBeVisible({ timeout: 10000 })
  71  | 
  72  |     // The Vault group → Assets, Documents, Lockbox
  73  |     await navigateToNestedItem(page, 'The Vault', 'Assets')
  74  |     await expect(page.getByText(/My Assets/i).first()).toBeVisible({ timeout: 10000 })
  75  | 
  76  |     await navigateToNestedItem(page, 'The Vault', 'Documents')
  77  |     await expect(page.getByText(/Vault|Documents/i).first()).toBeVisible({ timeout: 10000 })
  78  | 
  79  |     await navigateToNestedItem(page, 'The Vault', 'Lockbox')
  80  |     await expect(page.getByText(/Digital Lockbox|Lockbox/i).first()).toBeVisible({ timeout: 10000 })
  81  | 
  82  |     // Letters group → Directives, Time Capsules, Final Record
  83  |     await navigateToNestedItem(page, 'Letters', 'Directives')
  84  |     await expect(page.getByText(/Final Directives|Directives/i).first()).toBeVisible({ timeout: 10000 })
  85  | 
  86  |     await navigateToNestedItem(page, 'Letters', 'Time Capsules')
  87  |     await expect(page.getByText(/Time Capsule/i).first()).toBeVisible({ timeout: 10000 })
  88  | 
  89  |     await navigateToNestedItem(page, 'Letters', 'Final Record')
  90  |     await expect(page.getByText(/Final Record|Obituary/i).first()).toBeVisible({ timeout: 10000 })
  91  | 
  92  |     // Memories group → Photos & Videos, Heirlooms
  93  |     await navigateToNestedItem(page, 'Memories', 'Photos & Videos')
  94  |     await expect(page.getByText(/Memori|Life Stories/i).first()).toBeVisible({ timeout: 10000 })
  95  | 
  96  |     await navigateToNestedItem(page, 'Memories', 'Heirlooms')
  97  |     await expect(page.getByText(/Heirloom/i).first()).toBeVisible({ timeout: 10000 })
  98  | 
  99  |     // Utility items
  100 |     await page.locator('nav').getByText('Upgrade Plan', { exact: true }).click()
  101 |     await expect(page.getByText(/Choose Your Plan|Pricing/i).first()).toBeVisible({ timeout: 10000 })
  102 | 
  103 |     await page.locator('nav').getByText('Settings', { exact: true }).click()
  104 |     await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 })
  105 | 
  106 |     await page.locator('nav').getByText('Notifications', { exact: true }).click()
  107 |     await expect(page.getByText(/Notification/i).first()).toBeVisible({ timeout: 10000 })
  108 |   })
  109 | 
  110 |   // ─── 3. Assets page: open Add Asset dialog ─────────────────────────────
  111 | 
  112 |   test('assets page: open Add Asset dialog', async ({ page }) => {
  113 |     await navigateToNestedItem(page, 'The Vault', 'Assets')
  114 |     await expect(page.getByText('My Assets')).toBeVisible({ timeout: 10000 })
  115 | 
```