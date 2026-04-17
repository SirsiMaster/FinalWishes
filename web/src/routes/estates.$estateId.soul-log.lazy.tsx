/* eslint-disable react-refresh/only-export-components */
/**
 * Soul Log — The Heartbeat of FinalWishes
 *
 * A personal diary: video, audio, or written reflections.
 * Not a social media post — a private conversation with yourself
 * and the people who matter to you.
 *
 * @version 1.0.0
 */
import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useCollection, type Heir } from '../lib/firestore'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'
import { useTierGating } from '../lib/tier-gating'
import { collection, addDoc, serverTimestamp, orderBy, type Timestamp, doc, setDoc } from 'firebase/firestore'
import { db, auth as firebaseAuth } from '../lib/firebase'
import { toast } from 'sonner'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Video,
  Mic,
  PenLine,
  Lock,
  Users,
  Mail,
  Play,
  Pause,
  Square,
  Circle,
  Bold,
  Italic,
  List,
  Heading2,
  Undo2,
  Redo2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  X,
  Search,
  FileText,
  Loader2,
} from 'lucide-react'
import { getDailySoulLogPrompt } from '../lib/shepherd-prompts'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { ShepherdNudge, useShepherdNudge } from '@/components/estate/ShepherdNudge'

export const Route = createLazyFileRoute('/estates/$estateId/soul-log')({
  component: SoulLogPage,
})

// ─── Types ───────────────────────────────────────────────────────────────────

type EntryType = 'video' | 'audio' | 'text'
type Visibility = 'private' | 'shared' | 'sealed'

interface SoulLogEntry {
  id: string
  title: string
  type: EntryType
  visibility: Visibility
  mood?: string
  content?: string // HTML for text entries
  mediaUrl?: string // Cloud Storage URL for video/audio
  storageKey?: string // Cloud Storage path (for transcription)
  taggedPeople: string[]
  sealedDelivery?: {
    trigger: 'date' | 'on_passing'
    date?: string
  }
  duration?: number // seconds, for audio/video
  transcript?: string // Auto-transcribed text from audio/video
  transcriptStatus?: 'processing' | 'complete' | 'failed' // Transcription state
  createdAt: Timestamp
  createdBy: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ─── Constants ───────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: '\u{1F60A}', label: 'Happy' },
  { emoji: '\u{1F914}', label: 'Reflective' },
  { emoji: '\u2764\uFE0F', label: 'Grateful' },
  { emoji: '\u{1F622}', label: 'Emotional' },
  { emoji: '\u{1F4AA}', label: 'Determined' },
  { emoji: '\u{1F305}', label: 'Hopeful' },
  { emoji: '\u{1F64F}', label: 'Thankful' },
  { emoji: '\u{1F60C}', label: 'Peaceful' },
]

// Soul Log prompts are now served by the shepherd-prompts engine (date-seeded, 20-prompt pool)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return ''
  const d = ts.toDate()
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return ''
  const d = ts.toDate()
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function generateTitle(): string {
  const now = new Date()
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const hour = now.getHours()
  const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  return `${date} — ${period}`
}

function getVisibilityConfig(v: Visibility) {
  switch (v) {
    case 'private':
      return { icon: Lock, label: 'Private', color: 'bg-slate-100 text-slate-600 border-slate-200' }
    case 'shared':
      return { icon: Users, label: 'Shared', color: 'bg-blue-50 text-blue-600 border-blue-200' }
    case 'sealed':
      return { icon: Mail, label: 'Sealed', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
}

function getTypeConfig(t: EntryType) {
  switch (t) {
    case 'video':
      return { icon: Video, label: 'Video', color: 'text-[#133378]', bg: 'bg-[#133378]/8' }
    case 'audio':
      return { icon: Mic, label: 'Audio', color: 'text-[#7C3AED]', bg: 'bg-[#7C3AED]/8' }
    case 'text':
      return { icon: PenLine, label: 'Written', color: 'text-[#C8A951]', bg: 'bg-[#C8A951]/8' }
  }
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/** Fire-and-forget transcription request to the Go API. */
async function requestTranscription(
  estateId: string,
  entryId: string,
  storageUri: string,
  mimeType: string,
) {
  try {
    const token = await firebaseAuth.currentUser?.getIdToken()
    if (!token) return
    const resp = await fetch(`${API_BASE}/api/v1/transcription/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ estateId, entryId, storageUri, mimeType }),
    })
    if (!resp.ok) {
      console.warn('Transcription request failed:', resp.status)
    }
  } catch (err) {
    // Background request — don't block the UI
    console.warn('Transcription request error:', err)
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

function SoulLogPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/soul-log' })
  const { user, profile } = useAuth()
  const estateId = routeId
  const { usage: tierUsage } = useTierGating(estateId)

  // Firestore real-time feed
  const constraints = useMemo(() => [orderBy('createdAt', 'desc')], [])
  const { data: rawEntries, loading } = useCollection<SoulLogEntry>(
    `estates/${estateId}/soul-log`,
    constraints,
  )

  // Beneficiaries for tagging
  const { data: heirs } = useCollection<Heir>(
    `estates/${estateId}/heirs`,
  )

  const [composerOpen, setComposerOpen] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [viewerEntry, setViewerEntry] = useState<SoulLogEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Shepherd prompt — date-seeded daily rotation from 20-prompt pool
  const dailyPrompt = useMemo(() => getDailySoulLogPrompt(), [])

  // Shepherd inline nudges
  const lastEntryDate = useMemo(() => {
    if (rawEntries.length === 0) return null
    const first = rawEntries[0]
    if (first?.createdAt && typeof first.createdAt.toDate === 'function') {
      return first.createdAt.toDate()
    }
    return null
  }, [rawEntries])

  const daysSinceLastEntry = useMemo(() => {
    if (!lastEntryDate) return Infinity
    return Math.floor((Date.now() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24))
  }, [lastEntryDate])

  const noEntriesNudge = useShepherdNudge(
    estateId,
    'soul-log-no-entries',
    !loading && rawEntries.length === 0,
  )
  const staleNudge = useShepherdNudge(
    estateId,
    'soul-log-stale',
    !loading && rawEntries.length > 0 && daysSinceLastEntry > 7,
  )

  const userRole = profile?.role || 'principal'
  const isOwner = userRole === 'principal' || userRole === 'admin'

  // Normalize entries and apply visibility filtering
  const entries = useMemo(() => {
    const normalized = rawEntries.map((e) => ({
      ...e,
      taggedPeople: e.taggedPeople || [],
    }))

    // Owner/admin sees everything
    if (isOwner) return normalized

    // Other roles: see entries they created OR shared entries where they are tagged
    const userName = profile?.displayName || user?.displayName || ''
    return normalized.filter((entry) => {
      // Always see your own entries
      if (entry.createdBy === user?.uid) return true
      // See shared entries where you are tagged
      if (entry.visibility === 'shared' && entry.taggedPeople.includes(userName)) return true
      return false
    })
  }, [rawEntries, isOwner, profile?.displayName, user?.displayName, user?.uid])

  // Search filtering (client-side across title, content, transcript)
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((entry) => {
      if (entry.title?.toLowerCase().includes(q)) return true
      if (entry.content && stripHtml(entry.content).toLowerCase().includes(q)) return true
      if (entry.transcript?.toLowerCase().includes(q)) return true
      return false
    })
  }, [entries, searchQuery])

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-[#FBF9F6] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-12 space-y-8 bg-white min-h-screen">
      <SectionHeader
        section="soul-log"
        subtitle="Your personal diary — thoughts, feelings, and experiences captured in the moment."
        action={
          entries.length > 0 ? (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/30" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries, transcripts..."
                className="pl-9 rounded-full border-[#B8860B]/15 text-sm bg-white/80"
              />
            </div>
          ) : undefined
        }
      />

      {/* Shepherd Inline Nudges */}
      {noEntriesNudge.visible && (
        <ShepherdNudge
          message="Your voice is your most precious gift. Record a thought — even 30 seconds makes a difference."
          ctaLabel="Record now"
          onDismiss={noEntriesNudge.dismiss}
        />
      )}
      {staleNudge.visible && (
        <ShepherdNudge
          message="It's been a while since your last reflection. What's on your mind today?"
          ctaLabel="Record a thought"
          onDismiss={staleNudge.dismiss}
        />
      )}

      {/* Shepherd Card */}
      <ShepherdCard
        hasEntries={entries.length > 0}
        prompt={dailyPrompt}
        onRecord={() => setComposerOpen(true)}
      />

      {/* Record Button — central and inviting */}
      <div className="flex justify-center">
        <Button
          onClick={() => setComposerOpen(true)}
          className="h-16 px-10 rounded-full bg-[#133378] hover:bg-[#0F2860] text-white text-base font-semibold shadow-lg shadow-[#133378]/20 hover:shadow-xl hover:shadow-[#133378]/30 transition-all duration-300 gap-3"
        >
          <Circle className="w-5 h-5 fill-red-400 text-red-400 animate-pulse" />
          New Entry
        </Button>
      </div>

      {/* Feed */}
      {entries.length === 0 ? (
        <EmptyState onRecord={() => setComposerOpen(true)} />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-[#0F172A]/20 mx-auto mb-3" />
          <p className="text-sm text-[#0F172A]/40">No entries match your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedEntry === entry.id}
              onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              onViewVideo={() => setViewerEntry(entry)}
            />
          ))}
        </div>
      )}

      {/* Composer Dialog */}
      <ComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        estateId={estateId}
        userId={user?.uid || ''}
        tierUsage={tierUsage}
        heirs={heirs}
      />

      {/* Video Viewer Dialog */}
      <VideoViewer
        entry={viewerEntry}
        open={!!viewerEntry}
        onOpenChange={(open) => { if (!open) setViewerEntry(null) }}
      />
    </div>
  )
}

// ─── Shepherd Card ───────────────────────────────────────────────────────────

function ShepherdCard({
  hasEntries,
  prompt,
  onRecord,
}: {
  hasEntries: boolean
  prompt: string
  onRecord: () => void
}) {
  return (
    <Card className="rounded-3xl border-[#C8A951]/20 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7]/50 shadow-sm overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#C8A951]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-[#C8A951]" />
          </div>
          <div className="flex-1 space-y-2">
            {!hasEntries ? (
              <>
                <p className="text-[#0F172A] text-sm leading-relaxed font-medium">
                  What&apos;s on your mind today?
                </p>
                <p className="text-[#0F172A]/60 text-sm leading-relaxed">
                  You can record a video, leave a voice memo, or write a reflection.
                  Everything you capture here becomes part of your legacy.
                </p>
              </>
            ) : (
              <>
                <p className="text-[#0F172A]/50 text-xs font-semibold uppercase tracking-wider mb-1">
                  Today&apos;s prompt
                </p>
                <p className="text-[#0F172A] text-sm leading-relaxed italic">
                  &ldquo;{prompt}&rdquo;
                </p>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRecord}
              className="text-[#C8A951] hover:text-[#B8952F] hover:bg-[#C8A951]/10 mt-1 -ml-3 font-semibold text-xs"
            >
              Start recording
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onRecord }: { onRecord: () => void }) {
  return (
    <div className="text-center py-16 space-y-6">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#133378]/5 flex items-center justify-center">
          <Video className="w-6 h-6 text-[#133378]/40" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-[#133378]/10 flex items-center justify-center ring-2 ring-[#C8A951]/30">
          <Mic className="w-7 h-7 text-[#133378]/60" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#133378]/5 flex items-center justify-center">
          <PenLine className="w-6 h-6 text-[#133378]/40" />
        </div>
      </div>
      <div className="space-y-2 max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-[#0F172A]">Your story starts here</h3>
        <p className="text-sm text-[#0F172A]/50 leading-relaxed">
          Record a thought, share a memory, or write a reflection. Everything you capture
          becomes part of your legacy.
        </p>
      </div>
      <Button
        onClick={onRecord}
        variant="outline"
        className="rounded-full px-6 border-[#133378]/20 text-[#133378] hover:bg-[#133378]/5"
      >
        Create your first entry
      </Button>
    </div>
  )
}

// ─── Entry Card ──────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  expanded,
  onToggle,
  onViewVideo,
}: {
  entry: SoulLogEntry
  expanded: boolean
  onToggle: () => void
  onViewVideo: () => void
}) {
  const typeConfig = getTypeConfig(entry.type)
  const visConfig = getVisibilityConfig(entry.visibility)
  const TypeIcon = typeConfig.icon
  const VisIcon = visConfig.icon

  return (
    <Card className="rounded-3xl border-[#133378]/5 bg-[#FFFDF8] hover:border-[#133378]/10 hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Video Thumbnail */}
        {entry.type === 'video' && entry.mediaUrl && (
          <div
            className="aspect-video bg-[#0F172A] relative overflow-hidden cursor-pointer group"
            onClick={onViewVideo}
          >
            <video
              src={`${entry.mediaUrl}#t=0.001`}
              className="w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700"
              muted
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#133378] transition-all duration-500">
                <Play className="w-7 h-7 fill-current ml-1" />
              </div>
            </div>
            {entry.duration != null && entry.duration > 0 && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-mono px-2 py-1 rounded-lg">
                {formatDuration(entry.duration)}
              </div>
            )}
          </div>
        )}

        {/* Card Body */}
        <div className="p-5 md:p-6 space-y-3 cursor-pointer" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onToggle() }}>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#0F172A] truncate">
                  {entry.title || 'Untitled Entry'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#0F172A]/40 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{formatTimestamp(entry.createdAt)}</span>
                  <span className="text-[#0F172A]/20">|</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(entry.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {entry.mood && (
                <span className="text-lg">{entry.mood}</span>
              )}
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${visConfig.color}`}>
                <VisIcon className="w-3 h-3 mr-1" />
                {visConfig.label}
              </Badge>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#0F172A]/30" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#0F172A]/30" />
              )}
            </div>
          </div>

          {/* Visibility detail badges */}
          {entry.visibility === 'shared' && entry.taggedPeople.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-500">
                {entry.taggedPeople.join(', ')}
              </span>
            </div>
          )}
          {entry.visibility === 'sealed' && entry.sealedDelivery && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-600 italic">
                {entry.sealedDelivery.trigger === 'date' && entry.sealedDelivery.date
                  ? `Delivers on ${new Date(entry.sealedDelivery.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                  : 'Delivers upon passing'}
              </span>
            </div>
          )}

          {/* Transcription badge */}
          {(entry.type === 'audio' || entry.type === 'video') && entry.transcriptStatus === 'processing' && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 text-[#7C3AED] animate-spin" />
              <span className="text-[10px] text-[#7C3AED] italic">Transcribing...</span>
            </div>
          )}

          {/* Preview */}
          {!expanded && entry.type === 'text' && entry.content && (
            <p className="text-sm text-[#0F172A]/50 line-clamp-2 leading-relaxed">
              {stripHtml(entry.content).slice(0, 120)}
              {stripHtml(entry.content).length > 120 ? '...' : ''}
            </p>
          )}

          {!expanded && entry.type === 'audio' && (
            <div className="flex items-center gap-3 text-sm text-[#0F172A]/40">
              <Mic className="w-4 h-4" />
              <span>Voice memo</span>
              {entry.duration != null && entry.duration > 0 && (
                <span className="font-mono text-xs">{formatDuration(entry.duration)}</span>
              )}
            </div>
          )}

          {/* Transcript preview (when not expanded) */}
          {!expanded && entry.transcript && entry.transcriptStatus === 'complete' && (
            <div className="flex items-start gap-2 mt-1">
              <FileText className="w-3.5 h-3.5 text-[#0F172A]/25 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#0F172A]/40 line-clamp-2 leading-relaxed italic">
                {entry.transcript.slice(0, 150)}
                {entry.transcript.length > 150 ? '...' : ''}
              </p>
            </div>
          )}

          {/* Expanded Content */}
          {expanded && (
            <ExpandedContent entry={entry} onViewVideo={onViewVideo} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Expanded Content (separated to avoid dangerouslySetInnerHTML in main card) ─

function ExpandedContent({
  entry,
  onViewVideo,
}: {
  entry: SoulLogEntry
  onViewVideo: () => void
}) {
  // For text entries, render via a read-only TipTap editor for safety
  const textEditor = useEditor({
    extensions: [StarterKit],
    content: entry.type === 'text' ? (entry.content || '') : '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-[#0F172A]/70 leading-relaxed focus:outline-none',
      },
    },
  })

  return (
    <div className="pt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
      {entry.type === 'text' && entry.content && (
        <div className="rounded-2xl bg-white p-4 border border-slate-50">
          <EditorContent editor={textEditor} />
        </div>
      )}

      {entry.type === 'audio' && entry.mediaUrl && (
        <AudioPlayer url={entry.mediaUrl} />
      )}

      {entry.type === 'video' && entry.mediaUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onViewVideo() }}
          className="rounded-xl border-[#133378]/10 text-[#133378] text-xs"
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Watch video
        </Button>
      )}

      {entry.taggedPeople.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-3.5 h-3.5 text-[#0F172A]/30" />
          {entry.taggedPeople.map((person, i) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-blue-50/50 border-blue-100 text-blue-600">
              {person}
            </Badge>
          ))}
        </div>
      )}

      {/* Transcript (full, in expanded view) */}
      {entry.transcript && entry.transcriptStatus === 'complete' && (
        <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0F172A]/40 uppercase tracking-wider">
            <FileText className="w-3 h-3" />
            Transcript
          </div>
          <p className="text-sm text-[#0F172A]/60 leading-relaxed whitespace-pre-wrap">
            {entry.transcript}
          </p>
        </div>
      )}
      {entry.transcriptStatus === 'processing' && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10">
          <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
          <span className="text-sm text-[#7C3AED]/70 italic">Transcribing audio...</span>
        </div>
      )}
      {entry.transcriptStatus === 'failed' && (
        <TranscriptionRetry entry={entry} />
      )}
    </div>
  )
}

// ─── Transcription Retry ────────────────────────────────────────────────────

function TranscriptionRetry({ entry }: { entry: SoulLogEntry }) {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/soul-log' })
  const [retrying, setRetrying] = useState(false)

  const handleRetry = useCallback(async () => {
    if (!entry.mediaUrl || !entry.storageKey) return
    setRetrying(true)
    const mimeType = entry.type === 'video' ? 'video/webm' : 'audio/webm'
    await requestTranscription(routeId, entry.id, entry.storageKey, mimeType)
    // Mark as processing in Firestore
    try {
      const entryRef = doc(db, `estates/${routeId}/soul-log/${entry.id}`)
      await setDoc(entryRef, { transcriptStatus: 'processing' }, { merge: true })
      toast.success('Retrying transcription...')
    } catch {
      toast.error('Failed to retry transcription')
    }
    setRetrying(false)
  }, [entry, routeId])

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-red-50 border border-red-100">
      <span className="text-sm text-red-400 italic">Transcription failed</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); handleRetry() }}
        disabled={retrying}
        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg gap-1.5 h-7 px-3"
      >
        {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        Retry
      </Button>
    </div>
  )
}

// ─── Audio Player ────────────────────────────────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  const setupAnalyser = useCallback(() => {
    if (!audioRef.current || sourceRef.current) return
    try {
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaElementSource(audioRef.current)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
      analyserRef.current = analyser
      sourceRef.current = source
      ctxRef.current = audioCtx
    } catch {
      // Analyser setup can fail in some browsers — audio still plays
    }
  }, [])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 1.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)')
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.8)')
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
        x += barWidth + 1
      }
    }
    draw()
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      cancelAnimationFrame(animFrameRef.current)
    } else {
      setupAnalyser()
      if (ctxRef.current?.state === 'suspended') {
        ctxRef.current.resume()
      }
      audio.play()
      drawWaveform()
    }
    setPlaying(!playing)
  }, [playing, setupAnalyser, drawWaveform])

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime) }}
        onEnded={() => { setPlaying(false); cancelAnimationFrame(animFrameRef.current) }}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="w-10 h-10 rounded-xl bg-[#133378] text-white hover:bg-[#1E3A5F] hover:text-white flex-shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </Button>
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="flex-1 h-10 rounded-lg"
      />
      <span className="text-xs font-mono text-[#7C3AED]/60 flex-shrink-0 tabular-nums">
        {formatDuration(currentTime)} / {formatDuration(duration || 0)}
      </span>
    </div>
  )
}

// ─── Video Viewer Dialog ─────────────────────────────────────────────────────

function VideoViewer({
  entry,
  open,
  onOpenChange,
}: {
  entry: SoulLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[1000px] sm:max-w-[1000px] rounded-[3rem] overflow-hidden p-0 border-white/10 bg-white"
      >
        {entry && (
          <>
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                src={entry.mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-2">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-[#0F172A]">
                  {entry.title || 'Untitled Entry'}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#0F172A]/50">
                  {formatTimestamp(entry.createdAt)} at {formatTime(entry.createdAt)}
                </DialogDescription>
              </DialogHeader>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Composer Dialog ─────────────────────────────────────────────────────────

function ComposerDialog({
  open,
  onOpenChange,
  estateId,
  userId,
  tierUsage,
  heirs,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  estateId: string
  userId: string
  tierUsage: ReturnType<typeof useTierGating>['usage']
  heirs: Heir[]
}) {
  const [entryType, setEntryType] = useState<EntryType>('text')
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [mood, setMood] = useState<string>('')
  const [taggedPeople, setTaggedPeople] = useState<string[]>([])
  const [sealedTrigger, setSealedTrigger] = useState<'date' | 'on_passing'>('on_passing')
  const [sealedDate, setSealedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStep, setSaveStep] = useState<'idle' | 'uploading' | 'saving' | 'transcribing' | 'done'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)

  // Recording state
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string>('')
  const [recordDuration, setRecordDuration] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Text editor content
  const [textContent, setTextContent] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  // Reset state when closing or switching tabs
  const resetRecordingState = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setRecordedBlob(null)
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl('')
    setRecordDuration(0)
    setPermissionDenied(false)
  }, [recordedUrl])

  // Cleanup on unmount / close
  useEffect(() => {
    if (!open) {
      resetRecordingState()
      setTitle('')
      setVisibility('private')
      setMood('')
      setTaggedPeople([])
      setTextContent('')
      setSealedTrigger('on_passing')
      setSealedDate('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Start recording
  const startRecording = useCallback(async () => {
    resetRecordingState()
    try {
      const mediaConstraints = entryType === 'video'
        ? { video: true, audio: true }
        : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      streamRef.current = stream

      // Show preview for video
      if (entryType === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play()
      }

      const mimeType = entryType === 'video' ? 'video/webm' : 'audio/webm'
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        // Stop stream tracks
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start(1000) // Collect data every second
      setRecording(true)
      setRecordDuration(0)

      // Timer
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 200)

      setPermissionDenied(false)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setPermissionDenied(true)
      toast.error('Could not access your camera or microphone. Please check your browser permissions.')
    }
  }, [entryType, resetRecordingState])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }, [])

  // Save entry
  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveStep('idle')
    setUploadProgress(0)

    try {
      let mediaUrl = ''

      // Upload media if needed
      if ((entryType === 'video' || entryType === 'audio') && recordedBlob) {
        if (tierUsage && !tierUsage.canUploadMedia) {
          toast.error('You have reached your media upload limit. Upgrade your plan to continue.')
          setSaving(false)
          setSaveStep('idle')
          return
        }

        setSaveStep('uploading')

        const fileName = `soul-log-${Date.now()}.webm`
        const contentType = entryType === 'video' ? 'video/webm' : 'audio/webm'

        const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
          estateId,
          fileName,
          contentType,
        })

        if (uploadUrl) {
          // XHR upload with progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', uploadUrl)
            xhr.setRequestHeader('Content-Type', contentType)
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100))
              }
            }
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve()
              else reject(new Error(`Upload failed: ${xhr.status}`))
            }
            xhr.onerror = () => reject(new Error('Upload network error'))
            xhr.send(recordedBlob)
          })
        }

        mediaUrl = finalUrl || ''
      }

      setSaveStep('saving')

      // Build the document
      const entryDoc: Record<string, unknown> = {
        title: title || generateTitle(),
        type: entryType,
        visibility,
        mood: mood || null,
        taggedPeople,
        createdBy: userId,
        createdAt: serverTimestamp(),
        duration: recordDuration || null,
      }

      if (entryType === 'text') {
        entryDoc.content = textContent
      } else {
        entryDoc.mediaUrl = mediaUrl
      }

      if (visibility === 'sealed') {
        entryDoc.sealedDelivery = {
          trigger: sealedTrigger,
          ...(sealedTrigger === 'date' && sealedDate ? { date: sealedDate } : {}),
        }
      }

      // Store the storage key for transcription
      if (mediaUrl) {
        entryDoc.storageKey = mediaUrl
      }

      const entryRef = await addDoc(collection(db, `estates/${estateId}/soul-log`), entryDoc)

      // If sealed, also write a capsule document for the Guardian Protocol delivery system
      if (visibility === 'sealed') {
        const capsuleDoc: Record<string, unknown> = {
          type: 'soul-log',
          sourceEntryId: entryRef.id,
          estateId,
          title: entryDoc.title,
          visibility: 'sealed',
          taggedPeople,
          sealedDelivery: entryDoc.sealedDelivery || { trigger: 'on_passing' },
          status: 'pending',
          createdBy: userId,
          createdAt: serverTimestamp(),
        }
        await setDoc(
          doc(db, `estates/${estateId}/capsules`, `soul-log-${entryRef.id}`),
          capsuleDoc,
        )
      }

      // Fire background transcription for audio/video entries
      if ((entryType === 'video' || entryType === 'audio') && mediaUrl) {
        setSaveStep('transcribing')
        requestTranscription(estateId, entryRef.id, mediaUrl, entryType === 'video' ? 'video/webm' : 'audio/webm')
      }

      setSaveStep('done')
      toast.success('Entry saved to your Soul Log')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save soul log entry:', err)
      toast.error('Failed to save entry. Please try again.')
    } finally {
      setSaving(false)
      setSaveStep('idle')
      setUploadProgress(0)
    }
  }, [
    saving, entryType, recordedBlob, tierUsage, estateId, title,
    visibility, mood, taggedPeople, userId, recordDuration, textContent,
    sealedTrigger, sealedDate, onOpenChange,
  ])

  const canSave =
    entryType === 'text' ? textContent.length > 0 :
    recordedBlob !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-[#133378]/10 bg-white max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#133378] font-[family-name:var(--font-cinzel)] uppercase tracking-wide">
              New Soul Log Entry
            </DialogTitle>
            <DialogDescription className="text-sm text-[#0F172A]/50">
              Record a thought, share a memory, or write a reflection.
            </DialogDescription>
          </DialogHeader>

          {/* Entry Type Tabs */}
          <Tabs
            value={entryType}
            onValueChange={(v) => {
              resetRecordingState()
              setEntryType(v as EntryType)
            }}
          >
            <TabsList className="w-full rounded-2xl bg-[#F8FAFC] p-1 h-auto">
              <TabsTrigger value="video" className="flex-1 rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Video className="w-4 h-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex-1 rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Mic className="w-4 h-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1 rounded-xl py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <PenLine className="w-4 h-4" />
                Written
              </TabsTrigger>
            </TabsList>

            {/* Video Recording */}
            <TabsContent value="video" className="mt-4 space-y-4">
              <VideoRecorder
                recording={recording}
                recordedUrl={recordedUrl}
                recordDuration={recordDuration}
                permissionDenied={permissionDenied}
                videoPreviewRef={videoPreviewRef}
                onStart={startRecording}
                onStop={stopRecording}
                onRetake={() => {
                  resetRecordingState()
                }}
              />
            </TabsContent>

            {/* Audio Recording */}
            <TabsContent value="audio" className="mt-4 space-y-4">
              <AudioRecorder
                recording={recording}
                recordedUrl={recordedUrl}
                recordDuration={recordDuration}
                permissionDenied={permissionDenied}
                onStart={startRecording}
                onStop={stopRecording}
                onRetake={() => {
                  resetRecordingState()
                }}
              />
            </TabsContent>

            {/* Written Reflection */}
            <TabsContent value="text" className="mt-4 space-y-4">
              <WrittenEditor
                content={textContent}
                onChange={setTextContent}
              />
            </TabsContent>
          </Tabs>

          <Separator className="bg-[#133378]/5" />

          {/* Metadata */}
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
                Title (optional)
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={generateTitle()}
                className="rounded-xl border-[#133378]/10 focus:border-[#133378]/30 text-sm"
              />
            </div>

            {/* Visibility + Mood Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
                  Visibility
                </Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
                  <SelectTrigger className="rounded-xl border-[#133378]/10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" /> Private
                      </span>
                    </SelectItem>
                    <SelectItem value="shared">
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Shared
                      </span>
                    </SelectItem>
                    <SelectItem value="sealed">
                      <span className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Sealed
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
                  Mood
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map(({ emoji, label }) => (
                    <button
                      key={label}
                      onClick={() => setMood(mood === emoji ? '' : emoji)}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        mood === emoji
                          ? 'bg-[#133378]/10 ring-2 ring-[#133378]/30 scale-110'
                          : 'hover:bg-slate-100'
                      }`}
                      title={label}
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sealed Delivery Options */}
            {visibility === 'sealed' && (
              <div className="space-y-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50">
                <Label className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  Deliver this entry...
                </Label>
                <Select value={sealedTrigger} onValueChange={(v) => setSealedTrigger(v as 'date' | 'on_passing')}>
                  <SelectTrigger className="rounded-xl border-amber-200 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="on_passing">On my passing</SelectItem>
                    <SelectItem value="date">On a specific date</SelectItem>
                  </SelectContent>
                </Select>
                {sealedTrigger === 'date' && (
                  <Input
                    type="date"
                    value={sealedDate}
                    onChange={(e) => setSealedDate(e.target.value)}
                    className="rounded-xl border-amber-200 text-sm bg-white"
                  />
                )}
              </div>
            )}

            {/* Tagged People */}
            {(visibility === 'shared' || visibility === 'sealed') && heirs.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
                  Tag People
                </Label>
                <div className="flex flex-wrap gap-2">
                  {heirs.map((heir) => {
                    const tagged = taggedPeople.includes(heir.fullName)
                    return (
                      <button
                        key={heir.id}
                        onClick={() => {
                          setTaggedPeople(
                            tagged
                              ? taggedPeople.filter((n) => n !== heir.fullName)
                              : [...taggedPeople, heir.fullName],
                          )
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          tagged
                            ? 'bg-[#133378] text-white'
                            : 'bg-slate-100 text-[#0F172A]/60 hover:bg-slate-200'
                        }`}
                        type="button"
                      >
                        {heir.fullName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border-[#133378]/10 text-[#0F172A] font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="flex-1 rounded-xl bg-[#133378] hover:bg-[#0F2860] text-white font-semibold gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveStep === 'uploading' ? `Uploading ${uploadProgress}%` :
                   saveStep === 'saving' ? 'Saving entry...' :
                   saveStep === 'transcribing' ? 'Starting transcription...' :
                   'Saving...'}
                </>
              ) : 'Save Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Video Recorder ──────────────────────────────────────────────────────────

function VideoRecorder({
  recording,
  recordedUrl,
  recordDuration,
  permissionDenied,
  videoPreviewRef,
  onStart,
  onStop,
  onRetake,
}: {
  recording: boolean
  recordedUrl: string
  recordDuration: number
  permissionDenied: boolean
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>
  onStart: () => void
  onStop: () => void
  onRetake: () => void
}) {
  if (permissionDenied) {
    return (
      <div className="aspect-video rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
        <div className="text-center p-6 space-y-2">
          <Video className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-[#0F172A]/50">Camera access denied</p>
          <p className="text-xs text-[#0F172A]/30">Check your browser settings and try again.</p>
          <Button variant="outline" size="sm" onClick={onStart} className="rounded-xl mt-2 text-xs">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (recordedUrl) {
    return (
      <div className="space-y-3">
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <video src={recordedUrl} controls className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#0F172A]/40 font-mono">
            Duration: {formatDuration(recordDuration)}
          </span>
          <Button variant="outline" size="sm" onClick={onRetake} className="rounded-xl text-xs border-[#133378]/10">
            Record again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video rounded-2xl overflow-hidden bg-[#0F172A] relative">
        <video
          ref={videoPreviewRef}
          muted
          playsInline
          className={`w-full h-full object-cover ${recording ? 'opacity-100' : 'opacity-0'}`}
        />
        {!recording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Video className="w-10 h-10 text-white/30 mx-auto" />
              <p className="text-white/40 text-sm">Press record to begin</p>
            </div>
          </div>
        )}
        {recording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono">{formatDuration(recordDuration)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        {!recording ? (
          <button
            onClick={onStart}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30"
            type="button"
            aria-label="Start recording"
          >
            <Circle className="w-6 h-6 text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse"
            type="button"
            aria-label="Stop recording"
          >
            <Square className="w-5 h-5 text-white fill-white" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Audio Recorder ──────────────────────────────────────────────────────────

function AudioRecorder({
  recording,
  recordedUrl,
  recordDuration,
  permissionDenied,
  onStart,
  onStop,
  onRetake,
}: {
  recording: boolean
  recordedUrl: string
  recordDuration: number
  permissionDenied: boolean
  onStart: () => void
  onStop: () => void
  onRetake: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Live waveform visualization during recording
  useEffect(() => {
    if (!recording) {
      cancelAnimationFrame(animRef.current)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      return
    }

    let cancelled = false

    const setupViz = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        source.connect(analyser)

        cleanupRef.current = () => {
          stream.getTracks().forEach((t) => t.stop())
          audioCtx.close()
        }

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
          if (cancelled) return
          animRef.current = requestAnimationFrame(draw)
          analyser.getByteFrequencyData(dataArray)

          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const barWidth = (canvas.width / bufferLength) * 1.5
          let x = 0

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.8
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
            gradient.addColorStop(0, 'rgba(124, 58, 237, 0.2)')
            gradient.addColorStop(1, 'rgba(124, 58, 237, 0.7)')
            ctx.fillStyle = gradient
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
            x += barWidth + 1
          }
        }
        draw()
      } catch {
        // Visualization is optional — if mic is already in use, skip
      }
    }

    setupViz()

    return () => {
      cancelled = true
      cancelAnimationFrame(animRef.current)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [recording])

  if (permissionDenied) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Mic className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-[#0F172A]/50">Microphone access denied</p>
          <p className="text-xs text-[#0F172A]/30">Check your browser settings and try again.</p>
          <Button variant="outline" size="sm" onClick={onStart} className="rounded-xl mt-2 text-xs">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (recordedUrl) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10">
          <audio src={recordedUrl} controls className="w-full" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#0F172A]/40 font-mono">
            Duration: {formatDuration(recordDuration)}
          </span>
          <Button variant="outline" size="sm" onClick={onRetake} className="rounded-xl text-xs border-[#133378]/20 text-[#133378]">
            Record again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-24 rounded-2xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 flex items-center justify-center relative overflow-hidden">
        {recording ? (
          <>
            <canvas
              ref={canvasRef}
              width={500}
              height={80}
              className="w-full h-full"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono text-[#0F172A]/70">{formatDuration(recordDuration)}</span>
            </div>
          </>
        ) : (
          <div className="text-center space-y-1">
            <Mic className="w-6 h-6 text-[#7C3AED]/30 mx-auto" />
            <p className="text-xs text-[#7C3AED]/40">Press record to begin</p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        {!recording ? (
          <button
            onClick={onStart}
            className="w-16 h-16 rounded-full bg-[#133378] hover:bg-[#1E3A5F] transition-colors flex items-center justify-center shadow-lg shadow-[#133378]/20 hover:shadow-xl"
            type="button"
            aria-label="Start recording"
          >
            <Circle className="w-6 h-6 text-white fill-white" />
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-16 h-16 rounded-full bg-[#133378] hover:bg-[#1E3A5F] transition-colors flex items-center justify-center shadow-lg shadow-[#133378]/20 animate-pulse"
            type="button"
            aria-label="Stop recording"
          >
            <Square className="w-5 h-5 text-white fill-white" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Written Editor (TipTap) ─────────────────────────────────────────────────

function WrittenEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-5 py-4 focus:outline-none text-[#0F172A]/80 leading-relaxed',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-1 p-2 bg-[#F8FAFC] rounded-xl border border-slate-100">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`w-8 h-8 rounded-lg ${editor.isActive('bold') ? 'bg-[#133378] text-white hover:bg-[#133378]/90 hover:text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`w-8 h-8 rounded-lg ${editor.isActive('italic') ? 'bg-[#133378] text-white hover:bg-[#133378]/90 hover:text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`w-8 h-8 rounded-lg ${editor.isActive('heading', { level: 2 }) ? 'bg-[#133378] text-white hover:bg-[#133378]/90 hover:text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
          >
            <Heading2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`w-8 h-8 rounded-lg ${editor.isActive('bulletList') ? 'bg-[#133378] text-white hover:bg-[#133378]/90 hover:text-white' : 'text-[#64748B] hover:bg-[#E2E8F0]'}`}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-[#E2E8F0]"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-[#E2E8F0]"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
