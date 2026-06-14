/**
 * RSVP Dialog — Event RSVP submission form
 *
 * Allows attendees to RSVP to an event with name, email,
 * response status, guest count, and optional message.
 * Writes to the `rsvps` subcollection under the event document
 * and updates the `rsvpCount` on the event doc.
 *
 * @version 1.0.0
 */

import { useState, useCallback } from 'react'
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, HelpCircle, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RSVPResponse = 'attending' | 'maybe' | 'not_attending'

export interface RSVPRecord {
  id: string
  name: string
  email?: string
  phone?: string
  response: RSVPResponse
  guests: number
  message?: string
  createdAt: import('firebase/firestore').Timestamp
}

interface RSVPDialogProps {
  estateId: string
  eventId: string
  eventTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Response Pill Button ────────────────────────────────────────────────────

const RESPONSE_OPTIONS: { value: RSVPResponse; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: 'attending', label: 'Attending', icon: Check, activeClass: 'bg-green-600 text-white border-green-600' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'not_attending', label: 'Not Attending', icon: X, activeClass: 'bg-ink-muted text-white border-ink-muted' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function RSVPDialog({ estateId, eventId, eventTitle, open, onOpenChange }: RSVPDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    response: 'attending' as RSVPResponse,
    guests: 1,
    message: '',
  })

  const update = (key: string, value: string | number) => setForm((p) => ({ ...p, [key]: value }))

  const resetForm = useCallback(() => {
    setForm({ name: '', email: '', phone: '', response: 'attending', guests: 1, message: '' })
    setSubmitted(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      // Write RSVP to subcollection
      await addDoc(collection(db, `estates/${estateId}/events/${eventId}/rsvps`), {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        response: form.response,
        guests: form.response === 'not_attending' ? 0 : Math.max(1, form.guests),
        message: form.message.trim() || null,
        createdAt: serverTimestamp(),
      })

      // Update rsvpCount on the event document (denormalized tally).
      // Best-effort and non-fatal: the RSVP itself is already saved above, so a
      // failure to bump the count must NOT surface as an RSVP error. The narrow
      // firestore rule lets estate accessors update rsvpCount-only; if that ever
      // regresses, the RSVP still succeeds and the count can be recomputed.
      if (form.response !== 'not_attending') {
        const guestCount = Math.max(1, form.guests)
        try {
          await updateDoc(doc(db, `estates/${estateId}/events`, eventId), {
            rsvpCount: increment(guestCount),
          })
        } catch (countErr) {
          console.warn('[RSVP] rsvpCount bump failed (RSVP still saved):', countErr)
        }
      }

      setSubmitted(true)
      toast.success('RSVP submitted')
    } catch (err) {
      console.error('[RSVP] Submit error:', err)
      toast.error('Failed to submit RSVP')
    } finally {
      setSubmitting(false)
    }
  }, [estateId, eventId, form])

  const handleClose = useCallback((openState: boolean) => {
    if (!openState) {
      resetForm()
    }
    onOpenChange(openState)
  }, [onOpenChange, resetForm])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-10" showCloseButton={false}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)]">
            {submitted ? 'RSVP Confirmed' : 'RSVP'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--royal)]/60 mt-1">
            {submitted ? `Your response has been recorded for ${eventTitle}.` : `Respond to ${eventTitle}`}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          /* ── Confirmation View ── */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-[var(--royal)]/70 text-sm">
              {form.response === 'attending' && `You're attending with ${form.guests} guest${form.guests !== 1 ? 's' : ''}.`}
              {form.response === 'maybe' && 'You responded as maybe.'}
              {form.response === 'not_attending' && 'You responded as not attending.'}
            </p>
            <Button
              onClick={() => handleClose(false)}
              className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px] mt-4"
            >
              Done
            </Button>
          </div>
        ) : (
          /* ── RSVP Form ── */
          <>
            <div className="space-y-6">
              {/* Response pills */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Your Response *</Label>
                <div className="flex gap-2">
                  {RESPONSE_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isActive = form.response === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('response', opt.value)}
                        className={`
                          flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-[13px] font-bold transition-all
                          ${isActive ? opt.activeClass : 'border-[var(--neutral-border)] text-[var(--royal)]/60 hover:border-gold/50'}
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Your Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Full name"
                  className="h-auto px-5 py-4 rounded-2xl border-[var(--neutral-border)] text-[14px]"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="your@email.com"
                  className="h-auto px-5 py-4 rounded-2xl border-[var(--neutral-border)] text-[14px]"
                />
              </div>

              {/* Guest count (only for attending/maybe) */}
              {form.response !== 'not_attending' && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Number of Guests</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.guests}
                    onChange={(e) => update('guests', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="h-auto px-5 py-4 rounded-2xl border-[var(--neutral-border)] text-[14px] w-24"
                  />
                  <p className="text-[11px] text-[var(--royal)]/40">Including yourself</p>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">Message (Optional)</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Any notes or well wishes..."
                  rows={3}
                  className="px-5 py-4 rounded-2xl border-[var(--neutral-border)] text-[14px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="flex-row justify-end gap-4 mt-8 pt-8 border-t border-[var(--neutral-border)]">
              <Button
                variant="ghost"
                onClick={() => handleClose(false)}
                className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-[var(--royal)]/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]"
              >
                {submitting ? 'Submitting...' : 'Submit RSVP'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
