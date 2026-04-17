/**
 * ShepherdNudge — Proactive Inline Nudge Card
 *
 * A small, dismissible inline card that appears contextually on specific pages
 * when conditions are met. Uses localStorage for dismissal persistence so
 * nudges don't reappear once dismissed.
 *
 * Design: warm gold accent (#C8A951), subtle, not intrusive.
 * Uses shadcn Card + Button components.
 *
 * @version 1.0.0
 */
import { useState, useCallback, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

// ─── Dismissal Persistence ──────────────────────────────────────────────────

function getDismissalKey(estateId: string, nudgeId: string): string {
  return `fw_nudge_dismissed_${estateId}_${nudgeId}`
}

function isNudgeDismissed(estateId: string, nudgeId: string): boolean {
  try {
    return localStorage.getItem(getDismissalKey(estateId, nudgeId)) === '1'
  } catch {
    return false
  }
}

function dismissNudge(estateId: string, nudgeId: string): void {
  try {
    localStorage.setItem(getDismissalKey(estateId, nudgeId), '1')
  } catch {
    // localStorage unavailable — nudge will reappear next visit
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ShepherdNudgeProps {
  message: string
  ctaLabel?: string
  ctaRoute?: string
  onDismiss: () => void
}

export function ShepherdNudge({ message, ctaLabel, ctaRoute, onDismiss }: ShepherdNudgeProps) {
  return (
    <Card className="rounded-2xl border-[#C8A951]/25 bg-gradient-to-r from-[#FFFBEB] to-[#FEF9E7] shadow-sm overflow-hidden">
      <CardContent className="px-5 py-4 flex items-start gap-3">
        {/* Shepherd compass icon */}
        <div className="w-8 h-8 rounded-xl bg-[#C8A951]/12 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8A951]" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" stroke="none" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[13px] text-[#0F172A]/80 leading-relaxed font-medium">
            {message}
          </p>
          {ctaLabel && ctaRoute && (
            <Button asChild variant="ghost" size="sm" className="text-[#C8A951] hover:text-[#B8952F] hover:bg-[#C8A951]/10 -ml-3 font-semibold text-xs h-7 px-3">
              <Link to={ctaRoute as '/'}>
                {ctaLabel}
              </Link>
            </Button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#C8A951]/40 hover:text-[#C8A951] hover:bg-[#C8A951]/10 transition-colors flex-shrink-0"
          aria-label="Dismiss nudge"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </CardContent>
    </Card>
  )
}

// ─── Hook: useShepherdNudge ─────────────────────────────────────────────────

/**
 * Hook that manages visibility of a Shepherd nudge with localStorage persistence.
 *
 * Returns `{ visible, dismiss }` — visible is false if the nudge was already dismissed
 * or if the condition is not met.
 */
export function useShepherdNudge(
  estateId: string,
  nudgeId: string,
  condition: boolean,
): { visible: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(() => isNudgeDismissed(estateId, nudgeId))

  // Re-check if estateId or nudgeId changes
  useEffect(() => {
    setDismissed(isNudgeDismissed(estateId, nudgeId))
  }, [estateId, nudgeId])

  const dismiss = useCallback(() => {
    dismissNudge(estateId, nudgeId)
    setDismissed(true)
  }, [estateId, nudgeId])

  return {
    visible: condition && !dismissed,
    dismiss,
  }
}
