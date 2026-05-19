/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

import { SectionHeader } from '@/components/estate/SectionHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'

import {
  getProbateStatus,
  getProbateChecklist,
  updateChecklistItem,
  PHASE_LABELS,
  PHASE_COLORS,
  type ProbateStatus,
  type ChecklistResponse,
  type Deadline,
} from '@/lib/probate'

export const Route = createFileRoute('/estates/$estateId/probate')({
  component: ProbatePage,
})

function ProbatePage() {
  const { estateId } = useParams({ from: '/estates/$estateId/probate' })
  const [status, setStatus] = useState<ProbateStatus | null>(null)
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [s, c] = await Promise.all([
        getProbateStatus(estateId),
        getProbateChecklist(estateId),
      ])
      setStatus(s)
      setChecklist(c)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load probate data')
    } finally {
      setLoading(false)
    }
  }, [estateId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleItem = async (itemId: string, currentValue: boolean) => {
    const newValue = !currentValue
    // Optimistic update
    if (checklist) {
      setChecklist({
        ...checklist,
        completed: { ...checklist.completed, [itemId]: newValue },
      })
    }
    try {
      await updateChecklistItem(estateId, itemId, newValue)
      toast.success(newValue ? 'Item marked complete' : 'Item marked incomplete')
    } catch {
      // Revert on failure
      if (checklist) {
        setChecklist({
          ...checklist,
          completed: { ...checklist.completed, [itemId]: currentValue },
        })
      }
      toast.error('Failed to update checklist item')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader section="probate" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7C2D12] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader section="probate" />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchData} variant="outline" className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedCount = checklist ? Object.values(checklist.completed).filter(Boolean).length : 0
  const totalItems = checklist?.items.length || 0
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        section="probate"
        title="Estate Settlement"
        subtitle="Illinois probate guidance, deadlines, and court forms"
        action={
          <Badge
            className="text-xs px-3 py-1"
            style={{ backgroundColor: 'rgba(124, 45, 18, 0.1)', color: '#7C2D12' }}
          >
            {status?.stateCode || 'IL'} &middot; {status?.courtSystem || 'Cook County'}
          </Badge>
        }
      />

      {/* ── Phase Status Card ── */}
      {status && (
        <Card className="border-[#7C2D12]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#0F172A]">
                Current Phase
              </CardTitle>
              <Badge
                className="text-sm px-3 py-1 font-medium"
                style={{
                  backgroundColor: `${PHASE_COLORS[status.currentPhase] || '#6B7280'}20`,
                  color: PHASE_COLORS[status.currentPhase] || '#6B7280',
                }}
              >
                {PHASE_LABELS[status.currentPhase] || status.currentPhase}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[#0F172A]/60">Expected Timeline</span>
                <p className="font-medium text-[#0F172A]">{status.probableTimeline}</p>
              </div>
              <div>
                <span className="text-[#0F172A]/60">E-Filing</span>
                <p className="font-medium text-[#0F172A]">
                  {status.eFilingAvailable ? 'Available (Cook County eCourt)' : 'Paper filing required'}
                </p>
              </div>
              <div>
                <span className="text-[#0F172A]/60">Progress</span>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progressPct} className="flex-1 h-2" />
                  <span className="font-medium text-[#0F172A]">{progressPct}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Deadlines ── */}
      {status?.deadlines && status.deadlines.length > 0 && (
        <Card className="border-[#7C2D12]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">
              Active Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.deadlines.map((d: Deadline) => (
                <DeadlineRow key={d.id} deadline={d} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Checklist ── */}
      {checklist && (
        <Card className="border-[#7C2D12]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#0F172A]">
                Probate Checklist
              </CardTitle>
              <span className="text-sm text-[#0F172A]/60">
                {completedCount} of {totalItems} complete
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.items.map((item) => {
                const isComplete = checklist.completed[item.id] || false
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isComplete
                        ? 'bg-green-50/50 border-green-200/50'
                        : 'bg-white border-[#0F172A]/10 hover:border-[#7C2D12]/30'
                    }`}
                  >
                    <div className="pt-0.5">
                      <Switch
                        checked={isComplete}
                        onCheckedChange={() => handleToggleItem(item.id, isComplete)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${isComplete ? 'line-through text-[#0F172A]/40' : 'text-[#0F172A]'}`}>
                          {item.order}. {item.title}
                        </span>
                        {item.required && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#7C2D12]/30 text-[#7C2D12]">
                            Required
                          </Badge>
                        )}
                        {item.formRef && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#133378]/30 text-[#133378]">
                            {item.formRef}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isComplete ? 'text-[#0F172A]/30' : 'text-[#0F172A]/60'}`}>
                        {item.description}
                      </p>
                      {item.formUrl && !isComplete && (
                        <a
                          href={item.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1.5 text-xs font-medium text-[#133378] hover:underline"
                        >
                          View form &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Legal Disclaimer ── */}
      <p className="text-xs text-[#0F172A]/40 text-center px-4">
        This checklist is preparation assistance only and does not constitute legal advice.
        Consult a licensed Illinois attorney for advice specific to your situation.
      </p>
    </div>
  )
}

// ── Deadline Row Component ──

function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const isOverdue = deadline.overdue
  const isUrgent = !isOverdue && deadline.daysFromNow <= 7

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isOverdue
        ? 'bg-red-50 border-red-200'
        : isUrgent
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-[#0F172A]/10'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#0F172A]">{deadline.name}</span>
          {isOverdue && <Badge className="bg-red-100 text-red-700 text-[10px]">Overdue</Badge>}
          {isUrgent && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Urgent</Badge>}
        </div>
        <p className="text-xs text-[#0F172A]/60 mt-0.5">{deadline.description}</p>
      </div>
      <div className="text-right ml-4 shrink-0">
        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-[#0F172A]'}`}>
          {isOverdue
            ? `${Math.abs(deadline.daysFromNow)} days overdue`
            : `${deadline.daysFromNow} days`}
        </p>
        <p className="text-[10px] text-[#0F172A]/40">
          {new Date(deadline.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
