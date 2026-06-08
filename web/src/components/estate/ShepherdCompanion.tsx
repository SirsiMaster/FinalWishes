/**
 * ShepherdCompanion — the guided front door.
 *
 * A persistent docked companion (right side on desktop, a launcher + overlay on
 * mobile) that is the FIRST thing greeting the user inside an estate. It states
 * where they are and presents the single next step, sourced from the deterministic
 * guidance Score (api/internal/guidance/handler.go). This is the orchestrating
 * spine that turns a grid of tools into a guided process.
 *
 * Design intent: restrained and premium — Cinzel serif heading, royal + a single
 * gold accent, slate neutrals, generous spacing. No rainbow accents.
 */
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, ChevronRight, X, Check, Loader2, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useGuidanceScore, type ShepherdStep } from '../../lib/useGuidanceScore'
import { useResumables } from '../../lib/useResumables'
import { askShepherd, SHEPHERD_OPENERS, type ShepherdMessage } from '../../lib/shepherd'
import { canAccess, type PersonaRole, type SectionId } from '../../lib/persona'

interface SectionGuide {
  title: string
  prompt: string
  actionLabel: string
  actionRoute: string
}

const SECTION_IDS: SectionId[] = [
  'dashboard',
  'life-chapters',
  'soul-log',
  'memoirs',
  'heirlooms',
  'assets',
  'vault',
  'forms',
  'lockbox',
  'directives',
  'timecapsule',
  'beneficiaries',
  'events',
  'obituary',
  'probate',
  'notifications',
  'pricing',
  'settings',
  'attestation',
  'estates',
  'index',
]

const SECTION_SET = new Set<SectionId>(SECTION_IDS)

const SECTION_GUIDES: Partial<Record<SectionId, SectionGuide>> = {
  assets: {
    title: 'Inventory what your family must find',
    prompt: 'Help me add assets in the right order: bank accounts, real estate, investments, insurance, vehicles, and valuables.',
    actionLabel: 'Add an asset',
    actionRoute: 'assets',
  },
  beneficiaries: {
    title: 'Name every person with a role',
    prompt: 'Help me decide who should be a beneficiary, executor, trustee, legal advisor, or tax advisor.',
    actionLabel: 'Add a person',
    actionRoute: 'beneficiaries',
  },
  vault: {
    title: 'Upload the documents that prove authority',
    prompt: 'Help me organize wills, POAs, trusts, deeds, IDs, insurance documents, and account statements.',
    actionLabel: 'Upload a document',
    actionRoute: 'vault',
  },
  lockbox: {
    title: 'Preserve access instructions safely',
    prompt: 'Help me add bank accounts, online accounts, lawyer portals, passwords, PINs, recovery codes, and transfer instructions.',
    actionLabel: 'Add an account',
    actionRoute: 'lockbox',
  },
  heirlooms: {
    title: 'Capture the story behind valuables',
    prompt: 'Help me document jewelry, watches, art, collections, vehicles, real estate keepsakes, and who should receive them.',
    actionLabel: 'Add an heirloom',
    actionRoute: 'heirlooms',
  },
  memoirs: {
    title: 'Save photos and videos with context',
    prompt: 'Help me choose what photos and videos to preserve first, and what titles or notes my family will understand later.',
    actionLabel: 'Add media',
    actionRoute: 'memoirs',
  },
  'soul-log': {
    title: 'Keep diary entries and voice notes',
    prompt: 'Help me write or record a diary entry, voice note, private memory, or sealed message for later.',
    actionLabel: 'Add a memory',
    actionRoute: 'soul-log',
  },
  directives: {
    title: 'Write wishes no one else can write',
    prompt: 'Help me add funeral wishes, care instructions, ethical will notes, final messages, and account transition directions.',
    actionLabel: 'Write a directive',
    actionRoute: 'directives',
  },
  forms: {
    title: 'Generate legal forms carefully',
    prompt: 'Help me understand which will, POA, or statutory form to prepare and what still needs attorney review.',
    actionLabel: 'Open forms',
    actionRoute: 'forms',
  },
  timecapsule: {
    title: 'Schedule messages for the right moment',
    prompt: 'Help me create a message, voice note, photo bundle, or letter for a loved one.',
    actionLabel: 'Create a capsule',
    actionRoute: 'timecapsule',
  },
}

function sectionFromRoute(route: string): SectionId {
  const cleanRoute = route.split('?')[0]?.split('#')[0] ?? ''
  const parts = cleanRoute.split('/').filter(Boolean)
  const candidate = parts[0] === 'estates' ? parts[2] : parts[0]
  return SECTION_SET.has(candidate as SectionId) ? (candidate as SectionId) : 'dashboard'
}

function guideForPath(pathname: string, role: PersonaRole): SectionGuide | null {
  const section = sectionFromRoute(pathname)
  if (!canAccess(role, section)) return null
  return SECTION_GUIDES[section] ?? {
    title: 'I can guide your next action',
    prompt: 'Help me understand what to add next so my family never gets lost.',
    actionLabel: 'Go to dashboard',
    actionRoute: 'dashboard',
  }
}

/** Controlled: the estate layout owns open state so content can reserve space. */
export function ShepherdCompanion({
  estateId,
  open,
  onToggle,
  effectiveRole,
}: {
  estateId: string
  open: boolean
  onToggle: () => void
  effectiveRole: PersonaRole
}) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { score, loading } = useGuidanceScore(estateId)
  const resumables = useResumables(estateId)
  const [messages, setMessages] = useState<ShepherdMessage[]>([])
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstName = profile?.firstName?.trim() || profile?.displayName?.split(' ')[0] || 'there'
  const percent = score?.completionPercent ?? 0
  const next = score?.nextAction ?? null
  const done = !loading && score != null && next == null
  const currentGuide = useMemo(() => guideForPath(location.pathname, effectiveRole), [location.pathname, effectiveRole])
  const visibleSteps = useMemo(
    () =>
      score?.steps.filter(
        (step) =>
          !step.complete &&
          !step.optional &&
          canAccess(effectiveRole, sectionFromRoute(step.route)),
      ) ?? [],
    [effectiveRole, score],
  )
  const visibleNext = useMemo(() => {
    if (next && canAccess(effectiveRole, sectionFromRoute(next.route))) return next
    return visibleSteps[0] ?? null
  }, [effectiveRole, next, visibleSteps])
  const visibleResumables = useMemo(
    () => resumables.filter((item) => canAccess(effectiveRole, sectionFromRoute(item.route))),
    [effectiveRole, resumables],
  )

  const goTo = useCallback(
    (route: string) => {
      // Absolute routes (e.g. the estate-creation wizard) navigate as-is;
      // everything else is a sub-route of the current estate.
      const to = route.startsWith('/') ? route : `/estates/${estateId}/${route}`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to } as any)
    },
    [estateId, navigate],
  )

  const ask = useCallback(
    async (message: string) => {
      const trimmed = message.trim()
      if (!trimmed || asking) return
      const history = messages.slice(-6)
      const userMessage: ShepherdMessage = { role: 'user', content: trimmed }
      setMessages((prev) => [...prev, userMessage])
      setDraft('')
      setAsking(true)
      setError(null)
      try {
        const reply = await askShepherd(estateId, trimmed, history)
        setMessages((prev) => [...prev, { role: 'assistant', content: reply.reply }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Shepherd could not respond right now.')
      } finally {
        setAsking(false)
      }
    },
    [asking, estateId, messages],
  )

  const handleAsk = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void ask(draft)
    },
    [ask, draft],
  )

  return (
    <>
      {/* Launcher — shown only when the panel is closed, on every screen size,
          so reopening is always one obvious tap away. Closing is the header ✕. */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Open Shepherd"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--royal)] px-5 py-3 text-white shadow-lg shadow-[var(--royal)]/20 transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Compass className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[13px] font-semibold">Shepherd</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.aside
            key="shepherd-panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-0 top-0 z-40 flex h-screen w-[88vw] max-w-[360px] flex-col border-l border-slate-200 bg-white/95 backdrop-blur-sm shadow-2xl shadow-slate-900/5 lg:top-0"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-7 pt-7 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--royal)]/8 text-[var(--royal)]">
                  <Compass className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Shepherd
                  </p>
                  <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold leading-tight text-slate-900">
                    Good to see you, {firstName}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Hide Shepherd"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="px-7 py-6">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Your plan
                </span>
                <span className="text-[13px] font-semibold text-slate-900">
                  {percent}%
                  {score ? (
                    <span className="ml-1.5 font-normal text-slate-400">
                      {score.completedSteps}/{score.totalSteps}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-[var(--gold)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Next step / guidance */}
            <div className="flex-1 overflow-y-auto px-7 pb-7">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ) : done ? (
                <div className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                    <Check className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <p className="font-[family-name:var(--font-cinzel)] text-base font-bold text-slate-900">
                    Your essentials are in place
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                    {score?.insight || 'Revisit any section any time to refine your plan.'}
                  </p>
                </div>
              ) : visibleNext ? (
                <>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Your next step
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(visibleNext.route)}
                    className="group w-full rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-[var(--royal)]/40 hover:shadow-sm"
                  >
                    <h3 className="font-[family-name:var(--font-cinzel)] text-lg font-bold leading-snug text-slate-900">
                      {visibleNext.label}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                      {visibleNext.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--royal)]">
                      Continue
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  {/* Remaining steps, quietly listed for orientation */}
                  {visibleSteps.filter((s) => s.id !== visibleNext.id).length > 0 && (
                    <div className="mt-7">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Also ahead
                      </p>
                      <ul className="space-y-1">
                        {visibleSteps
                          .filter((s) => s.id !== visibleNext.id)
                          .slice(0, 4)
                          .map((s: ShepherdStep) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => goTo(s.route)}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <span>{s.label}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-slate-500">
                  Your guide will appear here as you build your estate plan.
                </p>
              )}

              {/* Route-aware guidance keeps Shepherd next to every CRUD action. */}
              {!loading && currentGuide && (
                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Shepherd on this page
                  </p>
                  <h3 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-slate-900">
                    {currentGuide.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => ask(currentGuide.prompt)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--royal)]"
                  >
                    Ask for guidance
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(currentGuide.actionRoute)}
                    className="ml-4 mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {currentGuide.actionLabel}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Continue where you left off — in-progress work the user can resume.
                  Rendered only when something is genuinely unfinished. */}
              {!loading && visibleResumables.length > 0 && (
                <div className="mt-7 border-t border-slate-100 pt-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Continue where you left off
                  </p>
                  <ul className="space-y-1">
                    {visibleResumables.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => goTo(r.route)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <span className="truncate font-[family-name:var(--font-cinzel)] text-slate-700">
                            {r.label}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Central chat: available from every estate route, not just the dashboard. */}
              <div className="mt-7 border-t border-slate-100 pt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ask Shepherd
                </p>
                {messages.length === 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {SHEPHERD_OPENERS.slice(0, 3).map((opener) => (
                      <button
                        key={opener.label}
                        type="button"
                        onClick={() => ask(opener.prompt)}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[var(--royal)]/30 hover:text-[var(--royal)]"
                      >
                        {opener.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mb-3 max-h-64 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                    {messages.slice(-6).map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                          message.role === 'user'
                            ? 'ml-8 bg-[var(--royal)] text-white'
                            : 'mr-8 border border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>
                )}
                {error && (
                  <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
                    {error}
                  </p>
                )}
                <form onSubmit={handleAsk} className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask what to do next..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--royal)]"
                  />
                  <button
                    type="submit"
                    disabled={asking || !draft.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--royal)] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Send message to Shepherd"
                  >
                    {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
