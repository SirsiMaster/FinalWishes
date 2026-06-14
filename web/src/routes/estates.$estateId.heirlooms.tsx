/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useHeirlooms, useEstateHeirs, type Heirloom } from '../lib/firestore'
import { addHeirloom, archiveHeirloom, updateHeirloom } from '../lib/estate-actions'
import { toast } from 'sonner'
import { estateClient } from '../lib/client'
import { useTierGating, tierUpgradeMessage } from '../lib/tier-gating'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import {
  Plus,
  Gem,
  MapPin,
  User,
  DollarSign,
  Archive,
  Image,
  Palette,
  Armchair,
  Car,
  Trophy,
  ScrollText,
  Package,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Globe,
  Loader2,
} from 'lucide-react'
import { importFromGooglePhotos, isGooglePhotosImportConfigured } from '../lib/google-photos-import'

import { Button } from '@/components/ui/button'
import { CameraCaptureButton } from '@/components/ui/camera-capture-button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'

import { SectionHeader } from '@/components/estate/SectionHeader'
import { SectionEmptyState } from '@/components/estate/SectionEmptyState'

export const Route = createFileRoute('/estates/$estateId/heirlooms')({
  component: HeirloomsPage,
})

// ─── Category Config ──────────────────────────────────────────────────────

// Category accent collapsed to a single restrained gold (#C8A951 = var(--gold)).
// Kept as a hex literal because consumers build alpha tints via `${color}20`.
const CATEGORY_ACCENT = '#C8A951'
const CATEGORIES = [
  { value: 'jewelry' as const, label: 'Jewelry', icon: Gem, color: CATEGORY_ACCENT },
  { value: 'artwork' as const, label: 'Artwork', icon: Palette, color: CATEGORY_ACCENT },
  { value: 'furniture' as const, label: 'Furniture', icon: Armchair, color: CATEGORY_ACCENT },
  { value: 'vehicle' as const, label: 'Vehicle', icon: Car, color: CATEGORY_ACCENT },
  { value: 'collectible' as const, label: 'Collectible', icon: Trophy, color: CATEGORY_ACCENT },
  { value: 'family_artifact' as const, label: 'Family Artifact', icon: ScrollText, color: CATEGORY_ACCENT },
  { value: 'other' as const, label: 'Other', icon: Package, color: CATEGORY_ACCENT },
] as const

type CategoryValue = (typeof CATEGORIES)[number]['value']

function getCategoryConfig(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function HeirloomsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/heirlooms' })
  const estateId = routeId
  const { usage: tierUsage } = useTierGating(estateId)

  const { data: items, loading } = useHeirlooms(estateId)
  const { data: heirs } = useEstateHeirs(estateId)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<CategoryValue | 'all'>('all')
  const [importing, setImporting] = useState(false)
  // Google Photos import is gated on a build-time OAuth client id. When absent the
  // control is hidden entirely rather than shown-then-erroring on click.
  const googlePhotosEnabled = isGooglePhotosImportConfigured()

  const handleGooglePhotosImport = useCallback(async () => {
    if (importing) return
    setImporting(true)
    const t = toast.loading('Connecting to Google Photos…')
    try {
      const { imported, skipped } = await importFromGooglePhotos(estateId, (status) =>
        toast.loading(status, { id: t }),
      )
      // The heirlooms list is realtime (useHeirlooms), so imports appear automatically.
      toast.success(
        `Imported ${imported} photo${imported === 1 ? '' : 's'}` +
          (skipped > 0 ? ` (${skipped} skipped — duplicates or non-images)` : ''),
        { id: t },
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Google Photos import failed', { id: t })
    } finally {
      setImporting(false)
    }
  }, [estateId, importing])

  // Only show active items
  const activeItems = useMemo(() => items.filter((i) => i.status === 'active'), [items])

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return activeItems
    return activeItems.filter((i) => i.category === filterCategory)
  }, [activeItems, filterCategory])

  const stats = useMemo(() => ({
    total: activeItems.length,
    totalValue: activeItems.reduce((sum, i) => sum + (i.estimatedValue || 0), 0),
    categories: new Set(activeItems.map((i) => i.category)).size,
  }), [activeItems])

  if (loading) {
    return <CardGridSkeleton />
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      <SectionHeader
        section="memories"
        title="Heirloom Registry"
        subtitle="Physical assets, family treasures, and sentimental items worth preserving for future generations."
        action={
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {googlePhotosEnabled && (
              <Button
                onClick={handleGooglePhotosImport}
                disabled={importing || (tierUsage ? !tierUsage.canUploadMedia : false)}
                variant="secondary"
                className="px-6 py-3 md:px-8 md:py-5 h-auto rounded-2xl font-bold text-[13px] md:text-[14px] bg-[var(--royal)]/5 text-[var(--ink-muted)] hover:bg-[var(--royal)]/10 w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
                Import from Google Photos
              </Button>
            )}
            <Button
              onClick={() => setModalOpen(true)}
              disabled={tierUsage ? !tierUsage.canUploadMedia : false}
              className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-6 py-3 md:px-10 md:py-5 h-auto rounded-2xl font-bold text-[13px] md:text-[14px] shadow-lg w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Add Heirloom
            </Button>
          </div>
        }
      />

      {/* Tier Limit Banner */}
      {tierUsage && !tierUsage.canUploadMedia && (
        <div className="bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--ink)]">{tierUpgradeMessage(tierUsage, 'media')}</p>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              {tierUsage.mediaCount} of {tierUsage.limits.maxMedia} uploads used
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {[
          { label: 'Total Items', value: String(stats.total), icon: Gem },
          { label: 'Estimated Value', value: formatCurrency(stats.totalValue), icon: DollarSign },
          { label: 'Categories', value: String(stats.categories), icon: Archive },
        ].map((s) => (
          <Card key={s.label} variant="glass" className="py-0">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--royal)]/5 rounded-2xl flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[var(--royal)]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[var(--ink)]">{s.value}</p>
                  <p className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Category Filter ── */}
      <div className="flex gap-3 flex-wrap">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'secondary'}
          onClick={() => setFilterCategory('all')}
          className={`px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider ${filterCategory === 'all' ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal-blue)]' : 'bg-[var(--royal)]/5 text-[var(--ink-muted)] hover:bg-[var(--royal)]/10'}`}
        >
          All
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={filterCategory === c.value ? 'default' : 'secondary'}
            onClick={() => setFilterCategory(c.value)}
            className={`px-5 py-2.5 h-auto rounded-xl text-[12px] font-bold uppercase tracking-wider ${filterCategory === c.value ? 'bg-[var(--royal)] text-white hover:bg-[var(--royal-blue)]' : 'bg-[var(--royal)]/5 text-[var(--ink-muted)] hover:bg-[var(--royal)]/10'}`}
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </Button>
        ))}
      </div>

      {/* ── Items Grid ── */}
      {filtered.length === 0 ? (
        <SectionEmptyState
          section="memories"
          heading="No heirlooms registered yet"
          message="Document your family treasures to ensure they reach the right hands."
          ctaLabel="Add First Heirloom"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <HeirloomCard key={item.id} item={item} estateId={estateId} heirs={heirs} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <AddHeirloomModal estateId={estateId} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}

// ─── Heirloom Card ──────────────────────────────────────────────────────────

function HeirloomCard({ item, estateId, heirs }: { item: Heirloom; estateId: string; heirs: { id: string; fullName: string; status: string }[] }) {
  const cat = getCategoryConfig(item.category)
  const [confirming, setConfirming] = useState(false)
  const [visibleTo, setVisibleTo] = useState<string[]>(item.visibleTo || [])
  const Icon = cat.icon
  const hasPhoto = item.photoUrls && item.photoUrls.length > 0
  const activeHeirs = heirs.filter(h => h.status === 'active')

  const handleArchive = useCallback(async () => {
    const result = await archiveHeirloom(estateId, item.id)
    setConfirming(false)
    if (!result?.success) {
      toast.error(result?.error || 'Could not archive. Please try again.')
      return
    }
    toast.success('Heirloom archived')
  }, [estateId, item.id])

  // Persist a visibility change with optimistic UI + revert-on-failure.
  // `prev` is the value to roll back to if the write fails (fire-and-forget
  // previously swallowed errors, leaving the UI out of sync with Firestore).
  const persistVisibility = useCallback(
    async (next: string[], prev: string[]) => {
      setVisibleTo(next)
      const result = await updateHeirloom(estateId, item.id, { visibleTo: next })
      if (!result?.success) {
        setVisibleTo(prev)
        toast.error(result?.error || 'Could not update visibility. Please try again.')
      }
    },
    [estateId, item.id],
  )

  return (
    <Card variant="glass" className="group py-0">
      <CardContent className="p-0">
        {/* Photo / Placeholder */}
        <div className="relative h-48 bg-[var(--royal)]/5 flex items-center justify-center overflow-hidden">
          {hasPhoto ? (
            <img
              src={item.photoUrls[0]}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Image className="w-10 h-10 text-[var(--royal)]/15" />
              <span className="text-[11px] font-bold text-[var(--royal)]/20 uppercase tracking-widest">No Photo</span>
            </div>
          )}
          {/* Category badge overlay */}
          <Badge
            className="absolute top-4 right-4 px-3 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-lg border-transparent backdrop-blur-sm"
            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
          >
            <Icon className="w-3 h-3" />
            {cat.label}
          </Badge>
        </div>

        <div className="p-8">
          {/* Name & Value */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--ink)]">{item.name}</h3>
            {item.estimatedValue != null && item.estimatedValue > 0 && (
              <Badge className="px-3 py-1.5 h-auto bg-[var(--gold)]/10 text-[var(--gold)] text-[11px] font-bold rounded-lg border-transparent">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(item.estimatedValue)}
              </Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[13px] text-[var(--ink-muted)] line-clamp-2 mb-4">{item.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 mb-4">
            {item.designatedHeir && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
                <User className="w-3.5 h-3.5 text-[var(--royal)]/40" />
                <span className="font-medium">{item.designatedHeir}</span>
              </div>
            )}
            {item.location && (
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--royal)]/40" />
                <span className="font-medium">{item.location}</span>
              </div>
            )}
          </div>

          {/* Provenance */}
          {item.provenance && (
            <div className="bg-[var(--gold)]/8 rounded-2xl p-5 mb-4">
              <p className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest mb-2">Provenance</p>
              <p className="text-[13px] text-[var(--ink-muted)] line-clamp-3">{item.provenance}</p>
            </div>
          )}

          {/* Visibility Picker */}
          {activeHeirs.length > 0 && (
            <div className="mb-4 pt-3">
              <div className="flex items-center gap-2 mb-2.5">
                {visibleTo.length === 0 ? (
                  <Globe className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-[var(--royal)]" />
                )}
                <span className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">
                  {visibleTo.length === 0 ? 'Visible to all heirs' : `Visible to ${visibleTo.length} selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    void persistVisibility([], visibleTo)
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                    visibleTo.length === 0
                      ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                      : 'border-[var(--royal)]/15 text-[var(--ink-muted)] hover:border-[var(--gold)]/40'
                  }`}
                >
                  Everyone
                </button>
                {activeHeirs.map((heir) => {
                  const selected = visibleTo.includes(heir.id)
                  return (
                    <button
                      key={heir.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = selected
                          ? visibleTo.filter((n) => n !== heir.id)
                          : [...visibleTo, heir.id]
                        void persistVisibility(next, visibleTo)
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                        selected
                          ? 'border-[var(--royal)] bg-[var(--royal)]/5 text-[var(--royal)]'
                          : 'border-[var(--royal)]/15 text-[var(--ink-muted)] hover:border-[var(--gold)]/40'
                      }`}
                    >
                      {heir.fullName}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Separator className="bg-[var(--royal)]/5 mb-4" />

          {/* Archive action */}
          <div className="flex justify-end">
            {confirming ? (
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[#DC2626] font-medium">Archive this heirloom?</span>
                <Button variant="destructive" size="xs" onClick={handleArchive} className="text-[12px] font-bold">
                  Yes
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setConfirming(false)} className="text-[12px] font-bold text-[var(--ink-muted)]">
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setConfirming(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Archive className="w-4 h-4 text-[var(--ink-muted)]/60 hover:text-[#DC2626]" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Photo Upload Types ─────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_IMAGES = 5
const ACCEPTED_IMAGE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
}

type PhotoUpload = {
  file: File
  previewUrl: string
  finalUrl: string
  progress: number
  status: 'preparing' | 'uploading' | 'done' | 'error'
  error?: string
}

// ─── Add Modal ──────────────────────────────────────────────────────────────

function AddHeirloomModal({ estateId, open, onOpenChange }: { estateId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { usage: tierUsage } = useTierGating(estateId)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'jewelry' as CategoryValue,
    description: '',
    estimatedValue: '',
    designatedHeir: '',
    location: '',
    provenance: '',
    manualUrls: '',
  })
  const [photoUploads, setPhotoUploads] = useState<PhotoUpload[]>([])

  const resetForm = useCallback(() => {
    // Revoke object URLs to prevent memory leaks
    photoUploads.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setForm({
      name: '',
      category: 'jewelry',
      description: '',
      estimatedValue: '',
      designatedHeir: '',
      location: '',
      provenance: '',
      manualUrls: '',
    })
    setPhotoUploads([])
  }, [photoUploads])

  // ─── Upload a single image ────────────────────────────────────────────

  const uploadImage = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    const newUpload: PhotoUpload = { file, previewUrl, finalUrl: '', progress: 0, status: 'preparing' }

    setPhotoUploads((prev) => [...prev, newUpload])

    const updateUpload = (patch: Partial<PhotoUpload>) => {
      setPhotoUploads((prev) =>
        prev.map((u) => (u.file === file ? { ...u, ...patch } : u)),
      )
    }

    try {
      updateUpload({ status: 'preparing', progress: 10 })
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId,
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
      })

      updateUpload({ status: 'uploading', progress: 30 })

      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = 30 + Math.round((e.loaded / e.total) * 60)
            updateUpload({ progress: pct })
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed (${xhr.status})`))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg')
        // Matches the server-signed X-Goog-Content-Length-Range constraint (100 MB cap)
        xhr.setRequestHeader('X-Goog-Content-Length-Range', '0,104857600')
        xhr.send(file)
      })

      updateUpload({ status: 'done', progress: 100, finalUrl })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      updateUpload({ status: 'error', error: msg })
    }
  }, [estateId])

  // ─── Remove an uploaded photo ─────────────────────────────────────────

  const removePhoto = useCallback((file: File) => {
    setPhotoUploads((prev) => {
      const target = prev.find((u) => u.file === file)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((u) => u.file !== file)
    })
  }, [])

  // ─── Dropzone ─────────────────────────────────────────────────────────

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (tierUsage && !tierUsage.canUploadMedia) return
    const remaining = MAX_IMAGES - photoUploads.length
    const filesToUpload = acceptedFiles.slice(0, remaining)

    for (const file of filesToUpload) {
      if (file.size > MAX_IMAGE_SIZE) {
        const previewUrl = URL.createObjectURL(file)
        setPhotoUploads((prev) => [
          ...prev,
          { file, previewUrl, finalUrl: '', progress: 0, status: 'error', error: 'File exceeds 10 MB limit' },
        ])
        continue
      }
      uploadImage(file)
    }
  }, [photoUploads.length, uploadImage, tierUsage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_SIZE,
    maxFiles: MAX_IMAGES - photoUploads.length,
    disabled: photoUploads.length >= MAX_IMAGES,
    multiple: true,
  })

  const isUploading = photoUploads.some((u) => u.status === 'preparing' || u.status === 'uploading')

  // ─── Submit ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.description.trim()) return
    setSaving(true)

    // Collect URLs from successful uploads
    const uploadedUrls = photoUploads
      .filter((u) => u.status === 'done' && u.finalUrl)
      .map((u) => u.finalUrl)

    // Collect manually pasted URLs
    const manualUrls = form.manualUrls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)

    const photoUrls = [...uploadedUrls, ...manualUrls]

    const result = await addHeirloom({
      estateId,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
      designatedHeir: form.designatedHeir.trim() || undefined,
      photoUrls,
      location: form.location.trim() || undefined,
      provenance: form.provenance.trim() || undefined,
    })
    setSaving(false)
    if (!result?.success) {
      toast.error(result?.error || 'Could not save heirloom. Please try again.')
      return
    }
    toast.success(`${form.name} added to heirlooms`)
    resetForm()
    onOpenChange(false)
  }, [estateId, form, photoUploads, onOpenChange, resetForm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--ink)]">
            Add Heirloom
          </DialogTitle>
          <DialogDescription>
            Register a physical asset, family treasure, or sentimental item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Item Name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Grandmother's Diamond Ring, Steinway Grand Piano"
              className="px-5 py-4 h-auto rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Category
            </Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as CategoryValue }))}>
              <SelectTrigger className="w-full px-5 py-4 h-auto rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)]">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Description *
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the item — materials, condition, distinguishing features..."
              rows={3}
              className="px-5 py-4 rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)] resize-none"
            />
          </div>

          {/* Two-column row: Value + Heir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
                Estimated Value
              </Label>
              <Input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
                placeholder="$0"
                className="px-5 py-4 h-auto rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
                Designated Heir
              </Label>
              <Input
                value={form.designatedHeir}
                onChange={(e) => setForm((f) => ({ ...f, designatedHeir: e.target.value }))}
                placeholder="Name of the intended recipient"
                className="px-5 py-4 h-auto rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)]"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Location
            </Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Where is the item kept? e.g., Master bedroom safe, Storage unit #42"
              className="px-5 py-4 h-auto rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)]"
            />
          </div>

          {/* Provenance */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Provenance / Story
            </Label>
            <Textarea
              value={form.provenance}
              onChange={(e) => setForm((f) => ({ ...f, provenance: e.target.value }))}
              placeholder="The history and story behind this item — where it came from, who owned it, why it matters..."
              rows={3}
              className="px-5 py-4 rounded-2xl border-[var(--royal)]/15 text-[14px] text-[var(--ink)] resize-none"
            />
          </div>

          {/* ── Photo Upload ── */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold text-[var(--royal)]/60 uppercase tracking-widest">
              Photos
            </Label>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${photoUploads.length >= MAX_IMAGES
                  ? 'border-[var(--royal)]/15 bg-[var(--royal)]/5 cursor-not-allowed opacity-60'
                  : isDragActive
                    ? 'border-[var(--royal)] bg-[var(--royal)]/5 scale-[1.01]'
                    : 'border-[var(--royal)]/20 hover:border-[var(--royal)]/40 hover:bg-[var(--royal)]/[0.02]'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isDragActive ? 'bg-[var(--royal)] text-white' : 'bg-[var(--royal)]/5 text-[var(--royal)] border border-[var(--royal)]/10'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[var(--ink)] font-bold text-[14px]">
                    {photoUploads.length >= MAX_IMAGES
                      ? 'Maximum photos reached'
                      : isDragActive
                        ? 'Drop images here'
                        : 'Drag & drop images, or click to browse'}
                  </p>
                  <p className="text-[12px] text-[var(--royal)]/40 mt-1">
                    JPEG, PNG, WebP, HEIC — Max 10 MB per image, up to {MAX_IMAGES} images
                  </p>
                </div>
              </div>
            </div>

            {photoUploads.length < MAX_IMAGES && (
              <div className="mt-3 flex items-center justify-center">
                <CameraCaptureButton onFile={(f) => onDrop([f])} accept="image/*" label="Take a photo" />
              </div>
            )}

            {/* Upload Thumbnails & Progress */}
            {photoUploads.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {photoUploads.map((upload, i) => (
                  <div key={`${upload.file.name}-${i}`} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden border border-[var(--royal)]/10 bg-[var(--royal)]/5">
                      <img
                        src={upload.previewUrl}
                        alt={upload.file.name}
                        className={`w-full h-full object-cover transition-opacity ${
                          upload.status === 'done' ? 'opacity-100' : 'opacity-60'
                        }`}
                      />
                      {/* Progress overlay */}
                      {(upload.status === 'preparing' || upload.status === 'uploading') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-xl">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                          <Progress
                            value={upload.progress}
                            className="w-3/4 h-1 [&>*]:bg-white bg-white/20"
                          />
                        </div>
                      )}
                      {/* Done indicator */}
                      {upload.status === 'done' && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-500 drop-shadow-sm" />
                        </div>
                      )}
                      {/* Error indicator */}
                      {upload.status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/20 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-[9px] text-red-600 font-bold mt-1 px-1 text-center leading-tight">
                            {upload.error}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(upload.file)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--royal)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual URL fallback */}
            <Separator className="bg-[var(--royal)]/10" />
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                Or paste image URLs directly
              </p>
              <Input
                value={form.manualUrls}
                onChange={(e) => setForm((f) => ({ ...f, manualUrls: e.target.value }))}
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                className="px-5 py-3 h-auto rounded-2xl border-[var(--royal)]/15 text-[13px] text-[var(--ink)]"
              />
              <p className="text-[11px] text-[var(--ink-muted)]/60">Separate multiple URLs with commas.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-4 pt-8 border-t border-[var(--royal)]/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="px-8 py-4 h-auto rounded-2xl text-[14px] font-bold text-[var(--ink-muted)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || isUploading || !form.name.trim() || !form.description.trim()}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-4 h-auto rounded-2xl font-bold text-[14px]"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Gem className="w-4 h-4" />}
            {saving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Heirloom'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
