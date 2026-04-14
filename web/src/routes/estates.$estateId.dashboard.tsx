/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth'
import { useEstate, useEstateAssets, useEstateHeirs, useEstateDocuments } from '../lib/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/estates/$estateId/dashboard')({
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

// ─── Shepherd Chat Types ────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'shepherd'
  content: string
  suggestedActions?: string[]
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Seed the initial insight message when the panel first opens
  useEffect(() => {
    if (open && messages.length === 0 && initialInsight) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'shepherd',
          content: initialInsight,
          suggestedActions: [
            'What should I do next?',
            'Explain my score',
            'Who needs to be notified?',
          ],
        },
      ])
    }
  }, [open, messages.length, initialInsight])

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
      } catch (err) {
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
              {/* Shepherd compass icon */}
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
              {/* Suggestion chips */}
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
      {/* Compass/shepherd icon */}
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
      </svg>
    </button>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function DashboardIndex() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/dashboard' })
  const { user, profile } = useAuth()
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])
  const userName = profile?.firstName || profile?.displayName || ''

  const { data: _estate, loading: metaLoading } = useEstate(estateId)
  const { data: assets, loading: assetsLoading } = useEstateAssets(estateId)
  const { data: heirs, loading: beneLoading } = useEstateHeirs(estateId)
  const { data: documents, loading: vaultLoading } = useEstateDocuments(estateId)

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

  const isLoading = metaLoading || assetsLoading || beneLoading || vaultLoading

  const percent = score?.completionPercent ?? 0
  const insight = score?.insight ?? 'Loading your estate guidance...'
  const nextAction = score?.nextAction

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-6 md:space-y-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="space-y-3 mb-16">
        <div className="flex items-center gap-3 text-[11px] font-bold text-royal/40 uppercase tracking-[0.2em] mb-4">
          <Separator className="w-10 bg-royal/20" />
          <span>The Shepherd — Estate Guidance</span>
        </div>
        <h1 className="text-[3.5rem] font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] leading-tight tracking-tight">
          Welcome back, {userName || 'there'}.
        </h1>
        <p className="text-[#64748B] text-xl font-medium max-w-3xl leading-relaxed">{insight}</p>
      </div>

      {/* ── Primary Action Card ── */}
      <Card className="rounded-[3rem] p-16 flex-row items-center justify-between border-slate-100 shadow-sm relative overflow-hidden group bg-[#F8FAFC] ring-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-royal/[0.015] rounded-bl-full pointer-events-none" />
        <CardContent className="flex-1 space-y-10 relative z-10 px-0">
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em]">Estate Completion</div>
            <div className="flex items-end gap-5">
              <span className="text-8xl font-black text-[#0F172A] tracking-tighter leading-none tabular-nums">
                {scoreLoading ? '—' : `${percent}%`}
              </span>
              <span className="text-slate-400 font-semibold text-2xl pb-2">
                {score ? `${score.completedSteps} of ${score.totalSteps} steps` : 'calculating...'}
              </span>
            </div>
          </div>
          <Progress
            value={percent}
            className="w-full max-w-xl h-2 bg-slate-200 shadow-inner"
          />
        </CardContent>
        {nextAction && (
          <Button asChild size="lg" className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-14 py-6 rounded-2xl font-bold text-[15px] h-auto shadow-[0_20px_50px_rgba(19,51,120,0.15)] hover:shadow-[0_25px_60px_rgba(19,51,120,0.25)] hover:-translate-y-1 active:scale-95 z-10">
            <Link to={`/estates/${routeId}/${nextAction.route}`}>
              {nextAction.label} →
            </Link>
          </Button>
        )}
      </Card>

      {/* ── Stat Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8 lg:gap-12">
        <MiniStat label="Total Assets" value={assets.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} />
        <MiniStat label="Stored Documents" value={documents.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>} />
        <MiniStat label="Beneficiaries" value={heirs.length.toString()} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} />
        <MiniStat label="Completion" value={scoreLoading ? '—' : `${percent}%`} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-6 md:gap-10 lg:gap-16 py-12">
        {/* ── Shepherd Checklist ── */}
        <Card className="rounded-[3rem] p-16 border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)] ring-0 bg-white">
          <CardContent className="space-y-12 px-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">Estate Checklist</h3>
              <Badge variant="secondary" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100 h-auto">
                {score ? `${score.completedSteps}/${score.totalSteps}` : '...'} Complete
              </Badge>
            </div>
            {Object.entries(categories).length > 0 ? (
              <div className="space-y-10">
                {Object.entries(categories).map(([category, catSteps]) => (
                  <div key={category}>
                    <div className="text-[10px] font-bold text-[#133378]/30 uppercase tracking-[0.3em] mb-4">{category}</div>
                    <div className="space-y-3">
                      {catSteps.map((step) => (
                        <Link
                          key={step.id}
                          to={`/estates/${routeId}/${step.route}`}
                          className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all no-underline group/step ${
                            step.complete
                              ? 'bg-[#059669]/5 border border-[#059669]/10'
                              : 'bg-[#F8FAFC] border border-slate-100 hover:border-[#133378]/20 hover:bg-white'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.complete ? 'bg-[#059669]' : 'border-2 border-slate-200 group-hover/step:border-[#133378]'
                          }`}>
                            {step.complete && (
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[14px] font-bold ${step.complete ? 'text-[#059669]' : 'text-[#0F172A] group-hover/step:text-[#133378]'} transition-colors`}>
                              {step.label}
                            </p>
                            <p className="text-[12px] text-[#64748B] truncate">{step.description}</p>
                          </div>
                          {!step.complete && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300 group-hover/step:text-[#133378] transition-colors" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-12">
                <ChecklistItem label="Loading..." percent={0} status="Calculating" color="bg-slate-200" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Quick Actions + Support ── */}
        <div className="space-y-12">
          <Card className="rounded-[3rem] p-12 border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)] ring-0 bg-white">
            <CardContent className="px-0">
              <h3 className="text-xl font-bold text-[#0F172A] mb-10 tracking-tight">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                <ActionBtn label="Add Asset" route={`/estates/${routeId}/assets`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12H3m9-9v18" /></svg>} />
                <ActionBtn label="Upload Doc" route={`/estates/${routeId}/vault`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
                <ActionBtn label="Add Heir" route={`/estates/${routeId}/beneficiaries`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>} />
                <ActionBtn label="Memory" route={`/estates/${routeId}/memoirs`} icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[3rem] p-12 border-0 ring-0 bg-[#133378] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[4rem] group-hover:bg-white/10 transition-colors" />
            <CardContent className="relative z-10 px-0">
              <h4 className="text-xl font-bold mb-4 font-[family-name:var(--font-cinzel)] uppercase tracking-widest">Need Support?</h4>
              <p className="text-white/70 text-sm mb-8 leading-relaxed font-medium">Your dedicated Concierge is available 24/7 to help you navigate your estate plan.</p>
              <Button
                variant="outline"
                size="lg"
                onClick={openShepherd}
                className="w-full py-4 h-auto bg-white text-[#133378] border-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#C8A951] hover:text-white hover:border-[#C8A951] transition-all active:scale-[0.98]"
              >
                Contact Concierge
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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

interface MiniStatProps {
  label: string
  value: string
  icon: React.ReactNode
}

function MiniStat({ label, value, icon }: MiniStatProps) {
  return (
    <Card className="p-10 rounded-[2.5rem] border-slate-100 shadow-[0_2px_30px_rgba(15,23,42,0.01)] ring-0 bg-white hover:border-[#133378]/20 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1">
      <CardContent className="flex flex-col gap-8 px-0">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-[#133378] group-hover/card:text-white transition-all duration-500 shadow-sm border border-slate-100">
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</div>
          <div className="text-4xl font-bold text-[#0F172A] tracking-tighter tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ChecklistItemProps {
  label: string
  percent: number
  status: string
  color: string
}

function ChecklistItem({ label, percent, status, color }: ChecklistItemProps) {
  return (
    <div className="space-y-5 group/item">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-bold text-[#0F172A] text-xl tracking-tight group-hover/item:text-[#133378] transition-colors">{label}</h4>
          <p className="text-slate-400 text-[13px] font-semibold tracking-wide mt-1">{status}</p>
        </div>
        <span className="font-bold text-slate-600 text-lg tabular-nums">{percent}%</span>
      </div>
      <Progress
        value={percent}
        className={`w-full h-2 bg-slate-50 border border-slate-100 p-0.5 shadow-inner [&>[data-slot=progress-indicator]]:${color} [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-[1500ms] [&>[data-slot=progress-indicator]]:ease-out [&>[data-slot=progress-indicator]]:shadow-sm`}
      />
    </div>
  )
}

interface ActionBtnProps {
  label: string
  icon: React.ReactNode
  route: string
}

function ActionBtn({ label, icon, route }: ActionBtnProps) {
  return (
    <Card className="rounded-3xl border-slate-100 bg-slate-50 ring-0 hover:bg-white hover:border-[#133378]/20 hover:shadow-[0_20px_60px_rgba(19,51,120,0.06)] transition-all active:scale-[0.98] p-0">
      <CardContent className="px-0 py-0">
        <Link
          to={route}
          className="flex flex-col items-center justify-center gap-6 p-10 no-underline group"
        >
          <div className="text-slate-300 group-hover:text-[#133378] transition-all duration-500 scale-110 group-hover:scale-125">
            {icon}
          </div>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#0F172A] uppercase tracking-[0.2em] mt-2">{label}</span>
        </Link>
      </CardContent>
    </Card>
  )
}
