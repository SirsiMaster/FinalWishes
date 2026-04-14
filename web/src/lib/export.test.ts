import { describe, it, expect } from 'vitest'
import { exportEstateData, type ExportOptions } from './export'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTimestamp(iso: string) {
  return {
    toDate: () => new Date(iso),
    seconds: Math.floor(new Date(iso).getTime() / 1000),
    nanoseconds: 0,
  }
}

function makeOptions(overrides?: Partial<ExportOptions>): ExportOptions {
  return {
    estateId: 'estate-1',
    estateName: 'Test Estate',
    assets: [],
    heirs: [],
    documents: [],
    lockboxItems: [],
    directives: [],
    capsules: [],
    heirlooms: [],
    memoirs: [],
    ...overrides,
  }
}

async function extractZipJSON(blob: Blob, path: string): Promise<unknown> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(blob)
  const file = zip.file(path)
  if (!file) throw new Error(`File ${path} not found in ZIP`)
  const text = await file.async('text')
  return JSON.parse(text)
}

// ─── Export Structure ───────────────────────────────────────────────────────

describe('exportEstateData', () => {
  it('produces a valid ZIP blob', async () => {
    const blob = await exportEstateData(makeOptions())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('creates manifest.json with correct metadata', async () => {
    const opts = makeOptions({
      assets: [{ id: 'a1', name: 'House' }],
      heirs: [{ id: 'h1', fullName: 'Jane' }, { id: 'h2', fullName: 'John' }],
    })

    const blob = await exportEstateData(opts)
    const manifest = (await extractZipJSON(blob, 'Test Estate/manifest.json')) as Record<string, unknown>

    expect(manifest.format).toBe('FinalWishes Estate Export v1.0')
    expect(manifest.estateId).toBe('estate-1')
    expect(manifest.estateName).toBe('Test Estate')
    expect((manifest.counts as Record<string, number>).assets).toBe(1)
    expect((manifest.counts as Record<string, number>).beneficiaries).toBe(2)
  })

  it('includes all 8 data files plus manifest', async () => {
    const blob = await exportEstateData(makeOptions())
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(blob)
    const files = Object.keys(zip.files).filter((f) => !f.endsWith('/'))

    expect(files).toContain('Test Estate/assets.json')
    expect(files).toContain('Test Estate/beneficiaries.json')
    expect(files).toContain('Test Estate/documents-metadata.json')
    expect(files).toContain('Test Estate/lockbox-metadata.json')
    expect(files).toContain('Test Estate/directives.json')
    expect(files).toContain('Test Estate/time-capsules.json')
    expect(files).toContain('Test Estate/heirlooms.json')
    expect(files).toContain('Test Estate/memoirs.json')
    expect(files).toContain('Test Estate/manifest.json')
  })
})

// ─── Timestamp Sanitization ─────────────────────────────────────────────────

describe('timestamp sanitization', () => {
  it('converts Firestore Timestamps to ISO strings in assets', async () => {
    const opts = makeOptions({
      assets: [
        {
          id: 'a1',
          name: 'House',
          createdAt: makeTimestamp('2026-01-15T00:00:00.000Z'),
        },
      ],
    })

    const blob = await exportEstateData(opts)
    const assets = (await extractZipJSON(blob, 'Test Estate/assets.json')) as Record<string, unknown>[]

    expect(assets[0].createdAt).toBe('2026-01-15T00:00:00.000Z')
  })

  it('handles nested Timestamps in arrays', async () => {
    const opts = makeOptions({
      directives: [
        {
          id: 'd1',
          title: 'My Wishes',
          versions: [
            { version: 1, savedAt: makeTimestamp('2026-02-01T12:00:00.000Z') },
          ],
        },
      ],
    })

    const blob = await exportEstateData(opts)
    const directives = (await extractZipJSON(blob, 'Test Estate/directives.json')) as Record<string, unknown>[]
    const versions = (directives[0].versions as Record<string, unknown>[])

    expect(versions[0].savedAt).toBe('2026-02-01T12:00:00.000Z')
  })

  it('handles null and undefined values gracefully', async () => {
    const opts = makeOptions({
      assets: [
        { id: 'a1', name: 'Car', description: null, notes: undefined },
      ],
    })

    const blob = await exportEstateData(opts)
    const assets = (await extractZipJSON(blob, 'Test Estate/assets.json')) as Record<string, unknown>[]

    expect(assets[0].description).toBeNull()
    // undefined values get sanitized to null (sanitizeValue returns null for nullish)
    expect(assets[0].notes).toBeNull()
  })
})

// ─── Lockbox Sanitization (Security-Critical) ──────────────────────────────

describe('lockbox sanitization', () => {
  it('strips encrypted credentials from lockbox items', async () => {
    const opts = makeOptions({
      lockboxItems: [
        {
          id: 'lb1',
          accountName: 'Chase Checking',
          category: 'banking',
          institution: 'Chase',
          hasSecureCredentials: true,
          status: 'active',
          encryptedPassword: 'AAABBBCCC==',
          encryptedAccountNumber: 'XXXYYY==',
          encryptedPin: '1234encrypted',
          notes: 'Secret notes here',
          createdAt: makeTimestamp('2026-01-01T00:00:00.000Z'),
        },
      ],
    })

    const blob = await exportEstateData(opts)
    const lockbox = (await extractZipJSON(blob, 'Test Estate/lockbox-metadata.json')) as Record<string, unknown>[]

    // Allowed fields present
    expect(lockbox[0].accountName).toBe('Chase Checking')
    expect(lockbox[0].category).toBe('banking')
    expect(lockbox[0].institution).toBe('Chase')
    expect(lockbox[0].hasSecureCredentials).toBe(true)
    expect(lockbox[0].status).toBe('active')

    // Sensitive fields stripped
    expect(lockbox[0]).not.toHaveProperty('encryptedPassword')
    expect(lockbox[0]).not.toHaveProperty('encryptedAccountNumber')
    expect(lockbox[0]).not.toHaveProperty('encryptedPin')
    expect(lockbox[0]).not.toHaveProperty('notes')
  })
})

// ─── Document Sanitization (Security-Critical) ─────────────────────────────

describe('document sanitization', () => {
  it('strips storage keys and paths from vault documents', async () => {
    const opts = makeOptions({
      documents: [
        {
          id: 'doc1',
          originalName: 'last-will.pdf',
          displayName: 'Last Will & Testament',
          mimeType: 'application/pdf',
          fileSize: 204800,
          storageKey: 'estates/estate-1/vault/last-will.pdf',
          storageBucket: 'finalwishes-prod.appspot.com',
          downloadUrl: 'https://storage.googleapis.com/...',
          encryptionKeyVersion: 'projects/finalwishes-prod/locations/us-central1/keyRings/...',
          folderId: 'legal',
          tags: ['will', 'legal'],
          version: 1,
          status: 'active',
          uploadedBy: 'user-1',
          createdAt: makeTimestamp('2026-03-01T00:00:00.000Z'),
        },
      ],
    })

    const blob = await exportEstateData(opts)
    const docs = (await extractZipJSON(blob, 'Test Estate/documents-metadata.json')) as Record<string, unknown>[]

    // Allowed metadata present
    expect(docs[0].originalName).toBe('last-will.pdf')
    expect(docs[0].displayName).toBe('Last Will & Testament')
    expect(docs[0].mimeType).toBe('application/pdf')
    expect(docs[0].fileSize).toBe(204800)
    expect(docs[0].tags).toEqual(['will', 'legal'])

    // Storage/encryption details stripped
    expect(docs[0]).not.toHaveProperty('storageKey')
    expect(docs[0]).not.toHaveProperty('storageBucket')
    expect(docs[0]).not.toHaveProperty('downloadUrl')
    expect(docs[0]).not.toHaveProperty('encryptionKeyVersion')
  })
})

// ─── Manifest Exclusion Notices ─────────────────────────────────────────────

describe('manifest exclusion notices', () => {
  it('documents what was excluded and why', async () => {
    const blob = await exportEstateData(makeOptions())
    const manifest = (await extractZipJSON(blob, 'Test Estate/manifest.json')) as Record<string, unknown>
    const exclusions = manifest.exclusions as Record<string, string>

    expect(exclusions.lockboxCredentials).toContain('excluded for security')
    expect(exclusions.documentFiles).toContain('excluded from this export')
  })
})
