import { createFileRoute, Outlet, useParams, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { useEffect, useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Estate Owner',
  admin: 'Administrator',
  beneficiary: 'Beneficiary',
  executor: 'Legal Executor',
};

export const Route = createFileRoute('/estates/$estateId')({
  component: EstateLayout,
})

function EstateLayout() {
  const { estateId } = useParams({ from: '/estates/$estateId' });
  const navigate = useNavigate();
  const [estateName, setEstateName] = useState('Lockhart Estate');
  const [userRole, setUserRole] = useState('owner');

  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      setUserRole(u.role || 'owner');
      if (estateId === 'lockhart' || estateId === 'estate_lockhart') {
        setEstateName('Lockhart Estate');
      } else {
        setEstateName(u.primaryEstateName);
      }
    } else {
      navigate({ to: '/login', replace: true });
    }
  }, [estateId, navigate]);

  const roleLabel = ROLE_LABELS[userRole] || 'Member';

  return (
    <div className="dashboard-shell dashboard-theme themed-layout-bg min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:bg-[#133378] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      <Sidebar />
      <div
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{
          marginLeft: 'var(--sidebar-width)',
        }}
      >
        <AdminHeader title={estateName} subtitle={`${roleLabel} · Vault Secured · Active`} />
        <main id="main-content" className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
