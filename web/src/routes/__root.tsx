import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/lib/auth'

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0B1D3A] to-[#133378]">
      <div className="max-w-lg text-center space-y-8 p-12">
        <h1
          className="text-6xl font-bold text-[#C8A951]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          404
        </h1>
        <h2
          className="text-2xl font-semibold text-white tracking-wide"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Page Not Found
        </h2>
        <p className="text-[#B0BEC5] text-[15px] leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-[#C8A951] hover:bg-[#B8993F] text-[#0B1D3A] px-10 py-3 rounded-xl font-bold text-[14px] tracking-wider transition-all"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  component: () => (
    <AuthProvider>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  ),
})
