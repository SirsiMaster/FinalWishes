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
  updateEstate,
  addAsset,
  updateAsset,
  addHeir,
  updateHeir,
  addExecutor,
  addLockboxItem,
  updateLockboxItem,
  addDirective,
  updateDirective,
  addTimeCapsule,
  updateTimeCapsule,
  archiveAsset,
  archiveDocument,
  archiveLockboxItem,
  cancelTimeCapsule,
  createDocumentRecord,
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

// ─── Extended Tests ──────────────────────────────────────────────────────────

describe('updateEstate', () => {
  it('updates estate name', async () => {
    const result = await updateEstate('estate-1', { name: 'Renamed Estate' })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      name: 'Renamed Estate',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })

  it('returns error on failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Not found'))
    const result = await updateEstate('estate-1', { name: 'X' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not found')
  })
})

describe('updateAsset', () => {
  it('updates asset fields with timestamp', async () => {
    const result = await updateAsset('estate-1', 'asset-1', { estimatedValue: 100000 })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      estimatedValue: 100000,
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })
})

describe('addHeir extended', () => {
  it('defaults isMinor and isResiduary to false', async () => {
    await addHeir({ estateId: 'estate-1', fullName: 'Minor Test' })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].isMinor).toBe(false)
    expect(addDocCall[1].isResiduary).toBe(false)
  })

  it('respects explicit isMinor true', async () => {
    await addHeir({ estateId: 'estate-1', fullName: 'Child', isMinor: true })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].isMinor).toBe(true)
  })
})

describe('updateHeir', () => {
  it('updates heir fields', async () => {
    const result = await updateHeir('estate-1', 'heir-1', { relationship: 'spouse' })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })

  it('returns error on failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permission denied'))
    const result = await updateHeir('estate-1', 'heir-1', { fullName: 'X' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Permission denied')
  })
})

describe('addExecutor', () => {
  it('creates executor with pending status', async () => {
    const result = await addExecutor({
      estateId: 'estate-1',
      fullName: 'John Executor',
      email: 'john@example.com',
      priority: 1,
    })

    expect(result.success).toBe(true)
    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].status).toBe('pending')
    expect(addDocCall[1].confirmedDeath).toBe(false)
    expect(addDocCall[1].priority).toBe(1)
  })

  it('returns error on failure', async () => {
    mockAddDoc.mockRejectedValue(new Error('Quota exceeded'))
    const result = await addExecutor({
      estateId: 'estate-1',
      fullName: 'Test',
      email: 'test@example.com',
      priority: 1,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Quota exceeded')
  })
})

describe('createDocumentRecord', () => {
  it('creates vault document metadata', async () => {
    const result = await createDocumentRecord({
      estateId: 'estate-1',
      originalName: 'will.pdf',
      mimeType: 'application/pdf',
      fileSize: 102400,
      storageKey: 'estates/estate-1/will.pdf',
      storageBucket: 'finalwishes-prod.appspot.com',
      uploadedBy: 'user-1',
    })

    expect(result.success).toBe(true)
    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].version).toBe(1)
    expect(addDocCall[1].status).toBe('active')
    expect(addDocCall[1].ocrProcessed).toBe(false)
  })
})

describe('archiveDocument', () => {
  it('sets document status to archived', async () => {
    const result = await archiveDocument('estate-1', 'doc-1')

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      status: 'archived',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })

  it('returns error on failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Not found'))
    const result = await archiveDocument('estate-1', 'doc-1')

    expect(result.success).toBe(false)
  })
})

describe('addLockboxItem extended', () => {
  it('defaults hasSecureCredentials to false', async () => {
    await addLockboxItem({
      estateId: 'estate-1',
      accountName: 'Bank Account',
      category: 'banking',
    })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].hasSecureCredentials).toBe(false)
    expect(addDocCall[1].status).toBe('active')
  })

  it('respects explicit hasSecureCredentials true', async () => {
    await addLockboxItem({
      estateId: 'estate-1',
      accountName: 'Crypto Wallet',
      category: 'crypto',
      hasSecureCredentials: true,
    })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].hasSecureCredentials).toBe(true)
  })

  it('returns error on failure', async () => {
    mockAddDoc.mockRejectedValue(new Error('Write failed'))
    const result = await addLockboxItem({
      estateId: 'estate-1',
      accountName: 'Test',
      category: 'other',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Write failed')
  })
})

describe('updateLockboxItem', () => {
  it('updates lockbox item fields', async () => {
    const result = await updateLockboxItem('estate-1', 'item-1', { institution: 'Chase' })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      institution: 'Chase',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })
})

describe('addDirective extended', () => {
  it('sets default content to empty string', async () => {
    await addDirective({
      estateId: 'estate-1',
      type: 'funeral_preferences',
      title: 'My Wishes',
    })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].content).toBe('')
    expect(addDocCall[1].status).toBe('draft')
  })

  it('preserves provided content', async () => {
    await addDirective({
      estateId: 'estate-1',
      type: 'final_message',
      title: 'Goodbye',
      content: '<p>Dear family...</p>',
    })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].content).toBe('<p>Dear family...</p>')
  })
})

describe('updateDirective', () => {
  it('updates directive fields', async () => {
    const result = await updateDirective('estate-1', 'dir-1', { title: 'Updated Title' })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
  })

  it('returns error on failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Forbidden'))
    const result = await updateDirective('estate-1', 'dir-1', { title: 'X' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Forbidden')
  })
})

describe('addTimeCapsule extended', () => {
  it('creates capsule without scheduledDate for on_death type', async () => {
    const result = await addTimeCapsule({
      estateId: 'estate-1',
      title: 'On Death Message',
      message: 'To be delivered...',
      recipientName: 'Jane',
      recipientEmail: 'jane@example.com',
      deliveryType: 'on_death',
    })

    expect(result.success).toBe(true)
    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].status).toBe('pending')
    expect(addDocCall[1]).not.toHaveProperty('scheduledDate')
  })

  it('includes scheduledDate when provided', async () => {
    const date = new Date('2027-06-15')
    await addTimeCapsule({
      estateId: 'estate-1',
      title: 'Scheduled',
      message: 'Happy birthday!',
      recipientName: 'Jane',
      recipientEmail: 'jane@example.com',
      deliveryType: 'scheduled_date',
      scheduledDate: date,
    })

    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].scheduledDate).toEqual(date)
  })
})

describe('updateTimeCapsule', () => {
  it('updates capsule fields', async () => {
    const result = await updateTimeCapsule('estate-1', 'cap-1', { message: 'Updated message' })

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      message: 'Updated message',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })
})

describe('createEstate extended', () => {
  it('writes estate_users junction with correct composite ID', async () => {
    await createEstate({ name: 'Test', principalId: 'uid-abc' })

    // setDoc is called for estate_users — check the doc path
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'estate_users', 'uid-abc_mock-id')
  })

  it('updates user profile with primaryEstateId', async () => {
    await createEstate({ name: 'My Estate', principalId: 'uid-abc' })

    // updateDoc is called for user profile
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      primaryEstateId: 'mock-id',
      primaryEstateName: 'My Estate',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })
})
