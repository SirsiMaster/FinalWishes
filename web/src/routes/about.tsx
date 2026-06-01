/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-gold font-[family-name:var(--font-cinzel)]">{value}</div>
      <div className="text-[11px] md:text-xs text-white/60 uppercase tracking-[0.15em] mt-1">{label}</div>
    </div>
  )
}

function Value({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
      <h3 className="text-[#1A1A1A] font-bold text-base mb-2">{title}</h3>
      <p className="text-[#4B5563] text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function AboutPage() {
  return (
    <main className="min-h-screen bg-white font-[family-name:var(--font-inter)]">
      {/* ── Header / Hero ── */}
      <section className="relative bg-[#1A3478] text-white px-6 pt-24 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs uppercase tracking-[0.2em] mb-8 transition-colors"
          >
            &larr; Back to Home
          </Link>
          <p className="text-gold text-xs font-bold uppercase tracking-[0.25em] mb-4">About FinalWishes</p>
          <h1 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] leading-tight mb-6">
            We Turn the Hardest Day<br /><span className="text-gold">Into a Guided One.</span>
          </h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            FinalWishes is the Estate Operating System — a single, secure place to organize what you own,
            preserve your voice, and give the people you love a clear path forward when it matters most.
          </p>
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl text-[#1A1A1A] font-[family-name:var(--font-cinzel)] mb-5">
          Why We <span className="text-[#C8A951]">Built This</span>
        </h2>
        <p className="text-[#4B5563] leading-relaxed mb-4">
          Every year, families lose months to probate, scramble for passwords that no longer exist, and
          argue over wishes that were never written down. More than $72 billion in assets sits unclaimed
          nationwide — not because families don&rsquo;t care, but because no one left a map.
        </p>
        <p className="text-[#4B5563] leading-relaxed">
          FinalWishes exists to end that chaos before it starts. We believe estate planning should feel less
          like a filing cabinet and more like a conversation with the people you love — organized, secure,
          and ready the moment it&rsquo;s needed. Not a substitute for your attorney, but the system that
          makes everyone&rsquo;s job easier.
        </p>
      </section>

      {/* ── Stats band ── */}
      <section className="bg-[#1A3478] px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value="$72B" label="Unclaimed Assets" />
          <Stat value="18 mo" label="Avg. Probate" />
          <Stat value="AES-256" label="Encryption" />
          <Stat value="50" label="States Supported" />
        </div>
      </section>

      {/* ── Values ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl text-[#1A1A1A] font-[family-name:var(--font-cinzel)] text-center mb-10">
          What We <span className="text-[#C8A951]">Stand For</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          <Value title="Security as a Foundation">
            Estate documents are the most sensitive data a family owns. Every record is encrypted at rest
            with AES-256-GCM via Google Cloud KMS, protected by multi-factor authentication, and logged for
            accountability — the same standard banks use.
          </Value>
          <Value title="Your Voice, Preserved">
            A plan is more than paperwork. Record video and audio memoirs, write ethical wills, and schedule
            sealed messages for the people and moments that matter — so your wishes arrive in your own words.
          </Value>
          <Value title="Clarity for Your People">
            You decide who sees what. Heirs, executors, and attorneys receive role-based access to exactly
            what you authorize — and step-by-step guidance through settlement when the time comes.
          </Value>
        </div>
      </section>

      {/* ── Backing ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto border-t border-slate-100">
        <h2 className="text-2xl md:text-3xl text-[#1A1A1A] font-[family-name:var(--font-cinzel)] mb-5">
          Built by <span className="text-[#C8A951]">Sirsi Technologies</span>
        </h2>
        <p className="text-[#4B5563] leading-relaxed mb-4">
          FinalWishes is operated by Sirsi Technologies, Inc., a Delaware C-Corporation building sovereign,
          security-first software for regulated industries. FinalWishes is our answer to one of the most
          universal — and most underserved — moments in any family&rsquo;s life.
        </p>
        <p className="text-[#4B5563] leading-relaxed">
          Our initial focus markets are Maryland, Illinois, and Minnesota, where we have invested in deep
          compliance knowledge of state-specific estate law. The platform works in all 50 states — estate
          organization is universal.
        </p>
        <p className="text-[#4B5563] leading-relaxed mt-4">
          Learn more about the company at{' '}
          <a href="https://sirsi.ai" className="text-[#133378] underline font-semibold">sirsi.ai</a>, or
          reach our team at{' '}
          <a href="mailto:support@sirsi.ai" className="text-[#133378] underline font-semibold">support@sirsi.ai</a>.
        </p>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#1A3478] px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl text-white font-[family-name:var(--font-cinzel)] mb-4">
            Start With a <span className="text-gold">Plan.</span>
          </h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            Free to start. Ready in 15 minutes. No credit card required.
          </p>
          <Link
            to="/"
            search={{ login: 'true' }}
            className="inline-block bg-gold text-black px-8 py-3.5 rounded-lg font-bold text-[0.7rem] uppercase tracking-[0.12em] hover:bg-gold-bright transition-all"
          >
            Create Your Free Vault
          </Link>
        </div>
      </section>
    </main>
  )
}
