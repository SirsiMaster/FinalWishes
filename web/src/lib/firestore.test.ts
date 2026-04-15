import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ─── Mock Firestore ──────────────────────────────────────────────────────────

type SnapshotCallback = (snapshot: unknown) => void
type ErrorCallback = (err: Error) => void

let capturedOnSnapshotCallback: SnapshotCallback | null = null
let capturedOnSnapshotError: ErrorCallback | null = null

const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn((..._: any[]) => 'mock-doc-ref')
const mockCollection = vi.fn((..._: any[]) => 'mock-collection-ref')
const mockQuery = vi.fn((...args: any[]) => args[0])
const mockWhere = vi.fn((...args: any[]) => ({ type: 'where', args }))
const mockOrderBy = vi.fn((...args: any[]) => ({ type: 'orderBy', args }))
const mockLimit = vi.fn((...args: any[]) => ({ type: 'limit', args }))

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}))

import {
  useDocument,
  useCollection,
  useEstate,
  useEstateAssets,
  useEstateHeirs,
  useEstateDocuments,
  useLockboxItems,
  useDirectives,
  useTimeCapsules,
  useEstateNotifications,
  useUserEstates,
} from './firestore'

beforeEach(() => {
  vi.clearAllMocks()
  capturedOnSnapshotCallback = null
  capturedOnSnapshotError = null

  // Default: onSnapshot captures callbacks and returns unsubscribe
  mockOnSnapshot.mockImplementation((_ref: unknown, onNext: SnapshotCallback, onError?: ErrorCallback) => {
    capturedOnSnapshotCallback = onNext
    capturedOnSnapshotError = onError || null
    return vi.fn() // unsubscribe
  })
})

// ─── Helper to fire snapshot ─────────────────────────────────────────────────

function fireDocSnapshot(exists: boolean, data?: Record<string, unknown>) {
  if (capturedOnSnapshotCallback) {
    capturedOnSnapshotCallback({
      exists: () => exists,
      id: 'doc-1',
      data: () => data || {},
    })
  }
}

function fireCollectionSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  if (capturedOnSnapshotCallback) {
    capturedOnSnapshotCallback({
      docs: docs.map((d) => ({
        id: d.id,
        data: () => d.data,
      })),
    })
  }
}

function fireSnapshotError(message: string) {
  if (capturedOnSnapshotError) {
    capturedOnSnapshotError(new Error(message))
  }
}

// ─── useDocument ─────────────────────────────────────────────────────────────

describe('useDocument', () => {
  it('returns loading initially then data on snapshot', async () => {
    const { result } = renderHook(() => useDocument<{ id: string; name: string }>('estates/e1'))

    // Initially loading
    expect(result.current.loading).toBe(true)

    // Fire snapshot
    act(() => {
      fireDocSnapshot(true, { name: 'Test Estate' })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual({ id: 'doc-1', name: 'Test Estate' })
    expect(result.current.error).toBeNull()
  })

  it('returns null data when document does not exist', async () => {
    const { result } = renderHook(() => useDocument('estates/nonexistent'))

    act(() => {
      fireDocSnapshot(false)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
  })

  it('returns null and stops loading when path is null', async () => {
    const { result } = renderHook(() => useDocument(null))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('sets error on snapshot failure', async () => {
    const { result } = renderHook(() => useDocument('estates/e1'))

    act(() => {
      fireSnapshotError('Permission denied')
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Permission denied')
  })
})

// ─── useCollection ───────────────────────────────────────────────────────────

describe('useCollection', () => {
  it('returns empty array initially then populated on snapshot', async () => {
    const { result } = renderHook(() => useCollection<{ id: string; name: string }>('estates/e1/assets'))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toEqual([])

    act(() => {
      fireCollectionSnapshot([
        { id: 'a1', data: { name: 'House' } },
        { id: 'a2', data: { name: 'Car' } },
      ])
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data[0]).toEqual({ id: 'a1', name: 'House' })
  })

  it('returns empty array when path is null', async () => {
    const { result } = renderHook(() => useCollection(null))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual([])
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('sets error on snapshot failure', async () => {
    const { result } = renderHook(() => useCollection('estates/e1/assets'))

    act(() => {
      fireSnapshotError('Quota exceeded')
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Quota exceeded')
  })
})

// ─── Domain Hooks ────────────────────────────────────────────────────────────

describe('useEstate', () => {
  it('subscribes to correct document path', () => {
    renderHook(() => useEstate('estate-1'))
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1')
  })

  it('does not subscribe when estateId is null', () => {
    renderHook(() => useEstate(null))
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })
})

describe('useEstateAssets', () => {
  it('subscribes to assets subcollection with orderBy', () => {
    renderHook(() => useEstateAssets('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/assets')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })

  it('returns empty when estateId is null', async () => {
    const { result } = renderHook(() => useEstateAssets(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([])
  })
})

describe('useEstateHeirs', () => {
  it('subscribes with active filter and orderBy', () => {
    renderHook(() => useEstateHeirs('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/heirs')
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'asc')
  })
})

describe('useEstateDocuments', () => {
  it('subscribes with active filter', () => {
    renderHook(() => useEstateDocuments('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/documents')
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active')
  })
})

describe('useLockboxItems', () => {
  it('subscribes to lockbox subcollection', () => {
    renderHook(() => useLockboxItems('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/lockbox')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })
})

describe('useDirectives', () => {
  it('subscribes to directives subcollection', () => {
    renderHook(() => useDirectives('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/directives')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })
})

describe('useTimeCapsules', () => {
  it('subscribes to capsules subcollection', () => {
    renderHook(() => useTimeCapsules('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/capsules')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })
})

describe('useEstateNotifications', () => {
  it('subscribes with limit of 20', () => {
    renderHook(() => useEstateNotifications('estate-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estates/estate-1/notifications')
    expect(mockLimit).toHaveBeenCalledWith(20)
  })
})

describe('useUserEstates', () => {
  it('queries estate_users with userId filter', () => {
    renderHook(() => useUserEstates('user-1'))
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'estate_users')
    expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-1')
    expect(mockWhere).toHaveBeenCalledWith('accessGranted', '==', true)
  })

  it('does not subscribe when userId is null', async () => {
    const { result } = renderHook(() => useUserEstates(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual([])
  })
})
