/* eslint-disable react-refresh/only-export-components */
/**
 * Broadcasting / Event Pages — Funeral, Service, Repast, Memorial
 *
 * Estate owners and executors can create event pages with:
 * - Event details (date, time, location, dress code)
 * - RSVP tracking
 * - Shareable links (via public memorial system)
 *
 * @version 1.0.0
 */

import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useCollection } from '../lib/firestore'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Copy,
  Check,
  Pencil,
  XCircle,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// DropdownMenu available but using inline buttons for simplicity
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { SectionEmptyState } from '@/components/estate/SectionEmptyState'

export const Route = createFileRoute('/estates/$estateId/events')({
  component: EventsPage,
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface EstateEvent {
  id: string
  type: 'funeral' | 'memorial_service' | 'celebration_of_life' | 'repast' | 'graveside' | 'other'
  title: string
  date: string
  time?: string
  endTime?: string
  location: string
  address?: string
  description?: string
  dressCode?: string
  notes?: string
  rsvpEnabled: boolean
  rsvpCount?: number
  status: 'upcoming' | 'completed' | 'cancelled'
  createdAt: Timestamp
}

const EVENT_TYPES = [
  { value: 'funeral', label: 'Funeral Service' },
  { value: 'memorial_service', label: 'Memorial Service' },
  { value: 'celebration_of_life', label: 'Celebration of Life' },
  { value: 'repast', label: 'Repast / Reception' },
  { value: 'graveside', label: 'Graveside Service' },
  { value: 'other', label: 'Other Event' },
] as const

// ─── Main Page ───────────────────────────────────────────────────────────────

function EventsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/events' })
  const estateId = routeId

  const { data: events, loading } = useCollection<EstateEvent>(
    `estates/${estateId}/events`,
    [],
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EstateEvent | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal" />
      </div>
    )
  }

  const upcoming = events.filter((e) => e.status === 'upcoming')
  const past = events.filter((e) => e.status === 'completed')
  const cancelled = events.filter((e) => e.status === 'cancelled')

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      <SectionHeader
        section="events"
        title="Events & Services"
        subtitle="Funeral services, memorials, celebrations of life, and receptions."
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 h-auto rounded-2xl font-bold text-[14px] shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Button>
        }
      />

      {events.length === 0 ? (
        <SectionEmptyState
          section="events"
          heading="No events yet"
          message="Create a funeral service, memorial, celebration of life, or reception to share with family and friends."
          ctaLabel="Create First Event"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-10">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em]">Upcoming</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} estateId={estateId} onEdit={setEditingEvent} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-[#64748B]/40 uppercase tracking-[0.3em]">Past</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} estateId={estateId} onEdit={setEditingEvent} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled */}
          {cancelled.length > 0 && (
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-red-400/50 uppercase tracking-[0.3em]">Cancelled</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cancelled.map((event) => (
                  <EventCard key={event.id} event={event} estateId={estateId} onEdit={setEditingEvent} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateEventModal
        estateId={estateId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditEventModal
        estateId={estateId}
        event={editingEvent}
        open={editingEvent !== null}
        onOpenChange={(open) => { if (!open) setEditingEvent(null) }}
      />
    </div>
  )
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event, estateId, onEdit }: { event: EstateEvent; estateId: string; onEdit?: (event: EstateEvent) => void }) {
  const [copied, setCopied] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.type)?.label || event.type

  const copyDetails = useCallback(async () => {
    const lines = [event.title]
    if (event.date) lines.push(`\u{1F4C5} ${event.date}${event.time ? ` at ${event.time}` : ''}`)
    if (event.location) lines.push(`\u{1F4CD} ${event.location}${event.address ? `, ${event.address}` : ''}`)
    if (event.description) lines.push(event.description)
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Event details copied')
  }, [event])

  return (
    <Card className="rounded-3xl border-slate-100 p-0 hover:border-[#133378]/20 hover:shadow-lg transition-all">
      <CardContent className="p-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <Badge
              variant="secondary"
              className="px-2.5 py-1 h-auto text-[10px] font-bold uppercase tracking-widest rounded-lg bg-[#133378]/5 text-[#133378] mb-3"
            >
              {typeLabel}
            </Badge>
            <h3 className="text-lg font-bold text-[#0F172A]">{event.title}</h3>
          </div>
          {event.status === 'cancelled' && (
            <Badge variant="secondary" className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg">
              Cancelled
            </Badge>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-[#334155] text-sm">
            <Calendar className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
            <span>{event.date}</span>
          </div>
          {event.time && (
            <div className="flex items-center gap-3 text-[#334155] text-sm">
              <Clock className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
              <span>{event.time}{event.endTime ? ` — ${event.endTime}` : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-[#334155] text-sm">
            <MapPin className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          {event.rsvpEnabled && event.rsvpCount !== undefined && (
            <div className="flex items-center gap-3 text-[#334155] text-sm">
              <Users className="w-4 h-4 text-[#C8A951]/60 flex-shrink-0" />
              <span>{event.rsvpCount} attending</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-[#64748B] mb-6 line-clamp-3">{event.description}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={copyDetails}
            className="text-[12px] font-bold text-[#64748B] hover:text-[#133378] rounded-xl"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Details'}
          </Button>
          {event.status !== 'cancelled' && onEdit && (
            <Button
              variant="ghost"
              onClick={() => onEdit(event)}
              className="text-[12px] font-bold text-[#64748B] hover:text-[#133378] rounded-xl"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
          {event.status === 'upcoming' && (
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(true)}
              className="text-[12px] font-bold text-red-400 hover:text-red-600 rounded-xl"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
          )}
          {event.status === 'cancelled' && (
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-[12px] font-bold text-red-400 hover:text-red-600 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>

        {/* Cancel confirmation */}
        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark <strong>{event.title}</strong> as cancelled. Attendees will see the cancellation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Keep Event</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 rounded-xl"
                onClick={async () => {
                  await updateDoc(doc(db, `estates/${estateId}/events`, event.id), { status: 'cancelled', updatedAt: serverTimestamp() })
                  toast.success('Event cancelled')
                }}
              >
                Cancel Event
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{event.title}</strong>. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Keep</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 rounded-xl"
                onClick={async () => {
                  await deleteDoc(doc(db, `estates/${estateId}/events`, event.id))
                  toast.success('Event deleted')
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

// ─── Create Event Modal ──────────────────────────────────────────────────────

function CreateEventModal({
  estateId,
  open,
  onOpenChange,
}: {
  estateId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'funeral' as EstateEvent['type'],
    title: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    address: '',
    description: '',
    dressCode: '',
    notes: '',
    rsvpEnabled: true,
  })

  const update = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }))

  const handleCreate = useCallback(async () => {
    if (!form.title.trim() || !form.date || !form.location.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, `estates/${estateId}/events`), {
        ...form,
        title: form.title.trim(),
        location: form.location.trim(),
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        dressCode: form.dressCode.trim() || null,
        notes: form.notes.trim() || null,
        rsvpCount: 0,
        status: 'upcoming',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success('Event created')
      onOpenChange(false)
      setForm({
        type: 'funeral',
        title: '',
        date: '',
        time: '',
        endTime: '',
        location: '',
        address: '',
        description: '',
        dressCode: '',
        notes: '',
        rsvpEnabled: true,
      })
    } catch (err) {
      console.error('[CreateEvent] Error:', err)
      toast.error('Failed to create event')
    } finally {
      setSaving(false)
    }
  }, [estateId, form, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10" showCloseButton={false}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">
            Create Event
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new event for the estate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Event Type</Label>
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g., Funeral Service for John Smith"
              className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Start Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => update('time', e.target.value)}
                className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">End Time</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Location *</Label>
            <Input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="e.g., St. Matthew's Church"
              className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Address</Label>
            <Input
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Full street address"
              className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Details about the service..."
              rows={3}
              className="px-5 py-4 rounded-2xl border-slate-200 text-[14px] resize-none"
            />
          </div>

          {/* Dress Code */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Dress Code</Label>
            <Input
              value={form.dressCode}
              onChange={(e) => update('dressCode', e.target.value)}
              placeholder="e.g., Business formal, Celebration colors welcome"
              className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-4 mt-8 pt-8 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-[#64748B]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !form.title.trim() || !form.date || !form.location.trim()}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]"
          >
            {saving ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Event Modal ───────────────────────────────────────────────────────

function EditEventModal({
  estateId,
  event,
  open,
  onOpenChange,
}: {
  estateId: string
  event: EstateEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: (event?.type || 'funeral') as EstateEvent['type'],
    title: event?.title || '',
    date: event?.date || '',
    time: event?.time || '',
    endTime: event?.endTime || '',
    location: event?.location || '',
    address: event?.address || '',
    description: event?.description || '',
    dressCode: event?.dressCode || '',
    notes: event?.notes || '',
  })

  // Sync form when event changes
  const [loadedId, setLoadedId] = useState<string | null>(null)
  if (event && event.id !== loadedId) {
    setLoadedId(event.id)
    setForm({
      type: event.type,
      title: event.title,
      date: event.date,
      time: event.time || '',
      endTime: event.endTime || '',
      location: event.location,
      address: event.address || '',
      description: event.description || '',
      dressCode: event.dressCode || '',
      notes: event.notes || '',
    })
  }
  if (!open && loadedId !== null) {
    setLoadedId(null)
  }

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleSave = useCallback(async () => {
    if (!event || !form.title.trim() || !form.date || !form.location.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, `estates/${estateId}/events`, event.id), {
        ...form,
        title: form.title.trim(),
        location: form.location.trim(),
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        dressCode: form.dressCode.trim() || null,
        notes: form.notes.trim() || null,
        updatedAt: serverTimestamp(),
      })
      toast.success('Event updated')
      onOpenChange(false)
    } catch (err) {
      console.error('[EditEvent] Error:', err)
      toast.error('Failed to update event')
    } finally {
      setSaving(false)
    }
  }, [estateId, event, form, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10" showCloseButton={false}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">
            Edit Event
          </DialogTitle>
          <DialogDescription className="sr-only">Edit event details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Title *</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Start Time</Label>
              <Input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Location *</Label>
            <Input value={form.location} onChange={(e) => update('location', e.target.value)} className="h-auto px-5 py-4 rounded-2xl border-slate-200 text-[14px]" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/60 uppercase tracking-widest">Description</Label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className="px-5 py-4 rounded-2xl border-slate-200 text-[14px] resize-none" />
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-4 mt-8 pt-8 border-t border-slate-100">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-[#64748B]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date || !form.location.trim()} className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
