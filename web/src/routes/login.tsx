import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => ({
    invite: (search.invite as string) ?? undefined,
  }),
  beforeLoad: ({ search }) => {
    // Redirect to landing page with login modal open, preserving invite param.
    const s = search as Record<string, string | undefined>;
    throw redirect({
      to: '/',
      search: {
        login: 'true',
        ...(s.invite ? { invite: s.invite } : {}),
      },
    });
  },
})
