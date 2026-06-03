import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
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
    screenshot: '/assets/screenshots/dashboard.png',
    caption: 'Your estate at a glance',
    description: 'See your completion score, recent activity, quick actions, and the Shepherd AI checklist — everything in one view.',
  },
  {
    id: 'soul-log',
    label: 'Soul Log',
    screenshot: '/assets/screenshots/soul-log.png',
    caption: 'Record your story',
    description: 'Video, audio, or written entries. Your personal diary that becomes a gift to your family — transcribed and searchable.',
  },
  {
    id: 'vault',
    label: 'Document Vault',
    screenshot: '/assets/screenshots/vault.png',
    caption: 'Every document, encrypted',
    description: 'Upload wills, trusts, deeds, policies. AES-256 encrypted with Cloud KMS. Your executor finds everything in one place.',
  },
  {
    id: 'assets',
    label: 'Assets',
    screenshot: '/assets/screenshots/assets.png',
    caption: 'Track everything you own',
    description: 'Real estate, financial accounts, vehicles, digital assets, insurance policies, debts — complete inventory with valuations.',
  },
  {
    id: 'directives',
    label: 'Directives',
    screenshot: '/assets/screenshots/directives.png',
    caption: 'Your wishes, in your words',
    description: 'Ethical wills, funeral preferences, final messages, care instructions. Rich text editor with AI-assisted templates.',
  },
  {
    id: 'beneficiaries',
    label: 'My People',
    screenshot: '/assets/screenshots/beneficiaries.png',
    caption: 'Designate and protect',
    description: 'Invite heirs, executors, attorneys, and CPAs. Each gets role-based access to exactly what you authorize.',
  },
  {
    id: 'timecapsule',
    label: 'Time Capsules',
    screenshot: '/assets/screenshots/timecapsule.png',
    caption: 'Deliver messages through time',
    description: 'Schedule sealed letters for birthdays, anniversaries, or upon your passing. Cloud Tasks delivers them automatically.',
  },
  {
    id: 'lockbox',
    label: 'Digital Lockbox',
    screenshot: '/assets/screenshots/lockbox.png',
    caption: 'Passwords and credentials',
    description: 'Store banking logins, crypto wallets, social media accounts. KMS-encrypted credentials your executor can access.',
  },
]

export function ProductShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const active = TABS[activeIndex]

  // Preload all screenshots on mount so transitions are instant
  useEffect(() => {
    TABS.forEach(tab => {
      const img = new Image()
      img.src = tab.screenshot
    })
  }, [])

  const advance = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % TABS.length)
  }, [])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(advance, 15000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, advance])

  const handleTabClick = (index: number) => {
    setActiveIndex(index)
    setPaused(true)
    setTimeout(() => setPaused(false), 10000)
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Tab bar */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(i)}
            className={cn(
              'relative px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer overflow-hidden',
              activeIndex === i
                ? 'bg-[var(--gold)] text-[var(--royal)] shadow-[0_0_15px_rgba(200,169,81,0.3)] font-black'
                : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            )}
          >
            {tab.label}
            {activeIndex === i && !paused && (
              <div
                key={`progress-${activeIndex}`}
                className="absolute bottom-0 left-0 h-0.5 bg-gold/70 rounded-full"
                style={{ animation: 'tabProgress 15s linear forwards' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Screenshot + caption — all images stacked, only active one visible */}
      <div className="relative">
        {/* Browser chrome frame */}
        <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
          {/* Title bar */}
          <div className="bg-slate-800 flex items-center gap-2 px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
              <div className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
            </div>
            <div className="flex-1 ml-4">
              <div className="bg-slate-900 rounded-md px-3 py-1 text-[10px] text-white/40 font-mono text-center max-w-xs mx-auto">
                finalwishes.app/estates/{active.id === 'beneficiaries' ? 'people' : active.id}
              </div>
            </div>
          </div>

          {/* Screenshot stack — all rendered, only active is visible */}
          <div className="relative" style={{ aspectRatio: '1280/800' }}>
            {TABS.map((tab, i) => (
              <motion.img
                key={tab.id}
                src={tab.screenshot}
                alt={`FinalWishes ${tab.label}`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={false}
                animate={{ opacity: activeIndex === i ? 1 : 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>

        {/* Caption below */}
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 text-center"
        >
          <h3 className="text-white font-bold text-lg mb-2 font-[family-name:var(--font-cinzel)]">
            {active.caption}
          </h3>
          <p className="text-white/60 text-sm max-w-lg mx-auto leading-relaxed">
            {active.description}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
