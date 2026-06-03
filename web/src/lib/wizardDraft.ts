/**
 * Estate-Creation Wizard Draft Persistence (device-local)
 *
 * Persists the in-progress intake wizard to localStorage so a user can leave
 * and resume on the same device. This is intentionally NOT Firestore: we do
 * NOT create a partial estate document until the user actually completes the
 * wizard and clicks "Create Estate". The draft is per-uid keyed so one user's
 * draft never leaks into another user's session on a shared device.
 *
 * All localStorage access is guarded in try/catch — storage may be disabled
 * (private mode, quota, SSR) and must never crash the wizard.
 */

const KEY_PREFIX = 'fw_wizard_draft_'

/** Current persisted-shape version. Bump if WizardData changes incompatibly. */
const DRAFT_VERSION = 1

/**
 * Time-to-live for a saved draft. It holds intake PII (name, state, marital/
 * family structure), so it must not linger on the device indefinitely — an
 * abandoned draft older than this is treated as absent and purged on next load.
 */
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Shape of the wizard payload we persist. Kept structurally compatible with the
 * `WizardData` interface in estates.create.tsx (which is the canonical source).
 * Declared independently here so this module has no import-time coupling to the
 * route component.
 */
export interface WizardDraftData {
  situation: 'planning' | 'after-loss' | null
  fullName: string
  stateOfResidence: string
  maritalStatus: string
  hasSpouse: boolean
  hasChildren: boolean
  numberOfChildren: number
  hasMinorChildren: boolean
  assets: string[]
  estateName: string
}

/** Envelope actually written to localStorage. */
export interface WizardDraft {
  version: number
  step: number
  data: WizardDraftData
  /** Epoch milliseconds of the last save. */
  savedAt: number
}

function keyFor(uid: string): string {
  return `${KEY_PREFIX}${uid}`
}

/**
 * Load a saved wizard draft for the given uid. Returns `null` when no usable
 * draft exists (absent, malformed, wrong version, or storage unavailable).
 */
export function loadWizardDraft(uid: string): WizardDraft | null {
  if (!uid) return null
  try {
    const raw = window.localStorage.getItem(keyFor(uid))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<WizardDraft>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== DRAFT_VERSION ||
      typeof parsed.step !== 'number' ||
      !parsed.data ||
      typeof parsed.data !== 'object'
    ) {
      return null
    }

    // Expire stale drafts so intake PII doesn't linger indefinitely on-device.
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      clearWizardDraft(uid)
      return null
    }

    return {
      version: DRAFT_VERSION,
      step: parsed.step,
      data: parsed.data as WizardDraftData,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    // Malformed JSON, blocked storage, or SSR — treat as "no draft".
    return null
  }
}

/**
 * Persist the current wizard state for the given uid. Silently no-ops if
 * storage is unavailable — persistence is best-effort and must never throw.
 */
export function saveWizardDraft(
  uid: string,
  payload: { data: WizardDraftData; step: number },
): void {
  if (!uid) return
  try {
    const draft: WizardDraft = {
      version: DRAFT_VERSION,
      step: payload.step,
      data: payload.data,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(keyFor(uid), JSON.stringify(draft))
  } catch {
    // Quota exceeded / storage disabled — best-effort, ignore.
  }
}

/** Remove any saved draft for the given uid (called on successful create or "Start over"). */
export function clearWizardDraft(uid: string): void {
  if (!uid) return
  try {
    window.localStorage.removeItem(keyFor(uid))
  } catch {
    // Storage disabled — nothing to clear.
  }
}
