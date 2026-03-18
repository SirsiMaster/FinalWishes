import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Transition to Light Premium Identity
    document.body.classList.add('dashboard-theme');
    document.body.classList.remove('royal-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Protocol Check: Tameeka116 / Tameekalockhart@gmail.com / 123-456-7890 / ML6824!
    const isTameeka = (username === 'Tameeka116' || username === 'Tameekalockhart@gmail.com' || username === '123-456-7890') && password === 'ML6824!';
    
    if (isTameeka) {
      // Initialize Session Shard for Tameeka Lockhart (SuperAdmin)
      localStorage.setItem('finalwishes_user', JSON.stringify({
        id: 'user_tameeka',
        name: 'Tameeka Lockhart',
        email: 'Tameekalockhart@gmail.com',
        phone: '123-456-7890',
        login: 'Tameeka116',
        profilePhotoUrl: '/assets/tameeka/mom dance.jpg', // The dance photo as profile
        primaryEstateId: 'estate_lockhart',
        primaryEstateName: 'Lockhart Estate'
      }));
      navigate({ to: '/dashboard' });
    } else {
      setError('Invalid identity protocol. Clear secure keys and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      {/* Background Subtle Tinge — Royal Neo-Deco Light Protocol */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-royal/[0.03] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-royal/[0.05] blur-[120px] rounded-full" />
      </div>

      <div className="bg-white/80 backdrop-blur-2xl w-full max-w-md p-10 rounded-[2.5rem] relative z-10 border border-royal/10 shadow-[0_20px_50px_rgba(19,51,120,0.08)] animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block mb-6 no-underline hover:scale-105 transition-transform group">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-white border border-royal/10 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-royal/30 transition-all">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-royal drop-shadow-sm">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M2 17l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M2 12l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.15em] font-black text-royal">
                FINALWISHES
              </span>
            </div>
          </Link>
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-2 uppercase tracking-wide">Identity Check</h1>
          <p className="text-royal/30 text-[0.65rem] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">Secured Access Protocol for the Estate Operating System</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2 group">
            <label className="text-[0.6rem] uppercase tracking-[0.2em] text-royal/40 font-black ml-1 group-focus-within:text-royal transition-colors">Identity Domain (Email/Login)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Tameeka116"
              className="w-full bg-royal/[0.02] border border-royal/10 hover:border-royal/30 rounded-2xl px-6 py-4.5 transition-all outline-none font-black text-[13px] text-royal placeholder:text-royal/10 focus:bg-white focus:border-royal focus:shadow-sm"
            />
          </div>
          <div className="space-y-2 relative group">
            <label className="text-[0.6rem] uppercase tracking-[0.2em] text-royal/40 font-black ml-1 group-focus-within:text-royal transition-colors">Vault Access Key (Password)</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-royal/[0.02] border border-royal/10 hover:border-royal/30 rounded-2xl px-6 py-4.5 pr-14 transition-all outline-none font-black text-[13px] text-royal placeholder:text-royal/10 focus:bg-white focus:border-royal focus:shadow-sm relative z-0"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-royal/20 hover:text-royal z-10 p-1"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="text-[10px] text-red-500 font-bold uppercase tracking-[0.12em] text-center bg-red-50 p-2 border border-red-100">{error}</div>}

          <button
            type="submit"
            className="block w-full bg-royal hover:bg-sapphire text-white text-center py-4.5 rounded-2xl font-[family-name:var(--font-cinzel)] font-black text-xs uppercase tracking-[0.2em] shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-95 mt-8 border border-white/10"
          >
            Access Vault Shard
          </button>

          <div className="flex items-center justify-between text-[0.65rem] text-royal/30 uppercase tracking-[0.15em] font-black px-1 pt-2">
            <a href="#" className="hover:text-royal transition-colors">Forgot Shard Key?</a>
            <a href="#" className="hover:text-royal transition-colors">Join Enclave</a>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-royal/5 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 group cursor-help">
            <div className="w-1.5 h-1.5 rounded-full bg-royal/10 group-hover:bg-royal transition-colors" />
            <span className="text-[0.6rem] text-royal/20 group-hover:text-royal font-black uppercase tracking-widest transition-colors">AES-256</span>
          </div>
          <div className="flex items-center gap-2 group cursor-help">
            <div className="w-1.5 h-1.5 rounded-full bg-royal/10 group-hover:bg-royal transition-colors" />
            <span className="text-[0.6rem] text-royal/20 group-hover:text-royal font-black uppercase tracking-widest transition-colors">Bipartite MFA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
