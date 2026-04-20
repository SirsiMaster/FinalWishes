import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ShowcaseTab {
  id: string
  label: string
  screenshot: string
  caption: string
  description: string
}

const TABS: ShowcaseTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    screenshot: '/assets/screenshots/dashboard',
    caption: 'Your estate at a glance',
    description: 'See your completion score, recent activity, quick actions, and the Shepherd AI checklist — everything in one view.',
  },
  {
    id: 'soul-log',
    label: 'Soul Log',
    screenshot: '/assets/screenshots/soul-log',
    caption: 'Record your story',
    description: 'Video, audio, or written entries. Your personal diary that becomes a gift to your family — transcribed and searchable.',
  },
  {
    id: 'vault',
    label: 'Document Vault',
    screenshot: '/assets/screenshots/vault',
    caption: 'Every document, encrypted',
    description: 'Upload wills, trusts, deeds, policies. AES-256 encrypted with Cloud KMS. Your executor finds everything in one place.',
  },
  {
    id: 'assets',
    label: 'Assets',
    screenshot: '/assets/screenshots/assets',
    caption: 'Track everything you own',
    description: 'Real estate, financial accounts, vehicles, digital assets, insurance policies, debts — complete inventory with valuations.',
  },
  {
    id: 'directives',
    label: 'Directives',
    screenshot: '/assets/screenshots/directives',
    caption: 'Your wishes, in your words',
    description: 'Ethical wills, funeral preferences, final messages, care instructions. Rich text editor with AI-assisted templates.',
  },
  {
    id: 'beneficiaries',
    label: 'My People',
    screenshot: '/assets/screenshots/beneficiaries',
    caption: 'Designate and protect',
    description: 'Invite heirs, executors, attorneys, and CPAs. Each gets role-based access to exactly what you authorize.',
  },
  {
    id: 'timecapsule',
    label: 'Time Capsules',
    screenshot: '/assets/screenshots/timecapsule',
    caption: 'Deliver messages through time',
    description: 'Schedule sealed letters for birthdays, anniversaries, or upon your passing. Cloud Tasks delivers them automatically.',
  },
  {
    id: 'lockbox',
    label: 'Digital Lockbox',
    screenshot: '/assets/screenshots/lockbox',
    caption: 'Passwords and credentials',
    description: 'Store banking logins, crypto wallets, social media accounts. KMS-encrypted credentials your executor can access.',
  },
]

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const active = TABS.find(t => t.id === activeTab) || TABS[0]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer',
              activeTab === tab.id
                ? 'bg-gold text-black shadow-[0_0_15px_rgba(200,169,81,0.3)]'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Screenshot + caption */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Browser chrome frame */}
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
              {/* Title bar */}
              <div className="bg-[#1E293B] flex items-center gap-2 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
                </div>
                <div className="flex-1 ml-4">
                  <div className="bg-[#0F172A] rounded-md px-3 py-1 text-[10px] text-white/40 font-mono text-center max-w-xs mx-auto">
                    finalwishes.app/estates/dashboard
                  </div>
                </div>
              </div>

              {/* Screenshot */}
              <picture>
                <source srcSet={`${active.screenshot}.png`} type="image/png" />
                <img
                  src={`${active.screenshot}.svg`}
                  alt={`FinalWishes ${active.label} — ${active.caption}`}
                  className="w-full block"
                  loading="lazy"
                />
              </picture>
            </div>

            {/* Caption below */}
            <div className="mt-6 text-center">
              <h3 className="text-white font-bold text-lg mb-2 font-[family-name:var(--font-cinzel)]">
                {active.caption}
              </h3>
              <p className="text-white/60 text-sm max-w-lg mx-auto leading-relaxed">
                {active.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
