import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { Sidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/estates/$estateId')({
  component: EstateLayout,
})

function EstateLayout() {
  const { estateId } = useParams({ from: '/estates/$estateId' });
  const [estateName, setEstateName] = useState('Lockhart Estate');

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
      // If we are on Tameeka, we know it's Lockhart Estate for now
      if (estateId === 'lockhart' || estateId === 'estate_lockhart') {
        setEstateName('Lockhart Estate');
      } else {
        setEstateName(u.primaryEstateName);
      }
    }
  }, [estateId]);

  return (
    <div className="dashboard-shell dashboard-theme themed-layout-bg min-h-screen">
      <Sidebar />
      <div 
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ 
          marginLeft: 'var(--sidebar-width)',
        }}
      >
        <AdminHeader title="Operations Command" subtitle={`Estate: ${estateName} · Vault: Secured · Status: Active`} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
