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
import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, ChevronRight, X, Check } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useGuidanceScore, type ShepherdStep } from '../../lib/useGuidanceScore'

/** Controlled: the estate layout owns open state so content can reserve space. */
export function ShepherdCompanion({
  estateId,
  open,
  onToggle,
}: {
  estateId: string
  open: boolean
  onToggle: () => void
}) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { score, loading } = useGuidanceScore(estateId)

  const goTo = useCallback(
    (route: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: `/estates/${estateId}/${route}` } as any)
    },
    [estateId, navigate],
  )

  const firstName = profile?.firstName?.trim() || profile?.displayName?.split(' ')[0] || 'there'
  const percent = score?.completionPercent ?? 0
  const next = score?.nextAction ?? null
  const done = !loading && score != null && next == null

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
              ) : next ? (
                <>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Your next step
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(next.route)}
                    className="group w-full rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-[var(--royal)]/40 hover:shadow-sm"
                  >
                    <h3 className="font-[family-name:var(--font-cinzel)] text-lg font-bold leading-snug text-slate-900">
                      {next.label}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                      {next.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--royal)]">
                      Continue
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  {/* Remaining steps, quietly listed for orientation */}
                  {score && score.steps.filter((s) => !s.complete && !s.optional && s.id !== next.id).length > 0 && (
                    <div className="mt-7">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Also ahead
                      </p>
                      <ul className="space-y-1">
                        {score.steps
                          .filter((s) => !s.complete && !s.optional && s.id !== next.id)
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
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
