/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useTimeCapsules, type TimeCapsule } from '../lib/firestore'
import { addTimeCapsule, cancelTimeCapsule } from '../lib/estate-actions'
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
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export const Route = createFileRoute('/estates/$estateId/timecapsule')({
  component: TimeCapsulePage,
})

// ─── Delivery Type Config ──────────────────────────────────────────────────

const DELIVERY_TYPES = [
  {
    value: 'scheduled_date' as const,
    label: 'Scheduled Date',
    description: 'Deliver on a specific future date',
    icon: Calendar,
    color: '#133378',
  },
  {
    value: 'on_death' as const,
    label: 'Upon Passing',
    description: 'Deliver when estate reports a death event',
    icon: Heart,
    color: '#7C3AED',
  },
  {
    value: 'on_settlement' as const,
    label: 'Upon Settlement',
    description: 'Deliver when the estate is fully settled',
    icon: FileText,
    color: '#C8A951',
  },
  {
    value: 'anniversary' as const,
    label: 'Anniversary',
    description: 'Deliver on a recurring date each year (e.g. birthday)',
    icon: Clock,
    color: '#059669',
  },
] as const

type DeliveryType = (typeof DELIVERY_TYPES)[number]['value']

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TimeCapsule['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-[#133378]/5 text-[#133378] border-[#133378]/10', Icon: Hourglass },
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

// ─── Delivery Type Badge ───────────────────────────────────────────────────

function DeliveryBadge({ type }: { type: DeliveryType }) {
  const cfg = DELIVERY_TYPES.find((d) => d.value === type)
  if (!cfg) return null
  const Icon = cfg.icon

  return (
    <Badge
      variant="outline"
      className="gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider h-auto"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}20` }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  )
}

// ─── Capsule Card ──────────────────────────────────────────────────────────

function CapsuleCard({
  capsule,
  onCancel,
}: {
  capsule: TimeCapsule
  onCancel: (capsule: TimeCapsule) => void
}) {
  const scheduledLabel = useMemo(() => {
    if (capsule.deliveryType === 'scheduled_date' && capsule.scheduledDate) {
      const d = capsule.scheduledDate.toDate ? capsule.scheduledDate.toDate() : new Date(capsule.scheduledDate as unknown as string)
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (capsule.deliveryType === 'anniversary' && capsule.anniversaryDate) {
      const [mm, dd] = capsule.anniversaryDate.split('-')
      const d = new Date(2000, parseInt(mm, 10) - 1, parseInt(dd, 10))
      return `Every ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
    }
    return null
  }, [capsule])

  return (
    <Card className="rounded-[2rem] border-[#133378]/10 shadow-sm hover:border-[#133378]/20 hover:shadow-xl transition-all group py-0">
      {/* Card Header */}
      <CardHeader className="p-8 pb-0">
        <CardTitle className="text-lg font-bold text-[#0F172A] tracking-tight group-hover:text-[#133378] transition-colors leading-snug">
          {capsule.title}
        </CardTitle>
        <CardAction>
          <StatusBadge status={capsule.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="px-8 space-y-4">
        <p className="text-[14px] text-[#64748B] leading-relaxed line-clamp-2">
          {capsule.message}
        </p>

        {/* Recipient */}
        <div className="flex items-center gap-3 py-3 px-4 bg-[#F8FAFC] rounded-xl border border-slate-100">
          <div className="w-8 h-8 rounded-full bg-[#133378]/5 flex items-center justify-center">
            <User className="w-4 h-4 text-[#133378]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#0F172A] truncate">{capsule.recipientName}</p>
            <p className="text-[11px] text-[#64748B] truncate">{capsule.recipientEmail}</p>
          </div>
          {capsule.recipientRelationship && (
            <span className="text-[10px] font-bold text-[#133378]/40 uppercase tracking-wider flex-shrink-0">
              {capsule.recipientRelationship}
            </span>
          )}
        </div>
      </CardContent>

      {/* Card Footer */}
      <CardFooter className="px-8 py-4 border-t border-slate-100 bg-[#FAFBFC] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DeliveryBadge type={capsule.deliveryType} />
          {scheduledLabel && (
            <span className="text-[11px] font-bold text-[#133378]/30">{scheduledLabel}</span>
          )}
        </div>
        {capsule.status === 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(capsule)}
            className="text-[11px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
          >
            Cancel
          </Button>
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
        <div className="w-20 h-20 rounded-full bg-[#133378]/5 flex items-center justify-center mb-6">
          <Send className="w-10 h-10 text-[#133378]/20" />
        </div>
        <h3 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">No Time Capsules Yet</h3>
        <p className="text-[#64748B] font-medium max-w-md mb-8">
          Create scheduled messages to be delivered to loved ones at future dates or triggered by estate events.
        </p>
        <Button
          onClick={onAdd}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] h-auto shadow-lg gap-3 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create Your First Capsule
        </Button>
      </CardContent>
    </Card>
  )
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const title = (fd.get('title') as string).trim()
    const message = (fd.get('message') as string).trim()
    const recipientName = (fd.get('recipientName') as string).trim()
    const recipientEmail = (fd.get('recipientEmail') as string).trim()
    const recipientRelationship = (fd.get('recipientRelationship') as string)?.trim() || undefined
    const scheduledDateStr = fd.get('scheduledDate') as string

    if (!title || !message || !recipientName || !recipientEmail) {
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

    const result = await addTimeCapsule({
      estateId,
      title,
      message,
      recipientName,
      recipientEmail,
      recipientRelationship,
      deliveryType,
      ...(deliveryType === 'scheduled_date' && scheduledDateStr ? { scheduledDate: new Date(scheduledDateStr) } : {}),
      ...(deliveryType === 'anniversary' ? { anniversaryDate: `${anniversaryMonth.padStart(2, '0')}-${anniversaryDay.padStart(2, '0')}` } : {}),
    })

    setSaving(false)
    if (result.success) {
      onOpenChange(false)
    } else {
      setError(result.error || 'Failed to create capsule.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-12 border-[#133378]/10"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-[#0F172A] tracking-tight">
            Create Time Capsule
          </DialogTitle>
          <DialogDescription className="text-[#133378]/40 font-medium text-sm">
            Compose a message to be delivered at just the right moment.
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
            <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Title *</Label>
            <Input
              name="title"
              required
              className="h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] placeholder:text-[#133378]/20"
              placeholder="e.g. A Letter for Your Wedding Day"
            />
          </div>

          {/* Recipient Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">
                <User className="w-3 h-3" />Recipient Name *
              </Label>
              <Input
                name="recipientName"
                required
                className="h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] placeholder:text-[#133378]/20"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">
                <Mail className="w-3 h-3" />Recipient Email *
              </Label>
              <Input
                name="recipientEmail"
                type="email"
                required
                className="h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] placeholder:text-[#133378]/20"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Relationship (optional)</Label>
            <Input
              name="recipientRelationship"
              className="h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] placeholder:text-[#133378]/20"
              placeholder="e.g. Daughter, Best Friend, Spouse"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Message *</Label>
            <Textarea
              name="message"
              required
              rows={6}
              className="px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A] placeholder:text-[#133378]/20 resize-none leading-relaxed"
              placeholder="Write your message here..."
            />
          </div>

          {/* Delivery Type Selector */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Delivery Trigger *</Label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_TYPES.map((dt) => {
                const Icon = dt.icon
                const selected = deliveryType === dt.value
                return (
                  <Card
                    key={dt.value}
                    className={`cursor-pointer p-4 rounded-2xl border-2 text-left transition-all py-0 ${
                      selected
                        ? 'border-[#133378] bg-[#133378]/5 shadow-md'
                        : 'border-[#133378]/10 bg-[#F8FAFC] hover:border-[#133378]/20'
                    }`}
                    onClick={() => setDeliveryType(dt.value)}
                  >
                    <CardContent className="p-4 px-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <Icon className="w-4 h-4" style={{ color: selected ? '#133378' : '#94A3B8' }} />
                        <span className={`text-[12px] font-bold ${selected ? 'text-[#133378]' : 'text-[#0F172A]'}`}>
                          {dt.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] leading-snug">{dt.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Conditional: Date Picker */}
          {deliveryType === 'scheduled_date' && (
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Delivery Date *</Label>
              <Input
                name="scheduledDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-[#133378]/5 font-bold text-[#0F172A]"
              />
            </div>
          )}

          {/* Conditional: Anniversary Picker */}
          {deliveryType === 'anniversary' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Month *</Label>
                <Select value={anniversaryMonth} onValueChange={setAnniversaryMonth}>
                  <SelectTrigger className="w-full h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] font-bold text-[#0F172A]">
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
                <Label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Day *</Label>
                <Select value={anniversaryDay} onValueChange={setAnniversaryDay}>
                  <SelectTrigger className="w-full h-auto px-6 py-4 rounded-2xl border-[#133378]/10 bg-[#F8FAFC] font-bold text-[#0F172A]">
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
              className="flex-1 py-4 h-auto rounded-2xl border-[#133378]/10 font-bold text-[#133378]/40 text-sm hover:bg-[#F8FAFC]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 h-auto rounded-2xl bg-[#133378] text-white font-bold text-sm hover:bg-[#1E3A5F] shadow-lg gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create Capsule
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function TimeCapsulePage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/timecapsule' })
  const estateId = routeId

  const { data: capsules, loading: isLoading } = useTimeCapsules(estateId)

  const [modalOpen, setModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<TimeCapsule | null>(null)

  const pendingCount = capsules.filter((c) => c.status === 'pending').length
  const deliveredCount = capsules.filter((c) => c.status === 'delivered').length

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#133378]/50 uppercase tracking-[0.2em]">
            Loading capsules...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-[#133378]/10 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Scheduled Messages</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
            Time Capsules
          </h2>
          <p className="text-[#133378]/50 text-lg font-medium max-w-2xl leading-relaxed">
            Write messages to be delivered to loved ones at future dates, life milestones, or upon estate events.
          </p>
          {/* Stats */}
          {capsules.length > 0 && (
            <div className="flex items-center gap-6 pt-2">
              <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-[#133378]/5 text-[#0F172A] border-none">
                <Hourglass className="w-4 h-4 text-[#133378]" />
                <span className="text-[13px] font-bold">{pendingCount}</span>
                <span className="text-[13px] text-[#64748B] font-normal">pending</span>
              </Badge>
              <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-green-50 text-[#0F172A] border-none">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-[13px] font-bold">{deliveredCount}</span>
                <span className="text-[13px] text-[#64748B] font-normal">delivered</span>
              </Badge>
              <Badge variant="secondary" className="gap-2 h-auto py-1.5 px-3 rounded-lg bg-[#C8A951]/10 text-[#0F172A] border-none">
                <Send className="w-4 h-4 text-[#C8A951]" />
                <span className="text-[13px] font-bold">{capsules.length}</span>
                <span className="text-[13px] text-[#64748B] font-normal">total</span>
              </Badge>
            </div>
          )}
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] h-auto shadow-lg gap-3 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create Capsule
        </Button>
      </div>

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
            <AlertDialogTitle className="text-xl font-bold text-[#0F172A] text-center">
              Cancel Time Capsule
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-[#133378]/50 text-center">
              <strong className="text-[#0F172A]">{cancelTarget?.title}</strong> will be cancelled and the message will never be delivered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:flex-row">
            <AlertDialogCancel
              variant="outline"
              className="flex-1 py-3 h-auto rounded-xl border-[#133378]/10 text-[#0F172A] font-bold text-[13px] hover:bg-[#F8FAFC]"
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
    </div>
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
      {cancelling ? 'Cancelling...' : 'Cancel Capsule'}
    </AlertDialogAction>
  )
}
