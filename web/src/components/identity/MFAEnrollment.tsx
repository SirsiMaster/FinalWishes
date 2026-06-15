/**
 * MFAEnrollment — Shared TOTP Enrollment Component
 * 
 * Reusable MFA enrollment UI for both dashboard and estate-scoped settings.
 * Shows QR code enrollment, 6-digit verification, and status display.
 * Role-aware: fiduciaries see "Required" badge, principals see "Optional".
 * 
 * @version 1.0.0
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { startTotpEnrollment, finalizeTotpEnrollment, unenrollTotp } from '../../lib/mfa';
import type { TotpSecret, User } from 'firebase/auth';

interface MFAEnrollmentProps {
  user: User | null;
  mfaStatus: { enrolled: boolean; methods: string[] };
  isFiduciary: boolean;
}

export function MFAEnrollment({ user, mfaStatus, isFiduciary }: MFAEnrollmentProps) {
  const [enrollState, setEnrollState] = React.useState<'idle' | 'enrolling' | 'verifying' | 'removing'>('idle');
  const [qrUrl, setQrUrl] = React.useState('');
  const [totpSecret, setTotpSecret] = React.useState<TotpSecret | null>(null);
  const [verifyCode, setVerifyCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const verifyCodeRef = React.useRef<HTMLInputElement>(null);

  // Focus the verification field when the QR/verify step appears (replaces autoFocus).
  React.useEffect(() => {
    if (enrollState === 'verifying') {
      verifyCodeRef.current?.focus();
    }
  }, [enrollState]);

  const handleStartEnrollment = async () => {
    if (!user) return;
    setError('');
    setEnrollState('enrolling');
    
    const result = await startTotpEnrollment(user);
    if ('error' in result) {
      setError(result.error);
      setEnrollState('idle');
    } else {
      setTotpSecret(result.secret);
      setQrUrl(result.qrUrl);
      setEnrollState('verifying');
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!user || !totpSecret) return;
    setError('');
    
    const result = await finalizeTotpEnrollment(user, totpSecret, verifyCode);
    if (result.success) {
      setSuccess('Two-factor authentication is now active.');
      setEnrollState('idle');
      setQrUrl('');
      setTotpSecret(null);
      setVerifyCode('');
    } else {
      setError(result.error || 'Verification failed.');
    }
  };

  const handleRemoveMFA = async () => {
    if (!user) return;
    setEnrollState('removing');
    setError('');
    
    const result = await unenrollTotp(user);
    if (result.success) {
      setSuccess('Two-factor authentication has been removed.');
      setEnrollState('idle');
    } else {
      setError(result.error || 'Failed to remove MFA.');
      setEnrollState('idle');
    }
  };

  return (
    <section className="bg-white rounded-[3rem] border border-royal/10 overflow-hidden shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--gold)]/30" />
      <div className="bg-royal/[0.03] px-10 py-6 border-b border-royal/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-royal/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-royal" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-royal font-black text-[11px] uppercase tracking-[0.3em]">Two-Factor Authentication</h3>
        </div>
        {mfaStatus.enrolled ? (
          <span className="text-[9px] font-black text-green-600 uppercase tracking-[0.2em] px-4 py-1.5 bg-green-50 border border-green-100 rounded-xl shadow-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active
          </span>
        ) : isFiduciary ? (
          <span className="text-[9px] font-black text-[var(--gold)] uppercase tracking-[0.2em] px-4 py-1.5 bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded-xl shadow-sm">
            Required for your role
          </span>
        ) : (
          <span className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] px-4 py-1.5 bg-royal/[0.02] border border-royal/5 rounded-xl">
            Optional
          </span>
        )}
      </div>

      <div className="p-10">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm font-bold flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
            {error}
          </div>
        )}

        {mfaStatus.enrolled && enrollState === 'idle' ? (
          /* ── MFA Active State ── */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 12 15 16 10" />
                </svg>
              </div>
              <div>
                <p className="text-royal font-black text-[15px] uppercase tracking-tight">Authenticator App Active</p>
                <p className="text-royal/40 font-bold text-[11px] uppercase tracking-widest mt-1">
                  {mfaStatus.methods.join(', ') || 'TOTP Authenticator'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleRemoveMFA}
              disabled={isFiduciary}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] ${
                isFiduciary 
                  ? 'bg-royal/[0.02] text-royal/20 border border-royal/5 cursor-not-allowed' 
                  : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
              }`}
            >
              {isFiduciary ? 'Required — Cannot Remove' : 'Remove 2FA'}
            </button>
          </div>
        ) : enrollState === 'verifying' ? (
          /* ── QR Code + Verify Step ── */
          <div className="max-w-lg mx-auto text-center space-y-8">
            <div>
              <p className="text-royal font-black text-[13px] uppercase tracking-widest mb-2">Scan This QR Code</p>
              <p className="text-royal/40 font-bold text-[11px] uppercase tracking-wider">
                Use Google Authenticator, 1Password, or Authy
              </p>
            </div>
            
            {qrUrl && (
              <div className="inline-block p-6 bg-white rounded-3xl border border-royal/10 shadow-[0_8px_30px_rgba(19,51,120,0.06)]">
                <QRCodeSVG 
                  value={qrUrl} 
                  size={200} 
                  level="M"
                  fgColor="#133378"
                  bgColor="#FFFFFF"
                />
              </div>
            )}

            <label htmlFor="mfa-verify-code" className="block space-y-3">
              <span className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] block">Enter 6-Digit Code</span>
              <input
                id="mfa-verify-code"
                ref={verifyCodeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                aria-label="Enter 6-digit verification code"
                className="w-48 mx-auto block bg-royal/[0.02] border border-royal/10 rounded-2xl px-6 py-4 text-center font-mono font-black text-[24px] text-royal tracking-[0.5em] outline-none focus:border-royal focus:bg-white transition-all placeholder:text-royal/10"
              />
            </label>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { setEnrollState('idle'); setQrUrl(''); setTotpSecret(null); setVerifyCode(''); }}
                className="px-8 py-4 rounded-2xl border border-royal/10 font-black text-royal/40 text-[10px] uppercase tracking-widest hover:bg-royal/[0.02] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyEnrollment}
                disabled={verifyCode.length !== 6}
                className="px-8 py-4 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                Verify & Activate
              </button>
            </div>
          </div>
        ) : (
          /* ── Not Enrolled — Enable Button ── */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-royal/[0.03] border border-royal/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-royal/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-royal font-black text-[15px] uppercase tracking-tight">Protect Your Account</p>
                <p className="text-royal/40 font-bold text-[11px] uppercase tracking-widest mt-1">
                  Add an authenticator app for enhanced security
                </p>
              </div>
            </div>
            <button
              onClick={handleStartEnrollment}
              disabled={enrollState === 'enrolling'}
              className="px-8 py-4 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[10px] uppercase tracking-widest shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 border border-white/10"
            >
              {enrollState === 'enrolling' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : 'Enable 2FA'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
