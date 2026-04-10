/**
 * Estate Data Export Utility
 *
 * Generates a ZIP archive of all estate data for compliance and portability.
 * Strips Firestore Timestamps to ISO strings, excludes encrypted credentials
 * and document file contents for security.
 *
 * @version 1.0.0
 */

import JSZip from 'jszip'
import type { Timestamp } from 'firebase/firestore'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportOptions {
  estateId: string
  estateName: string
  assets: Record<string, unknown>[]
  heirs: Record<string, unknown>[]
  documents: Record<string, unknown>[]
  lockboxItems: Record<string, unknown>[]
  directives: Record<string, unknown>[]
  capsules: Record<string, unknown>[]
  heirlooms: Record<string, unknown>[]
  memoirs: Record<string, unknown>[]
}

// ─── Timestamp Serialization ─────────────────────────────────────────────────

/**
 * Recursively converts Firestore Timestamp objects to ISO strings.
 * Also strips undefined values for clean JSON output.
 */
function sanitizeValue(value: unknown): unknown {
  if (value == null) return null

  // Firestore Timestamp has a toDate() method
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return (value as Timestamp).toDate().toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeValue(v)
      if (sanitized !== undefined) {
        result[k] = sanitized
      }
    }
    return result
  }

  return value
}

function sanitizeArray(items: Record<string, unknown>[]): unknown[] {
  return items.map((item) => sanitizeValue(item))
}

// ─── Lockbox Sanitization ────────────────────────────────────────────────────

/**
 * Strips encrypted credentials from lockbox items.
 * Only exports metadata: account names, categories, institution, status.
 */
function sanitizeLockboxItems(items: Record<string, unknown>[]): unknown[] {
  return items.map((item) => {
    const safe = sanitizeValue({
      id: item.id,
      category: item.category,
      accountName: item.accountName,
      institution: item.institution,
      hasSecureCredentials: item.hasSecureCredentials,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
    return safe
  })
}

// ─── Document Metadata Only ──────────────────────────────────────────────────

/**
 * Strips file contents / storage keys from vault documents.
 * Only exports metadata: names, types, dates, sizes.
 */
function sanitizeDocuments(items: Record<string, unknown>[]): unknown[] {
  return items.map((item) => {
    const safe = sanitizeValue({
      id: item.id,
      originalName: item.originalName,
      displayName: item.displayName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      folderId: item.folderId,
      tags: item.tags,
      version: item.version,
      status: item.status,
      uploadedBy: item.uploadedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })
    return safe
  })
}

// ─── Main Export Function ────────────────────────────────────────────────────

export async function exportEstateData(options: ExportOptions): Promise<Blob> {
  const zip = new JSZip()
  const folder = zip.folder(options.estateName)!

  // Add each collection as a sanitized JSON file
  folder.file('assets.json', JSON.stringify(sanitizeArray(options.assets), null, 2))
  folder.file('beneficiaries.json', JSON.stringify(sanitizeArray(options.heirs), null, 2))
  folder.file('documents-metadata.json', JSON.stringify(sanitizeDocuments(options.documents), null, 2))
  folder.file('lockbox-metadata.json', JSON.stringify(sanitizeLockboxItems(options.lockboxItems), null, 2))
  folder.file('directives.json', JSON.stringify(sanitizeArray(options.directives), null, 2))
  folder.file('time-capsules.json', JSON.stringify(sanitizeArray(options.capsules), null, 2))
  folder.file('heirlooms.json', JSON.stringify(sanitizeArray(options.heirlooms), null, 2))
  folder.file('memoirs.json', JSON.stringify(sanitizeArray(options.memoirs), null, 2))

  // Add a manifest describing the export
  folder.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'FinalWishes Estate Export v1.0',
        exportDate: new Date().toISOString(),
        estateId: options.estateId,
        estateName: options.estateName,
        counts: {
          assets: options.assets.length,
          beneficiaries: options.heirs.length,
          documents: options.documents.length,
          lockboxItems: options.lockboxItems.length,
          directives: options.directives.length,
          capsules: options.capsules.length,
          heirlooms: options.heirlooms.length,
          memoirs: options.memoirs.length,
        },
        exclusions: {
          lockboxCredentials:
            'Encrypted lockbox credentials (passwords, account numbers, PINs) are excluded for security. Only account metadata (names, categories, institutions) is included.',
          documentFiles:
            'Document file contents are excluded from this export. Only document metadata (names, types, sizes, dates) is included. Original files remain in the secure vault.',
        },
      },
      null,
      2
    )
  )

  return zip.generateAsync({ type: 'blob' })
}

// ─── Download Helper ─────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a Blob as a named file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
