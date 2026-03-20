/**
 * AuthGuard — Route Protection Component
 * 
 * Wraps protected routes. If the user is not authenticated,
 * redirects to /login. Shows a loading spinner while Firebase
 * determines auth state. Shows email verification banner if
 * the user's email hasn't been verified yet.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, emailVerified, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login', replace: true });
    }
  }, [user, loading, navigate]);

  const handleResendVerification = async () => {
    setResending(true);
    const result = await resendVerification();
    setResending(false);
    if (result.success) {
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 10000);
    }
  };

  // Loading state — premium spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <p className="text-[#133378]/60 text-sm font-medium tracking-wide">
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

  return (
    <>
      {/* Email verification banner */}
      {!emailVerified && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-[#C8A951] text-[#0F172A] text-center py-2.5 px-4 text-sm font-semibold shadow-md">
          <span>📧 Please verify your email address. Check your inbox for a verification link.</span>
          {verificationSent ? (
            <span className="ml-3 text-[#133378] font-bold">✓ Verification email sent!</span>
          ) : (
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="ml-3 underline font-bold text-[#133378] hover:text-[#1E3A5F] disabled:opacity-50 bg-transparent border-none cursor-pointer text-sm"
            >
              {resending ? 'Sending...' : 'Resend'}
            </button>
          )}
        </div>
      )}
      {/* Push content down when banner is visible */}
      {!emailVerified && <div className="h-[42px]" />}
      {children}
    </>
  );
}
