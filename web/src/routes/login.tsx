import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

/* ─── Test Account Registry ─── */
const TEST_ACCOUNTS = [
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
  {
    logins: ['heir@test.com'],
    password: 'Test123!',
    session: {
      id: 'user_heir',
      name: 'Sarah Lockhart',
      role: 'beneficiary',
      email: 'heir@test.com',
      login: 'heir@test.com',
      profilePhotoUrl: '',
      primaryEstateId: 'estate_lockhart',
      primaryEstateName: 'Lockhart Estate',
    },
  },
  {
    logins: ['attorney@test.com'],
    password: 'Test123!',
    session: {
      id: 'user_attorney',
      name: 'James Morrison, Esq.',
      role: 'executor',
      email: 'attorney@test.com',
      login: 'attorney@test.com',
      profilePhotoUrl: '',
      primaryEstateId: 'estate_lockhart',
      primaryEstateName: 'Lockhart Estate',
    },
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const account = TEST_ACCOUNTS.find(
      (a) =>
        a.logins.some(
          (l) => l.toLowerCase() === username.toLowerCase()
        ) && a.password === password
    );

    if (account) {
      localStorage.setItem(
        'finalwishes_user',
        JSON.stringify(account.session)
      );
      navigate({ to: '/estates/$estateId/dashboard', params: { estateId: 'lockhart' } });
    } else {
      setError('Invalid credentials. Please check your email and password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.03] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#133378]/[0.05] blur-[120px] rounded-full" />
      </div>

      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-md p-10 rounded-[2.5rem] relative z-10 border border-[#133378]/10 shadow-[0_20px_50px_rgba(19,51,120,0.08)]">
        <div className="text-center mb-10">
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
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[#133378] mb-2">Sign In</h1>
          <p className="text-[#64748B] text-sm font-medium max-w-[260px] mx-auto leading-relaxed">Secure access to the Estate Operating System</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email or Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cylton@sirsi.ai"
              className="w-full bg-slate-50 border border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 transition-all outline-none font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus:bg-white focus:border-[#133378] focus:shadow-sm"
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 hover:border-[#133378]/30 rounded-2xl px-6 py-4 pr-14 transition-all outline-none font-semibold text-[14px] text-[#0F172A] placeholder:text-slate-300 focus:bg-white focus:border-[#133378] focus:shadow-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#133378] z-10 p-1 transition-colors"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

          <button
            type="submit"
            className="block w-full bg-[#133378] hover:bg-[#1E3A5F] text-white text-center py-4 rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8"
          >
            Sign In
          </button>

          <div className="flex items-center justify-between text-xs text-[#64748B] px-1 pt-2">
            <a href="#" className="hover:text-[#133378] transition-colors font-medium">Forgot password?</a>
            <a href="#" className="hover:text-[#133378] transition-colors font-medium">Create account</a>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">AES-256</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">SOC 2</span>
          </div>
        </div>
      </div>
    </div>
  )
}
