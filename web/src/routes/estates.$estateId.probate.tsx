/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

import { SectionHeader } from '@/components/estate/SectionHeader'
import { SettlementGantt } from '@/components/estate/SettlementGantt'
import { QuorumPanel } from '@/components/estate/QuorumPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'

import {
  getProbateStatus,
  getProbateChecklist,
  updateChecklistItem,
  getDeathCertFacts,
  confirmDeathCert,
  getFormTemplates,
  getExecutorStatus,
  confirmExecutorRole,
  PHASE_LABELS,
  PHASE_COLORS,
  type ProbateStatus,
  type ChecklistResponse,
  type Deadline,
  type DeathCertFacts,
  type FormTemplate,
  type ExecutorActivation,
} from '@/lib/probate'

export const Route = createFileRoute('/estates/$estateId/probate')({
  component: ProbatePage,
})

function ProbatePage() {
  const { estateId } = useParams({ from: '/estates/$estateId/probate' })
  const [status, setStatus] = useState<ProbateStatus | null>(null)
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null)
  const [deathCert, setDeathCert] = useState<DeathCertFacts | null>(null)
  const [forms, setForms] = useState<FormTemplate[]>([])
  const [executorActivation, setExecutorActivation] = useState<ExecutorActivation | null>(null)
  const [confirmingCert, setConfirmingCert] = useState(false)
  const [confirmingExecutor, setConfirmingExecutor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [s, c, dc, f, ea] = await Promise.all([
        getProbateStatus(estateId),
        getProbateChecklist(estateId),
        getDeathCertFacts(estateId),
        getFormTemplates(estateId).catch(() => ({ templates: [], disclaimer: '' })),
        getExecutorStatus(estateId),
      ])
      setStatus(s)
      setChecklist(c)
      setDeathCert(dc)
      setForms(f.templates)
      setExecutorActivation(ea)
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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--gold)] border-t-transparent" />
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
            style={{ backgroundColor: 'rgba(124, 45, 18, 0.1)', color: 'var(--gold)' }}
          >
            {status?.stateCode || 'IL'} &middot; {status?.courtSystem || 'Cook County'}
          </Badge>
        }
      />

      {/* ── Phase Status Card ── */}
      {status && (
        <Card className="border-[var(--gold)]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
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
                <span className="text-slate-900/60">Expected Timeline</span>
                <p className="font-medium text-slate-900">{status.probableTimeline}</p>
              </div>
              <div>
                <span className="text-slate-900/60">E-Filing</span>
                <p className="font-medium text-slate-900">
                  {status.eFilingAvailable ? 'Available (Cook County eCourt)' : 'Paper filing required'}
                </p>
              </div>
              <div>
                <span className="text-slate-900/60">Progress</span>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progressPct} className="flex-1 h-2" />
                  <span className="font-medium text-slate-900">{progressPct}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Next Action (non-dead-end dashboard) ── */}
      {status && (
        <NextActionCard
          phase={status.currentPhase}
          deathCertConfirmed={deathCert?.confirmed || false}
          executorConfirmed={executorActivation?.status === 'confirmed'}
          completedCount={completedCount}
          totalItems={totalItems}
          hasDeadlines={(status.deadlines?.length || 0) > 0}
          overdueCount={status.deadlines?.filter(d => d.overdue).length || 0}
        />
      )}

      {/* ── Death Certificate Review ── */}
      {deathCert && !deathCert.confirmed && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Review Death Certificate Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-900/70 mb-4">
              AI analysis has extracted the following facts from the uploaded death certificate.
              Please review and confirm before proceeding.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
              {deathCert.decedentName && (
                <div><span className="text-slate-900/50">Summary</span><p className="font-medium">{deathCert.decedentName}</p></div>
              )}
              {deathCert.dateOfDeath && (
                <div><span className="text-slate-900/50">Date of Death</span><p className="font-medium">{deathCert.dateOfDeath}</p></div>
              )}
              {deathCert.countyOfDeath && (
                <div><span className="text-slate-900/50">County/Jurisdiction</span><p className="font-medium">{deathCert.countyOfDeath}</p></div>
              )}
              {deathCert.certificateNumber && (
                <div><span className="text-slate-900/50">Certificate #</span><p className="font-medium">{deathCert.certificateNumber}</p></div>
              )}
            </div>
            <p className="text-xs text-amber-700 mb-3">
              This is analysis assistance only. Verify all facts against the original document before confirming.
            </p>
            <Button
              onClick={async () => {
                setConfirmingCert(true)
                try {
                  await confirmDeathCert(estateId)
                  setDeathCert({ ...deathCert, confirmed: true })
                  toast.success('Death certificate confirmed')
                  fetchData()
                } catch {
                  toast.error('Failed to confirm death certificate')
                } finally {
                  setConfirmingCert(false)
                }
              }}
              disabled={confirmingCert}
              className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-white"
            >
              {confirmingCert ? 'Confirming...' : 'Confirm Death Certificate Facts'}
            </Button>
          </CardContent>
        </Card>
      )}

      {deathCert?.confirmed && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Confirmed</Badge>
              <span className="text-sm text-slate-900/70">Death certificate verified by executor</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Executor Confirmation ── */}
      {status?.currentPhase === 'death_reported' && !executorActivation?.status && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Confirm Your Role as Executor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-900/70 mb-4">
              A death has been reported for this estate. As the designated executor, you must confirm your role
              before probate proceedings can begin. By confirming, you accept responsibility for administering
              the estate according to Illinois law.
            </p>
            <Button
              onClick={async () => {
                setConfirmingExecutor(true)
                try {
                  await confirmExecutorRole(estateId)
                  toast.success('Executor role confirmed — you may now proceed with probate')
                  fetchData()
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to confirm executor role')
                } finally {
                  setConfirmingExecutor(false)
                }
              }}
              disabled={confirmingExecutor}
              className="bg-[var(--royal)] hover:bg-[var(--royal)]/90 text-white"
            >
              {confirmingExecutor ? 'Confirming...' : 'I Confirm My Role as Executor'}
            </Button>
          </CardContent>
        </Card>
      )}

      {executorActivation?.status === 'confirmed' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Executor Confirmed</Badge>
              <span className="text-sm text-slate-900/70">
                {executorActivation.executorName || 'Executor'} confirmed their role
                {executorActivation.confirmedAt && ` on ${new Date(executorActivation.confirmedAt).toLocaleDateString()}`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Multi-Executor Quorum ── */}
      <QuorumPanel estateId={estateId} />

      {/* ── Deadlines ── */}
      {status?.deadlines && status.deadlines.length > 0 && (
        <Card className="border-[var(--gold)]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">
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

      {/* ── Settlement Timeline (Gantt) ── */}
      {status?.deadlines && status.deadlines.length > 0 && (
        <Card className="border-[var(--gold)]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Settlement Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettlementGantt
              deadlines={status.deadlines}
              dateOfDeath={deathCert?.dateOfDeath}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Checklist ── */}
      {checklist && (
        <Card className="border-[var(--gold)]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Probate Checklist
              </CardTitle>
              <span className="text-sm text-slate-900/60">
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
                        : 'bg-white border-slate-900/10 hover:border-[var(--gold)]/30'
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
                        <span className={`font-medium text-sm ${isComplete ? 'line-through text-slate-900/40' : 'text-slate-900'}`}>
                          {item.order}. {item.title}
                        </span>
                        {item.required && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[var(--gold)]/30 text-[var(--gold)]">
                            Required
                          </Badge>
                        )}
                        {item.formRef && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[var(--royal)]/30 text-[var(--royal)]">
                            {item.formRef}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isComplete ? 'text-slate-900/30' : 'text-slate-900/60'}`}>
                        {item.description}
                      </p>
                      {item.formUrl && !isComplete && (
                        <a
                          href={item.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1.5 text-xs font-medium text-[var(--royal)] hover:underline"
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

      {/* ── Court Forms ── */}
      {forms.length > 0 && (
        <Card className="border-[var(--gold)]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Court Form Preparation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-700 mb-4 p-2 bg-amber-50 rounded border border-amber-200">
              These are draft preparation packets only — not legal filings or legal advice. Review all information for accuracy before filing with the court.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {forms.map((form) => (
                <div key={form.id} className="p-4 rounded-lg border border-slate-900/10 hover:border-[var(--gold)]/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-slate-900">{form.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[var(--royal)]/30 text-[var(--royal)]">
                          {form.formNumber}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-900/60 mb-2">{form.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(form.fields).filter(([, v]) => v).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/5 text-slate-900/50">
                            {k.replace(/([A-Z])/g, ' $1').trim()}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={form.courtUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[var(--royal)] hover:underline"
                    >
                      Official form &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Legal Disclaimer ── */}
      <p className="text-xs text-slate-900/40 text-center px-4">
        This checklist is preparation assistance only and does not constitute legal advice.
        Consult a licensed Illinois attorney for advice specific to your situation.
      </p>
    </div>
  )
}

// ── Next Action Card (non-dead-end per Codex B7) ──

function NextActionCard({ phase, deathCertConfirmed, executorConfirmed, completedCount, totalItems, hasDeadlines, overdueCount }: {
  phase: string
  deathCertConfirmed: boolean
  executorConfirmed: boolean
  completedCount: number
  totalItems: number
  hasDeadlines: boolean
  overdueCount: number
}) {
  const action = getNextAction(phase, deathCertConfirmed, executorConfirmed, completedCount, totalItems, hasDeadlines, overdueCount)

  return (
    <Card className="border-[var(--royal)]/20 bg-gradient-to-r from-slate-50 to-slate-100">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--royal)]/10 flex items-center justify-center shrink-0">
            <span className="text-lg">{action.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--royal)] text-sm">{action.title}</h3>
            <p className="text-sm text-slate-900/70 mt-1">{action.description}</p>
            {action.blockedReason && (
              <p className="text-xs text-amber-700 mt-2 p-2 bg-amber-50 rounded">{action.blockedReason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getNextAction(phase: string, deathCertConfirmed: boolean, executorConfirmed: boolean, completedCount: number, totalItems: number, hasDeadlines: boolean, overdueCount: number) {
  if (phase === 'active') {
    return {
      icon: '🛡️',
      title: 'Estate is Active',
      description: 'No probate action needed. This section will guide you through the process when the time comes. For now, focus on completing your estate plan — advance directives, beneficiary designations, and asset inventory.',
      blockedReason: null,
    }
  }

  if (phase === 'death_reported' && !deathCertConfirmed) {
    return {
      icon: '📋',
      title: 'Upload and Confirm Death Certificate',
      description: 'A death has been reported. Upload the certified death certificate to the document vault, then submit it for AI analysis. Review the extracted facts and confirm them to proceed.',
      blockedReason: null,
    }
  }

  if (phase === 'death_reported' && deathCertConfirmed && !executorConfirmed) {
    return {
      icon: '✋',
      title: 'Confirm Your Executor Role',
      description: 'The death certificate has been verified. The designated executor must now confirm their role to begin probate proceedings. Scroll down to the executor confirmation section.',
      blockedReason: null,
    }
  }

  if (phase === 'executor_confirmed') {
    return {
      icon: '⚖️',
      title: 'File Petition for Probate',
      description: 'You are confirmed as executor. The next step is to file the Petition for Probate (CCP0315) with the Cook County Circuit Court. Use the form preparation section below to pre-fill the petition with estate data. Once Letters of Office are received, transition the estate to "In Probate."',
      blockedReason: null,
    }
  }

  if (phase === 'in_probate') {
    if (overdueCount > 0) {
      return {
        icon: '🔴',
        title: `${overdueCount} Overdue Deadline${overdueCount > 1 ? 's' : ''}`,
        description: 'You have overdue items that need immediate attention. Check the deadlines section below and address overdue filings as soon as possible.',
        blockedReason: null,
      }
    }
    if (completedCount < totalItems) {
      return {
        icon: '📝',
        title: `Complete Checklist (${completedCount}/${totalItems})`,
        description: 'Work through the probate checklist items below. Mark each step as complete as you file documents, pay debts, and distribute assets. All items must be complete before closing the estate.',
        blockedReason: null,
      }
    }
    return {
      icon: '✅',
      title: 'Ready to Close',
      description: 'All checklist items are complete. Prepare the final accounting, obtain Receipt and Release from all beneficiaries, and file to close the estate with the court.',
      blockedReason: null,
    }
  }

  if (phase === 'probate_complete') {
    return {
      icon: '📊',
      title: 'File Final Accounting and Close',
      description: 'Probate proceedings are complete. File the final accounting with the court, distribute remaining assets to beneficiaries, and request discharge. Once the court approves, the estate can be formally closed.',
      blockedReason: null,
    }
  }

  if (phase === 'closed') {
    return {
      icon: '🏛️',
      title: 'Estate Closed',
      description: 'This estate has been formally closed. All distributions are complete and the court has discharged the executor. This record will be preserved for your family\'s reference.',
      blockedReason: null,
    }
  }

  if (phase === 'small_estate') {
    return {
      icon: '📄',
      title: 'Small Estate Affidavit Process',
      description: 'This estate qualifies for the small estate affidavit ($150K threshold, vehicles excluded). Wait at least 30 days after death, then present the affidavit to institutions holding estate property. No formal probate is required.',
      blockedReason: null,
    }
  }

  return {
    icon: 'ℹ️',
    title: 'Estate Settlement',
    description: 'View the checklist and deadlines below to track progress.',
    blockedReason: null,
  }
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
          : 'bg-white border-slate-900/10'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-900">{deadline.name}</span>
          {isOverdue && <Badge className="bg-red-100 text-red-700 text-[10px]">Overdue</Badge>}
          {isUrgent && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Urgent</Badge>}
        </div>
        <p className="text-xs text-slate-900/60 mt-0.5">{deadline.description}</p>
      </div>
      <div className="text-right ml-4 shrink-0">
        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-slate-900'}`}>
          {isOverdue
            ? `${Math.abs(deadline.daysFromNow)} days overdue`
            : `${deadline.daysFromNow} days`}
        </p>
        <p className="text-[10px] text-slate-900/40">
          {new Date(deadline.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
