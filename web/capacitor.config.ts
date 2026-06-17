import type { CapacitorConfig } from '@capacitor/cli'

// FinalWishes iOS shell (Capacitor).
//
// "Web app first, then convert to Apple" — this wraps the SAME Vite build that
// ships at finalwishes-prod.web.app inside a native iOS WKWebView. webDir points
// at Vite's default output (web/dist); assets are BUNDLED into the app (served
// from capacitor://localhost), so the app is offline-capable and is a real
// native binary, not a thin remote web-view (which Apple rejects).
//
// Bundle id follows the Sirsi reverse-DNS convention (cf. ai.sirsi.pantheon).
const config: CapacitorConfig = {
  appId: 'ai.sirsi.finalwishes',
  appName: 'FinalWishes',
  webDir: 'dist',
  ios: {
    // Royal Neo-Deco — match the web app's Royal Blue chrome behind the webview
    // so there is no white flash on launch / behind the safe-area insets.
    backgroundColor: '#133378',
    contentInset: 'always',
  },
}

export default config
