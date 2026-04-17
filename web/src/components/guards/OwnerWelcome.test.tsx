import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OwnerWelcome, shouldShowOwnerWelcome, markOwnerWelcomeSeen } from './OwnerWelcome'

// ─── Mock useAuth ───────────────────────────────────────────────────────────

const mockProfile = {
  uid: 'user-1',
  email: 'cylton@sirsi.ai',
  firstName: 'Cylton',
  lastName: 'Collymore',
  displayName: 'Cylton Collymore',
  role: 'principal' as const,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { uid: 'user-1' },
    loading: false,
  }),
}))

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

// ─── OwnerWelcome Component ─────────────────────────────────────────────────

describe('OwnerWelcome', () => {
  it('renders welcome message with user first name', () => {
    const onContinue = vi.fn()
    render(
      <OwnerWelcome estateId="estate-1" estateName="Collymore Estate" onContinue={onContinue} />
    )

    expect(screen.getByText('Welcome, Cylton.')).toBeInTheDocument()
  })

  it('renders estate name in the description', () => {
    const onContinue = vi.fn()
    render(
      <OwnerWelcome estateId="estate-1" estateName="Collymore Estate" onContinue={onContinue} />
    )

    expect(screen.getByText(/Collymore Estate/)).toBeInTheDocument()
  })

  it('calls onContinue when "Start Building Your Legacy" button is clicked', () => {
    const onContinue = vi.fn()
    render(
      <OwnerWelcome estateId="estate-1" estateName="Test Estate" onContinue={onContinue} />
    )

    const button = screen.getByText('Start Building Your Legacy')
    fireEvent.click(button)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('renders the three welcome steps', () => {
    const onContinue = vi.fn()
    render(
      <OwnerWelcome estateId="estate-1" estateName="Test Estate" onContinue={onContinue} />
    )

    expect(screen.getByText('Record your voice')).toBeInTheDocument()
    expect(screen.getByText('Organize what matters')).toBeInTheDocument()
    expect(screen.getByText('Protect your people')).toBeInTheDocument()
  })
})

// ─── shouldShowOwnerWelcome ─────────────────────────────────────────────────

describe('shouldShowOwnerWelcome', () => {
  it('returns true for principal role on first visit', () => {
    expect(shouldShowOwnerWelcome('principal', 'estate-1', 'user-1')).toBe(true)
  })

  it('returns true for admin role', () => {
    expect(shouldShowOwnerWelcome('admin', 'estate-1', 'user-1')).toBe(true)
  })

  it('returns true for owner role', () => {
    expect(shouldShowOwnerWelcome('owner', 'estate-1', 'user-1')).toBe(true)
  })

  it('returns false for heir role', () => {
    expect(shouldShowOwnerWelcome('heir', 'estate-1', 'user-1')).toBe(false)
  })

  it('returns false for executor role', () => {
    expect(shouldShowOwnerWelcome('executor', 'estate-1', 'user-1')).toBe(false)
  })

  it('returns false when userId is undefined', () => {
    expect(shouldShowOwnerWelcome('principal', 'estate-1', undefined)).toBe(false)
  })

  it('returns false after localStorage flag is set', () => {
    store['fw_owner_welcome_seen_estate-1_user-1'] = new Date().toISOString()

    expect(shouldShowOwnerWelcome('principal', 'estate-1', 'user-1')).toBe(false)
  })
})

// ─── markOwnerWelcomeSeen ───────────────────────────────────────────────────

describe('markOwnerWelcomeSeen', () => {
  it('writes to localStorage with correct key', () => {
    markOwnerWelcomeSeen('estate-42', 'user-7')

    expect(store['fw_owner_welcome_seen_estate-42_user-7']).toBeDefined()
  })

  it('stores an ISO date string', () => {
    markOwnerWelcomeSeen('estate-1', 'user-1')

    const stored = store['fw_owner_welcome_seen_estate-1_user-1']
    expect(() => new Date(stored).toISOString()).not.toThrow()
  })
})
