/**
 * SettlementPanel — Executor settlement interface for the Guardian Protocol.
 *
 * Shown to executors when they need to report owner status or when the estate
 * is already in settlement. This is the most sensitive screen in FinalWishes —
 * every word, every interaction must carry the gravity of the moment.
 *
 * @version 1.0.0
 */

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { auth } from '../../lib/firebase'
import { API_BASE } from '../../lib/client'

interface SettlementPanelProps {
  estateId: string
  ownerName?: string
  estateStatus?: string
  settlementType?: string | null
  settlementReportedAt?: string | null
}

export function SettlementPanel({
  estateId,
  ownerName,
  estateStatus,
  settlementType,
  settlementReportedAt,
}: SettlementPanelProps) {
  const [statusType, setStatusType] = useState<'incapacity' | 'death'>('incapacity')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const isInSettlement = estateStatus === 'in_settlement'

  const handleReportStatus = useCallback(async () => {
    setSubmitting(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        toast.error('You must be signed in.')
        return
      }

      const res = await fetch(`${API_BASE}/api/v1/guardian/report-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estateId,
          status: statusType,
          reportedBy: auth.currentUser?.uid,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message || 'Failed to report status')
      }

      toast.success('Settlement process initiated. Time capsules with settlement triggers are being delivered.')
      setDialogOpen(false)
    } catch (err) {
      console.error('[SettlementPanel] Report status error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to report status change')
    } finally {
      setSubmitting(false)
    }
  }, [estateId, statusType, notes])

  // --- Estate IS in settlement ---
  if (isInSettlement) {
    return (
      <Card className="rounded-[2.5rem] border-amber-200/50 shadow-sm py-0 gap-0 bg-amber-50/30">
        <div className="bg-gradient-to-r from-amber-100/60 to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-amber-200/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-amber-700/70 uppercase tracking-[0.3em]">Estate in Settlement</h3>
        </div>
        <CardContent className="px-10 py-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-ink font-bold text-lg">This estate is currently in settlement.</p>
              <p className="text-ink-muted text-[14px] leading-relaxed max-w-lg">
                {settlementType === 'death'
                  ? `The passing of ${ownerName || 'the estate owner'} has been reported. Time capsules and final messages are being delivered to their intended recipients.`
                  : `${ownerName || 'The estate owner'} has been reported as incapacitated. Settlement procedures are in progress.`}
              </p>
            </div>
            <Badge
              variant="outline"
              className="px-4 py-1.5 h-auto bg-amber-100 border-amber-300 rounded-xl text-[11px] font-black text-amber-700 uppercase tracking-[0.15em] shrink-0"
            >
              {settlementType === 'death' ? 'Passing' : 'Incapacity'}
            </Badge>
          </div>

          {settlementReportedAt && (
            <p className="text-[12px] text-ink-muted font-medium">
              Reported on {new Date(settlementReportedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          <div className="border-t border-amber-200/50 pt-6 space-y-3">
            <h4 className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Settlement Checklist</h4>
            <div className="space-y-2">
              {[
                'Time capsules with settlement triggers delivered',
                'Review and distribute estate assets per designations',
                'Notify all beneficiaries of their designations',
                'Secure all digital credentials in the lockbox',
                'Contact legal counsel for probate proceedings',
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                  <span className="text-[14px] text-ink font-medium">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- Estate is NOT in settlement — show report option ---
  return (
    <Card className="rounded-[2.5rem] border-[var(--neutral-border)] shadow-sm py-0 gap-0">
      <div className="bg-gradient-to-r from-[var(--royal)]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-[var(--neutral-border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[var(--royal)]/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h3 className="text-[11px] font-black text-[var(--royal)]/60 uppercase tracking-[0.3em]">Guardian Protocol</h3>
      </div>
      <CardContent className="px-10 py-8 space-y-6">
        <div className="space-y-2">
          <p className="text-ink font-bold text-[15px] leading-tight">
            Report a Status Change
          </p>
          <p className="text-[13px] text-ink-muted font-medium leading-relaxed max-w-lg">
            If {ownerName || 'the estate owner'} is no longer able to manage their estate,
            you can begin the settlement process. This will deliver all time capsules with
            settlement triggers and notify beneficiaries.
          </p>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="px-6 py-2.5 rounded-xl font-bold text-[12px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
            >
              Report Status Change
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-[family-name:var(--font-cinzel)] font-bold text-royal">
                Begin Settlement Process
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[14px] text-ink-muted leading-relaxed space-y-3">
                <span className="block">
                  This action will transition the estate into settlement. The following will happen:
                </span>
                <span className="block pl-4 border-l-2 border-amber-400 text-[13px]">
                  All time capsules with settlement triggers will be delivered to their recipients.
                  Beneficiaries will be notified. This action cannot be undone.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">
                  Status Type
                </label>
                <Select
                  value={statusType}
                  onValueChange={(v) => setStatusType(v as 'incapacity' | 'death')}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incapacity">Incapacity</SelectItem>
                    <SelectItem value="death">Passing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReportStatus}
                disabled={submitting}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Confirm Settlement'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
