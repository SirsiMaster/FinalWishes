/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useTimeCapsules, type TimeCapsule } from '../lib/firestore'
import { addTimeCapsule, cancelTimeCapsule } from '../lib/estate-actions'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { useAuth } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'
import {
  Clock,
  Heart,
  Calendar,
  Send,
  Plus,
  X,
  User,
  Mail,
  FileText,
  AlertCircle,
  Hourglass,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

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
    pending: { label: 'Pending', bg: 'bg-[#133378]/5', text: 'text-[#133378]', border: 'border-[#133378]/10', Icon: Hourglass },
    delivered: { label: 'Delivered', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', Icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', Icon: XCircle },
  }
  const c = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${c.bg} ${c.text} ${c.border}`}>
      <c.Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}

// ─── Delivery Type Badge ───────────────────────────────────────────────────

function DeliveryBadge({ type }: { type: DeliveryType }) {
  const cfg = DELIVERY_TYPES.find((d) => d.value === type)
  if (!cfg) return null
  const Icon = cfg.icon

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}10`, border: `1px solid ${cfg.color}20` }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
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
    <div className="bg-white rounded-[2rem] border border-[#133378]/10 overflow-hidden shadow-sm hover:border-[#133378]/20 hover:shadow-xl transition-all group">
      {/* Card Header */}
      <div className="p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h4 className="text-lg font-bold text-[#0F172A] tracking-tight group-hover:text-[#133378] transition-colors leading-snug">
            {capsule.title}
          </h4>
          <StatusBadge status={capsule.status} />
        </div>

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
      </div>

      {/* Card Footer */}
      <div className="px-8 py-4 border-t border-slate-100 bg-[#FAFBFC] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DeliveryBadge type={capsule.deliveryType} />
          {scheduledLabel && (
            <span className="text-[11px] font-bold text-[#133378]/30">{scheduledLabel}</span>
          )}
        </div>
        {capsule.status === 'pending' && (
          <button
            onClick={() => onCancel(capsule)}
            className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-20 h-20 rounded-full bg-[#133378]/5 flex items-center justify-center mb-6">
        <Send className="w-10 h-10 text-[#133378]/20" />
      </div>
      <h3 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">No Time Capsules Yet</h3>
      <p className="text-[#64748B] font-medium max-w-md mb-8">
        Create scheduled messages to be delivered to loved ones at future dates or triggered by estate events.
      </p>
      <button
        onClick={onAdd}
        className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl font-bold text-[13px] md:text-[14px] transition-all shadow-lg flex items-center gap-3 active:scale-95 w-full md:w-auto justify-center"
      >
        <Plus className="w-5 h-5" />
        Create Your First Capsule
      </button>
    </div>
  )
}

// ─── Create Modal ──────────────────────────────────────────────────────────

function CreateModal({
  estateId,
  onClose,
}: {
  estateId: string
  onClose: () => void
}) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('scheduled_date')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const title = (fd.get('title') as string).trim()
    const message = (fd.get('message') as string).trim()
    const recipientName = (fd.get('recipientName') as string).trim()
    const recipientEmail = (fd.get('recipientEmail') as string).trim()
    const recipientRelationship = (fd.get('recipientRelationship') as string)?.trim() || undefined
    const scheduledDateStr = fd.get('scheduledDate') as string
    const anniversaryMonth = fd.get('anniversaryMonth') as string
    const anniversaryDay = fd.get('anniversaryDay') as string

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

    if (result.success && result.id) {
      // Schedule delivery via Go API
      try {
        const token = await user?.getIdToken()
        await fetch(`${API_BASE}/api/v1/capsules/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estateId, capsuleId: result.id }),
        })
      } catch (err) {
        console.error('[CapsuleSchedule] Failed to schedule delivery:', err)
        // Capsule was created in Firestore; scheduling can be retried
      }
    }

    setSaving(false)
    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to create capsule.')
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[3rem] p-12 max-w-2xl w-full border border-[#133378]/10 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-3xl font-bold text-[#0F172A] tracking-tight">Create Time Capsule</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[#133378]/40 font-medium text-sm mb-8">
          Compose a message to be delivered at just the right moment.
        </p>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Title *</label>
            <input
              name="title"
              required
              className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
              placeholder="e.g. A Letter for Your Wedding Day"
            />
          </div>

          {/* Recipient Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">
                <User className="w-3 h-3 inline mr-1" />Recipient Name *
              </label>
              <input
                name="recipientName"
                required
                className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">
                <Mail className="w-3 h-3 inline mr-1" />Recipient Email *
              </label>
              <input
                name="recipientEmail"
                type="email"
                required
                className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Relationship (optional)</label>
            <input
              name="recipientRelationship"
              className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
              placeholder="e.g. Daughter, Best Friend, Spouse"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Message *</label>
            <textarea
              name="message"
              required
              rows={6}
              className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20 resize-none leading-relaxed"
              placeholder="Write your message here..."
            />
          </div>

          {/* Delivery Type Selector */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Delivery Trigger *</label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_TYPES.map((dt) => {
                const Icon = dt.icon
                const selected = deliveryType === dt.value
                return (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setDeliveryType(dt.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? 'border-[#133378] bg-[#133378]/5 shadow-md'
                        : 'border-[#133378]/10 bg-[#F8FAFC] hover:border-[#133378]/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <Icon className="w-4 h-4" style={{ color: selected ? '#133378' : '#94A3B8' }} />
                      <span className={`text-[12px] font-bold ${selected ? 'text-[#133378]' : 'text-[#0F172A]'}`}>
                        {dt.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-snug">{dt.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Conditional: Date Picker */}
          {deliveryType === 'scheduled_date' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Delivery Date *</label>
              <input
                name="scheduledDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all"
              />
            </div>
          )}

          {/* Conditional: Anniversary Picker */}
          {deliveryType === 'anniversary' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Month *</label>
                <select
                  name="anniversaryMonth"
                  className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none transition-all"
                >
                  <option value="">Select month</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Day *</label>
                <select
                  name="anniversaryDay"
                  className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none transition-all"
                >
                  <option value="">Select day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-[#133378]/10 font-bold text-[#133378]/40 text-sm hover:bg-[#F8FAFC] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 rounded-2xl bg-[#133378] text-white font-bold text-sm transition-all hover:bg-[#1E3A5F] shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Cancel Confirmation Modal ─────────────────────────────────────────────

function CancelModal({
  capsule,
  estateId,
  onClose,
}: {
  capsule: TimeCapsule
  estateId: string
  onClose: () => void
}) {
  const { user } = useAuth()
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = useCallback(async () => {
    setCancelling(true)
    // Cancel scheduled delivery via Go API BEFORE updating Firestore
    try {
      const token = await user?.getIdToken()
      await fetch(`${API_BASE}/api/v1/capsules/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estateId, capsuleId: capsule.id }),
      })
    } catch (err) {
      console.error('[CapsuleCancel] Failed to cancel scheduled delivery:', err)
    }
    await cancelTimeCapsule(estateId, capsule.id)
    setCancelling(false)
    onClose()
  }, [estateId, capsule.id, onClose, user])

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-[2rem] max-w-md w-full mx-4 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6 mx-auto">
          <XCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-[#0F172A] text-center mb-2">Cancel Time Capsule</h3>
        <p className="text-[14px] text-[#133378]/50 text-center mb-8">
          <strong className="text-[#0F172A]">{capsule.title}</strong> will be cancelled and the message will never be delivered.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#133378]/10 text-[#0F172A] font-bold text-[13px] hover:bg-[#F8FAFC] transition-all"
          >
            Keep It
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] transition-all disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Capsule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function TimeCapsulePage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/timecapsule' })
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])

  const { data: capsules, loading: isLoading } = useTimeCapsules(estateId)

  const [modalOpen, setModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<TimeCapsule | null>(null)

  const pendingCount = capsules.filter((c) => c.status === 'pending').length
  const deliveredCount = capsules.filter((c) => c.status === 'delivered').length

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return <CardGridSkeleton />
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#133378]/10 pb-8 md:pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Scheduled Messages</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
            Time Capsules
          </h2>
          <p className="text-[#133378]/50 text-lg font-medium max-w-2xl leading-relaxed">
            Write messages to be delivered to loved ones at future dates, life milestones, or upon estate events.
          </p>
          {/* Stats */}
          {capsules.length > 0 && (
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-[#133378]" />
                <span className="text-[13px] font-bold text-[#0F172A]">{pendingCount}</span>
                <span className="text-[13px] text-[#64748B]">pending</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-[13px] font-bold text-[#0F172A]">{deliveredCount}</span>
                <span className="text-[13px] text-[#64748B]">delivered</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#C8A951]" />
                <span className="text-[13px] font-bold text-[#0F172A]">{capsules.length}</span>
                <span className="text-[13px] text-[#64748B]">total</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 md:px-10 md:py-5 rounded-2xl font-bold text-[13px] md:text-[14px] transition-all shadow-lg flex items-center gap-3 active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Create Capsule
        </button>
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
      {modalOpen && (
        <CreateModal estateId={estateId} onClose={() => setModalOpen(false)} />
      )}

      {/* Cancel Confirmation */}
      {cancelTarget && (
        <CancelModal
          capsule={cancelTarget}
          estateId={estateId}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
