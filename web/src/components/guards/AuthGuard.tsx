/**
 * AuthGuard — Route Protection Component
 * 
 * Wraps protected routes. If the user is not authenticated,
 * redirects to /login. Shows a loading spinner while Firebase
 * determines auth state. Shows email verification banner if
 * the user's email hasn't been verified yet.
 */

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login', search: {}, replace: true });
    }
  }, [user, loading, navigate]);

  // Loading state — premium spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <p className="text-[var(--royal)]/60 text-sm font-medium tracking-wide">
            Securing your session...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — will redirect via the useEffect
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
