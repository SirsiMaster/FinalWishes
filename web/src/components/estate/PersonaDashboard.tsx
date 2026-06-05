import { Link } from '@tanstack/react-router'
import {
  Shield, Scale, FileText, Landmark, Users, CalendarDays, KeyRound,
  ScrollText, Stamp, Calculator, Heart, Mic, Camera, BookOpen, Gem, Clock,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useDocument, type EstateUser } from '../../lib/firestore'
import {
  resolveEffectiveRole, canAccess, personaLabel, type PersonaRole, type SectionId,
} from '../../lib/persona'

/* ─── Persona dashboards (Phase 3) ───────────────────────────────────────────
 * The estate `dashboard` route lands fiduciaries and advisors here instead of
 * the owner "My Legacy" completion timeline (which is owner-shaped and, per
 * ETHOS, wrong for anyone settling or advising an estate). Each persona gets a
 * purpose line and an actionable set of ONLY the flows they may use — driven by
 * the same PERSONA_ACCESS source of truth the sidebar and RoleGuard use.
 * Principals/admins keep the owner dashboard (DashboardRouter branches before
 * this renders). Heirs never reach here — RoleGuard sends them to their memories.
 * ──────────────────────────────────────────────────────────────────────────── */

type Intro = { title: string; purpose: string }

const PERSONA_INTRO: Partial<Record<PersonaRole, Intro>> = {
  executor: {
    title: 'Settlement',
    purpose: 'Verify your authority, report status, and carry the estate through probate — one calm step at a time.',
  },
  trustee: {
    title: 'Trust Administration',
    purpose: 'Administer the trust assets and guide distributions, with the documents and directives you are authorized to see.',
  },
  legal: {
    title: 'Counsel Workspace',
    purpose: 'Review the estate documents, directives, and forms you have been asked to advise on.',
  },
  cpa: {
    title: 'Financial Workspace',
    purpose: 'Review the financial assets and records relevant to the estate’s accounting and tax matters.',
  },
}

type SectionCard = { label: string; description: string; icon: LucideIcon }

// Display metadata for the action cards. Only sections a persona can access are shown.
const SECTION_META: Partial<Record<SectionId, SectionCard>> = {
  probate: { label: 'Probate & Settlement', description: 'Phases, deadlines, guardian, quorum', icon: Shield },
  vault: { label: 'Vault Documents', description: 'Wills, trusts, deeds, insurance, POAs', icon: FileText },
  assets: { label: 'Assets', description: 'Financial, property, accounts', icon: Landmark },
  lockbox: { label: 'Lockbox', description: 'Authorized credentials & accounts', icon: KeyRound },
  directives: { label: 'Directives', description: 'Wishes and instructions', icon: ScrollText },
  beneficiaries: { label: 'Beneficiaries', description: 'People and their designations', icon: Users },
  events: { label: 'Events', description: 'Services, memorials, RSVPs', icon: CalendarDays },
  obituary: { label: 'Final Record', description: 'Obituary and remembrance', icon: ScrollText },
  forms: { label: 'Forms Review', description: 'Statutory forms & POAs', icon: Stamp },
}

// The order fiduciaries/advisors most need their flows in.
const CARD_ORDER: SectionId[] = [
  'probate', 'vault', 'assets', 'lockbox', 'directives', 'beneficiaries', 'forms', 'events', 'obituary',
]

const ROLE_ICON: Partial<Record<PersonaRole, LucideIcon>> = {
  executor: Shield, trustee: Scale, legal: Scale, cpa: Calculator,
}

function PersonaDashboard({ estateId, role }: { estateId: string; role: PersonaRole }) {
  const intro = PERSONA_INTRO[role] ?? {
    title: personaLabel(role),
    purpose: 'Your authorized estate flows.',
  }
  const RoleIcon = ROLE_ICON[role] ?? Shield
  const cards = CARD_ORDER.filter((s) => canAccess(role, s) && SECTION_META[s])

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      <div className="flex items-start gap-5 mb-10">
        <div className="w-16 h-16 shrink-0 bg-[var(--gold)]/10 rounded-[1.5rem] flex items-center justify-center border border-[var(--gold)]/20">
          <RoleIcon className="w-8 h-8 text-[var(--gold)]" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] font-black text-royal/40 uppercase tracking-[0.3em] mb-1">
            {personaLabel(role)}
          </p>
          <h1 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">
            {intro.title}
          </h1>
          <p className="text-royal/60 text-[15px] leading-relaxed max-w-2xl">{intro.purpose}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((section) => {
          const meta = SECTION_META[section]!
          const Icon = meta.icon
          const to: string = `/estates/${estateId}/${section}`
          return (
            <Link
              key={section}
              to={to}
              className="group flex flex-col gap-3 p-6 rounded-[1.75rem] bg-white/60 border border-royal/5 hover:border-[var(--gold)]/40 hover:bg-white transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-royal/[0.04] flex items-center justify-center group-hover:bg-[var(--gold)]/10 transition-colors">
                <Icon className="w-5 h-5 text-royal group-hover:text-[var(--gold)] transition-colors" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-black text-royal text-[15px] leading-tight">{meta.label}</p>
                <p className="text-royal/40 text-[12px] mt-1 leading-snug">{meta.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-10 p-6 rounded-[1.75rem] bg-royal/[0.02] border border-royal/5">
        <p className="text-[12px] text-royal/50 leading-relaxed">
          <span className="font-black text-[var(--gold)]">The Shepherd</span> is here whenever you need a next
          step or aren’t sure what a section is for. Only the flows meant for your role are shown.
        </p>
      </div>
    </div>
  )
}

/* ─── Heir dashboard (the sacred landing) ─────────────────────────────────────
 * Per ETHOS, the heir's screen is the most important one we build. Not a
 * completion score, not an asset list — first the love: the letters, the voice,
 * the memories left for them. Assets come last and gently. Warm, never clinical.
 * ──────────────────────────────────────────────────────────────────────────── */

const HEIR_SECTION_META: Partial<Record<SectionId, SectionCard>> = {
  'soul-log': { label: 'Letters & Voice', description: 'Words and recordings left for you', icon: Mic },
  memoirs: { label: 'Photos & Videos', description: 'Moments you shared together', icon: Camera },
  'life-chapters': { label: 'Their Story', description: 'The life they lived', icon: BookOpen },
  heirlooms: { label: 'Heirlooms', description: 'Treasures meant for you', icon: Gem },
  timecapsule: { label: 'Sealed for You', description: 'Messages that open in time', icon: Clock },
  directives: { label: 'Their Wishes', description: 'What they wanted you to know', icon: ScrollText },
  events: { label: 'Gatherings', description: 'Services and remembrances', icon: CalendarDays },
  obituary: { label: 'Remembrance', description: 'Their final record', icon: Heart },
  assets: { label: 'What They Left You', description: 'Entrusted to your care', icon: Landmark },
}

// Love first, mechanics last.
const HEIR_CARD_ORDER: SectionId[] = [
  'soul-log', 'memoirs', 'life-chapters', 'heirlooms', 'timecapsule', 'directives', 'events', 'obituary', 'assets',
]

function HeirDashboard({ estateId }: { estateId: string }) {
  const cards = HEIR_CARD_ORDER.filter((s) => canAccess('heir', s) && HEIR_SECTION_META[s])
  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-[var(--gold)]/10 rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20">
          <Heart className="w-8 h-8 text-[var(--gold)]" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-3">
          For You
        </h1>
        <p className="text-royal/60 text-[15px] leading-relaxed">
          Everything here was kept with you in mind — the words, the voice, the moments, the things
          they wanted you to have. Take your time. There is no rush.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((section) => {
          const meta = HEIR_SECTION_META[section]!
          const Icon = meta.icon
          const to: string = `/estates/${estateId}/${section}`
          return (
            <Link
              key={section}
              to={to}
              className="group flex flex-col gap-3 p-6 rounded-[1.75rem] bg-white/60 border border-[var(--gold)]/10 hover:border-[var(--gold)]/40 hover:bg-white transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--gold)]/[0.06] flex items-center justify-center group-hover:bg-[var(--gold)]/15 transition-colors">
                <Icon className="w-5 h-5 text-[var(--gold)]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-black text-royal text-[15px] leading-tight">{meta.label}</p>
                <p className="text-royal/40 text-[12px] mt-1 leading-snug">{meta.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-10 p-6 rounded-[1.75rem] bg-[var(--gold)]/[0.04] border border-[var(--gold)]/10 text-center">
        <p className="text-[13px] text-royal/55 leading-relaxed max-w-xl mx-auto">
          <span className="font-black text-[var(--gold)]">The Shepherd</span> is here to walk with you —
          gently, and only when you’re ready.
        </p>
      </div>
    </div>
  )
}

/**
 * Branches the estate dashboard by persona. Principals/admins get the owner
 * dashboard (passed in to avoid importing the heavy lazy module here); heirs get
 * the sacred HeirDashboard; everyone else gets their persona dashboard. Resolves
 * the estate-scoped role and waits for it to be definitive before rendering.
 */
export function DashboardRouter({
  estateId,
  ownerDashboard,
}: {
  estateId: string
  ownerDashboard: React.ReactNode
}) {
  const { profile, profileResolved } = useAuth()
  const estateUserPath = profile?.uid ? `estate_users/${profile.uid}_${estateId}` : null
  const { data: estateUser, loading: estateUserLoading } = useDocument<EstateUser>(estateUserPath)

  if (!profileResolved || (estateUserPath !== null && estateUserLoading)) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
      </div>
    )
  }

  const role = resolveEffectiveRole(estateUser?.role ?? null, profile?.role ?? null)

  if (role === 'principal' || role === 'admin') {
    return <>{ownerDashboard}</>
  }
  if (role === 'heir') {
    return <HeirDashboard estateId={estateId} />
  }
  return <PersonaDashboard estateId={estateId} role={role} />
}
