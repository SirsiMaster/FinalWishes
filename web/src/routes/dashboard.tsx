/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/dashboard')({
  component: DashboardRedirect,
})

/** Legacy /dashboard route — redirects to scoped /estates/{id}/dashboard */
function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, profile, profileResolved } = useAuth();

  useEffect(() => {
    // Wait for a definitive profile answer before routing. Gating on
    // profileResolved (not `!loading`) ensures a returning user with an estate
    // isn't bounced to /estates/create while their profile read is still in
    // flight — `loading` only tracks Firebase auth init, not the profile fetch.
    if (!profileResolved) return;

    if (user) {
      const estateSlug = profile?.primaryEstateId;
      if (estateSlug) {
        navigate({ to: '/estates/$estateId/dashboard', params: { estateId: estateSlug }, replace: true });
      } else {
        navigate({ to: '/estates/create', replace: true });
      }
    } else {
      navigate({ to: '/login', search: {}, replace: true });
    }
  }, [navigate, user, profile, profileResolved]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--neutral-faint)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.2em]">Redirecting...</span>
      </div>
    </div>
  );
}
