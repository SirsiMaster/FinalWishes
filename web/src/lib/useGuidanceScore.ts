/**
 * useGuidanceScore — fetches the Shepherd guidance Score for an estate.
 *
 * The backend (api/internal/guidance/handler.go) computes a deterministic plan:
 * ordered steps, a trustworthy `nextAction` (lowest-priority incomplete core
 * step), and a completion percentage over completable steps. This hook is the
 * single source the Shepherd front-door companion and the dashboard share.
 */
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { API_BASE } from './client'

export interface ShepherdStep {
  id: string
  label: string
  description: string
  category: string
  complete: boolean
  route: string
  priority: number
  /** Situational/informational step with no auto-complete signal. */
  optional?: boolean
}

export interface ShepherdScore {
  estateId: string
  completionPercent: number
  completedSteps: number
  totalSteps: number
  steps: ShepherdStep[]
  nextAction: ShepherdStep | null
  insight: string
}

export function useGuidanceScore(estateId: string | null): {
  score: ShepherdScore | null
  loading: boolean
  refresh: () => void
} {
  const { user } = useAuth()
  const [score, setScore] = useState<ShepherdScore | null>(null)
  // Start false; the async fetch flips it to true on entry, then back to false.
  // (Avoids a synchronous setState in the effect body — this app has a history
  // of render-cascade bugs from that pattern.)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user || !estateId) return
    let cancelled = false
    // Abort the in-flight fetch on unmount/estate-change so navigating away mid-request
    // doesn't log a console error for a cancelled cross-origin request (the score call
    // takes ~1.3s; a fast route change would otherwise surface as a spurious network/CORS
    // error). The endpoint itself returns 200 + CORS — this only suppresses cancel noise.
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${API_BASE}/api/v1/guidance/score?estate_id=${estateId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!cancelled) {
          // Clear stale score on failure so we never show a prior estate's plan.
          setScore(res.ok ? ((await res.json()) as ShepherdScore) : null)
        }
      } catch (e) {
        // Non-fatal: companion degrades gracefully when the score is unavailable.
        // An AbortError on unmount is expected — not a failure, leave score as-is.
        if (!cancelled && (e as Error)?.name !== 'AbortError') setScore(null)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user, estateId, tick])

  return { score, loading, refresh: () => setTick((t) => t + 1) }
}
