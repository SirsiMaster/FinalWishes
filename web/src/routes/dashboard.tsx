import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
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
      setEstateName(u.primaryEstateName);
    }
  }, []);

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
