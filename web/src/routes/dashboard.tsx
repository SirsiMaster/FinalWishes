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
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to settle so a real Firebase user isn't bounced to /login
    // before their profile resolves.
    if (loading) return;

    // Prefer the authoritative auth context (covers BOTH real Firebase users
    // and demo sessions, since loadDemoSession() seeds the context too). Fall
    // back to the raw demo-session key only if the context hasn't populated.
    let estateSlug = profile?.primaryEstateId;
    if (!estateSlug) {
      try {
        const raw = localStorage.getItem('finalwishes_user');
        if (raw) estateSlug = JSON.parse(raw).primaryEstateId;
      } catch { /* ignore malformed session */ }
    }

    if (user || profile) {
      if (estateSlug) {
        navigate({ to: '/estates/$estateId/dashboard', params: { estateId: estateSlug }, replace: true });
      } else {
        navigate({ to: '/estates/create', replace: true });
      }
    } else {
      navigate({ to: '/login', search: {}, replace: true });
    }
  }, [navigate, user, profile, loading]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Redirecting...</span>
      </div>
    </div>
  );
}
