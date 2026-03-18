"use client";
import React, { useState, useEffect } from "react";

export function AdminHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [mode, setMode] = useState<'Owner' | 'Incapacity' | 'Settlement'>('Owner');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      setUser(JSON.parse(session));
    } else {
      setUser({
        name: 'Tameeka Lockhart',
        profilePhotoUrl: '/assets/tameeka/mom dance.jpg'
      });
    }
  }, []);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || 'TL';
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[var(--header-height)] px-8 bg-navy/90 backdrop-blur-xl border-b border-white/5 shadow-xl relative"
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-navy/20 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-black rounded-[3rem] overflow-hidden border-4 border-gold shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={user.profilePhotoUrl} 
              className="max-w-full max-h-[80vh] object-contain block mx-auto" 
              alt="Full Fidelity Portrait" 
            />
            <div className="absolute top-8 right-8">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPhotoModal(false); }}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-10 bg-white border-t border-border-light">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-wider mb-2">Heritage Shard Portrait</h3>
                  <p className="text-gold font-black text-xs uppercase tracking-[0.2em]">{user?.name || "Tameeka Lockhart"} · Identity Verification Shard</p>
                </div>
                <div className="px-5 py-2 bg-gold text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">4K Protocol</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Film Grain Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      
      <div className="relative z-10 flex items-center justify-between w-full h-full">
        {/* Left — Title */}
        <div className="shrink-0 mr-8 text-left">
          <h1 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] font-black uppercase tracking-[0.1em] text-white m-0 whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/40 text-[0.65rem] font-black uppercase tracking-[0.15em] m-0 whitespace-nowrap">
              {subtitle}
            </p>
          )}
        </div>

      {/* Center — Search */}
      <div className="flex-1 max-w-[350px] min-w-[150px] flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-2 px-5 focus-within:border-gold/50 focus-within:bg-white/10 transition-all">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search protocols..."
          className="flex-1 bg-transparent border-none outline-none text-[0.8rem] font-bold text-white placeholder:text-white/20"
        />
      </div>
      
      {/* Simulation Engine: Authority Mode */}
      <div className="flex items-center gap-4 px-5 py-2 bg-white/5 border border-white/10 rounded-2xl mx-8 shadow-inner">
        <div className="flex flex-col text-left">
          <label className="text-[0.5rem] font-black text-white/40 uppercase tracking-[0.25em] whitespace-nowrap leading-none mb-1">State Simulator</label>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'Owner' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter text-white/60">{mode} Mode</span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          {(['Owner', 'Incapacity', 'Settlement'] as const).map((m) => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-[0.55rem] font-black uppercase tracking-widest transition-all duration-300 ${
                mode === m 
                  ? "bg-gold text-black shadow-lg scale-105" 
                  : "text-white/40 hover:bg-white/5 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="p-2 rounded-xl text-[#6b7280] hover:bg-[#F3F4F6] hover:text-navy transition-all relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-gold rounded-full border-2 border-white" />
        </button>

        {/* Avatar */}
        {user?.profilePhotoUrl ? (
          <img 
            src={user.profilePhotoUrl} 
            onClick={() => setShowPhotoModal(true)}
            className="w-10 h-10 rounded-xl object-cover border-2 border-gold/40 shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all" 
            alt="Avatar" 
          />
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold to-gold-bright flex items-center justify-center text-black font-black text-[0.75rem] shadow-lg border border-white/50 cursor-pointer hover:scale-105 transition-transform">
            {getInitials(user?.name || 'TL')}
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
