import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { ShepherdNudge, useShepherdNudge } from './ShepherdNudge'

// Mock TanStack Router's Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
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

// ─── ShepherdNudge Component ────────────────────────────────────────────────

describe('ShepherdNudge', () => {
  it('renders the nudge message', () => {
    const onDismiss = vi.fn()
    render(
      <ShepherdNudge
        message="You should add a beneficiary"
        onDismiss={onDismiss}
      />
    )

    expect(screen.getByText('You should add a beneficiary')).toBeInTheDocument()
  })

  it('renders CTA button with link when ctaLabel and ctaRoute provided', () => {
    const onDismiss = vi.fn()
    render(
      <ShepherdNudge
        message="Add your first document"
        ctaLabel="Go to Vault"
        ctaRoute="/vault"
        onDismiss={onDismiss}
      />
    )

    const link = screen.getByText('Go to Vault')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/vault')
  })

  it('does not render CTA when ctaLabel is missing', () => {
    const onDismiss = vi.fn()
    render(
      <ShepherdNudge
        message="Reminder"
        ctaRoute="/somewhere"
        onDismiss={onDismiss}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <ShepherdNudge
        message="Dismissable nudge"
        onDismiss={onDismiss}
      />
    )

    const dismissButton = screen.getByLabelText('Dismiss nudge')
    fireEvent.click(dismissButton)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

// ─── useShepherdNudge Hook ──────────────────────────────────────────────────

describe('useShepherdNudge', () => {
  it('returns visible=true when condition is true and not dismissed', () => {
    const { result } = renderHook(() =>
      useShepherdNudge('estate-1', 'nudge-add-docs', true)
    )

    expect(result.current.visible).toBe(true)
  })

  it('returns visible=false when condition is false', () => {
    const { result } = renderHook(() =>
      useShepherdNudge('estate-1', 'nudge-add-docs', false)
    )

    expect(result.current.visible).toBe(false)
  })

  it('returns visible=false after dismiss is called', () => {
    const { result } = renderHook(() =>
      useShepherdNudge('estate-1', 'nudge-test', true)
    )

    expect(result.current.visible).toBe(true)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.visible).toBe(false)
  })

  it('writes dismissal to localStorage with correct key', () => {
    const { result } = renderHook(() =>
      useShepherdNudge('estate-42', 'add-heirs', true)
    )

    act(() => {
      result.current.dismiss()
    })

    expect(store['fw_nudge_dismissed_estate-42_add-heirs']).toBe('1')
  })

  it('returns visible=false when already dismissed in localStorage', () => {
    store['fw_nudge_dismissed_estate-1_already-dismissed'] = '1'

    const { result } = renderHook(() =>
      useShepherdNudge('estate-1', 'already-dismissed', true)
    )

    expect(result.current.visible).toBe(false)
  })
})
