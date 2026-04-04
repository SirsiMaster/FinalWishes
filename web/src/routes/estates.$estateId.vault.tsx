import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { useEstateDocuments, type VaultDocument } from '../lib/firestore'
import { createDocumentRecord, archiveDocument } from '../lib/estate-actions'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'
import { auth } from '../lib/firebase'

export const Route = createFileRoute('/estates/$estateId/vault')({
  component: VaultPage,
})

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  Legal: {
    label: 'Legal Documents',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  Financial: {
    label: 'Financial Records',
    icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  Personal: {
    label: 'Personal Memories',
    icon: (
      <>
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </>
    ),
  },
}

type UploadState = {
  file: File
  progress: number // 0-100
  status: 'preparing' | 'uploading' | 'saving' | 'done' | 'error'
  error?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

function VaultPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/vault' })
  const { user } = useAuth()
  const estateId = useMemo(
    () => (routeId === 'lockhart' ? 'estate_lockhart' : routeId),
    [routeId],
  )

  const { data: firestoreDocs, loading: isLoading } = useEstateDocuments(estateId)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<VaultDocument | null>(null)

  // ─── Upload Logic ───────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      const uploadIndex = Date.now()
      const newUpload: UploadState = { file, progress: 0, status: 'preparing' }

      setUploads((prev) => [...prev, newUpload])

      const updateUpload = (patch: Partial<UploadState>) => {
        setUploads((prev) =>
          prev.map((u) => (u.file === file ? { ...u, ...patch } : u)),
        )
      }

      try {
        // 1. Get signed URL from Go API
        updateUpload({ status: 'preparing', progress: 10 })
        const { uploadUrl } = await estateClient.generateUploadUrl({
          estateId,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        })

        // Derive storage key from the upload URL path
        const storageKey = decodeStorageKeyFromUrl(uploadUrl)

        // 2. Upload to Cloud Storage
        updateUpload({ status: 'uploading', progress: 30 })

        const xhr = new XMLHttpRequest()
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = 30 + Math.round((e.loaded / e.total) * 50)
              updateUpload({ progress: pct })
            }
          })
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Upload failed with status ${xhr.status}`))
          })
          xhr.addEventListener('error', () => reject(new Error('Upload network error')))
          xhr.open('PUT', uploadUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })

        // 3. Write Firestore metadata
        updateUpload({ status: 'saving', progress: 85 })

        const bucketName = 'finalwishes-vault'
        const category = inferCategory(file.name)

        await createDocumentRecord({
          estateId,
          originalName: file.name,
          displayName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageKey: storageKey,
          storageBucket: bucketName,
          uploadedBy: user?.uid || 'unknown',
          folderId: category,
          tags: [],
        })

        updateUpload({ status: 'done', progress: 100 })

        // Remove from upload list after 3 seconds
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.file !== file))
        }, 3000)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        updateUpload({ status: 'error', error: msg })
      }
    },
    [estateId, user],
  )

  // ─── Dropzone ───────────────────────────────────────────────────────────

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setUploads((prev) => [
            ...prev,
            { file, progress: 0, status: 'error', error: 'File exceeds 50 MB limit' },
          ])
          continue
        }
        if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
          setUploads((prev) => [
            ...prev,
            { file, progress: 0, status: 'error', error: `Unsupported file type: ${file.type}` },
          ])
          continue
        }
        uploadFile(file)
      }
    },
    [uploadFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    multiple: true,
  })

  // ─── Download ───────────────────────────────────────────────────────────

  const handleDownload = useCallback(
    async (doc: VaultDocument) => {
      try {
        const isLocal =
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        const baseUrl = isLocal ? 'http://localhost:8080' : ''

        const token = await auth.currentUser?.getIdToken()
        const res = await fetch(
          `${baseUrl}/api/v1/documents/download-url?storageKey=${encodeURIComponent(doc.storageKey)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )

        if (!res.ok) throw new Error('Failed to get download URL')

        const { downloadUrl } = await res.json()
        window.open(downloadUrl, '_blank')
      } catch (err) {
        console.error('Download error:', err)
      }
    },
    [],
  )

  // ─── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (doc: VaultDocument) => {
      const result = await archiveDocument(estateId, doc.id)
      if (result.success) {
        setDeleteConfirm(null)
      }
    },
    [estateId],
  )

  // ─── Filtered Documents ─────────────────────────────────────────────────

  const documents = useMemo(() => {
    const all = firestoreDocs.filter((d) => d.status === 'active')
    if (activeCategory) return all.filter((d) => d.folderId === activeCategory)
    return all
  }, [firestoreDocs, activeCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const doc of firestoreDocs.filter((d) => d.status === 'active')) {
      const cat = doc.folderId || 'General'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [firestoreDocs])

  // ─── Loading ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#133378]/50 uppercase tracking-[0.2em]">
            Loading documents...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-[#133378]/10 pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">
            Document Vault
          </h2>
          <p className="text-lg text-[#133378]/50 font-medium">
            All your important documents are safely stored and encrypted here.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider">
            AES-256 Encrypted
          </span>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-[#133378] bg-[#133378]/5 scale-[1.01]'
            : 'border-[#133378]/20 hover:border-[#133378]/40 hover:bg-[#133378]/[0.02]'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isDragActive ? 'bg-[#133378] text-white' : 'bg-[#F8FAFC] text-[#133378] border border-[#133378]/10'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-lg">
              {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
            </p>
            <p className="text-[13px] text-[#133378]/40 mt-1">
              PDF, JPEG, PNG, HEIC, DOC, DOCX, TXT — Max 50 MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload, i) => (
            <UploadProgress key={`${upload.file.name}-${i}`} upload={upload} />
          ))}
        </div>
      )}

      {/* Category Folders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(CATEGORY_MAP).map(([key, { label, icon }]) => (
          <VaultFolder
            key={key}
            name={label}
            count={categoryCounts[key] || 0}
            icon={icon}
            active={activeCategory === key}
            onClick={() => setActiveCategory(activeCategory === key ? null : key)}
          />
        ))}
      </div>

      {/* Active Filter Indicator */}
      {activeCategory && (
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-[#133378]/60 uppercase tracking-wider">
            Filtered: {CATEGORY_MAP[activeCategory]?.label || activeCategory}
          </span>
          <button
            onClick={() => setActiveCategory(null)}
            className="text-[11px] font-bold text-[#C8A951] hover:text-[#133378] transition-colors"
          >
            Show All
          </button>
        </div>
      )}

      {/* All Files */}
      <div className="bg-white rounded-[2.5rem] border border-[#133378]/10 p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <h3 className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">
            {activeCategory ? `${CATEGORY_MAP[activeCategory]?.label}` : 'All Files'} · {documents.length} file
            {documents.length !== 1 ? 's' : ''} · Encrypted
          </h3>
        </div>
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocItem
              key={doc.id}
              doc={doc}
              onDownload={() => handleDownload(doc)}
              onPreview={() => setPreviewDoc(doc)}
              onDelete={() => setDeleteConfirm(doc)}
            />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-24 bg-[#F8FAFC] rounded-2xl border border-[#133378]/10">
              <p className="text-[#133378]/50 font-medium">
                {activeCategory
                  ? `No ${CATEGORY_MAP[activeCategory]?.label.toLowerCase() || 'files'} yet.`
                  : 'No files have been added to this estate yet.'}
              </p>
              <p className="text-sm text-[#133378]/30 mt-2">
                Drag & drop files above or click to browse.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} onDownload={() => handleDownload(previewDoc)} />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteModal
          doc={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}
    </div>
  )
}

// ─── Upload Progress Bar ──────────────────────────────────────────────────

function UploadProgress({ upload }: { upload: UploadState }) {
  const statusLabel = {
    preparing: 'Preparing...',
    uploading: 'Uploading...',
    saving: 'Saving metadata...',
    done: 'Complete',
    error: upload.error || 'Error',
  }[upload.status]

  const isError = upload.status === 'error'
  const isDone = upload.status === 'done'

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
        isError
          ? 'bg-red-50 border-red-200'
          : isDone
            ? 'bg-green-50 border-green-200'
            : 'bg-[#F8FAFC] border-[#133378]/10'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-[#133378]/10">
        {isDone ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isError ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <div className="w-5 h-5 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[13px] font-bold text-[#0F172A] truncate">{upload.file.name}</span>
          <span
            className={`text-[11px] font-semibold ${
              isError ? 'text-red-600' : isDone ? 'text-green-600' : 'text-[#133378]'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="h-1.5 bg-[#133378]/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isError ? 'bg-red-400' : isDone ? 'bg-green-400' : 'bg-[#133378]'
            }`}
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Vault Folder Card ────────────────────────────────────────────────────

function VaultFolder({
  name,
  count,
  icon,
  active,
  onClick,
}: {
  name: string
  count: number
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full p-8 rounded-[2.5rem] border shadow-sm transition-all cursor-pointer group active:scale-[0.98] ${
        active
          ? 'bg-[#133378] border-[#133378] text-white'
          : 'bg-white border-[#133378]/10 hover:border-[#133378]/20 hover:shadow-md'
      }`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-[#F8FAFC] border border-[#133378]/10 text-[#133378] group-hover:bg-[#133378] group-hover:text-white'
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
      <h4
        className={`font-bold text-lg mb-2 transition-colors ${
          active ? 'text-white' : 'text-[#0F172A] group-hover:text-[#133378]'
        }`}
      >
        {name}
      </h4>
      <div className="flex items-center gap-3">
        <span className={`text-[13px] font-medium ${active ? 'text-white/70' : 'text-[#133378]/50'}`}>
          {count} file{count !== 1 ? 's' : ''}
        </span>
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
            active ? 'bg-white/10 border-white/20' : 'bg-green-50 border-green-200'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-300' : 'bg-green-400'}`} />
          <span className={`text-[10px] font-bold ${active ? 'text-green-200' : 'text-green-600'}`}>Protected</span>
        </div>
      </div>
    </button>
  )
}

// ─── Document Item Row ────────────────────────────────────────────────────

function DocItem({
  doc,
  onDownload,
  onPreview,
  onDelete,
}: {
  doc: VaultDocument
  onDownload: () => void
  onPreview: () => void
  onDelete: () => void
}) {
  const dateStr = doc.createdAt?.toDate?.()
    ? doc.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const sizeStr = doc.fileSize ? formatFileSize(doc.fileSize) : ''
  const isPreviewable = doc.mimeType?.startsWith('image/') || doc.mimeType === 'application/pdf'

  return (
    <div className="flex items-center justify-between p-5 bg-white border border-[#133378]/10 rounded-2xl hover:bg-[#F8FAFC] transition-all group">
      <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={isPreviewable ? onPreview : onDownload}>
        <div className="w-11 h-11 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-[#133378]/30 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500 border border-[#133378]/10 flex-shrink-0">
          <FileIcon mimeType={doc.mimeType} />
        </div>
        <div className="min-w-0">
          <div className="text-[#0F172A] font-bold text-[15px] mb-0.5 group-hover:text-[#133378] transition-colors truncate">
            {doc.displayName || doc.originalName}
          </div>
          <div className="flex items-center gap-3 text-[12px] font-medium text-[#133378]/40">
            {dateStr && <span>{dateStr}</span>}
            {dateStr && sizeStr && <div className="w-1 h-1 rounded-full bg-[#133378]/20" />}
            {sizeStr && <span>{sizeStr}</span>}
            {doc.folderId && (
              <>
                <div className="w-1 h-1 rounded-full bg-[#133378]/20" />
                <span className="text-[#C8A951] font-semibold">{doc.folderId}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {isPreviewable && (
          <button
            onClick={onPreview}
            className="p-2 rounded-lg hover:bg-[#133378]/5 text-[#133378]/30 hover:text-[#133378] transition-all"
            title="Preview"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
        <button
          onClick={onDownload}
          className="px-4 py-2 bg-[#133378] hover:bg-[#1E3A5F] text-white rounded-xl text-[11px] font-bold transition-all shadow-sm active:scale-95"
        >
          Download
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-red-50 text-[#133378]/20 hover:text-red-500 transition-all"
          title="Delete"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────

function PreviewModal({
  doc,
  onClose,
  onDownload,
}: {
  doc: VaultDocument
  onClose: () => void
  onDownload: () => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    let cancelled = false
    async function fetchUrl() {
      try {
        const isLocal =
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        const baseUrl = isLocal ? 'http://localhost:8080' : ''
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch(
          `${baseUrl}/api/v1/documents/download-url?storageKey=${encodeURIComponent(doc.storageKey)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
        if (!res.ok) throw new Error('Failed to fetch preview URL')
        const { downloadUrl } = await res.json()
        if (!cancelled) {
          setPreviewUrl(downloadUrl)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUrl()
    return () => { cancelled = true }
  }, [doc.storageKey])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#133378]/10">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#0F172A] truncate">{doc.displayName || doc.originalName}</h3>
            <p className="text-[12px] text-[#133378]/40 font-medium mt-0.5">
              {doc.mimeType} · {formatFileSize(doc.fileSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-[#133378] hover:bg-[#1E3A5F] text-white rounded-xl text-[12px] font-bold transition-all"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#133378]/5 text-[#133378]/40 hover:text-[#133378] transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center bg-[#F8FAFC]">
          {loading ? (
            <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          ) : previewUrl ? (
            doc.mimeType?.startsWith('image/') ? (
              <img src={previewUrl} alt={doc.originalName} className="max-w-full max-h-[60vh] rounded-xl object-contain" />
            ) : doc.mimeType === 'application/pdf' ? (
              <iframe src={previewUrl} className="w-full h-[60vh] rounded-xl border border-[#133378]/10" title={doc.originalName} />
            ) : (
              <p className="text-[#133378]/50">Preview not available for this file type.</p>
            )
          ) : (
            <p className="text-[#133378]/50">Unable to load preview. Try downloading instead.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────

function DeleteModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: VaultDocument
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] max-w-md w-full mx-4 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6 mx-auto">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#0F172A] text-center mb-2">Archive Document</h3>
        <p className="text-[14px] text-[#133378]/50 text-center mb-8">
          <strong className="text-[#0F172A]">{doc.displayName || doc.originalName}</strong> will be archived.
          It can be restored later if needed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#133378]/10 text-[#0F172A] font-bold text-[13px] hover:bg-[#F8FAFC] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] transition-all"
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function FileIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith('image/')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function inferCategory(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.match(/will|trust|power.of.attorney|testament|deed|legal|contract|agreement/)) return 'Legal'
  if (lower.match(/tax|bank|financial|statement|invoice|receipt|401k|ira|insurance/)) return 'Financial'
  if (lower.match(/photo|memory|memoir|letter|family|heritage/)) return 'Personal'
  return 'General'
}

function decodeStorageKeyFromUrl(signedUrl: string): string {
  try {
    const url = new URL(signedUrl)
    // GCS signed URL path: /bucket-name/object-path
    // or storage.googleapis.com/bucket/object
    const pathname = url.pathname
    // Remove leading /bucket-name/ to get just the object key
    // Pattern: /finalwishes-vault/estates/xxx/vault/123-file.pdf
    const parts = pathname.split('/')
    // Skip empty first element and bucket name
    if (parts.length >= 3) {
      return parts.slice(2).join('/')
    }
    return pathname.substring(1)
  } catch {
    // Fallback: extract from URL pattern
    const match = signedUrl.match(/\/(estates\/[^?]+)/)
    return match?.[1] || ''
  }
}
