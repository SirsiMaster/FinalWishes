import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shouldShowHeirWelcome, markWelcomeSeen } from './HeirWelcome'
import type { UserProfile } from '@/lib/auth'

// ─── localStorage mock ──────────────────────────────────────────────────────

let store: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
}

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  store = {}
  vi.clearAllMocks()
})

// ─── Test Data ──────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'user-1',
    email: 'heir@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    role: 'heir',
    ...overrides,
  } as UserProfile
}

// ─── shouldShowHeirWelcome ──────────────────────────────────────────────────

describe('shouldShowHeirWelcome', () => {
  it('returns true for heir role in settlement estate', () => {
    const profile = makeProfile({ role: 'heir' })
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1')).toBe(true)
  })

  it('returns true for executor role in settlement estate', () => {
    const profile = makeProfile({ role: 'executor' })
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1')).toBe(true)
  })

  it('returns false for principal role', () => {
    const profile = makeProfile({ role: 'principal' })
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1')).toBe(false)
  })

  it('returns false when profile is null', () => {
    expect(shouldShowHeirWelcome(null, 'in_settlement', 'estate-1')).toBe(false)
  })

  it('returns false after markWelcomeSeen is called', () => {
    const profile = makeProfile({ uid: 'user-1', role: 'heir' })

    // First call should be true
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1')).toBe(true)

    // Mark as seen
    markWelcomeSeen('estate-1', 'user-1')

    // Second call should be false
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1')).toBe(false)
  })

  it('uses estateRole over profile role when provided', () => {
    // Profile says principal, but estate role says heir
    const profile = makeProfile({ role: 'principal' })
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1', 'heir')).toBe(true)
  })

  it('falls back to profile role when estateRole is null', () => {
    const profile = makeProfile({ role: 'heir' })
    expect(shouldShowHeirWelcome(profile, 'in_settlement', 'estate-1', null)).toBe(true)
  })

  it('returns true for death_reported estate status', () => {
    const profile = makeProfile({ role: 'heir' })
    expect(shouldShowHeirWelcome(profile, 'death_reported', 'estate-1')).toBe(true)
  })

  it('returns true for executor_confirmed estate status', () => {
    const profile = makeProfile({ role: 'executor' })
    expect(shouldShowHeirWelcome(profile, 'executor_confirmed', 'estate-1')).toBe(true)
  })

  it('returns true on first visit even without settlement status', () => {
    // An heir visiting for the first time with "active" status still sees welcome
    // because isFirstVisit is true (no localStorage flag)
    const profile = makeProfile({ role: 'heir' })
    expect(shouldShowHeirWelcome(profile, 'active', 'estate-1')).toBe(true)
  })
})

// ─── markWelcomeSeen ────────────────────────────────────────────────────────

describe('markWelcomeSeen', () => {
  it('writes to localStorage with correct key', () => {
    markWelcomeSeen('estate-42', 'user-7')
    expect(store['fw_welcome_seen_estate-42_user-7']).toBeDefined()
  })

  it('stores an ISO date string', () => {
    markWelcomeSeen('estate-1', 'user-1')
    const stored = store['fw_welcome_seen_estate-1_user-1']
    expect(() => new Date(stored).toISOString()).not.toThrow()
  })
})
