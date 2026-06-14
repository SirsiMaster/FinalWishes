import { createFileRoute } from '@tanstack/react-router'

// Route definition only — the 645-line component (which pulls in recharts via
// SettlementGantt) lives in estates.$estateId.probate.lazy.tsx so recharts is
// code-split out of the main entry chunk. See vite.config.ts manualChunks.
export const Route = createFileRoute('/estates/$estateId/probate')({})
