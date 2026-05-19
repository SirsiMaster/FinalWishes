/**
 * QuorumPanel — Multi-Executor Approval UI
 *
 * Displays pending quorum actions and allows executors to vote.
 * Only renders when quorum is enabled (2+ executors on the estate).
 *
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getQuorumConfig,
  listQuorumActions,
  proposeQuorumAction,
  voteOnQuorumAction,
  type QuorumConfig,
  type QuorumAction,
} from '@/lib/probate'

interface QuorumPanelProps {
  estateId: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  phase_transition: 'Phase Transition',
  asset_distribution: 'Asset Distribution',
  document_sign: 'Document Signing',
}

export function QuorumPanel({ estateId }: QuorumPanelProps) {
  const { user } = useAuth()
  const [config, setConfig] = useState<QuorumConfig | null>(null)
  const [actions, setActions] = useState<QuorumAction[]>([])
  const [loading, setLoading] = useState(true)
  const [proposeOpen, setProposeOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [cfg, acts] = await Promise.all([
        getQuorumConfig(estateId),
        listQuorumActions(estateId),
      ])
      setConfig(cfg)
      setActions(acts)
    } catch {
      // Quorum not configured — hide the panel
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [estateId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !config?.enabled) return null

  const pendingActions = actions.filter((a) => a.status === 'pending')
  const resolvedActions = actions.filter((a) => a.status !== 'pending')

  return (
    <Card className="border-[#7C2D12]/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#0F172A]">
            Executor Quorum
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-[#7C2D12]/30 text-[#7C2D12]">
              {config.requiredVotes} of {config.totalExecutors} required
            </Badge>
            <Button
              onClick={() => setProposeOpen(true)}
              size="sm"
              className="bg-[#133378] hover:bg-[#133378]/90 text-white text-xs h-7 px-3"
            >
              Propose Action
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pendingActions.length === 0 && resolvedActions.length === 0 && (
          <p className="text-sm text-[#0F172A]/50 text-center py-6">
            No quorum actions yet. Propose an action that requires multi-executor approval.
          </p>
        )}

        {pendingActions.length > 0 && (
          <div className="space-y-3 mb-4">
            <h4 className="text-xs font-bold text-[#0F172A]/60 uppercase tracking-wider">
              Pending Votes
            </h4>
            {pendingActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                estateId={estateId}
                currentUid={user?.uid || ''}
                onVoted={fetchData}
              />
            ))}
          </div>
        )}

        {resolvedActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#0F172A]/60 uppercase tracking-wider">
              Resolved
            </h4>
            {resolvedActions.slice(0, 5).map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                estateId={estateId}
                currentUid={user?.uid || ''}
                onVoted={fetchData}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ProposeDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
        estateId={estateId}
        onProposed={fetchData}
      />
    </Card>
  )
}

function ActionCard({
  action,
  estateId,
  currentUid,
  onVoted,
}: {
  action: QuorumAction
  estateId: string
  currentUid: string
  onVoted: () => void
}) {
  const [voting, setVoting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const hasVoted = action.votes.some((v) => v.executorUid === currentUid)
  const isPending = action.status === 'pending'
  const approveCount = action.votes.filter((v) => v.decision === 'approve').length
  const rejectCount = action.votes.filter((v) => v.decision === 'reject').length

  const handleVote = async (decision: 'approve' | 'reject', reason?: string) => {
    setVoting(true)
    try {
      await voteOnQuorumAction(estateId, action.id, decision, reason)
      toast.success(`Vote recorded: ${decision}`)
      onVoted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record vote')
    } finally {
      setVoting(false)
      setShowReject(false)
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${STATUS_STYLES[action.status] || 'border-[#0F172A]/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-[#0F172A]">{action.description}</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              {ACTION_TYPE_LABELS[action.actionType] || action.actionType}
            </Badge>
          </div>
          <p className="text-xs text-[#0F172A]/50">
            Proposed by {action.proposedByName} &middot;{' '}
            {new Date(action.proposedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${STATUS_STYLES[action.status]}`}
        >
          {action.status === 'pending'
            ? `${approveCount}/${action.requiredVotes} votes`
            : action.status}
        </Badge>
      </div>

      {/* Vote indicators */}
      {action.votes.length > 0 && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {action.votes.map((v) => (
            <span
              key={v.executorUid}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                v.decision === 'approve'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {v.decision === 'approve' ? '✓' : '✗'} {v.executorName}
            </span>
          ))}
        </div>
      )}

      {/* Vote buttons (only for pending actions where user hasn't voted) */}
      {isPending && !hasVoted && (
        <div className="mt-3 space-y-2">
          {!showReject ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleVote('approve')}
                disabled={voting}
                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-4"
              >
                {voting ? 'Voting...' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReject(true)}
                disabled={voting}
                className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7 px-4"
              >
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="text-xs min-h-[60px] rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleVote('reject', rejectReason)}
                  disabled={voting}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-4"
                >
                  {voting ? 'Submitting...' : 'Confirm Rejection'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReject(false)}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isPending && hasVoted && (
        <p className="text-xs text-[#0F172A]/40 mt-2 italic">You have already voted on this action</p>
      )}
    </div>
  )
}

function ProposeDialog({
  open,
  onOpenChange,
  estateId,
  onProposed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  estateId: string
  onProposed: () => void
}) {
  const [actionType, setActionType] = useState('phase_transition')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Please describe the proposed action')
      return
    }
    setSubmitting(true)
    try {
      await proposeQuorumAction(estateId, actionType, description.trim())
      toast.success('Action proposed — other executors have been notified')
      setDescription('')
      onOpenChange(false)
      onProposed()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to propose action')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0F172A]">
            Propose Quorum Action
          </DialogTitle>
          <DialogDescription className="text-sm text-[#0F172A]/50">
            This action requires approval from at least 2 executors before it can proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full rounded-lg border border-[#0F172A]/10 px-3 py-2 text-sm"
            >
              <option value="phase_transition">Phase Transition</option>
              <option value="asset_distribution">Asset Distribution</option>
              <option value="document_sign">Document Signing</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0F172A]/60 uppercase tracking-wider">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the action that needs executor approval..."
              className="text-sm min-h-[80px] rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="bg-[#133378] hover:bg-[#133378]/90 text-white text-sm"
          >
            {submitting ? 'Proposing...' : 'Propose Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
