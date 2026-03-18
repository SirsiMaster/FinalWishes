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
    document.body.classList.add('royal-theme');
    document.body.classList.remove('dashboard-theme');
    return () => {
      document.body.classList.remove('royal-theme');
    }
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden royal-theme">
      {/* Background Orbs — Royal Neo-Deco Protocol */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-royal/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-gold/15 blur-[120px] rounded-full" />
      </div>

      <div className="glass-card w-full max-w-md p-10 rounded-3xl relative z-10 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block mb-6 no-underline hover:scale-105 transition-transform">
            <div className="flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-gold fill-current shadow-gold">
                <path d="M50 20 C55 20 58 25 58 30 C58 35 55 38 50 38 C45 38 42 35 42 30 C42 25 45 20 50 20 M50 40 C60 40 70 30 80 15 C85 25 85 45 70 55 L60 60 L65 90 L50 85 L35 90 L40 60 L30 55 C15 45 15 25 20 15 C30 30 40 40 50 40 Z" transform="scale(0.24)" />
              </svg>
              <span className="font-[family-name:var(--font-cinzel)] text-2xl tracking-[0.15em] font-black text-white">
                FINALWISHES
              </span>
            </div>
          </Link>
          <h1 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-white mb-2 uppercase tracking-wide">Identity Check</h1>
          <p className="text-white/40 text-[0.65rem] font-black uppercase tracking-[0.2em]">Secured Access Protocol for the Estate OS</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-[0.6rem] uppercase tracking-[0.2em] text-gold font-black ml-1 opacity-60">Identity Domain (Email/Login)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Tameeka116"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:border-gold/50 focus:bg-white/10 transition-all outline-none font-bold text-sm"
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[0.6rem] uppercase tracking-[0.2em] text-gold font-black ml-1 opacity-60">Vault Access Key (Password)</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 pr-12 text-white placeholder:text-white/20 focus:border-gold/50 focus:bg-white/10 transition-all outline-none font-bold text-sm relative z-0"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gold hover:text-white transition-colors z-10"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {error && <div className="text-[10px] text-red-400 font-black uppercase tracking-[0.12em] text-center">{error}</div>}

          <button
            type="submit"
            className="block w-full bg-gold text-black text-center py-3.5 rounded-xl font-[family-name:var(--font-cinzel)] font-black text-xs uppercase tracking-[0.2em] hover:bg-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all shadow-xl active:scale-95"
          >
            Access Vault
          </button>

          <div className="flex items-center justify-between text-[0.65rem] text-white/40 uppercase tracking-widest font-bold px-1">
            <a href="#" className="hover:text-gold transition-colors">Forgot Password?</a>
            <a href="#" className="hover:text-gold transition-colors">Request Access</a>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-white/10 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="status-dot scale-75" />
            <span className="text-[0.6rem] text-white/40 uppercase tracking-widest">AES-256</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="status-dot scale-75" />
            <span className="text-[0.6rem] text-white/40 uppercase tracking-widest">Bipartite MFA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
