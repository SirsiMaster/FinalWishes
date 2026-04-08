import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firestore
const mockAddDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => 'MOCK_TIMESTAMP')

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}))

import {
  createEstate,
  addAsset,
  addHeir,
  addLockboxItem,
  addDirective,
  addTimeCapsule,
  archiveAsset,
  archiveLockboxItem,
  cancelTimeCapsule,
} from './estate-actions'

beforeEach(() => {
  vi.clearAllMocks()
  mockAddDoc.mockResolvedValue({ id: 'mock-id' })
  mockSetDoc.mockResolvedValue(undefined)
  mockUpdateDoc.mockResolvedValue(undefined)
  mockCollection.mockReturnValue('mock-collection-ref')
  mockDoc.mockReturnValue('mock-doc-ref')
})

describe('createEstate', () => {
  it('creates estate + estate_users junction + updates user profile', async () => {
    const result = await createEstate({ name: 'Test Estate', principalId: 'user-123' })

    expect(result.success).toBe(true)
    expect(result.id).toBe('mock-id')
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
    expect(mockSetDoc).toHaveBeenCalledTimes(1) // estate_users
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1) // user profile
  })

  it('returns error on failure', async () => {
    mockAddDoc.mockRejectedValue(new Error('Permission denied'))
    const result = await createEstate({ name: 'Test', principalId: 'user-123' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Permission denied')
  })
})

describe('addAsset', () => {
  it('creates asset in estate subcollection', async () => {
    const result = await addAsset({
      estateId: 'estate-1',
      name: 'Chase Checking',
      category: 'financial',
      estimatedValue: 50000,
    })

    expect(result.success).toBe(true)
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
  })
})

describe('addHeir', () => {
  it('creates heir with defaults', async () => {
    const result = await addHeir({
      estateId: 'estate-1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      relationship: 'daughter',
    })

    expect(result.success).toBe(true)
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
  })
})

describe('addLockboxItem', () => {
  it('creates lockbox entry with hasSecureCredentials default', async () => {
    const result = await addLockboxItem({
      estateId: 'estate-1',
      accountName: 'Gmail',
      category: 'digital_account',
    })

    expect(result.success).toBe(true)
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
  })
})

describe('addDirective', () => {
  it('creates directive with draft status', async () => {
    const result = await addDirective({
      estateId: 'estate-1',
      type: 'ethical_will',
      title: 'My Values',
    })

    expect(result.success).toBe(true)
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
  })
})

describe('addTimeCapsule', () => {
  it('creates capsule with pending status', async () => {
    const result = await addTimeCapsule({
      estateId: 'estate-1',
      title: 'Birthday Message',
      message: 'Happy birthday!',
      recipientName: 'Jane',
      recipientEmail: 'jane@example.com',
      deliveryType: 'scheduled_date',
      scheduledDate: new Date('2027-01-01'),
    })

    expect(result.success).toBe(true)
    expect(mockAddDoc).toHaveBeenCalledTimes(1)
  })
})

describe('archiveAsset', () => {
  it('sets status to archived', async () => {
    const result = await archiveAsset('estate-1', 'asset-1')

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })
})

describe('archiveLockboxItem', () => {
  it('sets status to archived', async () => {
    const result = await archiveLockboxItem('estate-1', 'item-1')

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })
})

describe('cancelTimeCapsule', () => {
  it('sets status to cancelled', async () => {
    const result = await cancelTimeCapsule('estate-1', 'capsule-1')

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })
})
