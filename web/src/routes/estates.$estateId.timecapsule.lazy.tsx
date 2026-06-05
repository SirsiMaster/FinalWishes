/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTimeCapsules, type TimeCapsule } from '../lib/firestore'
import { addTimeCapsule, cancelTimeCapsule, updateTimeCapsule } from '../lib/estate-actions'
import { estateClient } from '../lib/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Clock,
  Heart,
  Calendar,
  Send,
  Plus,
  User,
  Mail,
  FileText,
  AlertCircle,
  Hourglass,
  CheckCircle2,
  XCircle,
  Bold,
  Italic,
  Heading2,
  List,
  Mic,
  Square,
  Play,
  Pause,
  ImagePlus,
  X,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

import { SectionHeader } from '@/components/estate/SectionHeader'

export const Route = createLazyFileRoute('/estates/$estateId/timecapsule')({
  component: TimeCapsulePage,
})

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Safely extract plain text from HTML using DOMParser (no innerHTML assignment). */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

// ─── Delivery Type Config ──────────────────────────────────────────────────

const DELIVERY_TYPES = [
  {
    value: 'scheduled_date' as const,
    label: 'Scheduled Date',
    description: 'Deliver on a specific future date',
    icon: Calendar,
    color: 'var(--royal)',
    previewTemplate: (name: string, date?: string) =>
      `This letter will be delivered to ${name} on ${date}`,
  },
  {
    value: 'on_death' as const,
    label: 'Upon Passing',
    description: 'Deliver when estate reports a death event',
    icon: Heart,
    color: 'var(--gold)',
    previewTemplate: (name: string) =>
      `This letter will be delivered to ${name} when the time comes`,
  },
  {
    value: 'on_settlement' as const,
    label: 'Upon Settlement',
    description: 'Deliver when the estate is fully settled',
    icon: FileText,
    color: 'var(--gold)',
    previewTemplate: (name: string) =>
      `This letter will be delivered to ${name} when the estate enters settlement`,
  },
  {
    value: 'anniversary' as const,
    label: 'Anniversary',
    description: 'Deliver on a recurring date each year (e.g. birthday)',
    icon: Clock,
    color: '#059669',
    previewTemplate: (name: string, date?: string) =>
      `This letter will be delivered to ${name} every year on ${date}`,
  },
] as const

type DeliveryType = (typeof DELIVERY_TYPES)[number]['value']

// ─── Sealed Badge ─────────────────────────────────────────────────────────

function SealedBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg h-auto border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]"
    >
      <div className="w-3 h-3 rounded-full bg-[var(--gold)] flex items-center justify-center">
        <span className="text-[6px] font-black text-white leading-none">FW</span>
      </div>
      Sealed
    </Badge>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TimeCapsule['status'] }) {
  if (status === 'pending') return <SealedBadge />

  const config = {
    pending: { label: 'Pending', className: 'bg-[var(--royal)]/5 text-[var(--royal)] border-[var(--royal)]/10', Icon: Hourglass },
    delivered: { label: 'Delivered', className: 'bg-green-50 text-green-600 border-green-200', Icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', className: 'bg-slate-50 text-slate-400 border-slate-200', Icon: XCircle },
  }
  const c = config[status]

  return (
    <Badge variant="outline" className={`gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg h-auto ${c.className}`}>
      <c.Icon className="w-3 h-3" />
      {c.label}
    </Badge>
  )
}

// ─── Delivery Preview ─────────────────────────────────────────────────────

function DeliveryPreview({ capsule }: { capsule: TimeCapsule }) {
  const cfg = DELIVERY_TYPES.find((d) => d.value === capsule.deliveryType)

  const dateLabel = useMemo(() => {
    if (capsule.deliveryType === 'scheduled_date' && capsule.scheduledDate) {
      const d = capsule.scheduledDate.toDate ? capsule.scheduledDate.toDate() : new Date(capsule.scheduledDate as unknown as string)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (capsule.deliveryType === 'anniversary' && capsule.anniversaryDate) {
      const [mm, dd] = capsule.anniversaryDate.split('-')
      const d = new Date(2000, parseInt(mm, 10) - 1, parseInt(dd, 10))
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    }
    return undefined
  }, [capsule])

  if (!cfg) return null

  const Icon = cfg.icon
  const previewText = cfg.previewTemplate(capsule.recipientName, dateLabel)

  return (
    <div className="flex items-center gap-2.5 text-[12px] text-slate-500 leading-snug">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />
      <span className="italic">{previewText}</span>
    </div>
  )
}

// ─── Voice Memo Playback Card ─────────────────────────────────────────────

function VoiceMemoCard({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }, [playing])

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--gold-dim)] border border-[var(--gold)]/20">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20 hover:text-[var(--gold)]"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>
      <span className="text-[12px] font-medium text-slate-500">Voice message attached</span>
    </div>
  )
}

// ─── Capsule Card ──────────────────────────────────────────────────────────

function CapsuleCard({
  capsule,
  onCancel,
  onEdit,
}: {
  capsule: TimeCapsule
  onCancel: (capsule: TimeCapsule) => void
  onEdit: (capsule: TimeCapsule) => void
}) {
  const isSealed = capsule.status === 'pending'
  const messagePreview = useMemo(() => stripHtml(capsule.message), [capsule.message])

  return (
    <Card
      className="rounded-[2rem] shadow-sm hover:shadow-xl transition-all group py-0"
      style={{
        background: 'var(--gold-dim)',
        borderColor: isSealed ? 'rgba(200, 169, 81, 0.3)' : 'rgba(19, 51, 120, 0.1)',
        borderWidth: '1px',
      }}
    >
      {/* Card Header */}
      <CardHeader className="p-8 pb-0">
        <CardTitle className="text-lg tracking-tight leading-snug">
          <span className="text-[13px] font-medium text-slate-500">For</span>
          <br />
          <span className="font-bold text-slate-900 group-hover:text-[var(--royal)] transition-colors">
            {capsule.recipientName}
          </span>
        </CardTitle>
        <CardAction>
          <StatusBadge status={capsule.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="px-8 space-y-4">
        {/* Title */}
        <p className="text-[15px] font-semibold text-slate-900">{capsule.title}</p>

        {/* Message preview */}
        <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-3">
          {messagePreview}
        </p>

        {/* Voice memo */}
        {capsule.voiceMemoUrl && <VoiceMemoCard url={capsule.voiceMemoUrl} />}

        {/* Photo thumbnails */}
        {capsule.photoUrls && capsule.photoUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {capsule.photoUrls.map((url, i) => (
              <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--gold)]/20">
                <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Delivery Preview */}
        <DeliveryPreview capsule={capsule} />
      </CardContent>

      {/* Card Footer */}
      <CardFooter className="px-8 py-4 border-t border-[var(--gold)]/10 bg-[var(--gold-dim)]/80 flex items-center justify-end gap-2 rounded-b-[2rem]">
        {capsule.status === 'pending' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(capsule)}
              className="text-[11px] font-bold text-[var(--royal)]/60 hover:text-[var(--royal)] uppercase tracking-wider"
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(capsule)}
              className="text-[11px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
            >
              Cancel
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--gold)]/10 flex items-center justify-center mb-6">
          <Send className="w-10 h-10 text-[var(--gold)]/40" />
        </div>
        <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 mb-3 tracking-tight">No letters yet</h3>
        <p className="text-slate-500 font-medium max-w-lg mb-8 leading-relaxed">
          A time capsule is a gift — a message sealed today, delivered when it matters most.
          Who would you like to write to?
        </p>
        <Button
          onClick={onAdd}
          className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-5 rounded-2xl font-bold text-[14px] h-auto shadow-lg gap-3 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Write Your First Letter
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Voice Recorder Panel ──────────────────────────────────────────────────

function VoiceRecorderPanel({
  onRecorded,
  onRemove,
  existingUrl,
}: {
  onRecorded: (blob: Blob) => void
  onRemove: () => void
  existingUrl: string | null
}) {
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string>(existingUrl || '')
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const cleanup = useCallback(() => {
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
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
      if (recordedUrl && !existingUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = useCallback(async () => {
    cleanup()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = 'audio/webm'
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
        const url = URL.createObjectURL(blob)
        setRecordedUrl(url)
        onRecorded(blob)
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start(1000)
      setRecording(true)
      setDuration(0)
      setRecordedBlob(null)
      if (recordedUrl && !existingUrl) URL.revokeObjectURL(recordedUrl)
      setRecordedUrl('')

      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 200)
    } catch {
      toast.error('Could not access your microphone. Please check browser permissions.')
    }
  }, [cleanup, onRecorded, recordedUrl, existingUrl])

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

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }, [playing])

  const handleRemove = useCallback(() => {
    cleanup()
    if (recordedUrl && !existingUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl('')
    setDuration(0)
    onRemove()
  }, [cleanup, recordedUrl, existingUrl, onRemove])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Has a recording (either just recorded or existing)
  if (recordedUrl && !recording) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gold-dim)] border border-[var(--gold)]/20">
        <audio ref={audioRef} src={recordedUrl} onEnded={() => setPlaying(false)} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
          className="w-9 h-9 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20 hover:text-[var(--gold)]"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <span className="text-[13px] font-medium text-slate-500 flex-1">
          Voice message {recordedBlob ? 'recorded' : 'attached'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          className="w-8 h-8 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  // Recording in progress
  if (recording) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/50 border border-red-200/50">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[13px] font-bold text-red-600 tabular-nums">{formatTime(duration)}</span>
        <span className="text-[12px] text-red-400 flex-1">Recording...</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="w-9 h-9 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  // Default: start button
  return (
    <Button
      type="button"
      variant="outline"
      onClick={startRecording}
      className="gap-2 rounded-xl border-[var(--gold)]/20 text-slate-500 hover:border-[var(--gold)]/40 hover:bg-[var(--gold-dim)] h-auto py-3"
    >
      <Mic className="w-4 h-4 text-[var(--gold)]" />
      <span className="text-[13px] font-medium">Attach Voice Memo</span>
    </Button>
  )
}

// ─── Photo Attachments ─────────────────────────────────────────────────────

function PhotoAttachments({
  photos,
  onAdd,
  onRemove,
}: {
  photos: { file: File; previewUrl: string }[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onAdd(Array.from(e.target.files))
      }
      if (inputRef.current) inputRef.current.value = ''
    },
    [onAdd],
  )

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative group/photo w-20 h-20 rounded-xl overflow-hidden border border-[var(--gold)]/20">
              <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="gap-2 rounded-xl border-[var(--gold)]/20 text-slate-500 hover:border-[var(--gold)]/40 hover:bg-[var(--gold-dim)] h-auto py-3"
      >
        <ImagePlus className="w-4 h-4 text-[var(--gold)]" />
        <span className="text-[13px] font-medium">Attach Photo</span>
      </Button>
    </div>
  )
}

// ─── Wax Seal Animation ────────────────────────────────────────────────────

function WaxSealOverlay({
  visible,
  onComplete,
}: {
  visible: boolean
  onComplete: () => void
}) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [visible, onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Seal + text */}
          <div className="relative flex flex-col items-center gap-6">
            {/* Wax seal */}
            <motion.div
              className="relative"
              initial={{ scale: 0, y: -60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.2,
              }}
            >
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold)] flex items-center justify-center shadow-[0_8px_32px_rgba(200,169,81,0.5)]">
                <div className="w-22 h-22 rounded-full border-2 border-[var(--gold)]/40 flex items-center justify-center">
                  <span className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-white tracking-wider">
                    FW
                  </span>
                </div>
              </div>

              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ delay: 0.8, duration: 0.6, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Text */}
            <motion.p
              className="text-white text-lg font-[family-name:var(--font-cinzel)] font-semibold tracking-wide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Letter Sealed
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Rich Text Editor Toolbar ──────────────────────────────────────────────

function LetterToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null
  return (
    <div className="flex items-center gap-1 p-2 bg-[var(--gold-dim)] rounded-xl border border-[var(--gold)]/10">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`w-8 h-8 rounded-lg ${editor.isActive('bold') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`w-8 h-8 rounded-lg ${editor.isActive('italic') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Separator orientation="vertical" className="h-5 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`w-8 h-8 rounded-lg ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`w-8 h-8 rounded-lg ${editor.isActive('bulletList') ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal)]/90 hover:text-white' : 'text-slate-500 hover:bg-slate-200'}`}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ─── Upload helpers ────────────────────────────────────────────────────────

async function uploadFileToStorage(
  estateId: string,
  file: File | Blob,
  fileName: string,
  contentType: string,
): Promise<string> {
  const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
    estateId,
    fileName,
    contentType,
  })

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(file)
  })

  return finalUrl
}

// ─── Create Modal ──────────────────────────────────────────────────────────

function CreateModal({
  estateId,
  open,
  onOpenChange,
}: {
  estateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('scheduled_date')
  const [error, setError] = useState<string | null>(null)
  const [anniversaryMonth, setAnniversaryMonth] = useState('')
  const [anniversaryDay, setAnniversaryDay] = useState('')

  // Voice memo state
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)

  // Photo state
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([])

  // Seal animation
  const [showSeal, setShowSeal] = useState(false)

  // TipTap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-[200px] focus:outline-none px-6 py-5 text-slate-900 leading-[1.8]',
      },
    },
  })

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setDeliveryType('scheduled_date')
      setError(null)
      setAnniversaryMonth('')
      setAnniversaryDay('')
      setVoiceBlob(null)
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPhotos([])
      setShowSeal(false)
      editor?.commands.setContent('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const addPhotos = useCallback((files: File[]) => {
    const newPhotos = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
  }, [])

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const title = (fd.get('title') as string).trim()
    const message = editor?.getHTML() || ''
    const recipientName = (fd.get('recipientName') as string).trim()
    const recipientEmail = (fd.get('recipientEmail') as string).trim()
    const recipientRelationship = (fd.get('recipientRelationship') as string)?.trim() || undefined
    const scheduledDateStr = fd.get('scheduledDate') as string

    if (!title || !message || message === '<p></p>' || !recipientName || !recipientEmail) {
      setError('Please fill in all required fields.')
      return
    }

    if (deliveryType === 'scheduled_date' && !scheduledDateStr) {
      setError('Please select a delivery date.')
      return
    }

    if (deliveryType === 'anniversary' && (!anniversaryMonth || !anniversaryDay)) {
      setError('Please select an anniversary month and day.')
      return
    }

    setError(null)
    setSaving(true)

    try {
      // Upload voice memo if present
      let voiceMemoUrl: string | undefined
      if (voiceBlob) {
        const filename = `capsule-voice-${Date.now()}.webm`
        voiceMemoUrl = await uploadFileToStorage(estateId, voiceBlob, filename, 'audio/webm')
      }

      // Upload photos if present
      let photoUrls: string[] | undefined
      if (photos.length > 0) {
        photoUrls = await Promise.all(
          photos.map((p, i) => {
            const ext = p.file.name.split('.').pop() || 'jpg'
            const filename = `capsule-photo-${Date.now()}-${i}.${ext}`
            return uploadFileToStorage(estateId, p.file, filename, p.file.type || 'image/jpeg')
          }),
        )
      }

      // Show seal animation
      setShowSeal(true)

      // Wait for animation then save
      const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        setTimeout(async () => {
          const res = await addTimeCapsule({
            estateId,
            title,
            message,
            recipientName,
            recipientEmail,
            recipientRelationship,
            deliveryType,
            ...(voiceMemoUrl ? { voiceMemoUrl } : {}),
            ...(photoUrls ? { photoUrls } : {}),
            ...(deliveryType === 'scheduled_date' && scheduledDateStr ? { scheduledDate: new Date(scheduledDateStr) } : {}),
            ...(deliveryType === 'anniversary' ? { anniversaryDate: `${anniversaryMonth.padStart(2, '0')}-${anniversaryDay.padStart(2, '0')}` } : {}),
          })
          resolve(res)
        }, 1800)
      })

      setSaving(false)
      if (result.success) {
        onOpenChange(false)
      } else {
        setShowSeal(false)
        setError(result.error || 'Failed to create capsule.')
      }
    } catch (err: unknown) {
      setShowSeal(false)
      setSaving(false)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    }
  }

  return (
    <>
      <WaxSealOverlay visible={showSeal} onComplete={() => setShowSeal(false)} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-12 border-[var(--gold)]/15"
          showCloseButton={true}
          style={{ background: 'var(--gold-dim)' }}
        >
          <DialogHeader>
            <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 tracking-tight">
              Write a Letter
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              A message sealed today, delivered when it matters most.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Title *</Label>
              <Input
                name="title"
                required
                className="h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white focus-visible:bg-white focus-visible:border-[var(--gold)] focus-visible:ring-[var(--gold)]/10 font-bold text-slate-900 placeholder:text-[var(--royal)]/20"
                placeholder="e.g. A Letter for Your Wedding Day"
              />
            </div>

            {/* Recipient Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                  <User className="w-3 h-3" />Recipient Name *
                </Label>
                <Input
                  name="recipientName"
                  required
                  className="h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white focus-visible:bg-white focus-visible:border-[var(--gold)] focus-visible:ring-[var(--gold)]/10 font-bold text-slate-900 placeholder:text-[var(--royal)]/20"
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                  <Mail className="w-3 h-3" />Recipient Email *
                </Label>
                <Input
                  name="recipientEmail"
                  type="email"
                  required
                  className="h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white focus-visible:bg-white focus-visible:border-[var(--gold)] focus-visible:ring-[var(--gold)]/10 font-bold text-slate-900 placeholder:text-[var(--royal)]/20"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Relationship (optional)</Label>
              <Input
                name="recipientRelationship"
                className="h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white focus-visible:bg-white focus-visible:border-[var(--gold)] focus-visible:ring-[var(--gold)]/10 font-bold text-slate-900 placeholder:text-[var(--royal)]/20"
                placeholder="e.g. Daughter, Best Friend, Spouse"
              />
            </div>

            {/* Letter Editor */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Your Letter *</Label>
              <LetterToolbar editor={editor} />
              <div
                className="rounded-2xl border border-[var(--gold)]/15 overflow-hidden bg-white"
                style={{ minHeight: 240 }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Voice Memo */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Voice Memo (optional)</Label>
              <VoiceRecorderPanel
                onRecorded={setVoiceBlob}
                onRemove={() => setVoiceBlob(null)}
                existingUrl={null}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Photos (optional)</Label>
              <PhotoAttachments
                photos={photos}
                onAdd={addPhotos}
                onRemove={removePhoto}
              />
            </div>

            {/* Delivery Type Selector */}
            <div className="space-y-3">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Delivery Trigger *</Label>
              <div className="grid grid-cols-2 gap-3">
                {DELIVERY_TYPES.map((dt) => {
                  const Icon = dt.icon
                  const selected = deliveryType === dt.value
                  return (
                    <Card
                      key={dt.value}
                      className={`cursor-pointer p-4 rounded-2xl border-2 text-left transition-all py-0 ${
                        selected
                          ? 'border-[var(--gold)] bg-[var(--gold)]/5 shadow-md'
                          : 'border-[var(--gold)]/10 bg-white hover:border-[var(--gold)]/20'
                      }`}
                      onClick={() => setDeliveryType(dt.value)}
                    >
                      <CardContent className="p-4 px-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <Icon className="w-4 h-4" style={{ color: selected ? 'var(--gold)' : 'var(--color-slate-400)' }} />
                          <span className={`text-[12px] font-bold ${selected ? 'text-[var(--gold)]' : 'text-slate-900'}`}>
                            {dt.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{dt.description}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Conditional: Date Picker */}
            {deliveryType === 'scheduled_date' && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Delivery Date *</Label>
                <Input
                  name="scheduledDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white focus-visible:bg-white focus-visible:border-[var(--gold)] focus-visible:ring-[var(--gold)]/10 font-bold text-slate-900"
                />
              </div>
            )}

            {/* Conditional: Anniversary Picker */}
            {deliveryType === 'anniversary' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Month *</Label>
                  <Select value={anniversaryMonth} onValueChange={setAnniversaryMonth}>
                    <SelectTrigger className="w-full h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white font-bold text-slate-900">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">Day *</Label>
                  <Select value={anniversaryDay} onValueChange={setAnniversaryDay}>
                    <SelectTrigger className="w-full h-auto px-6 py-4 rounded-2xl border-[var(--gold)]/15 bg-white font-bold text-slate-900">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-4 h-auto rounded-2xl border-[var(--gold)]/15 font-bold text-slate-500 text-sm hover:bg-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 py-4 h-auto rounded-2xl bg-[var(--gold)] text-white font-bold text-sm hover:bg-[var(--gold)] shadow-lg gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sealing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Seal Letter
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function TimeCapsulePage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/timecapsule' })
  const estateId = routeId

  const { data: capsules, loading: isLoading } = useTimeCapsules(estateId)

  const [modalOpen, setModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<TimeCapsule | null>(null)
  const [editTarget, setEditTarget] = useState<TimeCapsule | null>(null)

  const pendingCount = capsules.filter((c) => c.status === 'pending').length
  const deliveredCount = capsules.filter((c) => c.status === 'delivered').length

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[var(--gold)]/60 uppercase tracking-[0.2em]">
            Loading letters...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen">
      <SectionHeader
        section="letters"
        title="Time Capsules"
        subtitle="Write letters to the people you love. Seal them today. They will be delivered when the moment is right."
        action={
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white px-10 py-5 rounded-2xl font-bold text-[14px] h-auto shadow-lg gap-3 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Write a Letter
          </Button>
        }
      >
        {/* Stats */}
        {capsules.length > 0 && (
          <div className="flex items-center gap-6">
            <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-[var(--gold)]/10 text-slate-900 border-none">
              <Hourglass className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-[13px] font-bold">{pendingCount}</span>
              <span className="text-[13px] text-slate-500 font-normal">sealed</span>
            </Badge>
            <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-green-50 text-slate-900 border-none">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[13px] font-bold">{deliveredCount}</span>
              <span className="text-[13px] text-slate-500 font-normal">delivered</span>
            </Badge>
            <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-[var(--gold)]/5 text-slate-900 border-none">
              <Send className="w-4 h-4 text-[var(--gold)]/60" />
              <span className="text-[13px] font-bold">{capsules.length}</span>
              <span className="text-[13px] text-slate-500 font-normal">total</span>
            </Badge>
          </div>
        )}
      </SectionHeader>

      {/* Empty State or Grid */}
      {capsules.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capsules.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onCancel={setCancelTarget}
              onEdit={setEditTarget}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateModal estateId={estateId} open={modalOpen} onOpenChange={setModalOpen} />

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="rounded-[2rem] p-8 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 mx-auto">
              <XCircle className="w-7 h-7" />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900 text-center">
              Cancel This Letter
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500 text-center">
              <strong className="text-slate-900">{cancelTarget?.title}</strong> will be cancelled and the letter will never be delivered to {cancelTarget?.recipientName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:flex-row">
            <AlertDialogCancel
              variant="outline"
              className="flex-1 py-3 h-auto rounded-xl border-[var(--gold)]/15 text-slate-900 font-bold text-[13px] hover:bg-[var(--gold-dim)]"
            >
              Keep It
            </AlertDialogCancel>
            <CancelActionButton
              capsule={cancelTarget}
              estateId={estateId}
              onDone={() => setCancelTarget(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Letter */}
      <EditCapsuleDialog
        capsule={editTarget}
        estateId={estateId}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}

// ─── Edit Letter Dialog ──────────────────────────────────────────────────────
// Always mounted (so useEditor is unconditional). Edits the letter's title and
// message only — delivery type, recipient, and date are intentionally NOT
// editable here (changing them would alter when/to-whom a sealed letter is
// delivered). Cancel-and-rewrite covers that case.
function EditCapsuleDialog({
  capsule,
  estateId,
  onClose,
}: {
  capsule: TimeCapsule | null
  estateId: string
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[180px] px-5 py-4 focus:outline-none text-slate-900/80 leading-relaxed',
      },
    },
  })

  useEffect(() => {
    if (!capsule) return
    setTitle(capsule.title || '')
    editor?.commands.setContent(capsule.message || '')
  }, [capsule, editor])

  const handleSave = useCallback(async () => {
    if (!capsule) return
    if (!title.trim()) { toast.error('A title is required'); return }
    setSaving(true)
    const result = await updateTimeCapsule(estateId, capsule.id, {
      title: title.trim(),
      message: editor?.getHTML() ?? capsule.message,
    })
    setSaving(false)
    if (result.success) { toast.success('Letter updated'); onClose() }
    else toast.error(result.error || 'Could not update the letter. Please try again.')
  }, [capsule, title, editor, estateId, onClose])

  return (
    <Dialog open={!!capsule} onOpenChange={(open) => { if (!open && !saving) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900">Edit Letter</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Update the title and message. Delivery timing and recipient stay as sealed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A letter for…"
              className="px-5 py-4 h-auto rounded-2xl border-slate-200 text-[14px] text-slate-900"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Message</Label>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <LetterToolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[var(--gold)] hover:bg-[var(--gold)] text-white">{saving ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cancel Action Button (handles async state inside AlertDialogAction) ──

function CancelActionButton({
  capsule,
  estateId,
  onDone,
}: {
  capsule: TimeCapsule | null
  estateId: string
  onDone: () => void
}) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!capsule) return
    setCancelling(true)
    await cancelTimeCapsule(estateId, capsule.id)
    setCancelling(false)
    onDone()
  }, [estateId, capsule, onDone])

  return (
    <AlertDialogAction
      variant="destructive"
      disabled={cancelling}
      onClick={handleCancel}
      className="flex-1 py-3 h-auto rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px]"
    >
      {cancelling ? 'Cancelling...' : 'Cancel Letter'}
    </AlertDialogAction>
  )
}
