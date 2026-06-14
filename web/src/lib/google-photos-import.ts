/**
 * Google Photos import (CR-12, ADR-045) — Picker API, minimal scope.
 *
 * Flow (all server-mediated for the actual media download):
 *   1. Obtain a scoped Google OAuth access token via Google Identity Services (GIS) —
 *      NOT Firebase signInWithPopup, because a FinalWishes user may have signed in with
 *      email/password; GIS issues a photospicker-scoped token without touching their
 *      Firebase session.
 *   2. POST  /api/v1/heirlooms/{estateId}/google-photos/session   (X-Google-Photos-Token)
 *      → { id, pickerUri, pollingConfig }
 *   3. Open `pickerUri` — the user picks photos in Google's own UI (read-only, no library
 *      enumeration).
 *   4. Poll GET …/session/{id} until `mediaItemsSet === true`.
 *   5. POST …/import { accessToken, sessionId } → the Go API downloads + de-dups + stores
 *      the picked images as heirlooms.
 *
 * OWNER PREREQUISITES (without these the OAuth popup fails):
 *   - Enable the Google Photos Picker API on finalwishes-prod.
 *   - Add scope `…/auth/photospicker.mediaitems.readonly` to the OAuth consent screen.
 *   - Set `VITE_GOOGLE_OAUTH_CLIENT_ID` (the project's Web OAuth client id) at build time.
 */
import { auth } from './firebase'
import { API_BASE } from './client'

const PICKER_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export interface PhotoImportResult {
  imported: number
  skipped: number
}

// Minimal shape of the GIS token client we use (avoids a full @types/google.accounts dep).
interface GisTokenResponse { access_token?: string; error?: string }
interface GisTokenClient { requestAccessToken: (overrides?: { prompt?: string }) => void }
interface GisOAuth2 {
  initTokenClient: (cfg: {
    client_id: string
    scope: string
    callback: (resp: GisTokenResponse) => void
  }) => GisTokenClient
}
type GisWindow = Window & { google?: { accounts?: { oauth2?: GisOAuth2 } } }

/**
 * Whether the Google Photos import is provisioned in this build. Import requires a
 * build-time Web OAuth client id (`VITE_GOOGLE_OAUTH_CLIENT_ID`); without it every
 * import attempt throws "not configured", so callers should hide/disable the entry
 * point rather than letting users click into a guaranteed error. (See the OWNER
 * PREREQUISITES header — the Picker API + consent-screen scope are the other two
 * steps, but only the client id is observable at build time on the client.)
 */
export const isGooglePhotosImportConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)

let gisLoading: Promise<void> | null = null

function loadGis(): Promise<void> {
  const w = window as GisWindow
  if (w.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoading) return gisLoading
  gisLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => {
      // Reset so a later call retries rather than returning this permanently-rejected
      // Promise for the rest of the page session (claude-home PR #5 review obs 1).
      gisLoading = null
      reject(new Error('Failed to load Google sign-in'))
    }
    document.head.appendChild(s)
  })
  return gisLoading
}

/** Get a photospicker-scoped Google OAuth access token via GIS. */
async function getPickerAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined
  if (!clientId) {
    throw new Error('Google Photos import is not configured (missing OAuth client id).')
  }
  await loadGis()
  const oauth2 = (window as GisWindow).google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google sign-in failed to initialize')

  return new Promise<string>((resolve, reject) => {
    // GIS does not reliably fire its callback if the user dismisses the popup via the
    // window-X (no grant/deny) — bound the wait so the Promise can't hang forever
    // (claude-home PR #5 review obs 2).
    const timeoutId = setTimeout(
      () => reject(new Error('Google sign-in timed out — please try again')),
      90_000,
    )
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: PICKER_SCOPE,
      callback: (resp) => {
        clearTimeout(timeoutId)
        if (resp.error || !resp.access_token) {
          reject(new Error('Google Photos access was not granted'))
          return
        }
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}

async function firebaseIdToken(): Promise<string> {
  const t = await auth.currentUser?.getIdToken()
  if (!t) throw new Error('You must be signed in to import photos')
  return t
}

/**
 * Run the full Google Photos import for an estate. `onStatus` receives human-readable
 * progress strings. Resolves with the imported/skipped counts; rejects on failure or if
 * the user cancels without selecting anything.
 */
export async function importFromGooglePhotos(
  estateId: string,
  onStatus?: (status: string) => void,
): Promise<PhotoImportResult> {
  onStatus?.('Connecting to Google Photos…')
  const accessToken = await getPickerAccessToken()
  const idToken = await firebaseIdToken()

  const base = `${API_BASE}/api/v1/heirlooms/${estateId}/google-photos`
  const pickerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
    'X-Google-Photos-Token': accessToken,
  }

  // 1. Create the picking session.
  const sessRes = await fetch(`${base}/session`, { method: 'POST', headers: pickerHeaders })
  if (!sessRes.ok) throw new Error('Could not start the Google Photos picker')
  const session = await sessRes.json()
  const sessionId: string | undefined = session.id || session.sessionId
  const pickerUri: string | undefined = session.pickerUri
  if (!sessionId || !pickerUri) throw new Error('Google Photos returned an invalid picker session')

  // 2. Open the picker so the user can choose photos.
  onStatus?.('Choose your photos in the Google Photos window…')
  const pickerWindow = window.open(pickerUri, 'finalwishes-gphotos', 'width=480,height=760')

  // 3. Poll until the user has finished selecting (mediaItemsSet) or gives up.
  const deadline = Date.now() + 5 * 60 * 1000
  let selected = false
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000))
    const pollRes = await fetch(`${base}/session/${sessionId}`, { headers: pickerHeaders })
    if (pollRes.ok) {
      const s = await pollRes.json()
      if (s.mediaItemsSet) { selected = true; break }
    }
    if (pickerWindow && pickerWindow.closed) {
      const finalRes = await fetch(`${base}/session/${sessionId}`, { headers: pickerHeaders })
      if (finalRes.ok && (await finalRes.json()).mediaItemsSet) selected = true
      break
    }
  }
  try { pickerWindow?.close() } catch { /* ignore */ }
  if (!selected) throw new Error('No photos were selected')

  // 4. Server-side import of the picked items.
  onStatus?.('Saving your photos to the family vault…')
  const importRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ accessToken, sessionId }),
  })
  if (!importRes.ok) throw new Error('Could not import the selected photos')
  const result = await importRes.json()
  return { imported: Number(result.imported) || 0, skipped: Number(result.skipped) || 0 }
}
