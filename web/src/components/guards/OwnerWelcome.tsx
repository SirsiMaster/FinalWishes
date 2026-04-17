/**
 * Owner Welcome Screen — "This Is Where Your Life Lives"
 *
 * The estate owner's first moment after creating their estate.
 * This is NOT a checklist. This is NOT "upload your will."
 * This is the moment the owner feels: "I've just built something
 * that will outlast me, and it knows me."
 *
 * Priority #1 per ETHOS.md — the owner IS the product.
 * Everyone else is a guest of the owner's legacy.
 *
 * Shows once after estate creation, then the dashboard takes over.
 *
 * @see ETHOS.md §3 — "The Owner Experience"
 * @version 1.0.0
 */

import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Props ───────────────────────────────────────────────────────────────────

interface OwnerWelcomeProps {
  estateId: string
  estateName: string
  onContinue: () => void
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OwnerWelcome({ estateId, estateName, onContinue }: OwnerWelcomeProps) {
  const { profile } = useAuth()
  const firstName = profile?.firstName || profile?.displayName?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#F8FAFC] to-[#EEF2FF] flex items-center justify-center">
      <div className="max-w-xl mx-auto px-6 py-16 text-center">

        {/* Compass icon — The Shepherd's symbol */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#133378]/5 flex items-center justify-center mb-10">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#133378]/60" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
          </svg>
        </div>

        {/* Welcome headline */}
        <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight mb-4 leading-tight">
          Welcome, {firstName}.
        </h1>

        {/* The emotional hook — this is NOT a legal tool */}
        <p className="text-lg text-[#334155] leading-relaxed mb-4 max-w-md mx-auto">
          You&rsquo;ve just created <span className="font-semibold text-[#0F172A]">{estateName}</span> &mdash;
          a living record of your life, your wishes, and the people who matter most.
        </p>

        <p className="text-[#64748B] leading-relaxed mb-12 max-w-md mx-auto">
          This isn&rsquo;t a legal form. It&rsquo;s a companion &mdash; a place to
          record your voice, preserve your memories, and organize everything
          the people you love will need someday. At your pace, on your terms.
        </p>

        {/* What you can do — life-first framing */}
        <div className="grid grid-cols-1 gap-4 mb-12 max-w-sm mx-auto text-left">
          <WelcomeStep
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            }
            title="Record your voice"
            description="Leave messages, memories, and reflections in the Soul Log"
          />
          <WelcomeStep
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            title="Organize what matters"
            description="Documents, assets, and accounts — all in one secure place"
          />
          <WelcomeStep
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Protect your people"
            description="Invite family members and designate who gets what, when"
          />
        </div>

        {/* CTA */}
        <Button
          onClick={onContinue}
          className={cn(
            'bg-[#133378] hover:bg-[#1E3A5F] text-white',
            'px-12 py-5 h-auto rounded-2xl',
            'font-semibold text-[15px] tracking-wide',
            'shadow-lg hover:shadow-xl transition-all',
          )}
        >
          Start Building Your Legacy
        </Button>

        <p className="text-xs text-[#94A3B8] mt-6">
          The Shepherd is here whenever you need guidance.
        </p>
      </div>
    </div>
  )
}

// ─── Welcome Step ────────────────────────────────────────────────────────────

function WelcomeStep({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 border border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-[#133378]/5 flex items-center justify-center flex-shrink-0 text-[#133378]/50">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// ─── Utility: Should show owner welcome ──────────────────────────────────────

export function shouldShowOwnerWelcome(
  role: string | undefined,
  estateId: string,
  userId: string | undefined,
): boolean {
  if (!userId) return false
  if (role !== 'principal' && role !== 'admin' && role !== 'owner') return false

  const key = `fw_owner_welcome_seen_${estateId}_${userId}`
  if (typeof window !== 'undefined' && localStorage.getItem(key)) {
    return false
  }

  return true
}

export function markOwnerWelcomeSeen(estateId: string, userId: string): void {
  const key = `fw_owner_welcome_seen_${estateId}_${userId}`
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, new Date().toISOString())
  }
}
