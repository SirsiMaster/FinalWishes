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
const KEY = "fw_chunk_reloaded";

function reloadOnce(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode / quota) — fall through and reload.
  }
  window.location.reload();
}

const CHUNK_ERROR =
  /is not a valid JavaScript MIME type|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

// Vite emits this when a lazy import()'d chunk fails to preload.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnce();
});

// Catch the raw rejection too (the WebKit MIME error / Safari import failure
// surfaces as an unhandled promise rejection, not a vite:preloadError).
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as { message?: string } | string | undefined;
  const message = typeof reason === "string" ? reason : (reason?.message ?? "");
  if (CHUNK_ERROR.test(message)) reloadOnce();
});

// Mount watchdog + guard reset. A short while after load, check whether the app
// actually mounted (React renders into #root). The vite:preloadError/rejection
// handlers above only catch chunk/MIME failures — but a first-load bootstrap can
// also fail for OTHER reasons (a network transient during app init, a silent
// render throw) that leave #root empty with no chunk error, and NO recovery.
//   - Mounted  → clear the guard so a FUTURE failure can retry once.
//   - Empty    → reload once (the same session-guard prevents a reload loop; if the
//                second load is still empty the guard blocks further reloads, so a
//                genuinely-broken build degrades to a static blank, never a storm).
window.addEventListener("load", () => {
  setTimeout(() => {
    const root = document.getElementById("root");
    const mounted = !!root && root.childElementCount > 0;
    if (mounted) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    } else {
      reloadOnce();
    }
  }, 8000);
});

export {};
