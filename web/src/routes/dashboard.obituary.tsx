/**
 * Legacy route — parent /dashboard redirects to /estates/$estateId.
 * Stub exists only to keep TanStack Router file-based tree valid.
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/obituary')({
  component: () => null,
})
