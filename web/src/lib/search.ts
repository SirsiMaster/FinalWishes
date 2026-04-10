/**
 * Estate Search Hook — FinalWishes
 *
 * Client-side search across all estate Firestore subcollections.
 * No network requests — searches already-loaded onSnapshot data.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useEstateAssets,
  useEstateHeirs,
  useEstateExecutors,
  useEstateDocuments,
  useLockboxItems,
  useDirectives,
  useTimeCapsules,
  useHeirlooms,
  useCollection,
  type Asset,
  type Heir,
  type Executor,
  type VaultDocument,
  type LockboxItem,
  type Directive,
  type TimeCapsule,
  type Heirloom,
} from './firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchResultType =
  | 'asset'
  | 'document'
  | 'beneficiary'
  | 'lockbox'
  | 'directive'
  | 'capsule'
  | 'heirloom'
  | 'memoir';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: string; // lucide icon name
}

interface SearchState {
  results: SearchResult[];
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<SearchResultType, { icon: string; label: string }> = {
  asset:       { icon: 'DollarSign',  label: 'Asset' },
  document:    { icon: 'Lock',        label: 'Document' },
  beneficiary: { icon: 'Users',       label: 'Beneficiary' },
  lockbox:     { icon: 'Key',         label: 'Lockbox' },
  directive:   { icon: 'FileText',    label: 'Directive' },
  capsule:     { icon: 'Clock',       label: 'Time Capsule' },
  heirloom:    { icon: 'Diamond',     label: 'Heirloom' },
  memoir:      { icon: 'Video',       label: 'Memoir' },
};

export { TYPE_META };

/**
 * Score a match for relevance sorting.
 * Higher = better match.
 *   3 = exact match (title equals query)
 *   2 = starts with query
 *   1 = contains query
 *   0 = no match
 */
function scoreMatch(text: string, q: string): number {
  const lower = text.toLowerCase();
  if (lower === q) return 3;
  if (lower.startsWith(q)) return 2;
  if (lower.includes(q)) return 1;
  return 0;
}

function matches(text: string | undefined | null, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

// ─── Memoir type (inline — memoirs don't have a dedicated hook in firestore.ts) ─

interface Memoir {
  id: string;
  title: string;
  type: 'video' | 'photo' | 'youtube';
  url: string;
  dateAdded?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEstateSearch(estateId: string, query: string): SearchState {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query by 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Subscribe to all subcollections
  const { data: assets, loading: assetsLoading } = useEstateAssets(estateId);
  const { data: heirs, loading: heirsLoading } = useEstateHeirs(estateId);
  const { data: executors, loading: executorsLoading } = useEstateExecutors(estateId);
  const { data: documents, loading: docsLoading } = useEstateDocuments(estateId);
  const { data: lockbox, loading: lockboxLoading } = useLockboxItems(estateId);
  const { data: directives, loading: directivesLoading } = useDirectives(estateId);
  const { data: capsules, loading: capsulesLoading } = useTimeCapsules(estateId);
  const { data: heirlooms, loading: heirloomsLoading } = useHeirlooms(estateId);
  const { data: memoirsRaw, loading: memoirsLoading } = useCollection<Memoir>(
    estateId ? `estates/${estateId}/memoirs` : null,
  );

  const loading =
    assetsLoading ||
    heirsLoading ||
    executorsLoading ||
    docsLoading ||
    lockboxLoading ||
    directivesLoading ||
    capsulesLoading ||
    heirloomsLoading ||
    memoirsLoading;

  const results = useMemo(() => {
    const q = debouncedQuery;
    if (!q || q.length < 2) return [];

    const scored: { result: SearchResult; score: number }[] = [];

    // Assets
    for (const a of assets) {
      const s = Math.max(scoreMatch(a.name, q), matches(a.description, q) ? 1 : 0);
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'asset',
            id: a.id,
            title: a.name,
            subtitle: a.category.replace(/_/g, ' '),
            route: `/estates/${estateId}/assets`,
            icon: TYPE_META.asset.icon,
          },
        });
      }
    }

    // Heirs (beneficiaries)
    for (const h of heirs) {
      const s = Math.max(
        scoreMatch(h.fullName, q),
        matches(h.email, q) ? 1 : 0,
        matches(h.relationship, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'beneficiary',
            id: h.id,
            title: h.fullName,
            subtitle: h.relationship || 'Beneficiary',
            route: `/estates/${estateId}/beneficiaries`,
            icon: TYPE_META.beneficiary.icon,
          },
        });
      }
    }

    // Executors (also show as beneficiary type for search)
    for (const e of executors) {
      const s = Math.max(
        scoreMatch(e.fullName, q),
        matches(e.email, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'beneficiary',
            id: e.id,
            title: e.fullName,
            subtitle: `Executor${e.relationship ? ` · ${e.relationship}` : ''}`,
            route: `/estates/${estateId}/beneficiaries`,
            icon: TYPE_META.beneficiary.icon,
          },
        });
      }
    }

    // Documents
    for (const d of documents) {
      const name = d.displayName || d.originalName;
      const s = Math.max(
        scoreMatch(name, q),
        (d.tags || []).some((t) => matches(t, q)) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'document',
            id: d.id,
            title: name,
            subtitle: d.mimeType.split('/').pop() || 'Document',
            route: `/estates/${estateId}/vault`,
            icon: TYPE_META.document.icon,
          },
        });
      }
    }

    // Lockbox
    for (const l of lockbox) {
      const s = Math.max(
        scoreMatch(l.accountName, q),
        matches(l.institution, q) ? 1 : 0,
        matches(l.notes, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'lockbox',
            id: l.id,
            title: l.accountName,
            subtitle: l.institution || l.category.replace(/_/g, ' '),
            route: `/estates/${estateId}/lockbox`,
            icon: TYPE_META.lockbox.icon,
          },
        });
      }
    }

    // Directives
    for (const d of directives) {
      const s = Math.max(
        scoreMatch(d.title, q),
        matches(d.recipientName, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'directive',
            id: d.id,
            title: d.title,
            subtitle: d.type.replace(/_/g, ' '),
            route: `/estates/${estateId}/directives`,
            icon: TYPE_META.directive.icon,
          },
        });
      }
    }

    // Time Capsules
    for (const c of capsules) {
      const s = Math.max(
        scoreMatch(c.title, q),
        matches(c.recipientName, q) ? 1 : 0,
        matches(c.message, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'capsule',
            id: c.id,
            title: c.title,
            subtitle: `To: ${c.recipientName}`,
            route: `/estates/${estateId}/timecapsule`,
            icon: TYPE_META.capsule.icon,
          },
        });
      }
    }

    // Heirlooms
    for (const h of heirlooms) {
      const s = Math.max(
        scoreMatch(h.name, q),
        matches(h.description, q) ? 1 : 0,
        matches(h.location, q) ? 1 : 0,
      );
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'heirloom',
            id: h.id,
            title: h.name,
            subtitle: h.category.replace(/_/g, ' '),
            route: `/estates/${estateId}/heirlooms`,
            icon: TYPE_META.heirloom.icon,
          },
        });
      }
    }

    // Memoirs
    for (const m of memoirsRaw) {
      const s = scoreMatch(m.title || '', q);
      if (s > 0) {
        scored.push({
          score: s,
          result: {
            type: 'memoir',
            id: m.id,
            title: m.title || 'Untitled',
            subtitle: m.type || 'media',
            route: `/estates/${estateId}/memoirs`,
            icon: TYPE_META.memoir.icon,
          },
        });
      }
    }

    // Sort: highest score first, then alphabetical
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.result.title.localeCompare(b.result.title);
    });

    return scored.slice(0, 10).map((s) => s.result);
  }, [
    debouncedQuery,
    estateId,
    assets,
    heirs,
    executors,
    documents,
    lockbox,
    directives,
    capsules,
    heirlooms,
    memoirsRaw,
  ]);

  return { results, loading };
}
