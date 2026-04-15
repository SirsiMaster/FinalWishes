import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User, TotpSecret, MultiFactorResolver } from 'firebase/auth'

// ─── Mock Firebase Auth ──────────────────────────────────────────────────────

const mockGetSession = vi.fn()
const mockEnroll = vi.fn()
const mockUnenroll = vi.fn()
const mockEnrolledFactors: Array<{ factorId: string; displayName: string; uid: string }> = []

const mockMultiFactor = vi.fn((..._: any[]) => ({
  getSession: mockGetSession,
  enroll: mockEnroll,
  unenroll: mockUnenroll,
  enrolledFactors: mockEnrolledFactors,
}))

const mockGenerateSecret = vi.fn()
const mockAssertionForEnrollment = vi.fn((..._: any[]) => 'mock-assertion-enroll')
const mockAssertionForSignIn = vi.fn((..._: any[]) => 'mock-assertion-signin')
const mockGetMultiFactorResolver = vi.fn()

vi.mock('firebase/auth', () => ({
  multiFactor: (...args: any[]) => mockMultiFactor(...args),
  TotpMultiFactorGenerator: {
    generateSecret: (...args: any[]) => mockGenerateSecret(...args),
    assertionForEnrollment: (...args: any[]) => mockAssertionForEnrollment(...args),
    assertionForSignIn: (...args: any[]) => mockAssertionForSignIn(...args),
    FACTOR_ID: 'totp',
  },
  TotpSecret: {},
  getMultiFactorResolver: (...args: any[]) => mockGetMultiFactorResolver(...args),
}))

import {
  getMFAStatus,
  startTotpEnrollment,
  finalizeTotpEnrollment,
  resolveTotpChallenge,
  unenrollTotp,
  getMFAResolver,
} from './mfa'

beforeEach(() => {
  vi.clearAllMocks()
  mockEnrolledFactors.length = 0
})

// ─── getMFAStatus ────────────────────────────────────────────────────────────

describe('getMFAStatus', () => {
  it('returns not enrolled when user is null', () => {
    const status = getMFAStatus(null)
    expect(status.enrolled).toBe(false)
    expect(status.methods).toEqual([])
  })

  it('returns not enrolled when no factors', () => {
    const status = getMFAStatus({ uid: 'user-1' } as unknown as User)
    expect(status.enrolled).toBe(false)
    expect(status.methods).toEqual([])
  })

  it('returns enrolled with methods when factors exist', () => {
    mockEnrolledFactors.push({ factorId: 'totp', displayName: 'Authenticator App', uid: 'f1' })

    const status = getMFAStatus({ uid: 'user-1' } as unknown as User)
    expect(status.enrolled).toBe(true)
    expect(status.methods).toEqual(['Authenticator App'])
  })

  it('falls back to factorId when displayName is empty', () => {
    mockEnrolledFactors.push({ factorId: 'totp', displayName: '', uid: 'f1' })

    const status = getMFAStatus({ uid: 'user-1' } as unknown as User)
    expect(status.methods).toEqual(['totp'])
  })
})

// ─── startTotpEnrollment ─────────────────────────────────────────────────────

describe('startTotpEnrollment', () => {
  it('generates secret and QR URL', async () => {
    const mockSecret = {
      generateQrCodeUrl: vi.fn(() => 'otpauth://totp/FinalWishes:test@example.com?secret=ABC'),
    }
    mockGetSession.mockResolvedValue('mock-session')
    mockGenerateSecret.mockResolvedValue(mockSecret)

    const result = await startTotpEnrollment({ uid: 'user-1', email: 'test@example.com' } as unknown as User)

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.qrUrl).toContain('otpauth://')
      expect(result.secret).toBe(mockSecret)
    }
  })

  it('returns error on failure', async () => {
    mockGetSession.mockRejectedValue(new Error('Session expired'))

    const result = await startTotpEnrollment({ uid: 'user-1', email: 'test@example.com' } as unknown as User)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('Session expired')
    }
  })
})

// ─── finalizeTotpEnrollment ──────────────────────────────────────────────────

describe('finalizeTotpEnrollment', () => {
  it('enrolls with verification code', async () => {
    mockEnroll.mockResolvedValue(undefined)

    const result = await finalizeTotpEnrollment(
      { uid: 'user-1' } as unknown as User,
      { secretKey: 'ABC' } as unknown as TotpSecret,
      '123456'
    )

    expect(result.success).toBe(true)
    expect(mockAssertionForEnrollment).toHaveBeenCalledWith({ secretKey: 'ABC' }, '123456')
    expect(mockEnroll).toHaveBeenCalledWith('mock-assertion-enroll', 'Authenticator App')
  })

  it('returns error on invalid code', async () => {
    mockEnroll.mockRejectedValue({ code: 'auth/invalid-verification-code' })

    const result = await finalizeTotpEnrollment(
      { uid: 'user-1' } as unknown as User,
      { secretKey: 'ABC' } as unknown as TotpSecret,
      '000000'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid code')
  })
})

// ─── resolveTotpChallenge ────────────────────────────────────────────────────

describe('resolveTotpChallenge', () => {
  it('resolves sign-in with TOTP code', async () => {
    const mockResolver = {
      hints: [{ factorId: 'totp', uid: 'hint-1' }],
      resolveSignIn: vi.fn().mockResolvedValue(undefined),
    }

    const result = await resolveTotpChallenge(mockResolver as unknown as MultiFactorResolver, '123456')

    expect(result.success).toBe(true)
    expect(mockAssertionForSignIn).toHaveBeenCalledWith('hint-1', '123456')
    expect(mockResolver.resolveSignIn).toHaveBeenCalledWith('mock-assertion-signin')
  })

  it('returns error when no TOTP hint found', async () => {
    const mockResolver = {
      hints: [{ factorId: 'phone', uid: 'hint-1' }],
      resolveSignIn: vi.fn(),
    }

    const result = await resolveTotpChallenge(mockResolver as unknown as MultiFactorResolver, '123456')

    expect(result.success).toBe(false)
    expect(result.error).toContain('No authenticator app enrolled')
  })

  it('returns error on invalid verification code', async () => {
    const mockResolver = {
      hints: [{ factorId: 'totp', uid: 'hint-1' }],
      resolveSignIn: vi.fn().mockRejectedValue({ code: 'auth/invalid-verification-code' }),
    }

    const result = await resolveTotpChallenge(mockResolver as unknown as MultiFactorResolver, '000000')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid code')
  })
})

// ─── unenrollTotp ────────────────────────────────────────────────────────────

describe('unenrollTotp', () => {
  it('unenrolls TOTP factor', async () => {
    mockEnrolledFactors.push({ factorId: 'totp', displayName: 'Authenticator App', uid: 'f1' })
    mockUnenroll.mockResolvedValue(undefined)

    const result = await unenrollTotp({ uid: 'user-1' } as unknown as User)

    expect(result.success).toBe(true)
    expect(mockUnenroll).toHaveBeenCalled()
  })

  it('returns error when no TOTP factor enrolled', async () => {
    // mockEnrolledFactors is empty

    const result = await unenrollTotp({ uid: 'user-1' } as unknown as User)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No authenticator app enrolled')
  })
})

// ─── getMFAResolver ──────────────────────────────────────────────────────────

describe('getMFAResolver', () => {
  it('returns resolver from error', () => {
    mockGetMultiFactorResolver.mockReturnValue('mock-resolver')
    const resolver = getMFAResolver({ code: 'auth/multi-factor-auth-required' })
    expect(resolver).toBe('mock-resolver')
  })

  it('returns null on failure', () => {
    mockGetMultiFactorResolver.mockImplementation(() => {
      throw new Error('Invalid error')
    })
    const resolver = getMFAResolver({})
    expect(resolver).toBeNull()
  })
})
