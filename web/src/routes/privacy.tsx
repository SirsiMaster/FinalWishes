/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-20 max-w-3xl mx-auto font-[family-name:var(--font-inter)]">
      <h1 className="text-3xl font-bold text-[#0F172A] mb-8 font-[family-name:var(--font-cinzel)]">Privacy Policy</h1>
      <p className="text-slate-600 leading-relaxed mb-6">
        FinalWishes is committed to protecting your privacy. This policy describes how we collect, use, and protect your personal information.
      </p>
      <p className="text-slate-600 leading-relaxed mb-6">
        We use industry-standard AES-256 encryption to protect all sensitive data, including estate documents, financial records, and personal identifiers. Your data is stored in SOC 2-designed infrastructure and is never shared with third parties without your explicit consent.
      </p>
      <p className="text-slate-600 leading-relaxed mb-6">
        For questions about our privacy practices, contact us at <a href="mailto:privacy@sirsi.ai" className="text-[#133378] underline">privacy@sirsi.ai</a>.
      </p>
      <p className="text-sm text-slate-400 mt-12">Last updated: April 2026</p>
    </div>
  )
}
