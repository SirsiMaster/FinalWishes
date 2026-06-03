/**
 * useResumables — surfaces IN-PROGRESS work so a returning user can pick up
 * exactly where they left off.
 *
 * This is read-only and deliberately resilient: each source contributes
 * independently, and any source that errors or is empty simply adds nothing.
 * It reuses the existing real-time Firestore hooks (no new firebase client) and
 * the device-local wizard-draft helper.
 *
 * Sources (all scoped to the CURRENT estate — this hook runs inside the estate
 * Shepherd companion, so estate-level drafts are the only relevant work):
 *   1. Draft directives  — estates/{estateId}/directives where status == 'draft'.
 *   2. Draft obituary     — estates/{estateId}/governance/obituary, status Draft.
 *
 * NOTE: the device-local estate-CREATION wizard draft is deliberately NOT
 * surfaced here — Shepherd only renders inside an existing estate, so "finish
 * creating your estate" would be nonsensical on a real estate dashboard.
 */
import { useMemo } from 'react'
import { useDirectives, useDocument } from './firestore'

/** A single piece of unfinished work the user can jump back into. */
export interface Resumable {
  id: string
  label: string
  /** Coarse origin, for iconography/grouping if a consumer wants it. */
  kind: 'directive' | 'obituary'
  /** Where to send the user — sub-routes relative to /estates/{estateId}. */
  route: string
  /** Epoch milliseconds of last edit, when known — newest first. */
  updatedAt?: number
}

interface ObitDoc {
  status?: string
  last_updated?: { toDate?: () => Date } | null
}

/** Firestore Timestamp-ish → epoch ms, tolerant of missing/odd shapes. */
function tsToMillis(ts: { toDate?: () => Date } | null | undefined): number | undefined {
  if (!ts || typeof ts.toDate !== 'function') return undefined
  try {
    return ts.toDate().getTime()
  } catch {
    return undefined
  }
}

export function useResumables(estateId: string | null): Resumable[] {
  // Real-time draft directives (the hook already orders by createdAt desc).
  const { data: directives } = useDirectives(estateId)

  // The single obituary governance doc — null path short-circuits the snapshot.
  const obitPath = estateId ? `estates/${estateId}/governance/obituary` : null
  const { data: obit } = useDocument<ObitDoc>(obitPath)

  return useMemo<Resumable[]>(() => {
    const items: Resumable[] = []

    // 1. Draft directives.
    for (const d of directives ?? []) {
      if (d.status !== 'draft') continue
      items.push({
        id: `directive:${d.id}`,
        label: d.title?.trim() || 'Untitled message',
        kind: 'directive',
        route: 'directives',
        updatedAt: tsToMillis(d.updatedAt as unknown as { toDate?: () => Date }),
      })
    }

    // 2. Draft obituary.
    const obitStatus = obit?.status?.toLowerCase()
    if (obitStatus === 'draft') {
      items.push({
        id: 'obituary',
        label: 'Finish the obituary',
        kind: 'obituary',
        route: 'obituary',
        updatedAt: tsToMillis(obit?.last_updated),
      })
    }

    // Newest work first; items without a timestamp sink to the bottom.
    return items.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  }, [directives, obit])
}
