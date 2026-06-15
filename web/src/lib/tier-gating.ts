/**
 * Tier Gating — FinalWishes
 *
 * Client-side tier definitions and a React hook that fetches
 * media-usage limits from the Go API. Used by upload flows
 * to gate media/video uploads per Stripe tier.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { auth } from './firebase';
import { API_BASE } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TierID = 'free' | 'concierge' | 'white_glove';

export interface TierLimits {
  maxMedia: number;  // -1 = unlimited
  maxVideos: number; // -1 = unlimited
}

export interface MediaUsage {
  tier: TierID;
  mediaCount: number;
  videoCount: number;
  limits: TierLimits;
  canUploadMedia: boolean;
  canUploadVideo: boolean;
}

// ─── Tier Definitions (mirror of Go API) ─────────────────────────────────────

export const TIER_LIMITS: Record<TierID, TierLimits> = {
  free: { maxMedia: 10, maxVideos: 0 },
  concierge: { maxMedia: 25, maxVideos: 0 },
  white_glove: { maxMedia: -1, maxVideos: -1 },
};

export const TIER_NAMES: Record<TierID, string> = {
  free: 'Guardian',
  concierge: 'Concierge',
  white_glove: 'White Glove',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTierGating(estateId: string) {
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!estateId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/v1/estates/${estateId}/media-usage`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch media usage (${res.status})`);
      }

      const data: MediaUsage = await res.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [estateId]);

  useEffect(() => {
    // Fetch media-usage from the Go API (external system) on mount / estateId
    // change. fetchUsage intentionally resets loading+error before the request
    // so a changed estateId shows a fresh loading state; this is the documented
    // external-data-sync use of an effect, not avoidable derivation.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-data fetch; loading/error reset is intentional on estateId change
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, error, refresh: fetchUsage };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function tierUpgradeMessage(
  usage: MediaUsage,
  type: 'media' | 'video',
): string | null {
  if (type === 'media' && !usage.canUploadMedia) {
    const tierName = TIER_NAMES[usage.tier];
    if (usage.tier === 'free') {
      return `You've reached the ${tierName} plan limit of ${usage.limits.maxMedia} uploads. Upgrade to Concierge for more.`;
    }
    if (usage.tier === 'concierge') {
      return `You've reached the ${TIER_NAMES.concierge} plan limit of ${usage.limits.maxMedia} uploads. Upgrade to White Glove for unlimited.`;
    }
  }
  if (type === 'video' && !usage.canUploadVideo) {
    return 'Video uploads are available on the White Glove plan.';
  }
  return null;
}
