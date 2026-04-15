/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-20 max-w-3xl mx-auto font-[family-name:var(--font-inter)]">
      <h1 className="text-3xl font-bold text-[#0F172A] mb-8 font-[family-name:var(--font-cinzel)]">Terms of Service</h1>
      <p className="text-slate-600 leading-relaxed mb-6">
        By using FinalWishes, you agree to these terms. FinalWishes provides a digital estate planning platform for organizing assets, documents, and beneficiary designations.
      </p>
      <p className="text-slate-600 leading-relaxed mb-6">
        FinalWishes is not a law firm and does not provide legal advice. The platform assists with organization and documentation but does not replace professional legal, financial, or tax counsel.
      </p>
      <p className="text-slate-600 leading-relaxed mb-6">
        For questions about these terms, contact us at <a href="mailto:legal@sirsi.ai" className="text-[#133378] underline">legal@sirsi.ai</a>.
      </p>
      <p className="text-sm text-slate-400 mt-12">Last updated: April 2026</p>
    </div>
  )
}
