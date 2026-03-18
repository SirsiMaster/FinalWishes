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

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[var(--header-height)] px-8 bg-white/80 backdrop-blur-xl relative overflow-hidden"
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Film Grain Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      
      <div className="relative z-10 flex items-center justify-between w-full h-full">
        {/* Left — Title */}
        <div className="shrink-0 mr-8 text-left">
          <h1 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] font-black uppercase tracking-[0.1em] text-navy m-0 whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#6b7280] text-[0.65rem] font-black uppercase tracking-[0.15em] m-0 whitespace-nowrap opacity-40">
              {subtitle}
            </p>
          )}
        </div>

      {/* Center — Search */}
      <div className="flex-1 max-w-[350px] min-w-[150px] flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl py-2 px-5 focus-within:border-royal focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.08)] transition-all">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
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
          className="flex-1 bg-transparent border-none outline-none text-[0.8rem] font-bold text-navy placeholder:text-[#9ca3af]/60"
        />
      </div>
      
      {/* Simulation Engine: Authority Mode */}
      <div className="flex items-center gap-4 px-5 py-2 bg-navy/5 border border-royal/10 rounded-2xl mx-8 shadow-inner">
        <div className="flex flex-col text-left">
          <label className="text-[0.5rem] font-black text-navy opacity-30 uppercase tracking-[0.25em] whitespace-nowrap leading-none mb-1">State Simulator</label>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'Owner' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="text-[9px] font-black uppercase tracking-tighter text-navy/70">{mode} Mode</span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/50 backdrop-blur-sm rounded-xl border border-white">
          {(['Owner', 'Incapacity', 'Settlement'] as const).map((m) => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-[0.55rem] font-black uppercase tracking-widest transition-all duration-300 ${
                mode === m 
                  ? "bg-navy text-white shadow-xl scale-105" 
                  : "text-navy/40 hover:bg-white/80 hover:text-navy"
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
          <img src={user.profilePhotoUrl} className="w-10 h-10 rounded-2xl object-cover shadow-lg border border-white/50 cursor-pointer hover:scale-105 transition-transform" alt="Avatar" />
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
