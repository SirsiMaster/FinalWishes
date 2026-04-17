/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-[#0F172A] mb-4 font-[family-name:var(--font-cinzel)]">{title}</h2>
      {children}
    </section>
  )
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-20 max-w-3xl mx-auto font-[family-name:var(--font-inter)]">
      <h1 className="text-3xl font-bold text-[#0F172A] mb-4 font-[family-name:var(--font-cinzel)]">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-10">Effective Date: April 17, 2026 &middot; Last Updated: April 17, 2026</p>

      <p className="text-slate-700 leading-relaxed mb-8">
        FinalWishes (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is operated by Sirsi Technologies, Inc., a Delaware C-Corporation. This Privacy Policy describes how we collect, use, store, and protect your personal information when you use the FinalWishes platform (&ldquo;Service&rdquo;). By using the Service, you consent to the practices described below.
      </p>

      <Section title="1. Information We Collect">
        <p className="text-slate-700 leading-relaxed mb-3">We collect information in the following categories:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li><strong>Account Information:</strong> Name, email address, phone number, and authentication credentials when you create an account.</li>
          <li><strong>Estate Planning Data:</strong> Asset inventories, beneficiary designations, directive documents, funeral preferences, care instructions, and related estate planning information you voluntarily provide.</li>
          <li><strong>Uploaded Documents:</strong> Wills, trusts, insurance policies, deeds, financial statements, and other files you upload to your vault.</li>
          <li><strong>Payment Information:</strong> Billing details processed through Stripe. We do not store credit card numbers on our servers.</li>
          <li><strong>Usage Data:</strong> Pages visited, features used, session duration, and device/browser information collected automatically for product improvement.</li>
          <li><strong>Communications:</strong> Messages sent through the platform, including heir invitations and notifications.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li>Provide, maintain, and improve the FinalWishes estate planning platform.</li>
          <li>Process payments and manage your subscription.</li>
          <li>Send transactional communications (account verification, invitation notifications, security alerts).</li>
          <li>Power AI-assisted features, including estate completion guidance and document organization (via our &ldquo;Shepherd&rdquo; AI engine).</li>
          <li>Generate anonymized, aggregated analytics to improve our Service.</li>
          <li>Comply with legal obligations, including estate settlement processes initiated by authorized parties.</li>
        </ul>
      </Section>

      <Section title="3. Data Security &amp; Encryption">
        <p className="text-slate-700 leading-relaxed mb-3">
          Estate planning data is among the most sensitive information a person can entrust to a platform. We treat security as a foundational requirement, not an afterthought.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li><strong>Encryption at Rest:</strong> All personally identifiable information (PII) and estate documents are encrypted using AES-256-GCM envelope encryption via Google Cloud Key Management Service (Cloud KMS). Each estate has its own additional authenticated data (AAD) scope.</li>
          <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is protected by TLS 1.2 or higher.</li>
          <li><strong>Authentication:</strong> Multi-factor authentication (MFA) via TOTP is available and recommended for all accounts. We use Firebase Authentication for identity management.</li>
          <li><strong>Infrastructure:</strong> Our infrastructure is hosted on Google Cloud Platform with SOC 2 Type II-aligned security controls.</li>
          <li><strong>Access Controls:</strong> Internal access to customer data is restricted to authorized personnel on a need-to-know basis, with audit logging.</li>
        </ul>
      </Section>

      <Section title="4. Third-Party Services">
        <p className="text-slate-700 leading-relaxed mb-3">We use the following third-party services to operate the platform:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-2 font-semibold border-b border-slate-200">Service</th>
                <th className="text-left px-4 py-2 font-semibold border-b border-slate-200">Provider</th>
                <th className="text-left px-4 py-2 font-semibold border-b border-slate-200">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">Authentication</td>
                <td className="px-4 py-2">Google (Firebase Auth)</td>
                <td className="px-4 py-2">User identity &amp; MFA</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">Payments</td>
                <td className="px-4 py-2">Stripe, Inc.</td>
                <td className="px-4 py-2">Subscription billing</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">Hosting &amp; Storage</td>
                <td className="px-4 py-2">Google Cloud Platform</td>
                <td className="px-4 py-2">Application hosting, encrypted file storage</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">Encryption</td>
                <td className="px-4 py-2">Google Cloud KMS</td>
                <td className="px-4 py-2">Key management for PII encryption</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">E-Signing</td>
                <td className="px-4 py-2">Sirsi Sign (OpenSign)</td>
                <td className="px-4 py-2">Document signing ceremonies</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-2">AI Engine</td>
                <td className="px-4 py-2">Anthropic (Claude)</td>
                <td className="px-4 py-2">Estate completion guidance</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Email</td>
                <td className="px-4 py-2">Google (Gmail API)</td>
                <td className="px-4 py-2">Transactional email delivery</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-700 leading-relaxed mt-3">
          Each third-party provider is bound by their own privacy policies and applicable data protection agreements. We do not sell your personal information to any third party.
        </p>
      </Section>

      <Section title="5. Data Retention">
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li><strong>Active Accounts:</strong> Your data is retained for as long as your account is active and your subscription is current.</li>
          <li><strong>Account Deletion:</strong> Upon account deletion, your personal data and uploaded documents are permanently deleted within 30 days. Anonymized analytics data may be retained.</li>
          <li><strong>Estate Settlement:</strong> If your account enters estate settlement mode (triggered by an authorized heir or executor), your data is retained for the duration of the settlement process, subject to applicable law.</li>
          <li><strong>Legal Obligations:</strong> We may retain certain records as required by applicable law, regulation, or legal proceedings.</li>
        </ul>
      </Section>

      <Section title="6. Your Rights">
        <p className="text-slate-700 leading-relaxed mb-3">
          Depending on your jurisdiction, you may have the following rights regarding your personal information:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal information.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal retention requirements.</li>
          <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
          <li><strong>Opt-Out:</strong> Opt out of non-essential communications at any time via your account settings.</li>
        </ul>

        <h3 className="text-lg font-semibold text-[#0F172A] mt-6 mb-3">California Residents (CCPA/CPRA)</h3>
        <p className="text-slate-700 leading-relaxed mb-3">
          If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
        </p>
        <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed">
          <li>Right to know what personal information is collected, used, shared, or sold.</li>
          <li>Right to delete personal information held by us and by our service providers.</li>
          <li>Right to opt-out of the sale of personal information. <strong>We do not sell personal information.</strong></li>
          <li>Right to non-discrimination for exercising your privacy rights.</li>
        </ul>

        <h3 className="text-lg font-semibold text-[#0F172A] mt-6 mb-3">Maryland, Illinois &amp; Minnesota Residents</h3>
        <p className="text-slate-700 leading-relaxed">
          FinalWishes operates in compliance with applicable state privacy laws in Maryland, Illinois, and Minnesota. Illinois residents should be aware that we do not collect biometric information. If you have questions about your state-specific rights, contact us at the address below.
        </p>
      </Section>

      <Section title="7. Cookies &amp; Tracking">
        <p className="text-slate-700 leading-relaxed">
          We use essential cookies required for authentication and session management. We do not use third-party advertising cookies or cross-site tracking technologies. Analytics data is collected in aggregate form and does not identify individual users.
        </p>
      </Section>

      <Section title="8. Children&rsquo;s Privacy">
        <p className="text-slate-700 leading-relaxed">
          FinalWishes is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will take steps to delete such information.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p className="text-slate-700 leading-relaxed">
          We may update this Privacy Policy from time to time. Material changes will be communicated via email or an in-app notification. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p className="text-slate-700 leading-relaxed">
          If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at:
        </p>
        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">
          <p className="font-semibold">Sirsi Technologies, Inc.</p>
          <p>Email: <a href="mailto:privacy@sirsi.ai" className="text-[#133378] underline">privacy@sirsi.ai</a></p>
          <p>Web: <a href="https://finalwishes.app" className="text-[#133378] underline">finalwishes.app</a></p>
        </div>
      </Section>
    </div>
  )
}
