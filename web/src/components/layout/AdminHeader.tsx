"use client";
import React, { useState } from "react";
import { useAuth } from '../../lib/auth'

export function AdminHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const [mode, setMode] = useState<'Owner' | 'Incapacity' | 'Settlement'>('Owner');
  const { profile } = useAuth();
  const user = profile ? {
    name: profile.displayName,
    profilePhotoUrl: profile.profilePhotoUrl || '/assets/tameeka/mom dance.jpg',
  } : { name: 'Guest', profilePhotoUrl: '' };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || 'TL';
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[var(--header-height)] px-8 border-b border-royal/10 relative"
      style={{ background: 'var(--header-bg)' }}
    >
      {/* Photo Modal */}
      {showPhotoModal && user?.profilePhotoUrl && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-royal/10 backdrop-blur-xl p-8 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white overflow-hidden border border-royal/20 shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
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
                className="w-10 h-10 bg-white border border-royal/20 flex items-center justify-center text-royal hover:bg-royal/5 transition-all shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 flex items-center justify-between w-full h-full">
        {/* Left — Title */}
        <div className="shrink-0 mr-8 text-left">
          <h1 className="text-[1rem] font-black uppercase tracking-[0.1em] text-royal m-0 whitespace-nowrap font-[family-name:var(--font-cinzel)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-royal/40 m-0 whitespace-nowrap mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

      {/* Center — Search */}
      <div className="flex-1 max-w-[350px] min-w-[150px] flex items-center gap-2 bg-royal/[0.03] border border-royal/10 py-2 px-4 focus-within:border-royal transition-all">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-royal/30"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search protocols..."
          className="flex-1 bg-transparent border-none outline-none text-[0.8rem] font-bold text-royal placeholder:text-royal/20"
        />
      </div>
      
      {/* Simulation Engine: Authority Mode */}
      <div className="flex items-center gap-4 px-4 py-2 bg-royal/[0.03] border border-royal/10 mx-8">
        <div className="flex flex-col text-left">
          <label className="text-[9px] font-bold text-royal/60 uppercase tracking-[0.2em] whitespace-nowrap leading-none mb-1">View As</label>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${mode === 'Owner' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gold animate-pulse'}`} />
            <span className="text-[9px] font-black text-royal/70 uppercase tracking-widest leading-none">{mode === 'Owner' ? 'Active Owner' : mode === 'Incapacity' ? 'Incapacity' : 'After Passing'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white border border-royal/10 rounded-xl">
          {(['Owner', 'Incapacity', 'Settlement'] as const).map((m) => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest ${
                mode === m 
                  ? "bg-royal text-white shadow-md" 
                  : "text-royal/40 hover:bg-royal/5 hover:text-royal"
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
        <button className="p-2 text-royal/30 hover:bg-royal/5 hover:text-royal transition-all relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-royal shadow-[0_0_5px_rgba(19,51,120,0.4)]" />
        </button>

        {/* Avatar */}
        {user?.profilePhotoUrl ? (
          <img 
            src={user.profilePhotoUrl} 
            onClick={() => setShowPhotoModal(true)}
            className="w-9 h-9 object-cover border border-royal/30 shadow-sm cursor-pointer hover:border-royal transition-all" 
            alt="Avatar" 
          />
        ) : (
          <div className="w-9 h-9 bg-royal flex items-center justify-center text-white font-black text-[0.7rem] cursor-pointer hover:bg-sapphire transition-all shadow-sm">
            {getInitials(user?.name || 'TL')}
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
