/**
 * chunk-reload — recover from stale-deploy lazy-chunk load failures.
 *
 * After a deploy, a browser may still hold an old index that references a
 * content-hashed chunk (`/assets/<name>-<hash>.js`) which no longer exists. On
 * Firebase Hosting the catch-all SPA rewrite serves `index.html` (`text/html`)
 * for the missing file, so the dynamic import fails — in WebKit/iOS with
 * "'text/html' is not a valid JavaScript MIME type". Reload ONCE to fetch the
 * fresh index + chunks.
 *
 * The session-scoped once-guard prevents an infinite reload loop if the failure
 * is NOT deploy-related (e.g. a genuinely offline network), and is cleared after
 * a clean load so a future stale-deploy can still retry once.
 */
const KEY = 'fw_chunk_reloaded'

function reloadOnce(): void {
  try {
    if (sessionStorage.getItem(KEY)) return
    sessionStorage.setItem(KEY, '1')
  } catch {
    // sessionStorage unavailable (private mode / quota) — fall through and reload.
  }
  window.location.reload()
}

const CHUNK_ERROR =
  /is not a valid JavaScript MIME type|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

// Vite emits this when a lazy import()'d chunk fails to preload.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadOnce()
})

// Catch the raw rejection too (the WebKit MIME error / Safari import failure
// surfaces as an unhandled promise rejection, not a vite:preloadError).
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string } | string | undefined
  const message = typeof reason === 'string' ? reason : reason?.message ?? ''
  if (CHUNK_ERROR.test(message)) reloadOnce()
})

// After a clean load, clear the guard so a LATER stale-deploy can retry once.
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }, 5000)
})

export {}
