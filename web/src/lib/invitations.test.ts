import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Firestore ──────────────────────────────────────────────────────────

const mockAddDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockCollection = vi.fn((..._: any[]) => 'mock-collection-ref')
const mockDoc = vi.fn((..._: any[]) => 'mock-doc-ref')
const mockQuery = vi.fn((...args: any[]) => args[0])
const mockWhere = vi.fn((...args: any[]) => ({ type: 'where', args }))
const mockServerTimestamp = vi.fn(() => 'MOCK_TIMESTAMP')

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  serverTimestamp: () => mockServerTimestamp(),
}))

import {
  sendEstateInvitation,
  listPendingInvitations,
  hasExistingInvitation,
  getEstateInvitations,
  revokeInvitation,
  ROLE_LABELS,
} from './invitations'

beforeEach(() => {
  vi.clearAllMocks()
  mockAddDoc.mockResolvedValue({ id: 'inv-1' })
  mockSetDoc.mockResolvedValue(undefined)
  mockUpdateDoc.mockResolvedValue(undefined)
})

// ─── sendEstateInvitation ────────────────────────────────────────────────────

describe('sendEstateInvitation', () => {
  it('creates invitation for new user (no existing account)', async () => {
    // No existing user
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    const result = await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'new@example.com',
      fullName: 'Jane Doe',
      role: 'executor',
      invitedBy: 'user-1',
      priority: 1,
    })

    expect(result.success).toBe(true)
    expect(result.invitationId).toBe('inv-1')
    expect(result.autoLinked).toBe(false)
    // invitation record + executor subcollection record + email to mail collection
    expect(mockAddDoc).toHaveBeenCalledTimes(3)
  })

  it('does NOT look up or link the invitee from the client (server-side now)', async () => {
    // The client no longer queries the `users` collection by email (the read
    // rule forbids it — PII siloing) nor auto-links via estate_users. Linking an
    // existing-account invitee is handled by the autoMatchOnInvitation trigger.
    const result = await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'Existing@Example.com',
      fullName: 'Existing User',
      role: 'heir',
      invitedBy: 'user-1',
    })

    expect(result.success).toBe(true)
    // No client-side cross-user reads/writes:
    expect(mockSetDoc).not.toHaveBeenCalled()
    expect(mockUpdateDoc).not.toHaveBeenCalled()
    // invitation + heir subcollection are still written.
    expect(mockAddDoc.mock.calls[0][1].status).toBe('pending')
  })

  it('normalizes email to lowercase', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: '  UPPER@Example.COM  ',
      fullName: 'Test',
      role: 'heir',
      invitedBy: 'user-1',
    })

    // Check that the email was normalized in the invitation record
    const addDocCall = mockAddDoc.mock.calls[0]
    expect(addDocCall[1].email).toBe('upper@example.com')
  })

  it('creates executor subcollection record for executor role', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'exec@example.com',
      fullName: 'Executor Person',
      role: 'executor',
      invitedBy: 'user-1',
      priority: 2,
    })

    // Second addDoc call should be the executor subcollection
    const subcollectionCall = mockAddDoc.mock.calls[1]
    expect(subcollectionCall[1].priority).toBe(2)
    expect(subcollectionCall[1].status).toBe('invited')
  })

  it('creates heir subcollection record for non-executor roles', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'legal@example.com',
      fullName: 'Legal Counsel',
      role: 'legal',
      invitedBy: 'user-1',
    })

    const subcollectionCall = mockAddDoc.mock.calls[1]
    expect(subcollectionCall[1].isMinor).toBe(false)
    expect(subcollectionCall[1].isResiduary).toBe(false)
    expect(subcollectionCall[1].status).toBe('pending')
  })

  it('returns error on failure', async () => {
    // The invitation write is the first Firestore call now (no users query).
    mockAddDoc.mockRejectedValue(new Error('Network error'))

    const result = await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'test@example.com',
      fullName: 'Test',
      role: 'heir',
      invitedBy: 'user-1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})

// ─── listPendingInvitations ──────────────────────────────────────────────────

describe('listPendingInvitations', () => {
  it('returns pending invitations for estate', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'inv-1', data: () => ({ email: 'a@b.com', fullName: 'A', role: 'heir', status: 'pending' }) },
        { id: 'inv-2', data: () => ({ email: 'c@d.com', fullName: 'C', role: 'executor', status: 'pending' }) },
      ],
    })

    const result = await listPendingInvitations('estate-1')

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('inv-1')
    expect(mockWhere).toHaveBeenCalledWith('estateId', '==', 'estate-1')
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending')
  })

  it('returns empty array on error', async () => {
    mockGetDocs.mockRejectedValue(new Error('Permission denied'))

    const result = await listPendingInvitations('estate-1')

    expect(result).toEqual([])
  })
})

// ─── hasExistingInvitation ───────────────────────────────────────────────────

describe('hasExistingInvitation', () => {
  it('returns true when invitation exists', async () => {
    mockGetDocs.mockResolvedValue({ empty: false })

    const result = await hasExistingInvitation('estate-1', 'test@example.com')

    expect(result).toBe(true)
  })

  it('returns false when no invitation exists', async () => {
    mockGetDocs.mockResolvedValue({ empty: true })

    const result = await hasExistingInvitation('estate-1', 'new@example.com')

    expect(result).toBe(false)
  })

  it('returns false on error', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network error'))

    const result = await hasExistingInvitation('estate-1', 'test@example.com')

    expect(result).toBe(false)
  })
})

// ─── getEstateInvitations ────────────────────────────────────────────────────

describe('getEstateInvitations', () => {
  it('returns all invitations for estate', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'inv-1', data: () => ({ email: 'a@b.com', status: 'accepted' }) },
        { id: 'inv-2', data: () => ({ email: 'c@d.com', status: 'pending' }) },
      ],
    })

    const result = await getEstateInvitations('estate-1')

    expect(result).toHaveLength(2)
  })

  it('returns empty array on error', async () => {
    mockGetDocs.mockRejectedValue(new Error('Fail'))

    const result = await getEstateInvitations('estate-1')

    expect(result).toEqual([])
  })
})

// ─── revokeInvitation ────────────────────────────────────────────────────────

describe('revokeInvitation', () => {
  it('sets invitation status to revoked', async () => {
    const result = await revokeInvitation('inv-1')

    expect(result.success).toBe(true)
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      status: 'revoked',
      updatedAt: 'MOCK_TIMESTAMP',
    })
  })

  it('returns error on failure', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Permission denied'))

    const result = await revokeInvitation('inv-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Permission denied')
  })
})

// ─── ROLE_LABELS ─────────────────────────────────────────────────────────────

describe('ROLE_LABELS', () => {
  it('has labels for all roles', () => {
    expect(ROLE_LABELS.executor).toBe('Executor')
    expect(ROLE_LABELS.heir).toBe('Beneficiary')
    expect(ROLE_LABELS.trustee).toBe('Trustee')
    expect(ROLE_LABELS.legal).toBe('Legal Counsel')
    expect(ROLE_LABELS.cpa).toBe('CPA Advisor')
    expect(ROLE_LABELS.principal).toBe('Estate Owner')
  })
})

// ─── Phone Number Support ───────────────────────────────────────────────────

describe('sendEstateInvitation with phone', () => {
  it('includes phone in invitation document when provided', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'test@example.com',
      phone: '+1-555-123-4567',
      fullName: 'Phone User',
      role: 'heir',
      invitedBy: 'user-1',
    })

    // First addDoc call is the invitation record
    const invitationData = mockAddDoc.mock.calls[0][1]
    expect(invitationData.phone).toBe('+1-555-123-4567')
  })

  it('does not include phone field when not provided', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'nophone@example.com',
      fullName: 'No Phone',
      role: 'heir',
      invitedBy: 'user-1',
    })

    const invitationData = mockAddDoc.mock.calls[0][1]
    expect(invitationData).not.toHaveProperty('phone')
  })

  it('queues SMS notification when phone is provided', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })

    await sendEstateInvitation({
      estateId: 'estate-1',
      email: 'sms@example.com',
      phone: '  +1-555-999-0000  ',
      fullName: 'SMS User',
      role: 'executor',
      invitedBy: 'user-1',
      inviterName: 'Cylton',
      estateName: 'Collymore Estate',
      priority: 1,
    })

    // Without phone: 3 addDoc calls (invitation + executor subcollection + email)
    // With phone: 4 addDoc calls (+ sms_queue)
    expect(mockAddDoc).toHaveBeenCalledTimes(4)

    // The last addDoc call is the sms_queue entry
    const lastCall = mockAddDoc.mock.calls[3]
    expect(lastCall[1].to).toBe('+1-555-999-0000')
    expect(lastCall[1].status).toBe('pending')
  })
})
