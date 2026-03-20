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
    if (loading) return;

    if (user && profile) {
      const estateSlug = profile.primaryEstateId === 'estate_lockhart' ? 'lockhart' : (profile.primaryEstateId || 'lockhart');
      navigate({ to: '/estates/$estateId/dashboard', params: { estateId: estateSlug }, replace: true });
    } else if (!user) {
      navigate({ to: '/login', replace: true });
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Redirecting...</span>
      </div>
    </div>
  );
}

