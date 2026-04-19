/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import {
  useEstate,
  useEstateAssets,
  useEstateHeirs,
  useEstateDocuments,
  useDirectives,
  useTimeCapsules,
  useHeirlooms,
  useCollection,
  type Asset,
  type Heir,
  type VaultDocument,
  type Directive,
  type TimeCapsule,
  type Heirloom,
} from '../lib/firestore'
import { orderBy, type Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { getShepherdPrompt, type ShepherdContext } from '../lib/shepherd-prompts'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { ScrollReveal, AnimatedCounter, HoverCard, StaggerList, StaggerItem, PageTransition } from '@/lib/animations'

export const Route = createLazyFileRoute('/estates/$estateId/dashboard')({
  component: DashboardIndex,
})

// ─── Shepherd Types ──────────────────────────────────────────────────────

interface ShepherdStep {
  id: string
  label: string
  description: string
  category: string
  complete: boolean
  route: string
  priority: number
}

interface ShepherdScore {
  estateId: string
  completionPercent: number
  completedSteps: number
  totalSteps: number
  steps: ShepherdStep[]
  nextAction: ShepherdStep | null
  insight: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ─── Shepherd Persistence ────────────────────────────────────────────────────

/** Fire-and-forget: save a chat message to Firestore for conversation memory */
function persistMessage(estateId: string, msg: ChatMessage) {
  setDoc(doc(db, `estates/${estateId}/shepherd-messages/${msg.id}`), {
    role: msg.role,
    content: msg.content,
    suggestedActions: msg.suggestedActions || null,
    createdAt: serverTimestamp(),
  }).catch(() => {
    // Non-blocking — persistence failure is silent
  })
}

// ─── Shepherd Chat Types ────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'shepherd'
  content: string
  suggestedActions?: string[]
}

// ─── Timeline Types ─────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string
  type: 'soul-log' | 'asset' | 'document' | 'heir' | 'heirloom' | 'capsule' | 'directive' | 'memoir'
  title: string
  subtitle?: string
  createdAt: Timestamp
  date: Date
}

// ─── Shepherd Typing Indicator ──────────────────────────────────────────────

function ShepherdTypingIndicator() {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="bg-[#F8FAFC] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 bg-[#C8A951] rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-[#C8A951] rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-[#C8A951] rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

// ─── Shepherd Chat Panel ────────────────────────────────────────────────────

function ShepherdChat({
  open,
  onOpenChange,
  estateId,
  initialInsight,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  estateId: string
  initialInsight: string
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load conversation history from Firestore on first open
  useEffect(() => {
    if (!open || historyLoaded) return
    setHistoryLoaded(true)
    const loadHistory = async () => {
      try {
        const { getDocs, query, collection: col, orderBy: ob, limit: lim } = await import('firebase/firestore')
        const q = query(
          col(db, `estates/${estateId}/shepherd-messages`),
          ob('createdAt', 'desc'),
          lim(10),
        )
        const snap = await getDocs(q)
        if (snap.empty) {
          // No history — seed with initial insight
          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'shepherd',
              content: initialInsight,
              suggestedActions: ['What should I do next?', 'Explain my score', 'Who needs to be notified?'],
            },
          ])
        } else {
          const loaded: ChatMessage[] = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) }))
            .reverse()
          setMessages(loaded)
        }
      } catch {
        // Fallback to initial insight if Firestore load fails
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'shepherd',
            content: initialInsight,
            suggestedActions: ['What should I do next?', 'Explain my score', 'Who needs to be notified?'],
          },
        ])
      }
    }
    loadHistory()
  }, [open, historyLoaded, estateId, initialInsight])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Build conversation history (last 10 messages for token control)
  const buildHistory = useCallback(
    (currentMessages: ChatMessage[]) =>
      currentMessages.slice(-10).map((m) => ({
        role: m.role === 'shepherd' ? 'assistant' : 'user',
        content: m.content,
      })),
    [],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading || !user) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }
      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)
      setInput('')
      setIsLoading(true)

      // Persist user message to Firestore (fire-and-forget)
      persistMessage(estateId, userMsg)

      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estateId,
            message: trimmed,
            conversationHistory: buildHistory(updatedMessages),
          }),
        })

        if (!res.ok) throw new Error(`Server error (${res.status})`)

        const data = await res.json()
        const shepherdMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'shepherd',
          content: data.reply || data.message || 'I understand. Let me look into that for you.',
          suggestedActions: data.suggestedActions,
        }
        setMessages((prev) => [...prev, shepherdMsg])
        // Persist Shepherd reply
        persistMessage(estateId, shepherdMsg)
      } catch (_err) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'shepherd',
          content: `I'm having trouble connecting right now. Please try again in a moment.`,
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, user, messages, estateId, buildHistory],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col gap-0 bg-white"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 bg-[#133378] gap-0 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C8A951]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-[#C8A951]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <SheetTitle className="text-white font-[family-name:var(--font-cinzel)] text-base tracking-wide font-bold">
                The Shepherd
              </SheetTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <SheetDescription className="text-white/50 text-xs mt-1">
            Your AI estate planning guide
          </SheetDescription>
          <div className="w-full h-[1px] bg-[#C8A951]/30 mt-3" />
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={cn(
                  'flex mb-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[#133378] text-white rounded-tr-sm'
                      : 'bg-[#F8FAFC] text-[#0F172A] rounded-tl-sm border border-slate-100',
                  )}
                >
                  {msg.content}
                </div>
              </div>
              {msg.role === 'shepherd' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 ml-1">
                  {msg.suggestedActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => sendMessage(action)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#C8A951]/40 text-[#133378] bg-white hover:bg-[#C8A951]/10 hover:border-[#C8A951] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && <ShepherdTypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Shepherd..."
              className="flex-1 text-sm h-10 rounded-xl"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="bg-[#133378] hover:bg-[#1E3A5F] text-white h-10 w-10 shrink-0 rounded-xl"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Floating Shepherd Button ───────────────────────────────────────────────

function ShepherdFAB({ onClick, hasInteracted }: { onClick: () => void; hasInteracted: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#133378] hover:bg-[#1E3A5F] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center',
        !hasInteracted && 'animate-pulse',
      )}
      aria-label="Ask the Shepherd"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
      </svg>
    </button>
  )
}

// ─── Timeline Route Map ────────────────────────────────────────────────────

const TIMELINE_TYPE_ROUTES: Record<TimelineEntry['type'], string> = {
  'soul-log': 'soul-log',
  asset: 'assets',
  document: 'vault',
  heir: 'beneficiaries',
  heirloom: 'heirlooms',
  capsule: 'timecapsule',
  directive: 'directives',
  memoir: 'memoirs',
}

// ─── Timeline Icons ─────────────────────────────────────────────────────────

function TimelineIcon({ type }: { type: TimelineEntry['type'] }) {
  const iconClass = 'w-4 h-4'
  switch (type) {
    case 'soul-log':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )
    case 'asset':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'document':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'heir':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'heirloom':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 3h12l4 6-10 13L2 9z" />
          <path d="M11 3l1 6h6" />
          <path d="M2 9h20" />
          <path d="M13 3l-1 6H6" />
        </svg>
      )
    case 'capsule':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'directive':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
          <path d="M15 5l4 4" />
        </svg>
      )
    case 'memoir':
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
  }
}

// ─── Date Formatting ────────────────────────────────────────────────────────

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })

  const sameYear = date.getFullYear() === now.getFullYear()
  if (sameYear) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatGroupKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─── Timeline Entry Builders ────────────────────────────────────────────────

interface SoulLogEntry {
  id: string
  title?: string
  type?: string
  createdAt: Timestamp
}

interface MemoirEntry {
  id: string
  caption?: string
  fileName?: string
  createdAt: Timestamp
}

function buildTimelineEntries(
  assets: Asset[],
  heirs: Heir[],
  documents: VaultDocument[],
  directives: Directive[],
  capsules: TimeCapsule[],
  heirlooms: Heirloom[],
  soulLogs: SoulLogEntry[],
  memoirs: MemoirEntry[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const a of assets) {
    if (!a.createdAt) continue
    entries.push({
      id: `asset-${a.id}`,
      type: 'asset',
      title: `${a.name} added to assets`,
      subtitle: a.category?.replace('_', ' '),
      createdAt: a.createdAt,
      date: a.createdAt.toDate(),
    })
  }

  for (const h of heirs) {
    if (!h.createdAt) continue
    entries.push({
      id: `heir-${h.id}`,
      type: 'heir',
      title: `${h.fullName} added as beneficiary`,
      subtitle: h.relationship || undefined,
      createdAt: h.createdAt,
      date: h.createdAt.toDate(),
    })
  }

  for (const d of documents) {
    if (!d.createdAt) continue
    entries.push({
      id: `doc-${d.id}`,
      type: 'document',
      title: `${d.displayName || d.originalName} uploaded to vault`,
      subtitle: d.tags?.join(', ') || undefined,
      createdAt: d.createdAt,
      date: d.createdAt.toDate(),
    })
  }

  for (const dir of directives) {
    if (!dir.createdAt) continue
    entries.push({
      id: `directive-${dir.id}`,
      type: 'directive',
      title: `Directive written: ${dir.title}`,
      subtitle: dir.type?.replace('_', ' '),
      createdAt: dir.createdAt,
      date: dir.createdAt.toDate(),
    })
  }

  for (const c of capsules) {
    if (!c.createdAt) continue
    entries.push({
      id: `capsule-${c.id}`,
      type: 'capsule',
      title: `Time capsule sealed for ${c.recipientName}`,
      subtitle: c.scheduledDate
        ? `Delivers ${c.scheduledDate.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : c.deliveryType?.replace('_', ' '),
      createdAt: c.createdAt,
      date: c.createdAt.toDate(),
    })
  }

  for (const hl of heirlooms) {
    if (!hl.createdAt) continue
    entries.push({
      id: `heirloom-${hl.id}`,
      type: 'heirloom',
      title: `${hl.name} documented as heirloom`,
      subtitle: hl.category?.replace('_', ' '),
      createdAt: hl.createdAt,
      date: hl.createdAt.toDate(),
    })
  }

  for (const sl of soulLogs) {
    if (!sl.createdAt) continue
    const logType = sl.type === 'video' ? 'Video' : sl.type === 'audio' ? 'Voice memo' : 'Reflection'
    entries.push({
      id: `soul-${sl.id}`,
      type: 'soul-log',
      title: sl.title ? `${logType}: ${sl.title}` : `${logType} recorded`,
      createdAt: sl.createdAt,
      date: sl.createdAt.toDate(),
    })
  }

  for (const m of memoirs) {
    if (!m.createdAt) continue
    entries.push({
      id: `memoir-${m.id}`,
      type: 'memoir',
      title: m.caption || m.fileName || 'Memory uploaded',
      createdAt: m.createdAt,
      date: m.createdAt.toDate(),
    })
  }

  // Sort descending by date
  entries.sort((a, b) => b.date.getTime() - a.date.getTime())

  return entries
}

// ─── Shepherd Companion Prompts (powered by shepherd-prompts engine) ────────

// ─── Main Page ──────────────────────────────────────────────────────────────

function DashboardIndex() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/dashboard' })
  const { user, profile } = useAuth()
  const estateId = routeId
  const userName = profile?.firstName || profile?.displayName || ''

  const { data: _estate, loading: metaLoading } = useEstate(estateId)
  const { data: assets, loading: assetsLoading } = useEstateAssets(estateId)
  const { data: heirs, loading: beneLoading } = useEstateHeirs(estateId)
  const { data: documents, loading: vaultLoading } = useEstateDocuments(estateId)
  const { data: directives } = useDirectives(estateId)
  const { data: capsules } = useTimeCapsules(estateId)
  const { data: heirlooms } = useHeirlooms(estateId)

  // Soul log + memoirs via generic useCollection
  const soulLogConstraints = useMemo(() => [orderBy('createdAt', 'desc')], [])
  const { data: soulLogs } = useCollection<SoulLogEntry>(
    estateId ? `estates/${estateId}/soul-log` : null,
    soulLogConstraints,
  )
  const { data: memoirs } = useCollection<MemoirEntry>(
    estateId ? `estates/${estateId}/memoirs` : null,
    soulLogConstraints,
  )

  // Shepherd score
  const [score, setScore] = useState<ShepherdScore | null>(null)
  const [scoreLoading, setScoreLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/score?estate_id=${estateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && !cancelled) {
          setScore(await res.json())
        }
      } catch {
        // Fallback: score unavailable
      }
      if (!cancelled) setScoreLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, estateId])

  // Shepherd chat state
  const [shepherdOpen, setShepherdOpen] = useState(false)
  const [shepherdInteracted, setShepherdInteracted] = useState(false)

  const openShepherd = useCallback(() => {
    setShepherdOpen(true)
    setShepherdInteracted(true)
  }, [])

  // Checklist collapsible state
  const [checklistOpen, setChecklistOpen] = useState(false)

  // Timeline pagination
  const [visibleCount, setVisibleCount] = useState(50)

  const isLoading = metaLoading || assetsLoading || beneLoading || vaultLoading

  const percent = score?.completionPercent ?? 0
  const insight = score?.insight ?? 'Loading your estate guidance...'

  // Group steps by category
  const categories = useMemo(() => {
    const steps = score?.steps ?? []
    const map: Record<string, ShepherdStep[]> = {}
    for (const s of steps) {
      if (!map[s.category]) map[s.category] = []
      map[s.category].push(s)
    }
    return map
  }, [score])

  // Build timeline
  const allEntries = useMemo(
    () => buildTimelineEntries(assets, heirs, documents, directives, capsules, heirlooms, soulLogs, memoirs),
    [assets, heirs, documents, directives, capsules, heirlooms, soulLogs, memoirs],
  )

  const visibleEntries = useMemo(() => allEntries.slice(0, visibleCount), [allEntries, visibleCount])
  const hasMore = allEntries.length > visibleCount
  const totalEntryCount = allEntries.length

  // Group visible entries by date
  const groupedEntries = useMemo(() => {
    const groups: { key: string; label: string; entries: TimelineEntry[] }[] = []
    let currentKey = ''
    for (const entry of visibleEntries) {
      const key = formatGroupKey(entry.date)
      if (key !== currentKey) {
        currentKey = key
        groups.push({ key, label: formatRelativeDate(entry.date), entries: [] })
      }
      groups[groups.length - 1].entries.push(entry)
    }
    return groups
  }, [visibleEntries])

  // Shepherd companion prompt — context-aware via prompt engine
  const shepherdCtx: ShepherdContext = useMemo(() => {
    // Derive lastSoulLogDate from the most recent soul log entry
    let lastSoulLogDate: Date | null = null
    if (soulLogs.length > 0 && soulLogs[0].createdAt && typeof soulLogs[0].createdAt.toDate === 'function') {
      lastSoulLogDate = soulLogs[0].createdAt.toDate()
    }

    return {
      estateId,
      userName: userName || '',
      soulLogCount: soulLogs.length,
      lastSoulLogDate,
      assetCount: assets.length,
      documentCount: documents.length,
      heirCount: heirs.length,
      heirloomCount: heirlooms.length,
      capsuleCount: capsules.length,
      directiveCount: directives.length,
      memoirCount: memoirs.length,
      heirs: heirs.map((h) => ({
        fullName: h.fullName,
        relationship: h.relationship || undefined,
        email: h.email || undefined,
      })),
      completionPercent: percent,
    }
  }, [estateId, userName, soulLogs, assets, documents, heirs, heirlooms, capsules, directives, memoirs, percent])

  const shepherdResult = useMemo(() => getShepherdPrompt(shepherdCtx), [shepherdCtx])
  const shepherdPrompt = shepherdResult.message

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      <SectionHeader
        section="my-legacy"
        title={`Welcome back, ${userName || 'there'}.`}
      />

      {/* ── 1. Shepherd Companion Card ── */}
      <Card className={cn(
        'rounded-3xl border-slate-100 shadow-sm overflow-hidden',
        totalEntryCount === 0 && 'bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF]',
      )}>
        <CardContent className={cn('px-8 py-8', totalEntryCount === 0 && 'py-16')}>
          <div className="flex items-start gap-5">
            {/* Shepherd compass icon */}
            <div className="w-12 h-12 rounded-full bg-[#133378]/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-[#0F172A] mb-2 font-[family-name:var(--font-cinzel)]">
                The Shepherd
              </h3>
              <p className="text-[#64748B] text-base leading-relaxed mb-5">
                {shepherdPrompt}
              </p>
              <div className="flex flex-wrap gap-3">
                {shepherdResult.cta ? (
                  <Button asChild className={cn(
                    'rounded-xl px-6 h-11 font-semibold',
                    totalEntryCount === 0
                      ? 'bg-[#133378] hover:bg-[#1E3A5F] text-white'
                      : 'border border-[#133378]/20 text-[#133378] hover:bg-[#133378]/5 bg-transparent',
                  )}>
                    {/* @ts-expect-error — dynamic route */}
                    <Link to={`/estates/${routeId}/${shepherdResult.cta.route}`}>
                      {shepherdResult.cta.label}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-xl px-5 h-10 border-[#133378]/20 text-[#133378] hover:bg-[#133378]/5 font-semibold">
                    {/* @ts-expect-error — dynamic route */}
                    <Link to={`/estates/${routeId}/soul-log`}>
                      Record a Memory
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={openShepherd}
                  className="rounded-xl px-5 h-10 text-[#C8A951] hover:bg-[#C8A951]/10 font-semibold"
                >
                  Talk to the Shepherd
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Legacy Timeline ── */}
      {totalEntryCount === 0 ? (
        /* Empty state — the Shepherd card above already expanded */
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl mb-4 opacity-20">
            <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-[#133378]/20" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#0F172A]/40 font-[family-name:var(--font-cinzel)]">
            Your Legacy Timeline
          </h3>
          <p className="text-[#64748B] max-w-md mx-auto leading-relaxed">
            Every voice memo, photo, document, and heirloom you add will appear here — a living portrait of the life you're preserving.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] mb-6">
            <span>Legacy Timeline</span>
            <Badge variant="secondary" className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              {totalEntryCount} {totalEntryCount === 1 ? 'moment' : 'moments'}
            </Badge>
          </div>

          <div className="relative">
            {/* Timeline spine */}
            <div className="absolute left-[23px] top-0 bottom-0 w-[2px] bg-[#133378]/10" />

            {groupedEntries.map((group) => (
              <div key={group.key} className="mb-8">
                {/* Date group header */}
                <div className="relative flex items-center gap-4 mb-4">
                  <div className="w-12 flex justify-center relative z-10">
                    <div className="w-3 h-3 rounded-full bg-[#133378]/20 border-2 border-white" />
                  </div>
                  <span className="text-sm font-bold text-[#0F172A] font-[family-name:var(--font-cinzel)] tracking-wide">
                    {group.label}
                  </span>
                </div>

                {/* Entries for this date */}
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="relative flex items-start gap-4 group/entry"
                    >
                      {/* Timeline dot */}
                      <div className="w-12 flex justify-center pt-3.5 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-[#133378]/15 group-hover/entry:bg-[#133378]/40 transition-colors" />
                      </div>

                      {/* Entry card — clickable link to source page */}
                      <Link
                        // @ts-expect-error — dynamic route from timeline type
                        to={`/estates/${routeId}/${TIMELINE_TYPE_ROUTES[entry.type]}`}
                        className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer min-w-0 no-underline"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#133378]/5 flex items-center justify-center flex-shrink-0 text-[#133378]/50 group-hover/entry:text-[#133378] group-hover/entry:bg-[#133378]/10 transition-colors">
                          <TimelineIcon type={entry.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">
                            {entry.title}
                          </p>
                          {entry.subtitle && (
                            <p className="text-xs text-[#64748B] truncate mt-0.5">
                              {entry.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-300 flex-shrink-0 tabular-nums">
                          {entry.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="ghost"
                onClick={() => setVisibleCount((prev) => prev + 50)}
                className="text-[#133378] hover:bg-[#133378]/5 rounded-xl font-semibold"
              >
                Load more moments
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Quick Actions Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          label="Record a Memory"
          route={`/estates/${routeId}/soul-log`}
          icon={
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          }
          primary
        />
        <QuickAction
          label="Upload Doc"
          route={`/estates/${routeId}/vault`}
          icon={
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          }
        />
        <QuickAction
          label="Add Heir"
          route={`/estates/${routeId}/beneficiaries`}
          icon={
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
            </svg>
          }
        />
        <QuickAction
          label="Add Asset"
          route={`/estates/${routeId}/assets`}
          icon={
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* ── 4. Quick Stats Row ── */}
      <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StaggerItem><MiniStat label="Assets" value={assets.length.toString()} /></StaggerItem>
        <StaggerItem><MiniStat label="Documents" value={documents.length.toString()} /></StaggerItem>
        <StaggerItem><MiniStat label="Beneficiaries" value={heirs.length.toString()} /></StaggerItem>
        <StaggerItem><MiniStat label="Completion" value={scoreLoading ? '...' : `${percent}%`} /></StaggerItem>
      </StaggerList>

      {/* ── 5. Estate Health Check (Collapsible) ── */}
      <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-8 py-5 text-left group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <span className="text-base font-bold text-[#0F172A]">Estate Health Check</span>
                  <span className="text-sm text-[#64748B] ml-3">
                    {scoreLoading ? '...' : `${percent}% complete`}
                    {score && ` — ${score.completedSteps} of ${score.totalSteps} steps`}
                  </span>
                </div>
              </div>
              <svg
                viewBox="0 0 24 24"
                className={cn(
                  'w-5 h-5 text-slate-300 transition-transform',
                  checklistOpen && 'rotate-180',
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-8 pb-8">
              <Progress
                value={percent}
                className="w-full h-2 bg-slate-100 mb-8"
              />
              {Object.entries(categories).length > 0 ? (
                <div className="space-y-8">
                  {Object.entries(categories).map(([category, catSteps]) => (
                    <div key={category}>
                      <div className="text-[10px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] mb-3">{category}</div>
                      <div className="space-y-2">
                        {catSteps.map((step) => (
                          <Link
                            key={step.id}
                            // @ts-expect-error — dynamic route from checklist
                            to={`/estates/${routeId}/${step.route}`}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all no-underline group/step',
                              step.complete
                                ? 'bg-[#059669]/5'
                                : 'bg-[#F8FAFC] hover:bg-white hover:shadow-sm',
                            )}
                          >
                            <div className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                              step.complete ? 'bg-[#059669]' : 'border-2 border-slate-200 group-hover/step:border-[#133378]',
                            )}>
                              {step.complete && (
                                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-sm font-semibold transition-colors',
                                step.complete ? 'text-[#059669]' : 'text-[#0F172A] group-hover/step:text-[#133378]',
                              )}>
                                {step.label}
                              </p>
                              <p className="text-xs text-[#64748B] truncate">{step.description}</p>
                            </div>
                            {!step.complete && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 group-hover/step:text-[#133378] transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">Loading checklist...</p>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Shepherd Chat */}
      <ShepherdFAB onClick={openShepherd} hasInteracted={shepherdInteracted} />
      <ShepherdChat
        open={shepherdOpen}
        onOpenChange={setShepherdOpen}
        estateId={estateId}
        initialInsight={insight}
      />
    </div>
  )
}

// ── Shared UI Components ──

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <HoverCard glowColor="rgba(19,51,120,0.1)" tiltDeg={3}>
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[#F8FAFC] border border-slate-100 transition-all">
        <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{value}</div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </HoverCard>
  )
}

interface QuickActionProps {
  label: string
  icon: React.ReactNode
  route: string
  primary?: boolean
}

function QuickAction({ label, icon, route, primary }: QuickActionProps) {
  return (
    <Link
      to={route as '/'}
      className={cn(
        'flex items-center gap-3 px-5 py-4 rounded-xl transition-all no-underline group',
        primary
          ? 'bg-[#133378] text-white hover:bg-[#1E3A5F] shadow-sm'
          : 'bg-[#F8FAFC] border border-slate-100 text-[#0F172A] hover:border-[#133378]/20 hover:shadow-sm',
      )}
    >
      <div className={cn(
        'transition-colors',
        primary ? 'text-white/70 group-hover:text-white' : 'text-slate-400 group-hover:text-[#133378]',
      )}>
        {icon}
      </div>
      <span className={cn(
        'text-sm font-semibold',
        primary ? 'text-white' : 'text-[#0F172A] group-hover:text-[#133378]',
      )}>
        {label}
      </span>
    </Link>
  )
}
