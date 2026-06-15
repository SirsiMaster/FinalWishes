/* eslint-disable react-refresh/only-export-components */
/**
 * Life Chapters — Narrative Arcs of a Life
 *
 * Organize the Legacy Timeline into themed chapters:
 * childhood, military service, parenthood, career milestones.
 * Each chapter is a curated collection with a cover, date range, and description.
 *
 * @version 1.0.0
 */
import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useState, useMemo, useCallback, useRef } from 'react'
import { useLifeChapters, type LifeChapter, type ChapterEntryRef, useCollection } from '../lib/firestore'
import { addLifeChapter, updateLifeChapter, archiveLifeChapter } from '../lib/estate-actions'
import { useAuth } from '../lib/auth'
import { toast } from 'sonner'
import { estateClient } from '../lib/client'
import { orderBy, type Timestamp } from 'firebase/firestore'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  BookOpen,
  Calendar,
  Pencil,
  Trash2,
  FileText,
  Mic,
  Camera,
  PenLine,
  Gem,
  ChevronRight,
  GripVertical,
  ImagePlus,
  X,
  Loader2,
} from 'lucide-react'
import { SectionHeader } from '@/components/estate/SectionHeader'
import { getSectionNudge } from '../lib/shepherd-prompts'

export const Route = createFileRoute('/estates/$estateId/life-chapters')({
  component: LifeChaptersPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(from?: string, to?: string): string {
  if (!from && !to) return ''
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  if (from && to) return `${fmt(from)} — ${fmt(to)}`
  if (from) return `${fmt(from)} — Present`
  return `Until ${fmt(to!)}`
}

const ENTRY_ICONS: Record<string, typeof FileText> = {
  'soul-log': Mic,
  'memoirs': Camera,
  'capsules': PenLine,
  'directives': FileText,
  'heirlooms': Gem,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function LifeChaptersPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/life-chapters' })
  const estateId = routeId
  const { profile } = useAuth()
  const canEdit = profile?.role === 'principal' || profile?.role === 'admin'

  const { data: chapters, loading } = useLifeChapters(estateId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<LifeChapter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LifeChapter | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Load available entries for the entry picker
  const { data: soulLogs } = useCollection<{ id: string; title?: string; content?: string; createdAt: Timestamp }>(
    `estates/${estateId}/soul-log`,
    useMemo(() => [orderBy('createdAt', 'desc')], []),
  )
  const { data: memoirDocs } = useCollection<{ id: string; title: string; createdAt: Timestamp }>(
    `estates/${estateId}/memoirs`,
    useMemo(() => [orderBy('createdAt', 'desc')], []),
  )

  const handleCreate = useCallback(async (data: {
    title: string
    description: string
    dateFrom: string
    dateTo: string
    coverImageUrl?: string
  }) => {
    const result = await addLifeChapter({
      estateId,
      title: data.title,
      description: data.description,
      coverImageUrl: data.coverImageUrl,
      dateFrom: data.dateFrom || undefined,
      dateTo: data.dateTo || undefined,
      order: chapters.length,
    })
    if (result.success) {
      toast.success('Chapter created')
      setCreateOpen(false)
    } else {
      toast.error(result.error || 'Failed to create chapter')
    }
  }, [estateId, chapters.length])

  const handleUpdate = useCallback(async (chapterId: string, data: {
    title: string
    description: string
    dateFrom: string
    dateTo: string
    coverImageUrl?: string
  }) => {
    const result = await updateLifeChapter(estateId, chapterId, {
      title: data.title,
      description: data.description,
      dateFrom: data.dateFrom || null,
      dateTo: data.dateTo || null,
      ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
    })
    if (result.success) {
      toast.success('Chapter updated')
      setEditingChapter(null)
    } else {
      toast.error(result.error || 'Failed to update chapter')
    }
  }, [estateId])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const result = await archiveLifeChapter(estateId, deleteTarget.id)
    if (result.success) {
      toast.success('Chapter archived')
      setDeleteTarget(null)
    } else {
      toast.error(result.error || 'Failed to archive chapter')
    }
  }, [estateId, deleteTarget])

  const handleAddEntry = useCallback(async (chapterId: string, ref: ChapterEntryRef) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (!chapter) return
    const exists = chapter.entryRefs?.some((e) => e.docId === ref.docId && e.collection === ref.collection)
    if (exists) {
      toast.info('Already in this chapter')
      return
    }
    const updatedRefs = [...(chapter.entryRefs || []), ref]
    const result = await updateLifeChapter(estateId, chapterId, { entryRefs: updatedRefs })
    if (result.success) {
      toast.success(`Added to "${chapter.title}"`)
    }
  }, [estateId, chapters])

  const handleRemoveEntry = useCallback(async (chapterId: string, docId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId)
    if (!chapter) return
    const updatedRefs = (chapter.entryRefs || []).filter((e) => e.docId !== docId)
    const result = await updateLifeChapter(estateId, chapterId, { entryRefs: updatedRefs })
    if (result.success) {
      toast.success('Entry removed')
    } else {
      toast.error(result.error || 'Could not remove entry.')
    }
  }, [estateId, chapters])

  // Available entries not yet assigned to the expanded chapter
  const availableEntries = useMemo(() => {
    if (!expandedId) return []
    const chapter = chapters.find((c) => c.id === expandedId)
    const assigned = new Set((chapter?.entryRefs || []).map((e) => `${e.collection}:${e.docId}`))

    const entries: Array<ChapterEntryRef & { label: string }> = []

    for (const s of soulLogs) {
      const key = `soul-log:${s.id}`
      if (!assigned.has(key)) {
        entries.push({
          collection: 'soul-log',
          docId: s.id,
          title: s.title || (s.content ? s.content.substring(0, 40) + '...' : 'Soul Log Entry'),
          addedAt: new Date().toISOString(),
          label: s.title || 'Soul Log Entry',
        })
      }
    }

    for (const m of memoirDocs) {
      const key = `memoirs:${m.id}`
      if (!assigned.has(key)) {
        entries.push({
          collection: 'memoirs',
          docId: m.id,
          title: m.title || 'Memoir',
          addedAt: new Date().toISOString(),
          label: m.title || 'Memoir',
        })
      }
    }

    return entries
  }, [expandedId, chapters, soulLogs, memoirDocs])

  // ─── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.2em]">Loading chapters...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      <SectionHeader
        section="life-chapters"
        shepherdHint={getSectionNudge('life-chapters', {
          estateId, userName: '', soulLogCount: soulLogs.length, lastSoulLogDate: null,
          assetCount: 0, documentCount: 0, heirCount: 0, heirloomCount: 0,
          capsuleCount: 0, directiveCount: 0, memoirCount: memoirDocs.length,
          heirs: [], completionPercent: 0,
        })}
        action={canEdit ? (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-8 py-4 h-auto rounded-2xl font-bold text-[13px] shadow-lg gap-3"
          >
            <Plus className="w-5 h-5" />
            New Chapter
          </Button>
        ) : undefined}
      />

      {/* Create / Edit Modal */}
      <ChapterFormDialog
        open={createOpen || !!editingChapter}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditingChapter(null)
          }
        }}
        chapter={editingChapter}
        estateId={estateId}
        onSubmit={(data) => {
          if (editingChapter) {
            handleUpdate(editingChapter.id, data)
          } else {
            handleCreate(data)
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="rounded-3xl border-neutral-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-[family-name:var(--font-cinzel)]">Archive Chapter</AlertDialogTitle>
            <AlertDialogDescription>
              Archive &ldquo;{deleteTarget?.title}&rdquo;? The entries within it won&apos;t be deleted — they remain in your estate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-xl">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chapter Cards or Empty State */}
      {chapters.length === 0 ? (
        <Card className="border-0 shadow-none bg-transparent text-center py-24">
          <CardContent className="flex flex-col items-center">
            <div className="w-24 h-24 bg-[var(--gold)]/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <BookOpen className="w-12 h-12 text-[var(--gold)]/30" />
            </div>
            <h3 className="text-xl font-bold text-royal mb-3 font-[family-name:var(--font-cinzel)]">
              Your Story Begins Here
            </h3>
            <p className="text-ink-muted max-w-md mx-auto mb-8 leading-relaxed">
              Organize your life into meaningful chapters — childhood memories, career milestones, parenthood, adventures.
              Each chapter becomes a curated story for the people you love.
            </p>
            {canEdit && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-5 h-auto rounded-2xl font-bold text-[14px] shadow-lg gap-3"
              >
                <Plus className="w-5 h-5" />
                Create Your First Chapter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {chapters.map((chapter, index) => {
            const isExpanded = expandedId === chapter.id
            const entryCount = chapter.entryRefs?.length || 0
            const dateRange = formatDateRange(chapter.dateFrom, chapter.dateTo)

            return (
              <Card
                key={chapter.id}
                className="rounded-3xl border-neutral-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Cover Image */}
                {chapter.coverImageUrl && (
                  <div className="h-32 md:h-40 overflow-hidden">
                    <img
                      src={chapter.coverImageUrl}
                      alt={chapter.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Chapter Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : chapter.id)}
                  className="w-full text-left p-6 md:p-8 hover:bg-neutral-faint/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-5">
                    {/* Chapter number */}
                    <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--gold)] font-bold text-lg font-[family-name:var(--font-cinzel)]">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-xl font-bold text-royal font-[family-name:var(--font-cinzel)] tracking-tight">
                          {chapter.title}
                        </h3>
                        {dateRange && (
                          <Badge variant="secondary" className="gap-1.5 h-auto py-1 px-2.5 rounded-lg bg-[var(--gold)]/5 text-[var(--gold)] border-none text-[11px] font-semibold">
                            <Calendar className="w-3 h-3" />
                            {dateRange}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-ink-muted line-clamp-2">{chapter.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                          {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink-muted hover:text-[var(--royal)] hover:bg-[var(--royal)]/5 rounded-xl"
                            onClick={(e) => { e.stopPropagation(); setEditingChapter(chapter) }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-ink-muted hover:text-red-500 hover:bg-red-50 rounded-xl"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(chapter) }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <ChevronRight className={`w-5 h-5 text-ink-muted/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded: entries + add */}
                {isExpanded && (
                  <div className="border-t border-neutral-faint bg-neutral-faint/50">
                    {/* Existing entries */}
                    {entryCount > 0 && (
                      <div className="px-6 md:px-8 py-4 space-y-2">
                        {chapter.entryRefs.map((ref) => {
                          const Icon = ENTRY_ICONS[ref.collection] || FileText
                          return (
                            <div
                              key={`${ref.collection}:${ref.docId}`}
                              className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-white transition-colors group"
                            >
                              <GripVertical className="w-4 h-4 text-white/70 group-hover:text-ink-muted" />
                              <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/5 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-[var(--gold)]/60" />
                              </div>
                              <span className="flex-1 text-sm text-ink font-medium truncate">{ref.title}</span>
                              <Badge variant="outline" className="text-[10px] text-ink-muted border-neutral-border rounded-md">
                                {ref.collection.replace('-', ' ')}
                              </Badge>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-ink-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveEntry(chapter.id, ref.docId)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add entries section — only for editors */}
                    {canEdit && <div className="px-6 md:px-8 py-4 border-t border-neutral-faint">
                      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-[0.15em] mb-3">
                        Add entries to this chapter
                      </p>
                      {availableEntries.length === 0 ? (
                        <p className="text-sm text-ink-muted py-2">
                          No unassigned entries available. Create new entries in Soul Log or Memories first.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
                          {availableEntries.slice(0, 10).map((entry) => {
                            const Icon = ENTRY_ICONS[entry.collection] || FileText
                            return (
                              <button
                                key={`${entry.collection}:${entry.docId}`}
                                type="button"
                                onClick={() => handleAddEntry(chapter.id, {
                                  collection: entry.collection,
                                  docId: entry.docId,
                                  title: entry.title,
                                  addedAt: entry.addedAt,
                                })}
                                className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-dashed border-[var(--royal)]/15 hover:border-[var(--royal)]/40 hover:bg-[var(--royal)]/5 transition-all text-left cursor-pointer"
                              >
                                <Icon className="w-4 h-4 text-[var(--gold)]/40" />
                                <span className="flex-1 text-sm text-ink-muted truncate">{entry.label}</span>
                                <Plus className="w-4 h-4 text-[var(--gold)]/30" />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Link back to Legacy Timeline */}
      {chapters.length > 0 && (
        <div className="text-center pt-4">
          <Link
            to="/estates/$estateId/dashboard"
            params={{ estateId }}
            className="text-sm font-medium text-[var(--royal)] hover:text-[var(--royal-blue)] no-underline"
          >
            View Legacy Timeline <ChevronRight className="inline w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Chapter Form Dialog ──────────────────────────────────────────────────────

function ChapterFormDialog({
  open,
  onOpenChange,
  chapter,
  estateId,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapter: LifeChapter | null
  estateId: string
  onSubmit: (data: { title: string; description: string; dateFrom: string; dateTo: string; coverImageUrl?: string }) => void
}) {
  // Remount the inner fields on every (re)open and whenever the chapter being
  // edited changes, so the form's useState initializers re-seed from the current
  // chapter. The key-reset pattern replaces a setState-in-effect: it guarantees
  // fresh fields when opening the dialog for a different chapter, switching
  // create<->edit, or reopening the same chapter after a partial edit — without
  // cascading renders. Identical observable behavior, no stale fields.
  const resetKey = `${chapter?.id || 'new'}-${open ? 'open' : 'closed'}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ChapterFormFields
          key={resetKey}
          chapter={chapter}
          estateId={estateId}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  )
}

function ChapterFormFields({
  chapter,
  estateId,
  onOpenChange,
  onSubmit,
}: {
  chapter: LifeChapter | null
  estateId: string
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { title: string; description: string; dateFrom: string; dateTo: string; coverImageUrl?: string }) => void
}) {
  const [title, setTitle] = useState(chapter?.title ?? '')
  const [description, setDescription] = useState(chapter?.description ?? '')
  const [dateFrom, setDateFrom] = useState(chapter?.dateFrom ?? '')
  const [dateTo, setDateTo] = useState(chapter?.dateTo ?? '')
  const [coverPreview, setCoverPreview] = useState<string>(chapter?.coverImageUrl ?? '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCoverSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return
    setUploading(true)

    let coverImageUrl: string | undefined
    if (coverFile) {
      try {
        const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
          estateId,
          fileName: `chapter-cover-${Date.now()}.${coverFile.name.split('.').pop()}`,
          contentType: coverFile.type,
        })
        if (uploadUrl) {
          const resp = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': coverFile.type },
            body: coverFile,
          })
          if (!resp.ok) throw new Error('Upload failed')
        }
        coverImageUrl = finalUrl || undefined
      } catch {
        toast.error('Failed to upload cover image')
        setUploading(false)
        return
      }
    }

    setUploading(false)
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      dateFrom,
      dateTo,
      coverImageUrl,
    })
  }, [title, description, dateFrom, dateTo, coverFile, estateId, onSubmit])

  return (
    <DialogContent className="rounded-3xl border-neutral-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-[family-name:var(--font-cinzel)]">
            {chapter ? 'Edit Chapter' : 'New Life Chapter'}
          </DialogTitle>
          <DialogDescription>
            {chapter
              ? 'Update the details of this chapter.'
              : 'Create a chapter to organize your life story. You can add entries after.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-ink">
              Cover Image (optional)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
              aria-label="Upload cover image"
            />
            {coverPreview ? (
              <div className="relative h-32 rounded-xl overflow-hidden border border-neutral-border">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  onClick={() => { setCoverPreview(''); setCoverFile(null) }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-[var(--royal)]/15 hover:border-[var(--royal)]/30 bg-neutral-faint/50 flex items-center justify-center gap-2 text-sm text-[var(--royal)]/50 hover:text-[var(--royal)]/80 transition-colors cursor-pointer"
              >
                <ImagePlus className="w-5 h-5" />
                Choose a cover photo
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter-title" className="text-sm font-semibold text-ink">
              Chapter Title
            </Label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Growing Up in Chicago"
              className="rounded-xl border-neutral-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapter-desc" className="text-sm font-semibold text-ink">
              Description
            </Label>
            <Textarea
              id="chapter-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this chapter of your life mean to you?"
              className="rounded-xl border-neutral-border min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-sm font-semibold text-ink">
                From
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border-neutral-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-sm font-semibold text-ink">
                To
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border-neutral-border"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || uploading}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white rounded-xl px-8 gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading cover...
              </>
            ) : chapter ? 'Save Changes' : 'Create Chapter'}
          </Button>
        </DialogFooter>
      </DialogContent>
  )
}
