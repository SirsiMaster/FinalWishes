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
      className="sticky top-0 z-50 flex items-center justify-between h-[var(--header-height)] px-8 border-b border-[#E2E8F0] relative"
      style={{ background: 'var(--header-bg)' }}
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/20 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white overflow-hidden border border-[#E2E8F0] shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
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
                className="w-10 h-10 bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] hover:bg-[#F1F5F9] transition-all shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 bg-white border-t border-[#E2E8F0]">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-[#0F172A] uppercase tracking-wider mb-2">Heritage Shard Portrait</h3>
                  <p className="text-royal font-bold text-xs uppercase tracking-[0.2em]">{user?.name || "Tameeka Lockhart"} · Identity Verification Shard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 flex items-center justify-between w-full h-full">
        {/* Left — Title */}
        <div className="shrink-0 mr-8 text-left">
          <h1 className="text-[1rem] font-bold uppercase tracking-[0.1em] text-[#0F172A] m-0 whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8] m-0 whitespace-nowrap mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

      {/* Center — Search */}
      <div className="flex-1 max-w-[350px] min-w-[150px] flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] py-2 px-4 focus-within:border-royal transition-all">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#94A3B8]"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search protocols..."
          className="flex-1 bg-transparent border-none outline-none text-[0.8rem] font-medium text-[#0F172A] placeholder:text-[#CBD5E1]"
        />
      </div>
      
      {/* Simulation Engine: Authority Mode */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] mx-8">
        <div className="flex flex-col text-left">
          <label className="text-[9px] font-bold text-royal/60 uppercase tracking-[0.2em] whitespace-nowrap leading-none mb-1">View As</label>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'Owner' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-[9px] font-semibold text-[#0F172A]/70">{mode === 'Owner' ? 'Active Owner' : mode === 'Incapacity' ? 'Incapacity' : 'After Passing'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E2E8F0] rounded-xl">
          {(['Owner', 'Incapacity', 'Settlement'] as const).map((m) => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-semibold transition-all ${
                mode === m 
                  ? "bg-royal text-white shadow-sm" 
                  : "text-[#0F172A]/40 hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
            >
              {m === 'Owner' ? 'Active' : m === 'Settlement' ? 'After Passing' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button className="p-2 text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all relative">
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
          <span className="absolute top-2 right-2 w-2 h-2 bg-royal" />
        </button>

        {/* Avatar */}
        {user?.profilePhotoUrl ? (
          <img 
            src={user.profilePhotoUrl} 
            onClick={() => setShowPhotoModal(true)}
            className="w-9 h-9 object-cover border border-[#E2E8F0] shadow-sm cursor-pointer hover:opacity-80 transition-all" 
            alt="Avatar" 
          />
        ) : (
          <div className="w-9 h-9 bg-royal flex items-center justify-center text-white font-bold text-[0.7rem] cursor-pointer hover:opacity-90 transition-opacity">
            {getInitials(user?.name || 'TL')}
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
