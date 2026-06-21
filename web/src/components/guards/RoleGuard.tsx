import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useAuth } from '../../lib/auth'
import { useDocument, type EstateUser } from '../../lib/firestore'
import {
  resolveEffectiveRole,
  canAccess,
  personaLanding,
  personaLabel,
  type SectionId,
} from '../../lib/persona'

/* ─── Layer 2: route-level persona enforcement ───────────────────────────────
 * Sidebar hiding is not authorization. RoleGuard wraps the estate child Outlet
 * and blocks a persona from a section they may not see — even via direct URL.
 *
 * Two correctness rules (see docs/PERSONA_ACCESS_MATRIX.md):
 *   1. NEVER render children (private data) until the effective role is
 *      DEFINITIVE. While estateUser is still loading, the role can transiently
 *      read as the global profile role (e.g. principal), so we gate on the
 *      estateUser load AND profileResolved before deciding anything.
 *   2. A blocked persona sees a warm, Shepherd-toned "not your role" state and a
 *      way back to their own landing — no private data, no shame.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Known section ids that map to a guarded estate route segment. Exported for the
 *  persona-access invariant test. */
// eslint-disable-next-line react-refresh/only-export-components
export const GUARDED_SECTIONS = new Set<SectionId>([
  'dashboard', 'life-chapters', 'soul-log', 'memoirs', 'heirlooms', 'assets',
  'vault', 'forms', 'lockbox', 'directives', 'timecapsule', 'beneficiaries',
  'events', 'obituary', 'probate', 'notifications', 'pricing', 'settings',
  'attestation',
])

/**
 * Derive the section id from an estate child route path. Returns null for the
 * estate index / unmodelled segments (RoleGuard does not block those).
 * `/estates/<id>/vault` → 'vault'; `/estates/<id>` → null.
 * `.lazy` suffixes and query strings are already stripped by the router path.
 *
 * NOTE: This pure helper is exported from the guard module because the test
 * suite imports it from this module's stable public API. Extracting it to a
 * sibling file would require editing out-of-bucket consumers, so the
 * react-refresh/only-export-components warning is intentionally suppressed.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function sectionFromPath(pathname: string, estateId: string): SectionId | null {
  const parts = pathname.split('?')[0].split('/').filter(Boolean)
  const idx = parts.indexOf(estateId)
  const segment = idx >= 0 ? parts[idx + 1] : undefined
  if (!segment) return null
  return GUARDED_SECTIONS.has(segment as SectionId) ? (segment as SectionId) : null
}

function PendingState() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-royal uppercase tracking-[0.2em]">
          Preparing your space...
        </span>
      </div>
    </div>
  )
}

function BlockedState({
  estateId,
  role,
  section,
}: {
  estateId: string
  role: ReturnType<typeof resolveEffectiveRole>
  section: SectionId
}) {
  // Plain string (not the SectionId union) so the typed router accepts the
  // interpolated path, matching Sidebar's childTo pattern.
  const landingTo: string = `/estates/${estateId}/${personaLanding(role)}`
  return (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center">
      <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20">
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.4-3 8.2-7 9-4-0.8-7-4.6-7-9V7l7-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l1.8 1.8 3.2-3.6" />
        </svg>
      </div>
      <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-3">
        This isn't part of your role
      </h2>
      <p className="text-royal/40 font-bold text-[13px] uppercase tracking-widest max-w-md mx-auto leading-relaxed mb-2">
        As a <span className="text-[var(--gold)]">{personaLabel(role)}</span> for this estate,
        the <span className="text-[var(--gold)]">{section}</span> area is kept private to other members.
      </p>
      <p className="text-royal/50 text-[13px] max-w-md mx-auto leading-relaxed mb-8">
        Nothing is wrong — this space simply belongs to a different part of the estate.
        Let me take you back to where your journey continues.
      </p>
      <Link
        to={landingTo}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-royal text-white font-black text-[12px] uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
      >
        Return to your space
      </Link>
    </div>
  )
}

/**
 * Wrap estate child routes. Blocks the current section for personas who may not
 * access it; otherwise renders children unchanged.
 */
export function RoleGuard({ estateId, children }: { estateId: string; children: ReactNode }) {
  const { profile, loading: authLoading, profileResolved } = useAuth()
  const location = useLocation()

  const estateUserPath = profile?.uid ? `estate_users/${profile.uid}_${estateId}` : null
  const { data: estateUser, loading: estateUserLoading } = useDocument<EstateUser>(estateUserPath)

  // Gate 1 — role is not yet DEFINITIVE, or the user is not authenticated.
  // Render nothing that reveals data (an upstream AuthGuard handles redirect;
  // resolveEffectiveRole defaults to 'principal' when profile is null, so we
  // must not reach canAccess without a real profile).
  if (authLoading || !profileResolved || !profile || (estateUserPath !== null && estateUserLoading)) {
    return <PendingState />
  }

  const role = resolveEffectiveRole(estateUser?.role ?? null, profile?.role ?? null)
  const section = sectionFromPath(location.pathname, estateId)

  // Unmodelled segment (estate index, utility) — do not block.
  if (section && !canAccess(role, section)) {
    return <BlockedState estateId={estateId} role={role} section={section} />
  }

  return <>{children}</>
}
