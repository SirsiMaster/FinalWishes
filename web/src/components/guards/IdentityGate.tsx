/**
 * IdentityGate — Tiered Identity Verification Gate (ADR-035)
 *
 * Wraps estate routes to enforce MFA + attestation for all authenticated users.
 *
 * Tier 1 (Principal): Must enroll MFA after grace period (24h AND 3+ logins).
 *   - During grace period: shows a persistent banner suggesting MFA, but allows access.
 *   - After grace period: blocks access until MFA is enrolled.
 *
 * Tier 2 (Heir, Executor, Trustee, Legal, CPA): Must complete:
 *   Step 1: Enable MFA (TOTP authentication)
 *   Step 2: Sign identity attestation
 *
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { getMFAStatus } from '../../lib/mfa';
import { useDocument, type EstateUser } from '../../lib/firestore';
import { personaLabel, resolveEffectiveRole } from '../../lib/persona';
import { collection, query, where, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';

const FIDUCIARY_ROLES = ['heir', 'executor', 'trustee', 'legal', 'cpa'] as const;

/** Grace period: 24 hours in milliseconds */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
/** Minimum login count before MFA is enforced */
const MIN_LOGINS_BEFORE_ENFORCE = 3;

interface IdentityGateProps {
  estateId: string;
  children: React.ReactNode;
}

interface UserFirestoreProfile {
  createdAt?: Timestamp;
  loginCount?: number;
}

export function IdentityGate({ estateId, children }: IdentityGateProps) {
  const { user, profile, profileResolved, emailVerified, resendVerification } = useAuth();

  return <IdentityGateInner estateId={estateId} user={user} profile={profile} profileResolved={profileResolved} emailVerified={emailVerified} resendVerification={resendVerification}>{children}</IdentityGateInner>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IdentityGateInner({ estateId, children, user, profile, profileResolved, emailVerified, resendVerification }: IdentityGateProps & { user: any; profile: any; profileResolved: boolean; emailVerified: boolean; resendVerification: any }) {
  const [attestationVerified, setAttestationVerified] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  const mfaStatus = getMFAStatus(user as any);

  // Fetch user's Firestore profile for createdAt and loginCount
  const { data: userFsProfile } = useDocument<UserFirestoreProfile>(
    user ? `users/${user.uid}` : null
  );

  // Estate-scoped role: a user who is principal on their own estate may be a
  // fiduciary on THIS one. Fiduciary determination must use the estate role
  // (consistent with RoleGuard/Sidebar), NOT the global profile.role — else a
  // principal-on-their-own-estate would skip fiduciary MFA + attestation here.
  const estateUserPath = user ? `estate_users/${user.uid}_${estateId}` : null;
  const { data: estateUser, loading: estateUserLoading } = useDocument<EstateUser>(estateUserPath);
  const effectiveRole = resolveEffectiveRole(estateUser?.role ?? null, profile?.role ?? null);
  const effectiveRoleLabel = personaLabel(effectiveRole);
  const isFiduciary = (FIDUCIARY_ROLES as readonly string[]).includes(effectiveRole);

  // Determine if principal is within the grace period (computed in effect to avoid impure render)
  const [principalGracePeriodActive, setPrincipalGracePeriodActive] = React.useState(true);
  React.useEffect(() => {
    if (isFiduciary) { setPrincipalGracePeriodActive(false); return; }
    if (!userFsProfile) { setPrincipalGracePeriodActive(true); return; }

    const createdAt = userFsProfile.createdAt;
    const loginCount = userFsProfile.loginCount ?? 0;

    let accountAgeMs = Infinity;
    const now = Date.now();
    if (createdAt && typeof (createdAt as Timestamp).toDate === 'function') {
      accountAgeMs = now - (createdAt as Timestamp).toDate().getTime();
    }

    const isNewAccount = accountAgeMs < GRACE_PERIOD_MS;
    const hasLowLoginCount = loginCount < MIN_LOGINS_BEFORE_ENFORCE;
    setPrincipalGracePeriodActive(isNewAccount || hasLowLoginCount);
  }, [isFiduciary, userFsProfile]);

  // Check attestation status from Firestore (only for fiduciary roles)
  React.useEffect(() => {
    async function checkAttestation() {
      if (!user || !isFiduciary || !estateId) {
        setLoading(false);
        return;
      }

      try {
        const attestationsRef = collection(db, 'attestations');
        const q = query(
          attestationsRef,
          where('uid', '==', user.uid),
          where('estateId', '==', estateId),
          where('status', '==', 'verified')
        );
        const snapshot = await getDocs(q);
        setAttestationVerified(!snapshot.empty);
      } catch (error) {
        console.error('Attestation check failed:', error);
        setAttestationVerified(false);
      }
      setLoading(false);
    }

    checkAttestation();
  }, [user, isFiduciary, estateId]);

  // For principals (non-fiduciary), skip attestation loading — but only once the
  // estate role is definitive (else isFiduciary is transiently false while
  // estateUser loads and we'd clear loading prematurely).
  React.useEffect(() => {
    if (!isFiduciary && !estateUserLoading) {
      setLoading(false);
    }
  }, [isFiduciary, estateUserLoading]);

  if (!profileResolved || (estateUserPath !== null && estateUserLoading) || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-royal uppercase tracking-[0.2em]">Verifying identity...</span>
        </div>
      </div>
    );
  }

  // ── Email verification gate (all roles) ──
  if (user && !emailVerified) {
    return <EmailVerificationGate user={user} resendVerification={resendVerification} />;
  }

  // ── Principal path ──
  if (!isFiduciary) {
    // Principal has MFA enrolled — pass through
    if (mfaStatus.enrolled) {
      return <>{children}</>;
    }

    // Principal is within grace period — show banner but allow access
    if (principalGracePeriodActive) {
      return (
        <>
          <MFAGraceBanner />
          {children}
        </>
      );
    }

    // Principal is past grace period and has no MFA — block access
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-3">
            Two-Factor Authentication Required
          </h2>
          <p className="text-royal/40 font-bold text-[13px] uppercase tracking-widest max-w-md mx-auto leading-relaxed">
            To protect your estate, two-factor authentication must be enabled before you can continue.
          </p>
        </div>

        <div className="space-y-6">
          <VerificationStep
            step={1}
            title="Enable Two-Factor Authentication"
            description="Add an authenticator app to secure your account"
            completed={false}
            active={true}
            actionLabel="Go to Settings"
            actionHref="/dashboard/settings"
          />
        </div>

        <div className="mt-12 p-8 bg-royal/[0.02] rounded-[2.5rem] border border-royal/5 text-center">
          <p className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] leading-relaxed">
            Two-factor authentication protects your estate by ensuring<br />
            only you can access sensitive documents and settings.
          </p>
        </div>
      </div>
    );
  }

  // ── Fiduciary path ──

  // Both complete — pass through
  if (mfaStatus.enrolled && attestationVerified) {
    return <>{children}</>;
  }

  // Show verification wizard
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-3">
          Identity Verification Required
        </h2>
        <p className="text-royal/40 font-bold text-[13px] uppercase tracking-widest max-w-md mx-auto leading-relaxed">
          As a designated <span className="text-[var(--gold)]">{effectiveRoleLabel}</span> for this estate, you must complete identity verification before accessing estate documents.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: MFA */}
        <VerificationStep
          step={1}
          title="Enable Two-Factor Authentication"
          description="Add an authenticator app to secure your account"
          completed={mfaStatus.enrolled}
          active={!mfaStatus.enrolled}
          actionLabel="Go to Settings"
          actionHref="/dashboard/settings"
        />

        {/* Step 2: Attestation */}
        <VerificationStep
          step={2}
          title="Sign Identity Attestation"
          description="Digitally sign a declaration confirming your identity and role"
          completed={!!attestationVerified}
          active={mfaStatus.enrolled && !attestationVerified}
          actionLabel="Sign Attestation"
          actionHref={`/estates/${estateId}/attestation`}
        />
      </div>

      <div className="mt-12 p-8 bg-royal/[0.02] rounded-[2.5rem] border border-royal/5 text-center">
        <p className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] leading-relaxed">
          These requirements protect the estate and its beneficiaries by ensuring<br />
          only verified individuals can access sensitive documents.
        </p>
      </div>
    </div>
  );
}

// ── MFA Grace Banner ──

function MFAGraceBanner() {
  return (
    <div className="mb-6 mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[var(--gold)]/10 border border-[var(--gold)]/20 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--gold)]/20 rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="text-[13px] font-bold text-slate-900">
            Secure your account with two-factor authentication
          </p>
        </div>
        <a
          href="/dashboard/settings"
          className="px-5 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold)] text-white font-bold text-[11px] uppercase tracking-widest shadow-sm transition-all active:scale-[0.98] inline-block no-underline shrink-0"
        >
          Enroll Now
        </a>
      </div>
    </div>
  );
}

// ── Step Card ──

function VerificationStep({
  step,
  title,
  description,
  completed,
  active,
  actionLabel,
  actionHref,
}: {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className={`bg-white rounded-[2.5rem] border p-8 flex items-center gap-8 transition-all ${
      completed
        ? 'border-green-100 shadow-[0_2px_16px_rgba(34,197,94,0.06)]'
        : active
        ? 'border-royal/20 shadow-[0_8px_30px_rgba(19,51,120,0.08)]'
        : 'border-royal/5 opacity-50'
    }`}>
      {/* Step Number */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
        completed
          ? 'bg-green-50 border border-green-100'
          : active
          ? 'bg-royal/10 border border-royal/20'
          : 'bg-royal/[0.02] border border-royal/5'
      }`}>
        {completed ? (
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span className={`font-[family-name:var(--font-cinzel)] text-xl font-black ${
            active ? 'text-royal' : 'text-royal/20'
          }`}>
            {step}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={`font-black text-[15px] uppercase tracking-tight mb-1 ${
          completed ? 'text-green-700' : active ? 'text-royal' : 'text-royal/30'
        }`}>
          {title}
        </h3>
        <p className={`text-[11px] font-bold uppercase tracking-widest ${
          completed ? 'text-green-600/50' : 'text-royal/30'
        }`}>
          {description}
        </p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {completed ? (
          <span className="text-[9px] font-black text-green-600 uppercase tracking-[0.2em] px-4 py-2 bg-green-50 border border-green-100 rounded-xl">
            Verified
          </span>
        ) : active ? (
          <a
            href={actionHref}
            className="px-6 py-3 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] inline-block no-underline border border-white/10"
          >
            {actionLabel} →
          </a>
        ) : (
          <span className="text-[9px] font-black text-royal/15 uppercase tracking-widest">
            Complete Step {step - 1} first
          </span>
        )}
      </div>
    </div>
  );
}

// ── Email Verification Gate ──

function EmailVerificationGate({
  user,
  resendVerification,
}: {
  user: { email: string | null; reload: () => Promise<void> };
  resendVerification: () => Promise<{ success: boolean }>;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setSending(true);
    await resendVerification();
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 15000);
  };

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      await user.reload();
      // Auth state listener will pick up the change and re-render
      window.location.reload();
    } catch {
      // Ignore — user will try again
    }
    setChecking(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-[var(--gold)]/20">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-[var(--royal)] uppercase tracking-tight mb-3">
          Verify Your Email
        </h2>
        <p className="text-[var(--royal)]/40 font-bold text-[13px] uppercase tracking-widest max-w-md mx-auto leading-relaxed">
          We sent a verification link to{' '}
          <span className="text-[var(--gold)]">{user.email}</span>.
          Please check your inbox and click the link to continue.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[var(--royal)]/10 p-8 text-center space-y-6">
        <p className="text-slate-500 text-sm leading-relaxed">
          Email verification protects your estate by ensuring only you can access your account.
          Check your spam folder if you don't see the email.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleResend}
            disabled={sending || sent}
            className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white px-6 py-3 h-auto rounded-2xl font-bold text-sm"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : sent ? (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Email Sent
              </span>
            ) : 'Resend Verification Email'}
          </Button>

          <Button
            onClick={handleCheckAgain}
            disabled={checking}
            variant="outline"
            className="border-[var(--royal)]/20 text-[var(--royal)] px-6 py-3 h-auto rounded-2xl font-bold text-sm hover:bg-[var(--royal)]/5"
          >
            {checking ? 'Checking...' : 'I\'ve Verified — Continue'}
          </Button>
        </div>
      </div>

      <div className="mt-12 p-8 bg-[var(--royal)]/[0.02] rounded-[2.5rem] border border-[var(--royal)]/5 text-center">
        <p className="text-[10px] font-black text-[var(--royal)]/20 uppercase tracking-[0.3em] leading-relaxed">
          Your data is protected with AES-256 encryption<br />
          and enterprise-grade security infrastructure.
        </p>
      </div>
    </div>
  );
}
