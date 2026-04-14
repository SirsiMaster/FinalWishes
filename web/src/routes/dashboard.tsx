import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardRedirect,
})

/** Legacy /dashboard route — redirects to scoped /estates/{id}/dashboard */
function DashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const estateSlug = u.primaryEstateId === 'estate_lockhart' ? 'lockhart' : u.primaryEstateId;
      if (estateSlug) {
        navigate({ to: '/estates/$estateId/dashboard', params: { estateId: estateSlug }, replace: true });
      } else {
        navigate({ to: '/estates/create', replace: true });
      }
    } else {
      navigate({ to: '/login', replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Redirecting...</span>
      </div>
    </div>
  );
}
