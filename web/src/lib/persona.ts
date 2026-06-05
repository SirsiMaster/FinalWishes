/**
 * Persona access — single source of truth.
 *
 * Sidebar navigation, route guards, the Shepherd companion, and tests all import
 * from here so the three layers of persona safety (nav visibility, route
 * enforcement, persona experience) cannot drift apart.
 *
 * Spec + audit: docs/PERSONA_ACCESS_MATRIX.md
 * Mission: docs/CONTINUATION-PROMPT.md (v22.0)
 *
 * Two rules this module encodes:
 *   1. Effective role is ESTATE-SCOPED: estateUser.role wins over the global
 *      profile.role. A user who is `principal` on their own estate may be `heir`
 *      or `executor` on another. See resolveEffectiveRole().
 *   2. canAccess() is route-level allow/deny only. Sections marked in
 *      SCOPED_SECTIONS additionally require ITEM-LEVEL filtering (assigned /
 *      authorized / relevant only) — granting the route does NOT grant the data.
 */

export type PersonaRole =
  | 'principal'
  | 'executor'
  | 'trustee'
  | 'heir'
  | 'legal'
  | 'cpa'
  | 'admin';

/** Estate-scoped roles (no `admin` — admin is a global support role, not an estate persona). */
export type EstatePersonaRole = Exclude<PersonaRole, 'admin'>;

export type SectionId =
  | 'dashboard'
  | 'life-chapters'
  | 'soul-log'
  | 'memoirs'
  | 'heirlooms'
  | 'assets'
  | 'vault'
  | 'forms'
  | 'lockbox'
  | 'directives'
  | 'timecapsule'
  | 'beneficiaries'
  | 'events'
  | 'obituary'
  | 'probate'
  | 'notifications'
  | 'pricing'
  | 'settings'
  | 'attestation'
  | 'estates'
  | 'index';

export const PERSONA_LABELS: Record<PersonaRole, string> = {
  principal: 'Estate Owner',
  executor: 'Legal Executor',
  trustee: 'Trustee',
  heir: 'Beneficiary',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
  admin: 'Administrator',
};

const ALL_SECTIONS: SectionId[] = [
  'dashboard', 'life-chapters', 'soul-log', 'memoirs', 'heirlooms', 'assets',
  'vault', 'forms', 'lockbox', 'directives', 'timecapsule', 'beneficiaries',
  'events', 'obituary', 'probate', 'notifications', 'pricing', 'settings',
  'attestation', 'estates', 'index',
];

/**
 * Route-level access. Mirrors the Target matrix in docs/PERSONA_ACCESS_MATRIX.md §3.
 * Membership = "may reach this route." Item-level scope is enforced separately
 * via SCOPED_SECTIONS.
 *
 * admin currently mirrors principal (full) to avoid regressing internal support
 * access (Do-No-Harm). The boundary intent is "internal diagnostics/support only";
 * tightening admin to a support-only surface is tracked as a separate decision.
 */
export const PERSONA_ACCESS: Record<PersonaRole, ReadonlySet<SectionId>> = {
  principal: new Set(ALL_SECTIONS.filter((s) => s !== 'attestation')),
  admin: new Set(ALL_SECTIONS),

  executor: new Set<SectionId>([
    'dashboard', 'assets', 'vault', 'lockbox', 'directives', 'beneficiaries',
    'events', 'obituary', 'probate', 'notifications', 'attestation', 'estates', 'index',
  ]),

  trustee: new Set<SectionId>([
    'dashboard', 'assets', 'vault', 'lockbox', 'directives', 'beneficiaries',
    'probate', 'notifications', 'attestation', 'estates', 'index',
  ]),

  // Heir: sacred-moment first. NO owner dashboard, vault, lockbox, forms,
  // beneficiaries, probate, pricing, settings. Memory/asset sections are
  // assigned/shared only (see SCOPED_SECTIONS).
  heir: new Set<SectionId>([
    'life-chapters', 'soul-log', 'memoirs', 'heirlooms', 'assets', 'directives',
    'timecapsule', 'events', 'obituary', 'notifications', 'attestation', 'index',
  ]),

  legal: new Set<SectionId>([
    'dashboard', 'assets', 'vault', 'forms', 'directives', 'notifications',
    'attestation', 'estates', 'index',
  ]),

  cpa: new Set<SectionId>([
    'dashboard', 'assets', 'vault', 'lockbox', 'notifications', 'attestation',
    'estates', 'index',
  ]),
};

/**
 * Sections a persona may reach but which MUST be filtered to assigned /
 * authorized / relevant items only. Route access is necessary but not
 * sufficient — the view layer and backend must scope the data.
 */
export const SCOPED_SECTIONS: Partial<Record<PersonaRole, ReadonlySet<SectionId>>> = {
  executor: new Set<SectionId>(['assets', 'vault', 'lockbox', 'beneficiaries']),
  trustee: new Set<SectionId>(['assets', 'vault', 'lockbox', 'beneficiaries', 'probate']),
  heir: new Set<SectionId>([
    'life-chapters', 'soul-log', 'memoirs', 'heirlooms', 'assets', 'directives', 'timecapsule',
  ]),
  legal: new Set<SectionId>(['assets', 'vault', 'forms']),
  cpa: new Set<SectionId>(['assets', 'vault', 'lockbox']),
};

/**
 * Resolve the effective persona for THIS estate. Estate-scoped role wins over
 * the global profile role; fall back to 'principal' only when nothing is known.
 *
 * This is the fix for the leak in estates.$estateId.tsx / Sidebar.tsx, which
 * read profile.role and ignored the fetched estateUser.role.
 */
export function resolveEffectiveRole(
  estateUserRole?: PersonaRole | null,
  profileRole?: PersonaRole | null,
): PersonaRole {
  return estateUserRole ?? profileRole ?? 'principal';
}

/** Route-level allow/deny for a section. Does NOT imply item-level access. */
export function canAccess(role: PersonaRole, section: SectionId): boolean {
  return PERSONA_ACCESS[role]?.has(section) ?? false;
}

/** True when the section is reachable but its data must be item-scoped for this role. */
export function requiresItemScope(role: PersonaRole, section: SectionId): boolean {
  return SCOPED_SECTIONS[role]?.has(section) ?? false;
}

export function personaLabel(role: PersonaRole): string {
  return PERSONA_LABELS[role] ?? 'Member';
}

/**
 * The section a persona should land on / be redirected to when they hit a
 * forbidden route. Heirs land on shared memories (the closest existing
 * sacred-moment surface) until a dedicated heir landing route is built in
 * Phase 3 (persona dashboards).
 */
export function personaLanding(role: PersonaRole): SectionId {
  return role === 'heir' ? 'memoirs' : 'dashboard';
}
