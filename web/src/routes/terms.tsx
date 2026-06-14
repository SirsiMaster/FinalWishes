/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-royal mb-4 font-[family-name:var(--font-cinzel)]">{title}</h2>
      {children}
    </section>
  )
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-20 max-w-3xl mx-auto font-[family-name:var(--font-inter)]">
      <h1 className="text-3xl font-bold text-royal mb-4 font-[family-name:var(--font-cinzel)]">Terms of Service</h1>
      <p className="text-sm text-ink-muted mb-10">Effective Date: April 17, 2026 &middot; Last Updated: April 17, 2026</p>

      <p className="text-ink leading-relaxed mb-8">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the FinalWishes platform (&ldquo;Service&rdquo;), operated by Sirsi Technologies, Inc., a Delaware C-Corporation (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <Section title="1. Description of Service">
        <p className="text-ink leading-relaxed mb-3">
          FinalWishes is a digital estate planning and settlement platform that helps individuals organize their assets, documents, beneficiary designations, and end-of-life preferences. The Service includes:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>Secure document storage (the &ldquo;Vault&rdquo;) with AES-256-GCM encryption</li>
          <li>Asset inventory and beneficiary designation management</li>
          <li>Directive creation (ethical wills, funeral preferences, final messages, care instructions)</li>
          <li>AI-assisted estate completion guidance (the &ldquo;Shepherd&rdquo;)</li>
          <li>Heir and executor invitation and access management</li>
          <li>Electronic document signing via Sirsi Sign</li>
          <li>Estate settlement workflows for authorized parties</li>
        </ul>
      </Section>

      <Section title="2. Not Legal Advice">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <p className="text-ink leading-relaxed font-medium">
            FinalWishes is not a law firm, financial advisor, tax advisor, or insurance broker. The Service does not provide legal, financial, tax, or insurance advice.
          </p>
        </div>
        <p className="text-ink leading-relaxed mb-3">
          The platform is an organizational and documentation tool. It helps you collect and structure your estate planning information, but it does not replace the professional judgment of a licensed attorney, financial planner, CPA, or other qualified professional.
        </p>
        <p className="text-ink leading-relaxed">
          You are solely responsible for ensuring that your estate plan complies with applicable federal, state, and local laws. We strongly recommend consulting with qualified legal counsel, particularly regarding wills, trusts, powers of attorney, and advance healthcare directives.
        </p>
      </Section>

      <Section title="3. Account Registration &amp; Security">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>You must be at least 18 years of age to create an account.</li>
          <li>You must provide accurate and complete information during registration.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You must notify us immediately at <a href="mailto:security@sirsi.ai" className="text-[var(--royal)] underline">security@sirsi.ai</a> if you suspect unauthorized access to your account.</li>
          <li>We strongly recommend enabling multi-factor authentication (MFA) for your account.</li>
          <li>You may not share your account or allow others to access your account on your behalf, except through the platform&rsquo;s designated heir and executor invitation features.</li>
        </ul>
      </Section>

      <Section title="4. Subscription &amp; Payments">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>FinalWishes offers tiered subscription plans. Features and storage limits vary by tier.</li>
          <li>Payments are processed by Stripe, Inc. By subscribing, you also agree to <a href="https://stripe.com/legal" className="text-[var(--royal)] underline" target="_blank" rel="noopener noreferrer">Stripe&rsquo;s Terms of Service</a>.</li>
          <li>Subscriptions renew automatically unless canceled before the renewal date.</li>
          <li>You may manage your subscription, including cancellation and plan changes, through your account settings.</li>
          <li>Refunds are handled on a case-by-case basis. Contact <a href="mailto:billing@sirsi.ai" className="text-[var(--royal)] underline">billing@sirsi.ai</a> for refund requests.</li>
          <li>We reserve the right to change pricing with 30 days&rsquo; notice. Price changes do not affect the current billing period.</li>
        </ul>
      </Section>

      <Section title="5. Your Content &amp; Data">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li><strong>Ownership:</strong> You retain full ownership of all content you upload or create on the platform, including documents, directives, and asset records.</li>
          <li><strong>License:</strong> You grant us a limited license to store, process, display, and transmit your content solely for the purpose of providing the Service to you.</li>
          <li><strong>Accuracy:</strong> You are responsible for the accuracy and completeness of the information you provide. We do not verify the legal validity of documents you upload or create.</li>
          <li><strong>Prohibited Content:</strong> You may not upload content that is illegal, infringes on third-party rights, or contains malware or harmful code.</li>
          <li><strong>Data Portability:</strong> You may request an export of your data at any time through your account settings or by contacting support.</li>
        </ul>
      </Section>

      <Section title="6. Estate Settlement &amp; Heir Access">
        <p className="text-ink leading-relaxed mb-3">
          FinalWishes includes features that allow designated heirs and executors to access estate information under specific conditions:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>Access is granted only to individuals explicitly invited by the estate owner through the platform.</li>
          <li>Heir and executor access levels are controlled by the estate owner and may be modified at any time while the owner&rsquo;s account is active.</li>
          <li>Estate settlement mode may be initiated by an authorized heir or executor upon presentation of required documentation (e.g., death certificate).</li>
          <li>We reserve the right to require identity verification before granting settlement-mode access.</li>
          <li>The estate owner&rsquo;s designations and preferences, as recorded on the platform, take precedence in all access decisions within the Service.</li>
        </ul>
      </Section>

      <Section title="7. AI-Assisted Features">
        <p className="text-ink leading-relaxed mb-3">
          The Service includes AI-powered features (the &ldquo;Shepherd&rdquo;) that provide guidance and suggestions:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>AI-generated suggestions are informational only and do not constitute professional advice.</li>
          <li>AI features may use your estate data to provide personalized guidance. This data is processed in accordance with our <a href="/privacy" className="text-[var(--royal)] underline">Privacy Policy</a>.</li>
          <li>AI outputs should be reviewed for accuracy before relying on them for estate planning decisions.</li>
          <li>We do not guarantee the accuracy, completeness, or legal sufficiency of AI-generated content.</li>
        </ul>
      </Section>

      <Section title="8. Acceptable Use">
        <p className="text-ink leading-relaxed mb-3">You agree not to:</p>
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
          <li>Attempt to gain unauthorized access to other users&rsquo; accounts or data.</li>
          <li>Interfere with or disrupt the Service or its infrastructure.</li>
          <li>Reverse-engineer, decompile, or disassemble any part of the Service.</li>
          <li>Use automated systems (bots, scrapers) to access the Service without our written permission.</li>
          <li>Impersonate another person or misrepresent your identity or authority.</li>
          <li>Use the Service to commit fraud, including fraudulent estate claims.</li>
        </ul>
      </Section>

      <Section title="9. Limitation of Liability">
        <div className="p-4 bg-[var(--neutral-faint)] border border-[var(--neutral-border)] rounded-lg">
          <p className="text-ink leading-relaxed mb-3">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SIRSI TECHNOLOGIES, INC. AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
            <li>Loss of profits, data, or goodwill</li>
            <li>Cost of procurement of substitute services</li>
            <li>Any matter beyond our reasonable control</li>
            <li>Reliance on AI-generated suggestions or estate completion guidance</li>
            <li>Disputes between estate owners, heirs, executors, or other parties</li>
            <li>Legal insufficiency of documents created or stored on the platform</li>
          </ul>
          <p className="text-ink leading-relaxed mt-3">
            OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </div>
      </Section>

      <Section title="10. Indemnification">
        <p className="text-ink leading-relaxed">
          You agree to indemnify and hold harmless Sirsi Technologies, Inc. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo; fees) arising out of or in any way connected with: (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) disputes arising from your estate planning activities or the content you provide through the Service.
        </p>
      </Section>

      <Section title="11. Termination">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li>You may terminate your account at any time through your account settings or by contacting support.</li>
          <li>We may suspend or terminate your account if you violate these Terms or engage in conduct that we reasonably believe is harmful to the Service or other users.</li>
          <li>Upon termination, your data will be handled in accordance with our <a href="/privacy" className="text-[var(--royal)] underline">Privacy Policy</a> (30-day deletion window).</li>
          <li>Sections 2, 9, 10, and 13 survive termination of these Terms.</li>
        </ul>
      </Section>

      <Section title="12. Modifications to Terms">
        <p className="text-ink leading-relaxed">
          We may modify these Terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Your continued use of the Service after changes become effective constitutes acceptance. If you disagree with modified Terms, you must stop using the Service and delete your account.
        </p>
      </Section>

      <Section title="13. Dispute Resolution">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li><strong>Governing Law:</strong> These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles.</li>
          <li><strong>Informal Resolution:</strong> Before filing any formal proceeding, you agree to attempt to resolve disputes informally by contacting <a href="mailto:legal@sirsi.ai" className="text-[var(--royal)] underline">legal@sirsi.ai</a>. We will attempt to resolve the dispute within 30 days.</li>
          <li><strong>Arbitration:</strong> If informal resolution fails, disputes shall be resolved by binding arbitration under the rules of the American Arbitration Association (AAA). Arbitration shall take place in the State of Delaware.</li>
          <li><strong>Class Action Waiver:</strong> You agree to resolve disputes individually and waive the right to participate in a class action or class-wide arbitration.</li>
          <li><strong>Exceptions:</strong> Either party may seek injunctive relief in a court of competent jurisdiction for intellectual property infringement or unauthorized access to the Service.</li>
        </ul>
      </Section>

      <Section title="14. General Provisions">
        <ul className="list-disc pl-6 space-y-2 text-ink leading-relaxed">
          <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Sirsi Technologies, Inc. regarding the Service.</li>
          <li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions remain in full force and effect.</li>
          <li><strong>Waiver:</strong> Our failure to enforce any right or provision does not constitute a waiver of that right or provision.</li>
          <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our prior written consent. We may assign our rights without restriction.</li>
        </ul>
      </Section>

      <Section title="15. Contact Us">
        <p className="text-ink leading-relaxed">
          If you have questions about these Terms, contact us at:
        </p>
        <div className="mt-4 p-4 bg-[var(--neutral-faint)] rounded-lg text-ink leading-relaxed">
          <p className="font-semibold">Sirsi Technologies, Inc.</p>
          <p>Email: <a href="mailto:legal@sirsi.ai" className="text-[var(--royal)] underline">legal@sirsi.ai</a></p>
          <p>Web: <a href="https://finalwishes.app" className="text-[var(--royal)] underline">finalwishes.app</a></p>
        </div>
      </Section>
    </div>
  )
}
