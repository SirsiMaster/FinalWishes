"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from '../../lib/auth'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useEstateSearch, type SearchResult } from '@/lib/search'
import { SearchResults } from '@/components/search/SearchResults'
import { NotificationBell } from '@/components/layout/NotificationBell'

export function AdminHeader({
  title,
  subtitle,
  onMenuClick,
}: {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}) {
  const [mode, setMode] = useState<'Owner' | 'Incapacity' | 'Settlement'>('Owner');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { estateId?: string };
  const estateId = params.estateId || '';

  const user = profile ? {
    name: profile.displayName,
    profilePhotoUrl: profile.profilePhotoUrl || undefined,
  } : { name: 'Guest', profilePhotoUrl: undefined };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || '?';
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ─── Search State ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading } = useEstateSearch(estateId, searchQuery);

  // Wrap setSearchQuery to also reset activeIndex
  const updateSearchQuery = useCallback((q: string) => {
    setSearchQuery(q);
    setActiveIndex(-1);
  }, []);

  // Click-outside detection
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to a search result
  const handleSelect = useCallback((result: SearchResult) => {
    setSearchFocused(false);
    updateSearchQuery('');
    navigate({ to: result.route });
  }, [navigate, updateSearchQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!searchFocused) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchFocused(false);
        inputRef.current?.blur();
        break;
    }
  }, [searchFocused, results, activeIndex, handleSelect]);

  const showDropdown = searchFocused;

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between h-[var(--header-height)] px-4 md:px-8 border-b border-royal/10 relative"
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

      <div className="relative z-10 flex items-center justify-between w-full h-full gap-3 md:gap-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-royal/60 hover:bg-royal/5 hover:text-royal transition-all shrink-0"
          aria-label="Open navigation menu"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Left — Title */}
        <div className="shrink-0 md:mr-8 text-left min-w-0">
          <h1 className="text-[0.85rem] md:text-[1rem] font-black uppercase tracking-[0.1em] text-royal m-0 truncate md:whitespace-nowrap font-[family-name:var(--font-cinzel)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-royal/40 m-0 whitespace-nowrap mt-0.5 hidden md:block">
              {subtitle}
            </p>
          )}
        </div>

      {/* Center — Search (hidden on mobile) */}
      <div
        ref={searchContainerRef}
        className="relative hidden md:block flex-1 max-w-[350px] min-w-[150px]"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 bg-royal/[0.03] border border-royal/10 py-2 px-4 focus-within:border-royal transition-all">
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
            ref={inputRef}
            type="text"
            placeholder="Search estate..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="flex-1 bg-transparent border-none outline-none text-[0.8rem] font-bold text-royal placeholder:text-royal/20"
          />
          {searchQuery && (
            <button
              onClick={() => { updateSearchQuery(''); inputRef.current?.focus(); }}
              className="text-royal/30 hover:text-royal/60 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <SearchResults
            results={results}
            loading={loading}
            query={searchQuery}
            activeIndex={activeIndex}
            onSelect={handleSelect}
            onActiveIndexChange={setActiveIndex}
          />
        )}
      </div>

      {/* Simulation Engine: Authority Mode — hidden on mobile/tablet */}
      <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-royal/[0.03] border border-royal/10 mx-8">
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
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <NotificationBell estateId={estateId} />

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
