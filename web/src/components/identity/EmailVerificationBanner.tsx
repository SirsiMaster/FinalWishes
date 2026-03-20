/**
 * EmailVerificationBanner — Persistent nudge for unverified emails
 * 
 * Shows a gold notification banner when the user's email is not yet verified.
 * Includes a "Resend" button and auto-dismisses once verified.
 * 
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';

export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't render if no user, verified, or dismissed
  if (!user || emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    const result = await resendVerification();
    setSending(false);
    if (result.success) {
      setSent(true);
      // Reset "sent" after 10s so they can resend again
      setTimeout(() => setSent(false), 10000);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-[#C8A951]/10 via-[#C8A951]/[0.07] to-[#C8A951]/10 border-b border-[#C8A951]/20 px-8 py-3.5">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            {/* Mail icon */}
            <div className="w-8 h-8 rounded-xl bg-[#C8A951]/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8A951]" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
            <div>
              <p className="text-[#8B7332] font-bold text-[13px] leading-tight">
                Please verify your email address
              </p>
              <p className="text-[#C8A951]/70 text-[11px] font-medium mt-0.5">
                Check <span className="font-bold text-[#8B7332]">{user.email}</span> for a verification link{sent ? ' — just sent!' : '.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResend}
              disabled={sending || sent}
              className="px-5 py-2 rounded-xl bg-[#C8A951] hover:bg-[#B89941] text-white font-bold text-[11px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : sent ? (
                <span className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Sent
                </span>
              ) : 'Resend Email'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-[#C8A951]/10 transition-colors group"
              aria-label="Dismiss verification banner"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8A951]/40 group-hover:text-[#C8A951]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
