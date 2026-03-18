import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '../components/layout/Sidebar'
import { AdminHeader } from '../components/layout/AdminHeader'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="dashboard-shell min-h-screen">
      <Sidebar />
      <div 
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ 
          marginLeft: 'var(--sidebar-width)',
          backgroundColor: '#fcfdfe'
        }}
      >
        <AdminHeader title="Operations Command" subtitle="Estate Status: Active · 34% Complete" />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
