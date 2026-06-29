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
import { useCallback, useMemo, useRef, useState, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, ArrowLeft, ArrowRight, Loader2, Sparkles, Check, RefreshCw, Upload, Image as ImageIcon, Mail, Printer, Share2, Copy, Heart, AlertCircle } from 'lucide-react'
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

type Phase = 'intro' | 'interview' | 'composing' | 'review' | 'media' | 'recipients' | 'deliver' | 'done'

export interface Recipient {
  name?: string
  email: string
}

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
  heirContacts = [],
  service,
  onDraftReady,
  onAddDevicePhotos,
  onImportGooglePhotos,
  photosConfigured = false,
  onExportPDF,
  onEmailTo,
  onPublishMemorial,
}: {
  estateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectName: string
  /** 'self' = principal writing their own; 'other' = settling a loss. */
  subject?: Subject
  heirNames?: string[]
  /** Heirs with emails, for the recipients step. */
  heirContacts?: Recipient[]
  service?: ServiceSeed
  /** Called with the finished draft (plain text). Parent drops it into the editor. */
  onDraftReady: (text: string) => void
  /** Media: upload device files → returns the added image URLs (for thumbnails). */
  onAddDevicePhotos?: (files: FileList) => Promise<string[]>
  /** Media: import from Google Photos → returns added image URLs. */
  onImportGooglePhotos?: () => Promise<string[]>
  /** Whether the Google Photos picker is configured (else that option is hidden). */
  photosConfigured?: boolean
  /** Deliver: print / download the obituary PDF. */
  onExportPDF?: () => Promise<void> | void
  /** Deliver: email the obituary to the chosen recipients. */
  onEmailTo?: (recipients: Recipient[]) => Promise<void>
  /** Deliver: publish the public memorial → returns its shareable URL. */
  onPublishMemorial?: () => Promise<{ url: string }>
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [refining, setRefining] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Memorial-spine state (media → recipients → deliver).
  const [photos, setPhotos] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [extraRecipients, setExtraRecipients] = useState<Recipient[]>([])
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  // deliver action → 'idle' | 'busy' | 'done' | 'error'
  const [deliver, setDeliver] = useState<Record<string, 'idle' | 'busy' | 'done' | 'error'>>({})
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

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
    setPhotos([])
    setPhotoBusy(false)
    setSelectedEmails(new Set())
    setExtraRecipients([])
    setAddEmail('')
    setAddName('')
    setDeliver({})
    setPublishedUrl(null)
  }, [])

  // Single close path: the modal stays mounted (parent owns `open`), so its state
  // would otherwise survive a close. Reset after the close animation so reopening
  // always starts clean — covers the X, outside-dismiss, and "Use this draft".
  const closeAndReset = useCallback(() => {
    onOpenChange(false)
    setTimeout(restart, 300)
  }, [onOpenChange, restart])

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) closeAndReset()
    else onOpenChange(true)
  }, [closeAndReset, onOpenChange])

  // "Use this draft" now persists the draft into the editor AND continues the
  // conversation into the memorial spine (media → recipients → deliver), instead
  // of closing. The grieving family stays held the whole way through.
  const useThisDraft = useCallback(() => {
    onDraftReady(draft)
    setPhase('media')
  }, [draft, onDraftReady])

  // ---- Media ----
  const handleDeviceFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !onAddDevicePhotos) return
    setPhotoBusy(true)
    setError(null)
    try {
      const urls = await onAddDevicePhotos(files)
      setPhotos((prev) => [...prev, ...urls])
    } catch {
      setError('Those photos could not be added. You can try again or continue.')
    } finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }, [onAddDevicePhotos])

  const handleImportPhotos = useCallback(async () => {
    if (!onImportGooglePhotos) return
    setPhotoBusy(true)
    setError(null)
    try {
      const urls = await onImportGooglePhotos()
      setPhotos((prev) => [...prev, ...urls])
    } catch {
      setError('Google Photos could not be reached. You can upload from your device instead.')
    } finally {
      setPhotoBusy(false)
    }
  }, [onImportGooglePhotos])

  // ---- Recipients ----
  const toggleEmail = useCallback((email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }, [])

  const addRecipient = useCallback(() => {
    const email = addEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setExtraRecipients((prev) => prev.some((r) => r.email === email) ? prev : [...prev, { name: addName.trim() || undefined, email }])
    setSelectedEmails((prev) => new Set(prev).add(email))
    setAddEmail('')
    setAddName('')
  }, [addEmail, addName])

  const chosenRecipients = useMemo<Recipient[]>(() => {
    const fromHeirs = heirContacts.filter((h) => h.email && selectedEmails.has(h.email))
    const fromExtra = extraRecipients.filter((r) => selectedEmails.has(r.email))
    const seen = new Set<string>()
    return [...fromHeirs, ...fromExtra].filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
  }, [heirContacts, extraRecipients, selectedEmails])

  // ---- Deliver ----
  const runDeliver = useCallback(async (key: string, fn: () => Promise<unknown>) => {
    setDeliver((d) => ({ ...d, [key]: 'busy' }))
    try {
      await fn()
      setDeliver((d) => ({ ...d, [key]: 'done' }))
    } catch {
      setDeliver((d) => ({ ...d, [key]: 'error' }))
    }
  }, [])

  const doExport = useCallback(() => runDeliver('pdf', async () => { await onExportPDF?.() }), [runDeliver, onExportPDF])
  const doEmail = useCallback(() => runDeliver('email', async () => { await onEmailTo?.(chosenRecipients) }), [runDeliver, onEmailTo, chosenRecipients])
  const doPublish = useCallback(() => runDeliver('publish', async () => {
    const r = await onPublishMemorial?.()
    if (r?.url) setPublishedUrl(r.url)
  }), [runDeliver, onPublishMemorial])

  const canContinue = step ? step.optional || current.trim().length > 0 : false
  const progressPct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

            {/* MEDIA */}
            {phase === 'media' && (
              <motion.div key="media" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <SpineHeader step={1} label="Photos" title="Add a portrait and a few photos?" help="These appear on the memorial and the printed record. Add as many as feels right — or skip this for now." />
                {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{error}</p>}
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" aria-label="Upload photos from this device" onChange={(e) => handleDeviceFiles(e.target.files)} />
                <div className="flex flex-wrap gap-3">
                  {onAddDevicePhotos && (
                    <button type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--neutral-border)] px-5 py-3 text-[13px] font-semibold text-[var(--royal)] transition-colors hover:border-[var(--royal)]/40 disabled:opacity-50">
                      <Upload className="h-4 w-4" /> Upload from this device
                    </button>
                  )}
                  {photosConfigured && onImportGooglePhotos && (
                    <button type="button" disabled={photoBusy} onClick={handleImportPhotos} className="inline-flex items-center gap-2 rounded-2xl border border-[var(--neutral-border)] px-5 py-3 text-[13px] font-semibold text-[var(--royal)] transition-colors hover:border-[var(--royal)]/40 disabled:opacity-50">
                      <ImageIcon className="h-4 w-4" /> Choose from Google Photos
                    </button>
                  )}
                  {photoBusy && <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" /> Adding…</span>}
                </div>
                {photos.length > 0 && (
                  <div className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                    {photos.map((url, i) => (
                      <img key={`${url}-${i}`} src={url} alt={`In memory of ${firstWord(principalName)}, ${i + 1}`} className="aspect-square w-full rounded-xl object-cover border border-[var(--neutral-border)]" />
                    ))}
                  </div>
                )}
                <SpineFooter onClose={closeAndReset} onContinue={() => { setError(null); setPhase('recipients') }} continueLabel={photos.length ? 'Continue' : 'Skip for now'} />
              </motion.div>
            )}

            {/* RECIPIENTS */}
            {phase === 'recipients' && (
              <motion.div key="recipients" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <SpineHeader step={2} label="Recipients" title="Who should receive this?" help="We’ll send them the obituary. Choose from family below, or add anyone by email." />
                {heirContacts.filter((h) => h.email).length > 0 && (
                  <div className="space-y-1.5">
                    {heirContacts.filter((h) => h.email).map((h) => (
                      <button key={h.email} type="button" onClick={() => toggleEmail(h.email)} className="flex w-full items-center justify-between rounded-xl border border-[var(--neutral-border)] px-4 py-3 text-left transition-colors hover:border-[var(--royal)]/30">
                        <span>
                          <span className="block text-[14px] font-semibold text-ink">{h.name || h.email}</span>
                          {h.name && <span className="block text-[12px] text-ink-muted">{h.email}</span>}
                        </span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${selectedEmails.has(h.email) ? 'border-[var(--royal)] bg-[var(--royal)] text-white' : 'border-[var(--neutral-border)]'}`}>
                          {selectedEmails.has(h.email) && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {extraRecipients.filter((r) => !heirContacts.some((h) => h.email === r.email)).map((r) => (
                  <div key={r.email} className="mt-1.5 flex items-center justify-between rounded-xl border border-[var(--royal)]/30 bg-[var(--royal)]/5 px-4 py-3">
                    <span className="text-[14px] font-semibold text-ink">{r.name || r.email}</span>
                    <Check className="h-4 w-4 text-[var(--royal)]" />
                  </div>
                ))}
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name (optional)" aria-label="Recipient name" className="min-w-0 flex-1 rounded-xl border border-[var(--neutral-border)] bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-[var(--royal)]" />
                  <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient() } }} placeholder="name@example.com" aria-label="Recipient email" className="min-w-0 flex-[2] rounded-xl border border-[var(--neutral-border)] bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-[var(--royal)]" />
                  <Button onClick={addRecipient} variant="outline" className="rounded-xl px-5 py-2.5 h-auto font-semibold text-[13px]">Add</Button>
                </div>
                <p className="mt-3 text-[12px] text-ink-muted">{chosenRecipients.length} recipient{chosenRecipients.length === 1 ? '' : 's'} selected.</p>
                <SpineFooter onBack={() => setPhase('media')} onContinue={() => setPhase('deliver')} continueLabel="Continue" />
              </motion.div>
            )}

            {/* DELIVER */}
            {phase === 'deliver' && (
              <motion.div key="deliver" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <SpineHeader step={3} label="Share" title="How would you like to share it?" help="Each is yours to choose — nothing is sent until you tap it." />
                <div className="space-y-2.5">
                  <DeliverRow icon={<Printer className="h-4 w-4" />} label="Print or download a PDF" status={deliver.pdf} onClick={doExport} disabled={!onExportPDF} doneLabel="PDF ready" />
                  <DeliverRow icon={<Mail className="h-4 w-4" />} label={chosenRecipients.length ? `Email to ${chosenRecipients.length} recipient${chosenRecipients.length === 1 ? '' : 's'}` : 'Email a copy to yourself'} status={deliver.email} onClick={doEmail} disabled={!onEmailTo} doneLabel="Sent" />
                  <DeliverRow icon={<Share2 className="h-4 w-4" />} label="Create a public memorial (share to social)" status={deliver.publish} onClick={doPublish} disabled={!onPublishMemorial} doneLabel="Published" />
                </div>
                {publishedUrl && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--neutral-border)] bg-[var(--neutral-faint)] px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--royal)]">{publishedUrl}</span>
                    <button type="button" aria-label="Copy memorial link" onClick={() => navigator.clipboard?.writeText(publishedUrl)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--royal)]"><Copy className="h-3.5 w-3.5" /> Copy</button>
                  </div>
                )}
                <SpineFooter onBack={() => setPhase('recipients')} onContinue={() => setPhase('done')} continueLabel="Finish" />
              </motion.div>
            )}

            {/* DONE */}
            {phase === 'done' && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]"><Heart className="h-6 w-6" /></div>
                <p className="mt-5 font-[family-name:var(--font-cinzel)] text-xl font-bold text-[var(--royal)]">It’s ready.</p>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">You’ve done a beautiful thing — {firstWord(principalName)}’s story is saved, and ready to share whenever your family is.</p>
                <Button onClick={closeAndReset} className="mt-7 bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-8 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95">Close</Button>
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

// ---- Memorial-spine sub-components (shared chrome for media/recipients/deliver) ----

function SpineHeader({ step, label, title, help }: { step: number; label: string; title: string; help: string }) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--royal)]/45">
        Step {step} of 3 · {label}
      </p>
      <h3 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold leading-snug text-[var(--royal)]">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{help}</p>
    </div>
  )
}

function SpineFooter({ onBack, onClose, onContinue, continueLabel }: { onBack?: () => void; onClose?: () => void; onContinue: () => void; continueLabel: string }) {
  return (
    <div className="mt-7 flex items-center justify-between">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="text-ink-muted hover:text-[var(--royal)] px-3 py-2 h-auto rounded-xl font-semibold text-[13px]">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      ) : (
        <button type="button" onClick={onClose} className="text-[13px] font-semibold text-ink-muted hover:text-[var(--royal)]">Done for now</button>
      )}
      <Button onClick={onContinue} className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-7 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95">
        {continueLabel}
        <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

function DeliverRow({ icon, label, status = 'idle', onClick, disabled, doneLabel }: { icon: ReactNode; label: string; status?: 'idle' | 'busy' | 'done' | 'error'; onClick: () => void; disabled?: boolean; doneLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === 'busy'}
      className="flex w-full items-center justify-between rounded-2xl border border-[var(--neutral-border)] px-5 py-4 text-left transition-colors hover:border-[var(--royal)]/40 disabled:opacity-50"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--royal)]/8 text-[var(--royal)]">{icon}</span>
        <span className="text-[14px] font-semibold text-ink">{label}</span>
      </span>
      <span className="text-[12.5px] font-semibold">
        {status === 'busy' && <Loader2 className="h-4 w-4 animate-spin text-[var(--royal)]" />}
        {status === 'done' && <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-4 w-4" /> {doneLabel}</span>}
        {status === 'error' && <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle className="h-4 w-4" /> Try again</span>}
      </span>
    </button>
  )
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
