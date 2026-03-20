import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { Sidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { AuthGuard } from '../components/guards/AuthGuard'
import { IdentityGate } from '../components/guards/IdentityGate'
import { useAuth } from '../lib/auth'
import { useEffect } from 'react'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Estate Owner',
  principal: 'Estate Owner',
  admin: 'Administrator',
  beneficiary: 'Beneficiary',
  heir: 'Beneficiary',
  executor: 'Legal Executor',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
};

export const Route = createFileRoute('/estates/$estateId')({
  component: EstateLayout,
})

function EstateLayout() {
  const { estateId } = useParams({ from: '/estates/$estateId' });
  const { profile } = useAuth();

  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    }
  }, []);

  const userRole = profile?.role || 'principal';
  const estateName = profile?.primaryEstateName || 'My Estate';

  // Check for demo mode — preserve Lockhart demo data
  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
  const displayEstateName = (isDemo && (estateId === 'lockhart' || estateId === 'estate_lockhart'))
    ? 'Lockhart Estate'
    : estateName;

  const roleLabel = ROLE_LABELS[userRole] || 'Member';

  return (
    <AuthGuard>
      <div className="dashboard-shell dashboard-theme themed-layout-bg min-h-screen">
        <Sidebar />
        <div 
          className="transition-all duration-300 min-h-screen flex flex-col"
          style={{ 
            marginLeft: 'var(--sidebar-width)',
          }}
        >
          <AdminHeader title={displayEstateName} subtitle={`${roleLabel} · Vault Secured · Active`} />
          <main className="flex-1 p-8">
            <IdentityGate estateId={estateId}>
              <Outlet />
            </IdentityGate>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

