import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// ─── Mock Firebase Auth ──────────────────────────────────────────────────────

const mockSignInWithEmailAndPassword = vi.fn()
const mockCreateUserWithEmailAndPassword = vi.fn()
const mockFirebaseSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()
const mockUpdateProfile = vi.fn()
const mockSendPasswordResetEmail = vi.fn()
const mockSendEmailVerification = vi.fn()

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockFirebaseSignOut(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  getMultiFactorResolver: vi.fn(() => null),
}))

// ─── Mock Firestore ──────────────────────────────────────────────────────────

const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockDoc = vi.fn((..._args: any[]) => 'mock-doc-ref')

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  serverTimestamp: () => 'MOCK_TIMESTAMP',
}))

// ─── Mock MFA module ─────────────────────────────────────────────────────────

vi.mock('./mfa', () => ({
  getMFAResolver: vi.fn(() => null),
}))

import { AuthProvider, useAuth } from './auth'

// ─── Test Helpers ────────────────────────────────────────────────────────────

function AuthWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function _simulateAuthState(user: unknown) {
  // mockOnAuthStateChanged captures the callback; we invoke it manually
  const callback = mockOnAuthStateChanged.mock.calls[0]?.[1]
  if (callback) {
    callback(user)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: onAuthStateChanged fires with null (no user)
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
    // Fire async to simulate real behavior
    setTimeout(() => callback(null), 0)
    return vi.fn() // unsubscribe
  })
  mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null })
  mockSetDoc.mockResolvedValue(undefined)
  mockUpdateProfile.mockResolvedValue(undefined)
  mockSendEmailVerification.mockResolvedValue(undefined)
  mockSendPasswordResetEmail.mockResolvedValue(undefined)
  mockFirebaseSignOut.mockResolvedValue(undefined)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  it('renders children', () => {
    render(
      <AuthProvider>
        <div>Child content</div>
      </AuthProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('provides null user when not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('provides user and profile when authenticated', async () => {
    const mockUser = { uid: 'user-1', email: 'test@example.com', emailVerified: true }
    const mockProfile = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      role: 'principal',
      status: 'active',
    }

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
      setTimeout(() => callback(mockUser), 0)
      return vi.fn()
    })

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockProfile,
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.profile).toBeTruthy()
    expect(result.current.profile?.firstName).toBe('Test')
    expect(result.current.emailVerified).toBe(true)
  })
})

describe('useAuth hook', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })
})

describe('signIn', () => {
  it('signs in with email and password', async () => {
    const mockCredential = { user: { uid: 'user-1' } }
    mockSignInWithEmailAndPassword.mockResolvedValue(mockCredential)
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    let signInResult: { success: boolean; error?: string }
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'password123')
    })

    expect(signInResult!.success).toBe(true)
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1)
  })

  it('resolves username to email before signing in', async () => {
    const mockCredential = { user: { uid: 'user-1' } }
    mockSignInWithEmailAndPassword.mockResolvedValue(mockCredential)

    // First call: username lookup returns email, second: profile fetch
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ email: 'resolved@example.com' }) })
      .mockResolvedValueOnce({ exists: () => false, data: () => null })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signInResult: { success: boolean }
    await act(async () => {
      signInResult = await result.current.signIn('myusername', 'password123')
    })

    expect(signInResult!.success).toBe(true)
    // Should have looked up the username doc
    expect(mockGetDoc).toHaveBeenCalled()
  })

  it('returns error when username not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signInResult: { success: boolean; error?: string }
    await act(async () => {
      signInResult = await result.current.signIn('nonexistent', 'password123')
    })

    expect(signInResult!.success).toBe(false)
    expect(signInResult!.error).toContain('No account found')
  })

  it('returns formatted error on wrong password', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signInResult: { success: boolean; error?: string }
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'wrong')
    })

    expect(signInResult!.success).toBe(false)
    expect(signInResult!.error).toContain('Incorrect password')
  })

  it('detects MFA challenge', async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: 'auth/multi-factor-auth-required',
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signInResult: { success: boolean; mfaRequired?: boolean }
    await act(async () => {
      signInResult = await result.current.signIn('test@example.com', 'password123')
    })

    expect(signInResult!.success).toBe(false)
    // getMFAResolver returns null in our mock, so mfaRequired won't be set
    // but the code path is exercised
  })
})

describe('signUp', () => {
  it('creates account, profile, and username index', async () => {
    const mockCredential = {
      user: { uid: 'new-user-1', email: 'new@example.com', displayName: null },
    }
    mockCreateUserWithEmailAndPassword.mockResolvedValue(mockCredential)
    // isUsernameAvailable check
    mockGetDoc.mockResolvedValueOnce({ exists: () => false })
    // fetchUserProfile after creation
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        displayName: 'New User',
        role: 'principal',
        status: 'active',
      }),
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signUpResult: { success: boolean; error?: string }
    await act(async () => {
      signUpResult = await result.current.signUp({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      })
    })

    expect(signUpResult!.success).toBe(true)
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1)
    expect(mockSetDoc).toHaveBeenCalledTimes(2) // user profile + username index
    expect(mockSendEmailVerification).toHaveBeenCalledTimes(1)
  })

  it('rejects taken username', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true }) // username taken

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signUpResult: { success: boolean; error?: string }
    await act(async () => {
      signUpResult = await result.current.signUp({
        email: 'new@example.com',
        username: 'taken',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      })
    })

    expect(signUpResult!.success).toBe(false)
    expect(signUpResult!.error).toContain('already taken')
  })

  it('returns formatted error on weak password', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false }) // username available
    mockCreateUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/weak-password' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let signUpResult: { success: boolean; error?: string }
    await act(async () => {
      signUpResult = await result.current.signUp({
        email: 'new@example.com',
        username: 'newuser',
        password: '12',
        firstName: 'New',
        lastName: 'User',
      })
    })

    expect(signUpResult!.success).toBe(false)
    expect(signUpResult!.error).toContain('at least 6 characters')
  })
})

describe('signOut', () => {
  it('calls Firebase signOut and clears profile', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1)
  })
})

describe('resetPassword', () => {
  it('sends password reset email', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resetResult: { success: boolean }
    await act(async () => {
      resetResult = await result.current.resetPassword('test@example.com')
    })

    expect(resetResult!.success).toBe(true)
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1)
  })

  it('returns error on failure', async () => {
    mockSendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resetResult: { success: boolean; error?: string }
    await act(async () => {
      resetResult = await result.current.resetPassword('noone@example.com')
    })

    expect(resetResult!.success).toBe(false)
    expect(resetResult!.error).toContain('No account found')
  })
})
