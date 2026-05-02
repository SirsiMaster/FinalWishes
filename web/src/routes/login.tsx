import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ search }) => {
    // Redirect to landing page with login modal open
    // Preserve invite and demo params
    const s = search as Record<string, string | undefined>;
    throw redirect({
      to: '/',
      search: {
        login: 'true',
        ...(s.invite ? { invite: s.invite } : {}),
        ...(s.demo ? { demo: s.demo } : {}),
      },
    });
  },
})
