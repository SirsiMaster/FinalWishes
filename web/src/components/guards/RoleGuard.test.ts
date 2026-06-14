import { describe, it, expect } from 'vitest'
import { sectionFromPath } from './RoleGuard'
import { canAccess, type PersonaRole } from '../../lib/persona'

const EST = 'estate_abc123'

describe('sectionFromPath — derive guarded section from a direct URL', () => {
  it('extracts the section segment after the estateId', () => {
    expect(sectionFromPath(`/estates/${EST}/vault`, EST)).toBe('vault')
    expect(sectionFromPath(`/estates/${EST}/lockbox`, EST)).toBe('lockbox')
    expect(sectionFromPath(`/estates/${EST}/soul-log`, EST)).toBe('soul-log')
    expect(sectionFromPath(`/estates/${EST}/dashboard`, EST)).toBe('dashboard')
  })

  it('ignores trailing sub-paths and query strings', () => {
    expect(sectionFromPath(`/estates/${EST}/vault/upload?id=9`, EST)).toBe('vault')
    expect(sectionFromPath(`/estates/${EST}/assets?tab=financial`, EST)).toBe('assets')
  })

  it('returns null for the estate index (no section to guard)', () => {
    expect(sectionFromPath(`/estates/${EST}`, EST)).toBeNull()
    expect(sectionFromPath(`/estates/${EST}/`, EST)).toBeNull()
  })

  it('returns null for unmodelled segments', () => {
    expect(sectionFromPath(`/estates/${EST}/some-future-thing`, EST)).toBeNull()
    expect(sectionFromPath(`/totally/unrelated`, EST)).toBeNull()
  })
})

/**
 * The guard's decision is exactly canAccess(role, sectionFromPath(url)). These
 * cases prove that typing a forbidden URL directly is denied — the gap Layer 2
 * exists to close (sidebar hiding alone does not stop direct navigation).
 */
describe('direct-URL enforcement — the section a persona must not reach', () => {
  const guardBlocks = (role: PersonaRole, url: string) => {
    const section = sectionFromPath(url, EST)
    return section !== null && !canAccess(role, section)
  }

  it('blocks a heir who direct-URLs owner-only / settlement routes', () => {
    expect(guardBlocks('heir', `/estates/${EST}/vault`)).toBe(true)
    expect(guardBlocks('heir', `/estates/${EST}/lockbox`)).toBe(true)
    expect(guardBlocks('heir', `/estates/${EST}/probate`)).toBe(true)
    expect(guardBlocks('heir', `/estates/${EST}/forms`)).toBe(true)
  })

  it('does NOT block a heir on routes meant for them (incl. their sacred dashboard)', () => {
    expect(guardBlocks('heir', `/estates/${EST}/dashboard`)).toBe(false)
    expect(guardBlocks('heir', `/estates/${EST}/settings`)).toBe(false)
    expect(guardBlocks('heir', `/estates/${EST}/memoirs`)).toBe(false)
    expect(guardBlocks('heir', `/estates/${EST}/events`)).toBe(false)
    expect(guardBlocks('heir', `/estates/${EST}/obituary`)).toBe(false)
  })

  it('blocks an executor who direct-URLs owner living-legacy creation', () => {
    expect(guardBlocks('executor', `/estates/${EST}/soul-log`)).toBe(true)
    expect(guardBlocks('executor', `/estates/${EST}/life-chapters`)).toBe(true)
    expect(guardBlocks('executor', `/estates/${EST}/pricing`)).toBe(true)
  })

  it('does NOT block an executor on settlement routes', () => {
    expect(guardBlocks('executor', `/estates/${EST}/probate`)).toBe(false)
    expect(guardBlocks('executor', `/estates/${EST}/vault`)).toBe(false)
  })

  it('blocks legal/cpa from out-of-lane routes', () => {
    expect(guardBlocks('legal', `/estates/${EST}/soul-log`)).toBe(true)
    expect(guardBlocks('legal', `/estates/${EST}/lockbox`)).toBe(true)
    expect(guardBlocks('cpa', `/estates/${EST}/directives`)).toBe(true)
    expect(guardBlocks('cpa', `/estates/${EST}/forms`)).toBe(true)
  })

  it('never blocks the principal', () => {
    for (const url of ['vault', 'lockbox', 'soul-log', 'probate', 'settings', 'pricing']) {
      expect(guardBlocks('principal', `/estates/${EST}/${url}`)).toBe(false)
    }
  })
})
