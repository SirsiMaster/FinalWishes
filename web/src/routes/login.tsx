/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { resolveTotpChallenge } from '../lib/mfa'
import { type MultiFactorResolver } from 'firebase/auth'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    invite: (search.invite as string) ?? undefined,
    demo: (search.demo === 'true' || search.demo === true) ? true : undefined,
  }),
})

/* ─── Post-login routing helper ─── */
interface UserProfile {
  primaryEstateId?: string;
  [key: string]: unknown;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function navigatePostLogin(
  nav: ReturnType<typeof useNavigate>,
  profile: UserProfile | null,
  inviteId?: string,
) {
  if (inviteId) {
    nav({ to: '/accept-invite', search: { id: inviteId } } as any);
  } else if (profile?.primaryEstateId) {
    const eid = profile.primaryEstateId === 'estate_lockhart' ? 'lockhart' : profile.primaryEstateId;
    nav({ to: '/estates/$estateId/dashboard', params: { estateId: eid as string } } as any);
  } else {
    nav({ to: '/estates/create' } as any);
  }
}

/* ─── Demo Test Account Registry (preserved for ?demo=true) ─── */
const DEMO_ACCOUNTS = [
  {
    logins: ['Tameeka116', 'Tameekalockhart@gmail.com', '123-456-7890'],
    password: 'ML6824!',
    session: {
      id: 'user_tameeka',
      name: 'Tameeka Lockhart',
      role: 'owner',
      email: 'Tameekalockhart@gmail.com',
      phone: '123-456-7890',
      login: 'Tameeka116',
      profilePhotoUrl: '/assets/tameeka/mom dance.jpg',
      primaryEstateId: 'estate_lockhart',
      primaryEstateName: 'Lockhart Estate',
    },
  },
  {
    logins: ['cylton@sirsi.ai'],
    password: 'Sirsi2026!',
    session: {
      id: 'user_cylton',
      name: 'Cylton Collymore',
      role: 'admin',
      email: 'cylton@sirsi.ai',
      login: 'cylton@sirsi.ai',
      profilePhotoUrl: '',
      primaryEstateId: 'estate_lockhart',
      primaryEstateName: 'Lockhart Estate',
    },
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const inviteId = search.invite;
  const isDemo = search.demo === true;
  const { signIn, signUp, resetPassword, user, profile } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'mfa' | 'forgot'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    };
  }, []);

  // If already authenticated, redirect to their estate (or create one)
  useEffect(() => {
    if (user) {
      navigatePostLogin(navigate, profile, inviteId);
    }
  }, [user, profile, navigate, inviteId]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Demo mode — use hardcoded test accounts
    if (isDemo) {
      const account = DEMO_ACCOUNTS.find(
        (a) =>
          a.logins.some(
            (l) => l.toLowerCase() === identifier.toLowerCase()
          ) && a.password === password
      );

      if (account) {
        localStorage.setItem('finalwishes_user', JSON.stringify(account.session));
        navigatePostLogin(navigate, account.session as UserProfile, inviteId);
        setIsSubmitting(false);
        return;
      } else {
        setError('Invalid demo credentials. Check your email/username and password.');
        setIsSubmitting(false);
        return;
      }
    }

    // Real Firebase Auth — supports email or username
    const result = await signIn(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      navigatePostLogin(navigate, result.profile ?? null, inviteId);
    } else if (result.mfaRequired && result.mfaResolver) {
      // Switch to MFA challenge mode
      setMfaResolver(result.mfaResolver);
      setMode('mfa');
      setError('');
    } else {
      setError(result.error || 'Sign in failed. Please try again.');
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setError('');
    setIsSubmitting(true);

    const result = await resolveTotpChallenge(mfaResolver, totpCode);
    setIsSubmitting(false);

    if (result.success) {
      // After MFA, the auth state listener will update profile — use it from context
      navigatePostLogin(navigate, profile, inviteId);
    } else {
      setError(result.error || 'MFA verification failed.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate fields
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      setIsSubmitting(false);
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setIsSubmitting(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      setIsSubmitting(false);
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    const result = await signUp({
      email: email.trim(),
      username: username.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      // New users have no estate — send to create, unless they have an invite
      if (inviteId) {
        navigate({ to: '/accept-invite', search: { id: inviteId } });
      } else {
        navigate({ to: '/estates/create' });
      }
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.03] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.05] blur-[120px] rounded-full" />
      </div>

      <Card className="bg-white/80 backdrop-blur-2xl w-full max-w-md rounded-[2.5rem] relative z-10 border-[#133378]/10 shadow-[0_20px_50px_rgba(19,51,120,0.08)] ring-0 py-0">
        <CardHeader className="text-center pb-0 pt-10 px-10">
          <Link to="/" className="inline-block mb-6 no-underline hover:scale-105 transition-transform group">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-white border border-[#133378]/10 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-[#133378]/30 transition-all">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#133378] drop-shadow-sm">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M2 17l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.15em] font-bold text-[#133378]">
                FINALWISHES
              </span>
            </div>
          </Link>
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#133378] mb-2">
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Verification Required'}
          </h1>
          <p className="text-[#64748B] text-sm font-medium max-w-[260px] mx-auto leading-relaxed">
            {mode === 'signin'
              ? 'Secure access to the Estate Operating System'
              : mode === 'signup'
              ? 'Start preserving your legacy today'
              : mode === 'forgot'
              ? 'Enter your email and we\'ll send a reset link'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
          {isDemo && (
            <div className="mt-3">
              <Badge className="bg-[#C8A951]/10 text-[#C8A951] border-[#C8A951]/30 text-[11px] font-bold uppercase tracking-wider hover:bg-[#C8A951]/10">
                Demo Mode
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-10 pt-6 pb-0">
          {mode === 'signin' ? (
            /* ─── Sign In Form ─── */
            <form className="space-y-6" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="login-identifier" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Email or Username</Label>
                <Input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. cylton@sirsi.ai or Tameeka116"
                  autoComplete="username"
                  className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 pr-14 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#133378] z-10 h-8 w-8">
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </Button>
                </div>
              </div>

              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

              <Button
                id="login-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#133378] hover:bg-[#1E3A5F] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>

              <div className="flex items-center justify-between text-xs px-1 pt-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => { setMode('forgot'); setError(''); setResetSent(false); setResetEmail(identifier.includes('@') ? identifier : ''); }}
                  className="text-[#64748B] hover:text-[#133378] font-medium text-xs p-0 h-auto no-underline hover:no-underline"
                >Forgot password?</Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-[#64748B] hover:text-[#133378] font-medium text-xs p-0 h-auto no-underline hover:no-underline"
                >
                  Create account
                </Button>
              </div>
            </form>
          ) : mode === 'signup' ? (
            /* ─── Sign Up Form ─── */
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-firstname" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">First Name</Label>
                  <Input
                    id="signup-firstname"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Cylton"
                    autoComplete="given-name"
                    className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-4 py-3.5 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-lastname" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Last Name</Label>
                  <Input
                    id="signup-lastname"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Collymore"
                    autoComplete="family-name"
                    className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-4 py-3.5 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-username" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. CyltonC"
                  autoComplete="username"
                  className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-3.5 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                />
                <p className="text-[10px] text-slate-400 pl-1">Letters, numbers, underscores only. Min 3 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. cylton@sirsi.ai"
                  autoComplete="email"
                  className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-3.5 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-3.5 pr-14 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#133378] z-10 h-8 w-8">
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </Button>
                </div>
              </div>

              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

              <Button
                id="signup-submit"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#133378] hover:bg-[#1E3A5F] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-6"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </Button>

              <div className="text-center text-xs text-[#64748B] pt-2">
                <span>Already have an account? </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="text-[#133378] hover:text-[#133378] font-bold text-xs p-0 h-auto"
                >
                  Sign in
                </Button>
              </div>
            </form>
          ) : mode === 'forgot' ? (
            /* ─── Forgot Password Form ─── */
            <div className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#C8A951]/10 rounded-2xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#C8A951]" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 7L2 7" />
                  </svg>
                </div>
              </div>

              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      <span className="text-green-700 font-bold text-sm">Check your email</span>
                    </div>
                    <p className="text-green-600/70 text-[13px] font-medium">
                      If an account exists for that email, we've sent password reset instructions.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => { setMode('signin'); setError(''); setResetSent(false); }}
                    className="text-[#133378] font-bold text-sm p-0 h-auto"
                  >
                    &larr; Back to sign in
                  </Button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setIsSubmitting(true);
                  const result = await resetPassword(resetEmail.trim());
                  setIsSubmitting(false);
                  if (result.success) {
                    setResetSent(true);
                  } else {
                    // Per security-guidance: don't reveal if email exists
                    // Always show success to prevent user enumeration
                    setResetSent(true);
                  }
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                      className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm"
                    />
                  </div>

                  {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                  <Button
                    id="reset-submit"
                    type="submit"
                    disabled={isSubmitting || !resetEmail.includes('@')}
                    className="w-full bg-[#C8A951] hover:bg-[#B89941] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(200,169,81,0.2)] hover:shadow-[0_12px_32px_rgba(200,169,81,0.3)] transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : 'Send Reset Link'}
                  </Button>

                  <div className="text-center text-xs pt-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => { setMode('signin'); setError(''); }}
                      className="text-[#64748B] hover:text-[#133378] font-medium text-xs p-0 h-auto no-underline hover:no-underline"
                    >
                      &larr; Back to sign in
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : mode === 'mfa' ? (
            /* ─── MFA TOTP Challenge ─── */
            <form className="space-y-6" onSubmit={handleMfaVerify}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#133378]/5 rounded-2xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfa-code" className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest pl-1">Authenticator Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                  className="h-auto bg-slate-50 border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 font-mono font-bold text-[24px] text-center text-[#0F172A] placeholder:text-slate-200 focus-visible:bg-white focus-visible:border-[#133378] focus-visible:ring-0 focus-visible:shadow-sm tracking-[0.5em]"
                />
              </div>

              {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

              <Button
                id="mfa-submit"
                type="submit"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full bg-[#133378] hover:bg-[#1E3A5F] disabled:opacity-60 text-white py-4 h-auto rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify'}
              </Button>

              <div className="text-center text-xs pt-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => { setMode('signin'); setError(''); setTotpCode(''); setMfaResolver(null); }}
                  className="text-[#64748B] hover:text-[#133378] font-medium text-xs p-0 h-auto no-underline hover:no-underline"
                >
                  &larr; Back to sign in
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col gap-0 mt-8 mx-10 px-0 pt-0 pb-10 border-0 bg-transparent">
          <Separator className="mb-6 bg-slate-100" />
          <div className="flex items-center justify-center gap-6 w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <Badge variant="outline" className="text-[11px] text-[#133378]/40 font-bold uppercase tracking-widest border-0 px-0 h-auto bg-transparent hover:bg-transparent">AES-256</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <Badge variant="outline" className="text-[11px] text-[#133378]/40 font-bold uppercase tracking-widest border-0 px-0 h-auto bg-transparent hover:bg-transparent">SOC 2</Badge>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
