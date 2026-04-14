import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ─── Mock Firebase Auth ──────────────────────────────────────────────────────

const mockGetIdToken = vi.fn()

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: () => mockGetIdToken(),
    },
  },
}))

// ─── Mock global fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  TIER_LIMITS,
  TIER_NAMES,
  tierUpgradeMessage,
  useTierGating,
  type MediaUsage,
  type TierID,
} from './tier-gating'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetIdToken.mockResolvedValue('mock-token')
})

// ─── Constants ──────────────────────────────────────────────────────────────

describe('TIER_LIMITS', () => {
  it('free tier allows 10 media, 0 video', () => {
    expect(TIER_LIMITS.free).toEqual({ maxMedia: 10, maxVideos: 0 })
  })

  it('concierge tier allows 25 media, 0 video', () => {
    expect(TIER_LIMITS.concierge).toEqual({ maxMedia: 25, maxVideos: 0 })
  })

  it('white_glove tier is unlimited (-1)', () => {
    expect(TIER_LIMITS.white_glove).toEqual({ maxMedia: -1, maxVideos: -1 })
  })
})

describe('TIER_NAMES', () => {
  it('maps tier IDs to display names', () => {
    expect(TIER_NAMES.free).toBe('Guardian')
    expect(TIER_NAMES.concierge).toBe('Concierge')
    expect(TIER_NAMES.white_glove).toBe('White Glove')
  })
})

// ─── tierUpgradeMessage ─────────────────────────────────────────────────────

describe('tierUpgradeMessage', () => {
  const makeUsage = (
    tier: TierID,
    canUploadMedia: boolean,
    canUploadVideo: boolean,
  ): MediaUsage => ({
    tier,
    mediaCount: 10,
    videoCount: 0,
    limits: TIER_LIMITS[tier],
    canUploadMedia,
    canUploadVideo,
  })

  it('returns null when free user can still upload media', () => {
    const msg = tierUpgradeMessage(makeUsage('free', true, false), 'media')
    expect(msg).toBeNull()
  })

  it('returns upgrade message when free user hits media limit', () => {
    const msg = tierUpgradeMessage(makeUsage('free', false, false), 'media')
    expect(msg).toContain('Guardian')
    expect(msg).toContain('10 uploads')
    expect(msg).toContain('Upgrade to Concierge')
  })

  it('returns upgrade message when concierge user hits media limit', () => {
    const usage = makeUsage('concierge', false, false)
    const msg = tierUpgradeMessage(usage, 'media')
    expect(msg).toContain('Concierge')
    expect(msg).toContain('25 uploads')
    expect(msg).toContain('White Glove')
  })

  it('returns null when white_glove user (unlimited)', () => {
    const msg = tierUpgradeMessage(makeUsage('white_glove', true, true), 'media')
    expect(msg).toBeNull()
  })

  it('returns video upgrade message for non-white-glove', () => {
    const msg = tierUpgradeMessage(makeUsage('free', true, false), 'video')
    expect(msg).toContain('White Glove')
    expect(msg).toContain('Video uploads')
  })

  it('returns null for video when white_glove can upload', () => {
    const msg = tierUpgradeMessage(makeUsage('white_glove', true, true), 'video')
    expect(msg).toBeNull()
  })

  it('returns null for video when canUploadVideo is true', () => {
    // Edge case: a tier that somehow allows video
    const usage: MediaUsage = {
      tier: 'free',
      mediaCount: 0,
      videoCount: 0,
      limits: TIER_LIMITS.free,
      canUploadMedia: true,
      canUploadVideo: true,
    }
    expect(tierUpgradeMessage(usage, 'video')).toBeNull()
  })
})

// ─── useTierGating hook ─────────────────────────────────────────────────────

describe('useTierGating', () => {
  const mockUsageResponse: MediaUsage = {
    tier: 'free',
    mediaCount: 5,
    videoCount: 0,
    limits: TIER_LIMITS.free,
    canUploadMedia: true,
    canUploadVideo: false,
  }

  it('fetches usage on mount and returns data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUsageResponse),
    })

    const { result } = renderHook(() => useTierGating('estate-1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.usage).toEqual(mockUsageResponse)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/estates/estate-1/media-usage'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      }),
    )
  })

  it('sets error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    const { result } = renderHook(() => useTierGating('estate-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toContain('403')
    expect(result.current.usage).toBeNull()
  })

  it('sets error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useTierGating('estate-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
  })

  it('refresh function re-fetches data', async () => {
    const updatedUsage = { ...mockUsageResponse, mediaCount: 8 }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsageResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedUsage),
      })

    const { result } = renderHook(() => useTierGating('estate-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.usage?.mediaCount).toBe(5)

    // Call refresh and wait for state update
    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.usage?.mediaCount).toBe(8)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
