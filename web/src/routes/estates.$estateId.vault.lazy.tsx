/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useState, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { useEstateDocuments, useEstateHeirs, type VaultDocument, type Heir, type DocumentAnalysis, type DocumentDiscrepancy } from '../lib/firestore'
import { createOrReplaceDocumentRecord, archiveDocument, updateVaultDocument } from '../lib/estate-actions'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'
import { auth } from '../lib/firebase'
import { useTierGating, tierUpgradeMessage } from '../lib/tier-gating'
import { trackDocumentUploaded } from '../lib/analytics'
import { analyzeDocument } from '../lib/doc-intelligence'
import { toast } from 'sonner'

import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from '../components/ui/alert-dialog'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { ShepherdNudge, useShepherdNudge } from '@/components/estate/ShepherdNudge'

export const Route = createLazyFileRoute('/estates/$estateId/vault')({
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

// ─── Document Checklist Data ────────────────────────────────────────────────

type ChecklistItem = {
  id: string
  name: string
  description: string
  category: 'essential' | 'financial' | 'property_identity'
  /** folderId to match in vault documents */
  matchFolder: string
  /** Regex pattern to match against document names */
  matchPattern: RegExp
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Essential Documents
  {
    id: 'will',
    name: 'Last Will & Testament',
    description: 'The legal document that directs how your assets are distributed',
    category: 'essential',
    matchFolder: 'Legal',
    matchPattern: /will|testament/i,
  },
  {
    id: 'poa',
    name: 'Power of Attorney',
    description: 'Authorizes someone to act on your behalf if you\'re incapacitated',
    category: 'essential',
    matchFolder: 'Legal',
    matchPattern: /power.of.attorney|poa/i,
  },
  {
    id: 'healthcare_directive',
    name: 'Healthcare Directive / Living Will',
    description: 'Specifies your medical treatment preferences',
    category: 'essential',
    matchFolder: 'Legal',
    matchPattern: /healthcare.directive|living.will|advance.directive|medical.directive/i,
  },
  {
    id: 'life_insurance',
    name: 'Life Insurance Policies',
    description: 'Policies that provide financial support to your beneficiaries',
    category: 'essential',
    matchFolder: 'Financial',
    matchPattern: /life.insurance|insurance.polic/i,
  },
  // Financial Documents
  {
    id: 'bank_statements',
    name: 'Bank Account Statements',
    description: 'Recent statements from all checking and savings accounts',
    category: 'financial',
    matchFolder: 'Financial',
    matchPattern: /bank.*(statement|account)|checking|savings/i,
  },
  {
    id: 'retirement',
    name: 'Retirement Account Statements',
    description: '401(k), IRA, pension plan documents',
    category: 'financial',
    matchFolder: 'Financial',
    matchPattern: /retirement|401k|401\(k\)|ira|pension/i,
  },
  {
    id: 'investment',
    name: 'Investment / Brokerage Statements',
    description: 'Stock, bond, and mutual fund accounts',
    category: 'financial',
    matchFolder: 'Financial',
    matchPattern: /invest|brokerage|stock|bond|mutual.fund/i,
  },
  {
    id: 'tax_returns',
    name: 'Tax Returns (Last 3 Years)',
    description: 'Federal and state tax returns',
    category: 'financial',
    matchFolder: 'Financial',
    matchPattern: /tax.return|tax.filing|1040|w-?2/i,
  },
  // Property & Identity
  {
    id: 'property_deeds',
    name: 'Property Deeds / Mortgage Documents',
    description: 'Ownership records for real estate',
    category: 'property_identity',
    matchFolder: 'Legal',
    matchPattern: /deed|mortgage|property.title|real.estate/i,
  },
  {
    id: 'vehicle_titles',
    name: 'Vehicle Titles',
    description: 'Registration and title for cars, boats, etc.',
    category: 'property_identity',
    matchFolder: 'Legal',
    matchPattern: /vehicle.title|car.title|registration|boat.title/i,
  },
  {
    id: 'birth_certificate',
    name: 'Birth Certificate',
    description: 'Official proof of identity',
    category: 'property_identity',
    matchFolder: 'Personal',
    matchPattern: /birth.certificate/i,
  },
  {
    id: 'marriage_certificate',
    name: 'Marriage Certificate',
    description: 'If applicable',
    category: 'property_identity',
    matchFolder: 'Personal',
    matchPattern: /marriage.certificate/i,
  },
  {
    id: 'ssn_card',
    name: 'Social Security Card',
    description: 'For identity verification purposes',
    category: 'property_identity',
    matchFolder: 'Personal',
    matchPattern: /social.security|ss.card|ssn/i,
  },
]

const CHECKLIST_CATEGORIES: Record<string, { label: string; icon: React.ReactNode }> = {
  essential: {
    label: 'Essential Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  financial: {
    label: 'Financial Documents',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  property_identity: {
    label: 'Property & Identity',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
}

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
  General: {
    label: 'General Documents',
    icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
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
  const estateId = routeId

  const { usage: tierUsage } = useTierGating(estateId)
  const { data: firestoreDocs, loading: isLoading } = useEstateDocuments(estateId)
  const { data: heirs } = useEstateHeirs(estateId)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<VaultDocument | null>(null)
  const [checklistOpen, setChecklistOpen] = useState(true)

  // Shepherd inline nudge
  const activeDocCount = useMemo(
    () => firestoreDocs.filter((d) => d.status === 'active').length,
    [firestoreDocs],
  )
  const noDocsNudge = useShepherdNudge(
    estateId,
    'vault-no-docs',
    !isLoading && activeDocCount === 0,
  )

  // ─── Checklist Status Computation ───────────────────────────────────────

  const checklistStatus = useMemo(() => {
    const activeDocs = firestoreDocs.filter((d) => d.status === 'active')
    const statusMap: Record<string, boolean> = {}

    for (const item of CHECKLIST_ITEMS) {
      statusMap[item.id] = activeDocs.some((doc) => {
        const nameToCheck = (doc.displayName || doc.originalName || '').toLowerCase()
        return item.matchPattern.test(nameToCheck)
      })
    }
    return statusMap
  }, [firestoreDocs])

  const checklistProgress = useMemo(() => {
    const total = CHECKLIST_ITEMS.length
    const uploaded = Object.values(checklistStatus).filter(Boolean).length
    return { total, uploaded, percent: total > 0 ? Math.round((uploaded / total) * 100) : 0 }
  }, [checklistStatus])

  const dropzoneRef = React.useRef<HTMLDivElement>(null)

  const scrollToUpload = useCallback(() => {
    dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Briefly flash the dropzone
    dropzoneRef.current?.classList.add('ring-2', 'ring-[var(--gold)]')
    setTimeout(() => {
      dropzoneRef.current?.classList.remove('ring-2', 'ring-[var(--gold)]')
    }, 2000)
  }, [])

  // ─── Upload Logic ───────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      const _uploadIndex = Date.now()
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

        const docResult = await createOrReplaceDocumentRecord({
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
        toast.success(`${file.name} uploaded securely`, {
          description: docResult.success && docResult.id ? 'AI analysis running in background...' : undefined,
        })
        trackDocumentUploaded(estateId, file.type || 'unknown')

        // Fire background Document Intelligence analysis (non-blocking)
        if (docResult.success && docResult.id) {
          analyzeDocument({
            estateId,
            documentId: docResult.id,
            storageKey: storageKey,
            mimeType: file.type || 'application/octet-stream',
            fileName: file.name,
          }).catch(() => {
            // Silent failure — AI analysis is best-effort
          })
        }

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
      if (tierUsage && !tierUsage.canUploadMedia) {
        toast.error(tierUpgradeMessage(tierUsage, 'media') || 'Upload limit reached. Please upgrade your plan.')
        return
      }
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
    [uploadFile, tierUsage],
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
        toast.error('Could not download this document. Please try again.')
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
        toast.success('Document archived')
      } else {
        toast.error(result.error || 'Could not archive document. Please try again.')
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
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[var(--royal)]/50 uppercase tracking-[0.2em]">
            Loading documents...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <SectionHeader
        section="the-vault"
        title="Document Vault"
        subtitle="All your important documents are safely stored and encrypted here."
        action={
          <Badge className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider h-auto gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AES-256 Encrypted
          </Badge>
        }
      />

      {/* Shepherd Inline Nudge */}
      {noDocsNudge.visible && (
        <ShepherdNudge
          message="Upload your most important document first — a will, insurance policy, or deed."
          ctaLabel="Upload now"
          onDismiss={noDocsNudge.dismiss}
        />
      )}

      {/* Document Checklist Panel */}
      <Card className="rounded-[2.5rem] border-[var(--royal)]/10 p-0 shadow-sm overflow-hidden">
        {/* Checklist Header — always visible */}
        <button
          type="button"
          onClick={() => setChecklistOpen((o) => !o)}
          className="w-full flex items-center justify-between p-8 pb-6 text-left hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--royal)] flex items-center justify-center text-white flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)]">
                Documents Your Estate Needs
              </h3>
              <p className="text-[13px] text-[var(--royal)]/50 font-medium mt-0.5">
                {checklistProgress.uploaded} of {checklistProgress.total} essential documents uploaded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <Progress
                value={checklistProgress.percent}
                className="w-32 h-2 [&>*]:bg-[var(--gold)] bg-[var(--royal)]/10"
              />
              <span className="text-[13px] font-bold text-[var(--gold)] min-w-[3ch]">
                {checklistProgress.percent}%
              </span>
            </div>
            <svg
              viewBox="0 0 24 24"
              className={`w-5 h-5 text-[var(--royal)]/30 transition-transform duration-300 ${checklistOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* Checklist Body — collapsible */}
        {checklistOpen && (
          <CardContent className="px-8 pb-8 pt-0">
            {/* Mobile progress bar */}
            <div className="sm:hidden flex items-center gap-3 mb-6">
              <Progress
                value={checklistProgress.percent}
                className="flex-1 h-2 [&>*]:bg-[var(--gold)] bg-[var(--royal)]/10"
              />
              <span className="text-[13px] font-bold text-[var(--gold)]">
                {checklistProgress.percent}%
              </span>
            </div>

            <div className="space-y-8">
              {(['essential', 'financial', 'property_identity'] as const).map((catKey) => {
                const catInfo = CHECKLIST_CATEGORIES[catKey]
                const items = CHECKLIST_ITEMS.filter((i) => i.category === catKey)
                const catUploaded = items.filter((i) => checklistStatus[i.id]).length

                return (
                  <div key={catKey}>
                    {/* Category sub-heading */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-[var(--royal)]/10 flex items-center justify-center text-[var(--royal)]/60">
                        {catInfo.icon}
                      </div>
                      <span className="text-[12px] font-bold text-[var(--royal)]/50 uppercase tracking-widest">
                        {catInfo.label}
                      </span>
                      <Badge className="bg-slate-50 text-[var(--royal)]/40 border border-[var(--royal)]/10 text-[11px] font-bold h-auto py-0.5 px-2 rounded-lg">
                        {catUploaded}/{items.length}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const isUploaded = checklistStatus[item.id]
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (!isUploaded) scrollToUpload()
                            }}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                              isUploaded
                                ? 'bg-[var(--gold)]/5 border-[var(--gold)]/30'
                                : 'bg-white border-[var(--royal)]/10 hover:border-[var(--royal)]/25 hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            {/* Status indicator */}
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isUploaded
                                  ? 'bg-[var(--gold)] text-white'
                                  : 'border-2 border-[var(--royal)]/15 text-transparent'
                              }`}
                            >
                              {isUploaded && (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`text-[14px] font-bold block ${
                                  isUploaded ? 'text-[var(--gold)]' : 'text-[var(--royal)]'
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="text-[12px] text-[var(--royal)]/40 font-medium leading-snug block mt-0.5">
                                {item.description}
                              </span>
                              {isUploaded ? (
                                <Badge className="mt-2 bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/20 text-[10px] font-bold h-auto py-0.5 px-2 rounded-lg gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                                  Uploaded
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-[var(--royal)]/30 font-semibold mt-2 block">
                                  Click to upload
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tier Limit Banner */}
      {tierUsage && !tierUsage.canUploadMedia && (
        <div className="bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--royal)]">{tierUpgradeMessage(tierUsage, 'media')}</p>
            <p className="text-xs text-[var(--royal)]/60 mt-1">
              {tierUsage.mediaCount} of {tierUsage.limits.maxMedia} uploads used
            </p>
            <Link
              to="/estates/$estateId/pricing"
              params={{ estateId }}
              className="inline-block mt-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold)] underline underline-offset-2"
            >
              View upgrade options
            </Link>
          </div>
        </div>
      )}

      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-[2rem] p-12 text-center cursor-pointer transition-all
          ${tierUsage && !tierUsage.canUploadMedia
            ? 'border-slate-500/20 opacity-50 pointer-events-none'
            : isDragActive
              ? 'border-[var(--royal)] bg-[var(--royal)]/5 scale-[1.01]'
              : 'border-[var(--royal)]/20 hover:border-[var(--royal)]/40 hover:bg-[var(--royal)]/[0.02]'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isDragActive ? 'bg-[var(--royal)] text-white' : 'bg-slate-50 text-[var(--royal)] border border-[var(--royal)]/10'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="text-[var(--royal)] font-bold text-lg">
              {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
            </p>
            <p className="text-[13px] text-[var(--royal)]/40 mt-1">
              PDF, JPEG, PNG, HEIC, DOC, DOCX, TXT — Max 50 MB per file
            </p>
            {tierUsage && tierUsage.limits.maxMedia > 0 && (
              <p className="text-[11px] text-[var(--gold)] font-bold mt-2">
                {tierUsage.mediaCount} / {tierUsage.limits.maxMedia} uploads used
              </p>
            )}
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
          <span className="text-[12px] font-bold text-[var(--royal)]/60 uppercase tracking-wider">
            Filtered: {CATEGORY_MAP[activeCategory]?.label || activeCategory}
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActiveCategory(null)}
            className="text-[11px] font-bold text-[var(--gold)] hover:text-[var(--royal)]"
          >
            Show All
          </Button>
        </div>
      )}

      {/* All Files */}
      <Card className="rounded-[2.5rem] border-[var(--royal)]/10 p-0 shadow-sm">
        <CardContent className="p-10">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <h3 className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
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
                estateId={estateId}
                heirs={heirs}
              />
            ))}
            {documents.length === 0 && (
              <div className="text-center py-24 bg-slate-50 rounded-2xl border border-[var(--royal)]/10">
                <p className="text-[var(--royal)]/50 font-medium">
                  {activeCategory
                    ? `No ${CATEGORY_MAP[activeCategory]?.label.toLowerCase() || 'files'} yet.`
                    : 'No files have been added to this estate yet.'}
                </p>
                <p className="text-sm text-[var(--royal)]/30 mt-2">
                  Drag & drop files above or click to browse.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        {previewDoc && (
          <PreviewModalContent
            doc={previewDoc}
            onDownload={() => handleDownload(previewDoc)}
          />
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        {deleteConfirm && (
          <DeleteModalContent
            doc={deleteConfirm}
            onConfirm={() => handleDelete(deleteConfirm)}
          />
        )}
      </AlertDialog>
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
            : 'bg-slate-50 border-[var(--royal)]/10'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-[var(--royal)]/10">
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
          <div className="w-5 h-5 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[13px] font-bold text-[var(--royal)] truncate">{upload.file.name}</span>
          <span
            className={`text-[11px] font-semibold ${
              isError ? 'text-red-600' : isDone ? 'text-green-600' : 'text-[var(--royal)]'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <Progress
          value={upload.progress}
          className={`h-1.5 ${
            isError ? '[&>*]:bg-red-400' : isDone ? '[&>*]:bg-green-400' : '[&>*]:bg-[var(--royal)]'
          } bg-[var(--royal)]/10`}
        />
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
    <Card
      onClick={onClick}
      className={`text-left w-full p-8 rounded-[2.5rem] border shadow-sm transition-all cursor-pointer group active:scale-[0.98] ${
        active
          ? 'bg-[var(--royal)] border-[var(--royal)] text-white'
          : 'bg-white border-[var(--royal)]/10 hover:border-[var(--royal)]/20 hover:shadow-md'
      }`}
    >
      <CardContent className="p-0">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${
            active
              ? 'bg-white/20 text-white'
              : 'bg-slate-50 border border-[var(--royal)]/10 text-[var(--royal)] group-hover:bg-[var(--royal)] group-hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
            {icon}
          </svg>
        </div>
        <h4
          className={`font-[family-name:var(--font-cinzel)] font-bold text-lg mb-2 transition-colors ${
            active ? 'text-white' : 'text-[var(--royal)] group-hover:text-[var(--royal)]'
          }`}
        >
          {name}
        </h4>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={`text-[13px] font-medium h-auto py-0 px-0 bg-transparent border-none ${
              active ? 'text-white/70' : 'text-[var(--royal)]/50'
            }`}
          >
            {count} file{count !== 1 ? 's' : ''}
          </Badge>
          <Badge
            className={`text-[10px] font-bold h-auto py-0.5 px-2 rounded border gap-1.5 ${
              active
                ? 'bg-white/10 border-white/20 text-green-200'
                : 'bg-green-50 border-green-200 text-green-600'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-300' : 'bg-green-400'}`} />
            Protected
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Document Item Row ────────────────────────────────────────────────────

function DocItem({
  doc,
  onDownload,
  onPreview,
  onDelete,
  estateId,
  heirs,
}: {
  doc: VaultDocument
  onDownload: () => void
  onPreview: () => void
  onDelete: () => void
  estateId: string
  heirs: Heir[]
}) {
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [visibleTo, setVisibleTo] = useState<string[]>(doc.visibleTo || [])
  const dateStr = doc.createdAt?.toDate?.()
    ? doc.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const sizeStr = doc.fileSize ? formatFileSize(doc.fileSize) : ''
  const isPreviewable = doc.mimeType?.startsWith('image/') || doc.mimeType === 'application/pdf'
  const hasAnalysis = doc.analysisStatus === 'complete' && doc.analysis
  const isAnalyzing = doc.analysisStatus === 'processing'

  return (
    <div className="rounded-2xl border border-[var(--royal)]/10 overflow-hidden transition-all group">
      <div className="flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-all">
        <button
          type="button"
          onClick={isPreviewable ? onPreview : onDownload}
          aria-label={`Open ${doc.displayName || doc.originalName}`}
          className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer text-left bg-transparent border-none p-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--royal)]/40"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-[var(--royal)]/30 group-hover:bg-[var(--royal)] group-hover:text-white transition-all duration-500 border border-[var(--royal)]/10 flex-shrink-0">
            <FileIcon mimeType={doc.mimeType} />
          </div>
          <div className="min-w-0">
            <div className="text-[var(--royal)] font-bold text-[15px] mb-0.5 group-hover:text-[var(--royal)] transition-colors truncate">
              {doc.displayName || doc.originalName}
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium text-[var(--royal)]/40 flex-wrap">
              {dateStr && <span>{dateStr}</span>}
              {dateStr && sizeStr && <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />}
              {sizeStr && <span>{sizeStr}</span>}
              {doc.version > 1 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />
                  <Badge variant="secondary" className="bg-[var(--gold)]/10 text-[var(--gold)] text-[10px] font-bold h-auto py-0.5 px-2 rounded-lg">
                    v{doc.version}
                  </Badge>
                </>
              )}
              {doc.folderId && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />
                  <Badge variant="ghost" className="text-[var(--gold)] font-semibold text-[12px] h-auto py-0 px-0">
                    {doc.folderId}
                  </Badge>
                </>
              )}
              {visibleTo.length > 0 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />
                  <Badge className="bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 text-[10px] font-bold h-auto py-0.5 px-2 rounded-lg gap-1.5">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {visibleTo.length} heir{visibleTo.length !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
              {isAnalyzing && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />
                  <Badge className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold h-auto py-0.5 px-2 rounded-lg gap-1.5 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Analyzing...
                  </Badge>
                </>
              )}
              {hasAnalysis && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--royal)]/20" />
                  <Badge className="bg-[var(--royal)]/5 text-[var(--royal)] border border-[var(--royal)]/10 text-[10px] font-bold h-auto py-0.5 px-2 rounded-lg gap-1.5">
                    <DocTypeBadgeLabel type={doc.analysis!.documentType} />
                  </Badge>
                </>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {heirs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibilityOpen(!visibilityOpen)}
              className={`gap-1.5 text-[11px] font-bold ${
                visibilityOpen || visibleTo.length > 0
                  ? 'text-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/5'
                  : 'text-[var(--royal)]/40 hover:text-[var(--royal)] hover:bg-[var(--royal)]/5'
              }`}
              title="Set visibility"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {visibleTo.length > 0 ? `${visibleTo.length} selected` : 'Visibility'}
            </Button>
          )}
          {hasAnalysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInsightsOpen(!insightsOpen)}
              className="text-[var(--royal)]/40 hover:text-[var(--royal)] hover:bg-[var(--royal)]/5 gap-1.5 text-[11px] font-bold"
              title="AI Insights"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Insights
            </Button>
          )}
          {isPreviewable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreview}
              className="text-[var(--royal)]/30 hover:text-[var(--royal)] hover:bg-[var(--royal)]/5"
              title="Preview"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Button>
          )}
          <Button
            onClick={onDownload}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white rounded-xl text-[11px] font-bold shadow-sm"
            size="sm"
          >
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-[var(--royal)]/20 hover:text-red-500 hover:bg-red-50"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Visibility Picker — collapsible */}
      {visibilityOpen && heirs.length > 0 && (
        <div className="border-t border-[var(--royal)]/10 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            {visibleTo.length === 0 ? (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--royal)]/60" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
            <span className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              {visibleTo.length === 0 ? 'Visible to all heirs' : `Visible to ${visibleTo.length} selected`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                const prev = visibleTo
                setVisibleTo([])
                const result = await updateVaultDocument(estateId, doc.id, { visibleTo: [] })
                if (!result.success) {
                  setVisibleTo(prev)
                  toast.error('Could not update who can see this document')
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                visibleTo.length === 0
                  ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                  : 'border-slate-200 text-[var(--royal)]/60 hover:border-slate-300'
              }`}
            >
              Everyone
            </button>
            {heirs.filter(h => h.status === 'active').map((heir) => {
              const selected = visibleTo.includes(heir.id)
              return (
                <button
                  key={heir.id}
                  onClick={async () => {
                    const prev = visibleTo
                    const next = selected
                      ? visibleTo.filter((n) => n !== heir.id)
                      : [...visibleTo, heir.id]
                    setVisibleTo(next)
                    const result = await updateVaultDocument(estateId, doc.id, { visibleTo: next })
                    if (!result.success) {
                      setVisibleTo(prev)
                      toast.error('Could not update who can see this document')
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                    selected
                      ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                      : 'border-slate-200 text-[var(--royal)]/60 hover:border-slate-300'
                  }`}
                >
                  {heir.fullName}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Insights Panel — collapsible */}
      {hasAnalysis && insightsOpen && (
        <AIInsightsPanel
          analysis={doc.analysis!}
          discrepancies={doc.discrepancies || []}
          estateId={estateId}
        />
      )}
    </div>
  )
}

// ─── Preview Modal Content ───────────────────────────────────────────────

function PreviewModalContent({
  doc,
  onDownload,
}: {
  doc: VaultDocument
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
    <DialogContent
      showCloseButton
      className="max-w-4xl w-full rounded-[2rem] p-0 overflow-hidden shadow-2xl sm:max-w-4xl"
    >
      <DialogHeader className="p-6 border-b border-[var(--royal)]/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)] truncate">
              {doc.displayName || doc.originalName}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--royal)]/40 font-medium mt-0.5">
              {doc.mimeType} · {formatFileSize(doc.fileSize)}
            </DialogDescription>
          </div>
          <Button
            onClick={onDownload}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white rounded-xl text-[12px] font-bold ml-4"
            size="sm"
          >
            Download
          </Button>
        </div>
      </DialogHeader>

      {/* Content */}
      <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center bg-slate-50">
        {loading ? (
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
        ) : previewUrl ? (
          doc.mimeType?.startsWith('image/') ? (
            <img src={previewUrl} alt={doc.originalName} className="max-w-full max-h-[60vh] rounded-xl object-contain" />
          ) : doc.mimeType === 'application/pdf' ? (
            <iframe src={previewUrl} className="w-full h-[60vh] rounded-xl border border-[var(--royal)]/10" title={doc.originalName} />
          ) : (
            <p className="text-[var(--royal)]/50">Preview not available for this file type.</p>
          )
        ) : (
          <p className="text-[var(--royal)]/50">Unable to load preview. Try downloading instead.</p>
        )}
      </div>
    </DialogContent>
  )
}

// ─── Delete Confirmation Modal Content ───────────────────────────────────

function DeleteModalContent({
  doc,
  onConfirm,
}: {
  doc: VaultDocument
  onConfirm: () => void
}) {
  return (
    <AlertDialogContent className="rounded-[2rem] p-8 max-w-md sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogMedia className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 mx-auto mb-2">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </AlertDialogMedia>
        <AlertDialogTitle className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)] text-center">
          Archive Document
        </AlertDialogTitle>
        <AlertDialogDescription className="text-[14px] text-[var(--royal)]/50 text-center">
          <strong className="text-[var(--royal)]">{doc.displayName || doc.originalName}</strong> will be archived.
          It can be restored later if needed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex gap-3 mt-4 sm:flex-row border-t-0 bg-transparent mx-0 mb-0 p-0 rounded-none">
        <AlertDialogCancel className="flex-1 py-3 rounded-xl border-[var(--royal)]/10 text-[var(--royal)] font-bold text-[13px] hover:bg-slate-50 h-auto">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] h-auto border-none"
        >
          Archive
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

// ─── AI Insights Panel ───────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  will: 'Last Will & Testament',
  trust: 'Trust Document',
  insurance: 'Insurance Policy',
  deed: 'Property Deed',
  financial: 'Financial Document',
  medical: 'Medical Directive',
  other: 'Document',
}

function DocTypeBadgeLabel({ type }: { type: string }) {
  return <>{DOC_TYPE_LABELS[type] || type}</>
}

function AIInsightsPanel({
  analysis,
  discrepancies,
  estateId,
}: {
  analysis: DocumentAnalysis
  discrepancies: DocumentDiscrepancy[]
  estateId: string
}) {
  const { data: heirs } = useEstateHeirs(estateId)
  const heirNames = useMemo(
    () => new Set(heirs.map((h) => h.fullName.toLowerCase().trim())),
    [heirs],
  )

  return (
    <div className="border-t border-[var(--royal)]/10 bg-slate-50 px-6 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span className="text-[12px] font-bold text-[var(--royal)] uppercase tracking-widest">
          AI Insights
        </span>
      </div>

      {/* Summary */}
      <p className="text-[14px] text-[var(--royal)]/80 leading-relaxed">
        {analysis.summary}
      </p>

      {/* Key Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {analysis.signingDate && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--royal)]/40 font-medium">Signed:</span>
            <span className="text-[var(--royal)] font-semibold">{analysis.signingDate}</span>
          </div>
        )}
        {analysis.jurisdiction && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--royal)]/40 font-medium">Jurisdiction:</span>
            <span className="text-[var(--royal)] font-semibold">{analysis.jurisdiction}</span>
          </div>
        )}
        {analysis.notarized !== null && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--royal)]/40 font-medium">Notarized:</span>
            <span className={`font-semibold ${analysis.notarized ? 'text-green-600' : 'text-amber-600'}`}>
              {analysis.notarized ? 'Yes' : 'No'}
            </span>
          </div>
        )}
        {analysis.namedExecutor && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--royal)]/40 font-medium">Executor:</span>
            <span className="text-[var(--royal)] font-semibold">{analysis.namedExecutor}</span>
            {heirNames.has(analysis.namedExecutor.toLowerCase().trim()) ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 9v4M12 17h.01" />
              </svg>
            )}
          </div>
        )}
        {analysis.namedTrustee && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--royal)]/40 font-medium">Trustee:</span>
            <span className="text-[var(--royal)] font-semibold">{analysis.namedTrustee}</span>
          </div>
        )}
      </div>

      {/* Named Beneficiaries */}
      {analysis.namedBeneficiaries.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
            Named Beneficiaries
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.namedBeneficiaries.map((name) => {
              const isKnown = heirNames.has(name.toLowerCase().trim())
              return (
                <Badge
                  key={name}
                  className={`text-[12px] font-semibold h-auto py-1 px-3 rounded-xl gap-1.5 ${
                    isKnown
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isKnown ? (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                  )}
                  {name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Assets Mentioned */}
      {analysis.assetsMentioned.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
            Assets Referenced
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.assetsMentioned.map((asset, i) => (
              <Badge
                key={i}
                className="bg-slate-50 text-[var(--royal)]/60 border border-[var(--royal)]/10 text-[12px] font-medium h-auto py-1 px-3 rounded-xl"
              >
                {asset}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancy Alerts */}
      {discrepancies.length > 0 && (
        <div className="space-y-2">
          {discrepancies.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-amber-800">
                  {d.type === 'unknown_executor'
                    ? `Your document names "${d.name}" as executor, but they're not in your estate.`
                    : d.type === 'unknown_trustee'
                      ? `Your document names "${d.name}" as trustee, but they're not in your estate.`
                      : `"${d.name}" is named in this document but not in your estate beneficiaries.`}
                </p>
                <p className="text-[12px] text-amber-600 mt-0.5">
                  Add them to ensure your estate records match your legal documents.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 text-[11px] font-bold rounded-lg flex-shrink-0"
                onClick={() => {
                  window.location.hash = ''
                  window.location.pathname = `/estates/${estateId}/beneficiaries`
                }}
              >
                Add to Estate
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <div className="space-y-2">
          {analysis.flags.map((flag, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-[13px] text-yellow-800 font-medium">{flag}</p>
            </div>
          ))}
        </div>
      )}
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
