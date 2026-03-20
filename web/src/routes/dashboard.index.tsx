/**
 * Legacy /dashboard/ route — parent /dashboard handles redirect to /estates/$estateId.
 * Stub exists only to keep TanStack Router file-based tree valid.
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/')({
  component: () => null,
})
