/**
 * SearchResults — Dropdown for estate-wide search
 *
 * Renders below the AdminHeader search input.
 * Groups results by type, supports keyboard navigation.
 *
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type SearchResult, TYPE_META } from '@/lib/search';

// ─── Icon Map (inline SVGs matching Sidebar style) ────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  DollarSign: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Key: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  FileText: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Diamond: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M2 9h20" />
    </svg>
  ),
  Video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
};

// ─── Combobox/listbox identity (shared with AdminHeader) ──────────────────────
// Stable ids let the search input expose `aria-controls` (the listbox) and
// `aria-activedescendant` (the highlighted option) so screen readers announce
// the active result during keyboard navigation.

export const SEARCH_LISTBOX_ID = 'estate-search-listbox';

/** Deterministic option id for a given result index. */
export const searchOptionId = (index: number) => `estate-search-option-${index}`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onActiveIndexChange: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchResults({
  results,
  loading,
  query,
  activeIndex,
  onSelect,
  onActiveIndexChange,
}: SearchResultsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-search-item]');
    const activeItem = items[activeIndex] as HTMLElement | undefined;
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Empty state — no query
  if (!query.trim()) {
    return (
      <DropdownShell>
        <div className="px-4 py-8 text-center">
          <p className="text-[11px] font-bold text-royal/30 uppercase tracking-[0.15em]">
            Type to search across your estate
          </p>
        </div>
      </DropdownShell>
    );
  }

  // Loading state
  if (loading && results.length === 0) {
    return (
      <DropdownShell>
        <div className="px-4 py-8 flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
          <p className="text-[11px] font-bold text-royal/40 uppercase tracking-[0.15em]">
            Searching...
          </p>
        </div>
      </DropdownShell>
    );
  }

  // No results
  if (query.trim().length >= 2 && results.length === 0) {
    return (
      <DropdownShell liveMessage="No results found">
        <div className="px-4 py-8 text-center">
          <p className="text-[11px] font-bold text-royal/30 uppercase tracking-[0.15em]">
            No results found
          </p>
          <p className="text-[10px] text-royal/20 mt-1">
            Try a different search term
          </p>
        </div>
      </DropdownShell>
    );
  }

  // Too short
  if (query.trim().length < 2) {
    return (
      <DropdownShell>
        <div className="px-4 py-8 text-center">
          <p className="text-[11px] font-bold text-royal/30 uppercase tracking-[0.15em]">
            Type at least 2 characters
          </p>
        </div>
      </DropdownShell>
    );
  }

  return (
    <DropdownShell liveMessage={`${results.length} result${results.length !== 1 ? 's' : ''}`}>
      <ScrollArea className="max-h-[360px]">
        <div ref={listRef} className="py-1">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              id={searchOptionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              data-search-item
              onClick={() => onSelect(result)}
              onMouseEnter={() => onActiveIndexChange(index)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                index === activeIndex
                  ? 'bg-royal/[0.06]'
                  : 'hover:bg-royal/[0.03]'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-royal/[0.05] border border-royal/10 text-royal/50">
                {ICONS[result.icon] || null}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[0.8rem] font-bold text-royal truncate leading-tight">
                  {result.title}
                </p>
                <p className="text-[10px] text-royal/40 truncate mt-0.5 capitalize">
                  {result.subtitle}
                </p>
              </div>

              {/* Type Badge */}
              <Badge
                variant="outline"
                className="shrink-0 text-[9px] font-bold uppercase tracking-wider border-royal/10 text-royal/40 px-2 py-0.5 rounded-none"
              >
                {TYPE_META[result.type].label}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-royal/10 px-4 py-2 flex items-center justify-between">
        <span className="text-[9px] text-royal/30 font-bold uppercase tracking-wider">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <kbd className="text-[9px] text-royal/30 bg-royal/[0.04] border border-royal/10 px-1.5 py-0.5 font-mono">
            ↑↓
          </kbd>
          <span className="text-[9px] text-royal/20">navigate</span>
          <kbd className="text-[9px] text-royal/30 bg-royal/[0.04] border border-royal/10 px-1.5 py-0.5 font-mono">
            ↵
          </kbd>
          <span className="text-[9px] text-royal/20">select</span>
        </div>
      </div>
    </DropdownShell>
  );
}

// ─── Shell wrapper ────────────────────────────────────────────────────────────

function DropdownShell({
  children,
  liveMessage = '',
}: {
  children: React.ReactNode;
  liveMessage?: string;
}) {
  return (
    <div
      id={SEARCH_LISTBOX_ID}
      role="listbox"
      aria-label="Search results"
      className="absolute top-full left-0 right-0 mt-1 z-[100] bg-white border border-royal/10 shadow-[0_20px_60px_rgba(19,51,120,0.12)] overflow-hidden"
    >
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>
      {children}
    </div>
  );
}
