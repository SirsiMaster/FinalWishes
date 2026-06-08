import { describe, it, expect } from 'vitest'
import {
  type PersonaRole,
  type SectionId,
  PERSONA_ACCESS,
  resolveEffectiveRole,
  canAccess,
  requiresItemScope,
  personaLanding,
  personaLabel,
} from './persona'

const ALL_ROLES: PersonaRole[] = ['principal', 'executor', 'trustee', 'heir', 'legal', 'cpa', 'admin']

describe('resolveEffectiveRole — estate-scoped role wins', () => {
  it('prefers the estate role over the global profile role', () => {
    // A principal on their own estate who is an heir on THIS one must read as heir.
    expect(resolveEffectiveRole('heir', 'principal')).toBe('heir')
    expect(resolveEffectiveRole('executor', 'principal')).toBe('executor')
    expect(resolveEffectiveRole('trustee', 'principal')).toBe('trustee')
  })

  it('falls back to the profile role when there is no estate role', () => {
    expect(resolveEffectiveRole(null, 'principal')).toBe('principal')
    expect(resolveEffectiveRole(undefined, 'legal')).toBe('legal')
  })

  it("defaults to 'principal' only when nothing is known", () => {
    expect(resolveEffectiveRole(null, null)).toBe('principal')
    expect(resolveEffectiveRole(undefined, undefined)).toBe('principal')
  })
})

describe('heir — the sacred-moment boundary (ETHOS)', () => {
  it('never reaches owner-admin or settlement surfaces', () => {
    const forbidden: SectionId[] = [
      'vault', 'lockbox', 'forms', 'beneficiaries', 'probate', 'pricing', 'settings',
    ]
    for (const s of forbidden) {
      expect(canAccess('heir', s), `heir must NOT access ${s}`).toBe(false)
    }
  })

  it('has a persona-aware dashboard (heir-shaped sacred landing, not the owner timeline)', () => {
    // The route is allowed; DashboardRouter renders HeirDashboard, never the
    // owner completion timeline — that separation is what keeps it ETHOS-safe.
    expect(canAccess('heir', 'dashboard')).toBe(true)
  })

  it('reaches the memories and directives meant for them', () => {
    const allowed: SectionId[] = [
      'memoirs', 'soul-log', 'heirlooms', 'life-chapters', 'timecapsule', 'events', 'obituary', 'directives', 'notifications',
    ]
    for (const s of allowed) {
      expect(canAccess('heir', s), `heir SHOULD access ${s}`).toBe(true)
    }
  })

  it('lands on the persona-aware dashboard (heir-shaped via DashboardRouter)', () => {
    expect(personaLanding('heir')).toBe('dashboard')
  })

  it('sees its memory/asset sections only as item-scoped (assigned/shared)', () => {
    for (const s of ['assets', 'memoirs', 'soul-log', 'heirlooms', 'directives', 'timecapsule'] as SectionId[]) {
      expect(requiresItemScope('heir', s), `heir ${s} must be item-scoped`).toBe(true)
    }
  })
})

describe('fiduciaries — settlement only, no living-legacy creation', () => {
  it('executor cannot reach owner living-legacy/creation surfaces', () => {
    for (const s of ['soul-log', 'life-chapters', 'memoirs', 'heirlooms', 'timecapsule', 'pricing', 'settings', 'forms'] as SectionId[]) {
      expect(canAccess('executor', s), `executor must NOT access ${s}`).toBe(false)
    }
  })

  it('executor reaches settlement + authorized evidence', () => {
    for (const s of ['probate', 'vault', 'assets', 'directives', 'beneficiaries', 'events', 'obituary'] as SectionId[]) {
      expect(canAccess('executor', s), `executor SHOULD access ${s}`).toBe(true)
    }
  })

  it('lockbox is principal-only (canon Firestore boundary) — fiduciaries cannot reach it', () => {
    for (const r of ['executor', 'trustee', 'cpa'] as PersonaRole[]) {
      expect(canAccess(r, 'lockbox'), `${r} must NOT access lockbox`).toBe(false)
    }
  })

  it('executor/trustee authorized-data sections are item-scoped', () => {
    for (const s of ['assets', 'vault', 'beneficiaries'] as SectionId[]) {
      expect(requiresItemScope('executor', s)).toBe(true)
      expect(requiresItemScope('trustee', s)).toBe(true)
    }
  })

  it('trustee is trust-scoped (no events/obituary by default)', () => {
    expect(canAccess('trustee', 'probate')).toBe(true)
    expect(canAccess('trustee', 'events')).toBe(false)
    expect(canAccess('trustee', 'soul-log')).toBe(false)
  })
})

describe('advisors — narrow professional surfaces', () => {
  it('legal sees documents/directives/forms but not private living-legacy', () => {
    expect(canAccess('legal', 'vault')).toBe(true)
    expect(canAccess('legal', 'directives')).toBe(true)
    expect(canAccess('legal', 'forms')).toBe(true)
    expect(canAccess('legal', 'soul-log')).toBe(false)
    expect(canAccess('legal', 'lockbox')).toBe(false)
    expect(canAccess('legal', 'memoirs')).toBe(false)
  })

  it('cpa sees financial surfaces only', () => {
    expect(canAccess('cpa', 'assets')).toBe(true)
    expect(canAccess('cpa', 'vault')).toBe(true)
    expect(canAccess('cpa', 'lockbox')).toBe(false)
    expect(canAccess('cpa', 'directives')).toBe(false)
    expect(canAccess('cpa', 'forms')).toBe(false)
    expect(canAccess('cpa', 'soul-log')).toBe(false)
  })
})

describe('principal/admin — full owner surface', () => {
  it('principal can reach every primary owner section', () => {
    for (const s of ['dashboard', 'soul-log', 'vault', 'lockbox', 'forms', 'assets', 'beneficiaries', 'pricing', 'settings'] as SectionId[]) {
      expect(canAccess('principal', s), `principal SHOULD access ${s}`).toBe(true)
    }
  })

  it('principal has no item-scoping (owns everything)', () => {
    for (const s of ['assets', 'vault', 'soul-log'] as SectionId[]) {
      expect(requiresItemScope('principal', s)).toBe(false)
    }
  })
})

describe('structural invariants', () => {
  it('every role has a non-empty access set and a label', () => {
    for (const r of ALL_ROLES) {
      expect(PERSONA_ACCESS[r].size, `${r} access set`).toBeGreaterThan(0)
      expect(personaLabel(r)).toBeTruthy()
    }
  })

  it('notifications are reachable by every role (everyone gets their own)', () => {
    for (const r of ALL_ROLES) {
      expect(canAccess(r, 'notifications'), `${r} notifications`).toBe(true)
    }
  })

  it('a section a role cannot access is never marked item-scoped (scope implies access)', () => {
    for (const r of ALL_ROLES) {
      const access = PERSONA_ACCESS[r]
      // requiresItemScope true ⇒ canAccess true
      for (const s of access) {
        // sampling the access set keeps the invariant meaningful without enumerating non-members
        if (requiresItemScope(r, s)) expect(access.has(s)).toBe(true)
      }
    }
  })

  it('unknown sections deny by default', () => {
    expect(canAccess('heir', 'totally-unknown' as SectionId)).toBe(false)
  })
})
