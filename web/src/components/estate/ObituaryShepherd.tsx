/**
 * ObituaryShepherd — the guided "fill in the blanks → perfect obituary" experience.
 *
 * A grieving family should never face a blank page. The Shepherd walks them through
 * a short, gentle interview — one question at a time, prefilled with what the estate
 * already knows — then composes a dignified draft with Claude (Sonnet, warm) via
 * /api/v1/guidance/assist-obituary. The draft can be refined conversationally
 * ("warmer", "shorter", "more about family") before it lands in the editor.
 *
 * Design intent (Royal Neo-Deco): Cinzel serif, royal + a single gold accent,
 * restrained motion, no clinical form-feel. Scripted empathy for the questions
 * (never wanders, never asks something insensitive); AI only for composition.
 */
import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, ArrowLeft, ArrowRight, Loader2, Sparkles, Check, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { auth } from '../../lib/firebase'

const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_URL || ''

type Subject = 'self' | 'other'

interface QuestionDef {
  id: string
  /** The Shepherd's gentle question. {name} is replaced with the subject's name. */
  ask: (name: string, subject: Subject) => string
  /** A short reassuring line under the question. */
  help: string
  placeholder: string
  /** Optional questions can be skipped without an answer. */
  optional?: boolean
  /** Multi-line answer field. */
  long?: boolean
}

// One gentle question at a time. Order matters: identity → life → people →
// work → loves → a story → closing feeling → service. Every step is skippable
// except the name, so the walk-through never traps a grieving user.
const QUESTIONS: QuestionDef[] = [
  {
    id: 'happened',
    ask: (n, s) =>
      s === 'self'
        ? 'Tell me about your life — start wherever you like.'
        : `Tell me what happened. Take your time.`,
    help: 'Just talk to me. Whatever you’d want remembered — who they were, what happened, the moments that matter. I’m listening, and I’ll shape it with you from here.',
    placeholder: 'e.g. We lost Mom last Tuesday. She was the heart of our family — 78 years, four kids, the best garden on the block. She went peacefully, with all of us there…',
    long: true,
    optional: true,
  },
  {
    id: 'name',
    ask: (_n, s) => (s === 'self' ? 'And your full name?' : 'What was their full name?'),
    help: "We'll use this as the heart of the record. Include a nickname in quotes if they were known by one.",
    placeholder: 'e.g. Margaret "Maggie" Eleanor Collins',
  },
  {
    id: 'lived',
    ask: (n, s) =>
      s === 'self'
        ? `When and where did your life begin, ${firstWord(n)}?`
        : `When and where did ${firstWord(n)}'s life begin?`,
    help: 'Birth date and hometown — and where they made their life. Approximate is perfectly fine.',
    placeholder: 'e.g. Born March 4, 1948 in Baltimore, MD. Lived most of her life in Rockville.',
    optional: true,
  },
  {
    id: 'passed',
    ask: (n, s) => (s === 'self' ? '' : `When did ${firstWord(n)} pass, and where?`),
    help: 'The date and place of passing, and their age if you wish to include it.',
    placeholder: 'e.g. Passed peacefully on June 2, 2026, at home, surrounded by family. Age 78.',
    optional: true,
  },
  {
    id: 'family',
    ask: (n, s) =>
      s === 'self'
        ? 'Who are the people who matter most to you?'
        : `Who were the people closest to ${firstWord(n)}?`,
    help: 'Spouse, children, parents, grandchildren, dear friends — whoever should be remembered. List who survives them and any who went before.',
    placeholder: 'e.g. Survived by her husband John, daughters Anna and Beth, four grandchildren. Preceded by her son Michael.',
    long: true,
    optional: true,
  },
  {
    id: 'work',
    ask: (n, s) =>
      s === 'self'
        ? 'What did you do with your days?'
        : `What did ${firstWord(n)} do with ${their(s)} days?`,
    help: 'A career, a craft, raising a family, military service, volunteering — all of it counts.',
    placeholder: 'e.g. A schoolteacher for 32 years, then ran the church food pantry. Raised three kids.',
    long: true,
    optional: true,
  },
  {
    id: 'loves',
    ask: (n, s) =>
      s === 'self' ? 'What do you love?' : `What did ${firstWord(n)} love?`,
    help: 'The things that lit them up — hobbies, places, music, faith, a team, a garden, a way of being.',
    placeholder: 'e.g. Her rose garden, Motown records, Sunday dinners, the Orioles, and a good crossword.',
    long: true,
    optional: true,
  },
  {
    id: 'story',
    ask: (n, s) =>
      s === 'self'
        ? 'Is there a moment or story that captures who you are?'
        : `Is there a moment or story that captures who ${firstWord(n)} was?`,
    help: 'Even a small one. A saying they always used, a kindness they were known for, a favorite memory.',
    placeholder: "e.g. She never let anyone leave hungry, and always said 'we make room.'",
    long: true,
    optional: true,
  },
  {
    id: 'feeling',
    ask: () => 'If the reader remembers one thing, what should it be?',
    help: 'The single feeling or truth you most want carried forward.',
    placeholder: 'e.g. That she made everyone feel they belonged.',
    long: true,
    optional: true,
  },
  {
    id: 'service',
    ask: () => 'Are there service or memorial details to include?',
    help: 'A service, a celebration of life, donations in lieu of flowers. Skip if not yet arranged.',
    placeholder: 'e.g. Service June 10 at 11am, St. Mary’s. Donations to the Rockville Food Bank.',
    long: true,
    optional: true,
  },
]

function firstWord(s: string): string {
  const w = (s || '').trim().split(/\s+/)[0]
  return w || 'their loved one'
}
function their(s: Subject): string {
  return s === 'self' ? 'your' : 'their'
}

type Phase = 'intro' | 'interview' | 'composing' | 'review'

export interface ServiceSeed {
  type?: string
  date?: string
  time?: string
  location?: string
  address?: string
}

export function ObituaryShepherd({
  estateId,
  open,
  onOpenChange,
  subjectName,
  subject = 'self',
  heirNames = [],
  service,
  onDraftReady,
}: {
  estateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectName: string
  /** 'self' = principal writing their own; 'other' = settling a loss. */
  subject?: Subject
  heirNames?: string[]
  service?: ServiceSeed
  /** Called with the finished draft (plain text). Parent drops it into the editor. */
  onDraftReady: (text: string) => void
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refining, setRefining] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Questions that actually apply (drop the empty "passed" step for self-planning).
  const steps = useMemo(
    () => QUESTIONS.filter((q) => q.ask(subjectName, subject).trim() !== ''),
    [subjectName, subject],
  )

  // Seed defaults the estate already knows, so the user confirms rather than retypes.
  const seedFor = useCallback(
    (id: string): string => {
      if (id === 'name') return subjectName || ''
      if (id === 'family' && heirNames.length > 0) {
        const verb = subject === 'self' ? 'Family includes' : 'Survived by'
        return `${verb} ${heirNames.join(', ')}.`
      }
      if (id === 'service' && service && (service.date || service.location)) {
        const bits = [
          service.type ? cap(service.type.replace(/_/g, ' ')) : 'Service',
          service.date,
          service.time,
          service.location,
          service.address,
        ].filter(Boolean)
        return bits.join(', ') + '.'
      }
      return ''
    },
    [subjectName, heirNames, service, subject],
  )

  const step = steps[stepIndex]
  const total = steps.length
  const principalName = answers.name || subjectName

  // Load the seed/prior answer into the field whenever the step changes.
  useEffect(() => {
    if (phase !== 'interview' || !step) return
    // Sync the field to the seed/prior answer when the step changes — this is a
    // deliberate React→field sync, not derived state, so the user can edit freely.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(answers[step.id] ?? seedFor(step.id))
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex])

  const compose = useCallback(
    async (collected: Record<string, string>) => {
      setPhase('composing')
      setError(null)
      try {
        const prompt = buildPrompt(collected, subject)
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/assist-obituary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ estateId, prompt }),
        })
        if (!res.ok) throw new Error(res.status === 503 ? 'Shepherd is resting — please try again in a moment.' : `Could not compose right now (${res.status}).`)
        const data = await res.json()
        const text: string = data.text || data.content || data.response || ''
        if (!text.trim()) throw new Error('The draft came back empty. Please try again.')
        setDraft(text.trim())
        setPhase('review')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not compose the draft.')
        setPhase('review')
      }
    },
    [estateId, subject],
  )

  const refine = useCallback(
    async (instruction: string) => {
      if (!draft || refining) return
      setRefining(true)
      setError(null)
      try {
        const prompt = `Here is the current obituary draft:\n\n${draft}\n\nPlease revise it so that it is ${instruction}. Keep it dignified, warm, and factually faithful to the draft. Return only the revised obituary text.`
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/assist-obituary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ estateId, prompt }),
        })
        if (!res.ok) throw new Error(`Could not refine right now (${res.status}).`)
        const data = await res.json()
        const text: string = data.text || data.content || data.response || ''
        if (text.trim()) setDraft(text.trim())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not refine the draft.')
      } finally {
        setRefining(false)
      }
    },
    [draft, refining, estateId],
  )

  const saveAnswerAnd = useCallback(
    (next: () => void) => {
      if (step) {
        setAnswers((prev) => ({ ...prev, [step.id]: current.trim() }))
      }
      next()
    },
    [step, current],
  )

  const goNext = useCallback(() => {
    if (!step) return
    const updated = { ...answers, [step.id]: current.trim() }
    setAnswers(updated)
    if (stepIndex < total - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      void compose(updated)
    }
  }, [step, answers, current, stepIndex, total, compose])

  const goBack = useCallback(() => {
    saveAnswerAnd(() => setStepIndex((i) => Math.max(0, i - 1)))
  }, [saveAnswerAnd])

  const restart = useCallback(() => {
    setPhase('intro')
    setStepIndex(0)
    setAnswers({})
    setCurrent('')
    setDraft('')
    setError(null)
  }, [])

  const useThisDraft = useCallback(() => {
    onDraftReady(draft)
    onOpenChange(false)
    // Reset for next time after the dialog closes.
    setTimeout(restart, 300)
  }, [draft, onDraftReady, onOpenChange, restart])

  const canContinue = step ? step.optional || current.trim().length > 0 : false
  const progressPct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-neutral-border shadow-2xl"
        showCloseButton
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--neutral-border)] bg-[var(--royal)]/[0.03] px-8 pt-7 pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--royal)]/10 text-[var(--royal)]">
            <Compass className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--royal)]/40">Shepherd</p>
            <h2 className="font-[family-name:var(--font-cinzel)] text-xl font-bold leading-tight text-[var(--royal)]">
              Let’s write this together
            </h2>
          </div>
        </div>

        <div className="px-8 py-7">
          <AnimatePresence mode="wait">
            {/* INTRO */}
            {phase === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <p className="text-[15px] leading-relaxed text-ink">
                  You don’t have to find the words alone. Start by simply telling me what happened
                  {subject === 'self' ? ' in your life' : ` — about ${firstWord(subjectName)}`}.
                  I’ll listen, ask a few gentle things to fill in the blanks, and compose a dignified
                  draft you can shape however you like.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                  There are no wrong answers, and nearly every question is optional.
                  Share as much or as little as feels right.
                </p>
                <div className="mt-7 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-ink-muted">Tell me what happened · about 3 minutes</span>
                  <Button
                    onClick={() => setPhase('interview')}
                    className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-7 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95"
                  >
                    Begin
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* INTERVIEW */}
            {phase === 'interview' && step && (
              <motion.div key={`q-${step.id}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                {/* Progress */}
                <div className="mb-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--royal)]/45">
                      Question {stepIndex + 1} of {total}
                    </span>
                    {step.optional && (
                      <button type="button" onClick={goNext} className="text-[12px] font-semibold text-ink-muted hover:text-[var(--royal)]">
                        Skip
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--neutral-faint)]">
                    <motion.div className="h-full rounded-full bg-[var(--gold)]" initial={false} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                  </div>
                </div>

                <h3 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold leading-snug text-[var(--royal)]">
                  {step.ask(principalName, subject)}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{step.help}</p>

                {step.long ? (
                  <textarea
                    ref={inputRef}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder={step.placeholder}
                    aria-label={step.ask(principalName, subject)}
                    rows={4}
                    className="mt-5 w-full resize-none rounded-2xl border border-[var(--neutral-border)] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-[var(--royal)]"
                  />
                ) : (
                  <textarea
                    ref={inputRef}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    aria-label={step.ask(principalName, subject)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && canContinue) {
                        e.preventDefault()
                        goNext()
                      }
                    }}
                    placeholder={step.placeholder}
                    rows={1}
                    className="mt-5 w-full resize-none rounded-2xl border border-[var(--neutral-border)] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-[var(--royal)]"
                  />
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    disabled={stepIndex === 0}
                    className="text-ink-muted hover:text-[var(--royal)] px-3 py-2 h-auto rounded-xl font-semibold text-[13px] disabled:opacity-30"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canContinue}
                    className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-7 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-40"
                  >
                    {stepIndex === total - 1 ? (
                      <>
                        Compose the draft
                        <Sparkles className="ml-1.5 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* COMPOSING */}
            {phase === 'composing' && (
              <motion.div key="composing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-12 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--gold)]/20 border-t-[var(--gold)] animate-spin" />
                  <Compass className="h-7 w-7 text-[var(--royal)]" strokeWidth={1.5} />
                </div>
                <p className="mt-6 font-[family-name:var(--font-cinzel)] text-lg font-bold text-[var(--royal)]">
                  Composing {firstWord(principalName)}’s record…
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted max-w-sm">
                  Weaving your answers into a dignified obituary. This takes a few seconds.
                </p>
              </motion.div>
            )}

            {/* REVIEW */}
            {phase === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {error && (
                  <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{error}</p>
                )}
                {draft ? (
                  <>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--royal)]/45">Your draft</p>
                    <div className="max-h-[40vh] overflow-y-auto rounded-2xl border border-[var(--neutral-border)] bg-[var(--neutral-faint)] p-6">
                      <p className="whitespace-pre-wrap font-[family-name:var(--font-inter)] text-[15px] leading-[1.75] text-ink">{draft}</p>
                    </div>

                    {/* Conversational refinement */}
                    <div className="mt-5">
                      <p className="mb-2.5 text-[12px] font-medium text-ink-muted">
                        {refining ? 'Shepherd is refining…' : 'Want a different feel? Tap to refine:'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Warmer', instr: 'warmer and more personal' },
                          { label: 'Shorter', instr: 'more concise, about two short paragraphs' },
                          { label: 'More formal', instr: 'more formal and traditional in tone' },
                          { label: 'More about family', instr: 'more focused on family and relationships' },
                          { label: 'Add faith', instr: 'inclusive of faith and spiritual comfort' },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            disabled={refining}
                            onClick={() => refine(chip.instr)}
                            className="rounded-full border border-[var(--neutral-border)] px-4 py-2 text-[12.5px] font-semibold text-[var(--royal)]/70 transition-colors hover:border-[var(--royal)]/40 hover:text-[var(--royal)] disabled:opacity-40"
                          >
                            {refining ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-7 flex items-center justify-between">
                      <Button variant="ghost" onClick={restart} className="text-ink-muted hover:text-[var(--royal)] px-3 py-2 h-auto rounded-xl font-semibold text-[13px]">
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Start over
                      </Button>
                      <Button
                        onClick={useThisDraft}
                        className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-7 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95"
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Use this draft
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[14px] text-ink-muted">{error || 'Something went wrong composing the draft.'}</p>
                    <Button onClick={() => compose(answers)} className="mt-5 bg-[var(--royal)] text-white px-6 py-2.5 h-auto rounded-2xl font-bold text-[13px]">
                      Try again
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// Assemble the structured interview answers into a rich, faithful prompt. The
// backend system prompt (obituarySystemPrompt) owns tone + dignity; we supply
// only the facts so the model never invents details it wasn't given.
function buildPrompt(a: Record<string, string>, subject: Subject): string {
  const name = (a.name || '').trim() || 'the person'
  const lines: string[] = []
  lines.push(
    `Write a complete, dignified, publication-ready obituary for ${name}, in the third person.`,
  )
  if (subject === 'self') {
    lines.push('This is a person preparing their own life record in advance; write it as a finished obituary in the third person.')
  }
  lines.push('Use ONLY the details below. Do not invent facts, dates, names, or events that are not provided. Where a detail is missing, simply omit it gracefully rather than guessing.')
  lines.push('')
  const open = (a.happened || '').trim()
  if (open) {
    lines.push('In their own words, the family shared this — treat it as the primary source of truth and voice:')
    lines.push(`"""${open}"""`)
    lines.push('')
  }
  const field = (label: string, key: string) => {
    const v = (a[key] || '').trim()
    if (v) lines.push(`${label}: ${v}`)
  }
  field('Full name', 'name')
  field('Born / where they lived', 'lived')
  field('Passing', 'passed')
  field('Family and survivors', 'family')
  field('Life and work', 'work')
  field('What they loved', 'loves')
  field('A defining story or quality', 'story')
  field('The feeling to leave the reader with', 'feeling')
  field('Service and memorial details', 'service')
  lines.push('')
  lines.push('Structure it as flowing prose (not a list): an opening that announces the passing and names them, a paragraph on their life and the people they loved, a paragraph on what made them who they were, and a graceful closing. If service details are provided, end with them. Keep it warm, specific, and never clichéd.')
  return lines.join('\n')
}
