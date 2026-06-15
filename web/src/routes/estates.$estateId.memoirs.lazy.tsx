/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams, Link } from '@tanstack/react-router'
import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
// YouTube embed via native iframe — zero bundle cost (no react-player)
import { useCollection } from '../lib/firestore'
import { estateClient, API_BASE } from '../lib/client'
import { useAuth } from '../lib/auth'
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db, auth as firebaseAuth } from '../lib/firebase'
import { useTierGating, tierUpgradeMessage } from '../lib/tier-gating'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CameraCaptureButton } from '@/components/ui/camera-capture-button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogMedia,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SectionHeader } from '@/components/estate/SectionHeader'

export const Route = createLazyFileRoute('/estates/$estateId/memoirs')({
  component: MemoirsPage,
})

// ─── Types ──────────────────────────────────────────────────────────────────

interface Memoir {
  id: string
  title: string
  type: 'video' | 'photo' | 'youtube'
  url: string
  youtubeUrl?: string
  dateAdded: string
  visibility: string
  uploadedBy?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

function MemoirsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/memoirs' })
  const { user } = useAuth()
  const estateId = routeId
  const { usage: tierUsage } = useTierGating(estateId)

  const { data: firestoreMemoirs, loading: isLoading } = useCollection<Record<string, string>>(
    `estates/${estateId}/memoirs`,
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'file' | 'youtube'>('file')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedMemoir, setSelectedMemoir] = useState<Memoir | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Memoir | null>(null)
  const [editTarget, setEditTarget] = useState<Memoir | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editVisibility, setEditVisibility] = useState('private')
  const [savingEdit, setSavingEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openEdit = useCallback((m: Memoir) => {
    setEditTitle(m.title)
    setEditVisibility(m.visibility || 'private')
    setEditTarget(m)
    setSelectedMemoir(null)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editTarget) return
    setSavingEdit(true)
    try {
      await updateDoc(doc(db, `estates/${estateId}/memoirs/${editTarget.id}`), {
        title: editTitle.trim() || 'Untitled',
        visibility: editVisibility,
        updatedAt: serverTimestamp(),
      })
      toast.success('Memory updated')
      setEditTarget(null)
    } catch (e) {
      console.error('Update memoir failed:', e)
      toast.error('Could not update the memory. Please try again.')
    } finally {
      setSavingEdit(false)
    }
  }, [editTarget, editTitle, editVisibility, estateId])

  // ─── Map Firestore to local shape ─────────────────────────────────────

  const memoirs: Memoir[] = useMemo(
    () =>
      firestoreMemoirs.map((m) => ({
        id: m.id,
        title: m.title || 'Untitled',
        type: (m.type as Memoir['type']) || 'photo',
        url: m.url || '',
        youtubeUrl: m.youtubeUrl || m.youtube_url || '',
        dateAdded: m.date_added || m.dateAdded || '',
        visibility: m.visibility || 'private',
        uploadedBy: m.uploadedBy || m.uploaded_by || '',
      })),
    [firestoreMemoirs],
  )

  const videos = memoirs.filter((m) => m.type === 'video' || m.type === 'youtube')
  const photos = memoirs.filter((m) => m.type === 'photo')

  // ─── File Upload ──────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (title: string, type: string, visibility: string, file: File) => {
      try {
        if (tierUsage && !tierUsage.canUploadMedia) {
          toast.error(tierUpgradeMessage(tierUsage, 'media') || 'Upload limit reached. Please upgrade your plan.')
          return
        }
        setUploading(true)
        const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
          estateId,
          fileName: file.name,
          contentType: file.type,
        })

        if (uploadUrl) {
          setUploadProgress(0)
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', uploadUrl)
            xhr.setRequestHeader('Content-Type', file.type)
            // Matches the server-signed X-Goog-Content-Length-Range constraint (100 MB cap)
            xhr.setRequestHeader('X-Goog-Content-Length-Range', '0,104857600')

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                setUploadProgress(Math.round((e.loaded / e.total) * 100))
              }
            })

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve()
              } else {
                reject(new Error('Failed to upload file'))
              }
            })

            xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
            xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

            xhr.send(file)
          })
        }

        await addDoc(collection(db, `estates/${estateId}/memoirs`), {
          title,
          type,
          url: finalUrl || '',
          visibility,
          uploadedBy: user?.uid || 'unknown',
          date_added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAt: serverTimestamp(),
        })

        setModalOpen(false)
      } catch (err) {
        console.error('Upload failed:', err)
        toast.error('Upload failed. Please try again.')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [estateId, user, tierUsage],
  )

  // ─── YouTube Link Save ────────────────────────────────────────────────

  const handleYouTubeSave = useCallback(
    async (title: string, youtubeUrl: string, visibility: string) => {
      try {
        if (tierUsage && !tierUsage.canUploadVideo) {
          toast.error(tierUpgradeMessage(tierUsage, 'video') || 'Video uploads require a plan upgrade.')
          return
        }
        setUploading(true)

        await addDoc(collection(db, `estates/${estateId}/memoirs`), {
          title,
          type: 'youtube',
          url: '',
          youtubeUrl,
          visibility,
          uploadedBy: user?.uid || 'unknown',
          date_added: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAt: serverTimestamp(),
        })

        setModalOpen(false)
      } catch (err) {
        console.error('Save failed:', err)
        toast.error('Failed to save YouTube link.')
      } finally {
        setUploading(false)
      }
    },
    [estateId, user, tierUsage],
  )

  // ─── YouTube Direct Upload ────────────────────────────────────────────

  const handleYouTubeUpload = useCallback(
    async (title: string, description: string, file: File) => {
      try {
        setUploading(true)
        setUploadProgress(0)

        const token = await firebaseAuth.currentUser?.getIdToken()
        if (!token) {
          toast.error('You must be signed in to upload.')
          return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('estateId', estateId)

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', `${API_BASE}/api/v1/memoirs/upload-video`)
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              let msg = 'Upload failed'
              try {
                const resp = JSON.parse(xhr.responseText)
                msg = resp?.error?.message || msg
              } catch { /* ignore parse errors */ }
              reject(new Error(msg))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

          xhr.send(formData)
        })

        setModalOpen(false)
      } catch (err) {
        console.error('YouTube upload failed:', err)
        toast.error(err instanceof Error ? err.message : 'YouTube upload failed. Please try again.')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [estateId],
  )

  // ─── Delete ───────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (memoir: Memoir) => {
      try {
        await deleteDoc(doc(db, `estates/${estateId}/memoirs`, memoir.id))
        setDeleteTarget(null)
        if (selectedMemoir?.id === memoir.id) setSelectedMemoir(null)
      } catch (err) {
        console.error('Delete failed:', err)
      }
    },
    [estateId, selectedMemoir],
  )

  // ─── Loading ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[var(--royal)]/50 uppercase tracking-[0.2em]">
            Loading memories...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 bg-white min-h-screen">
      {/* Cinema Viewer */}
      <CinemaViewer
        memoir={selectedMemoir}
        open={!!selectedMemoir}
        onOpenChange={(open) => { if (!open) setSelectedMemoir(null) }}
        onDelete={() => { if (selectedMemoir) setDeleteTarget(selectedMemoir) }}
        onEdit={() => { if (selectedMemoir) openEdit(selectedMemoir) }}
      />

      <SectionHeader
        section="memories"
        title="Life Stories & Memories"
        subtitle="Preserve your legacy with video recordings, YouTube memorials, and photo collections for future generations."
        action={
          <Button
            onClick={() => {
              setModalMode('file')
              setModalOpen(true)
            }}
            disabled={tierUsage ? !tierUsage.canUploadMedia : false}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-10 py-5 rounded-2xl font-bold text-[14px] h-auto shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Memory
          </Button>
        }
      />

      {/* Tier Limit Banner */}
      {tierUsage && (!tierUsage.canUploadMedia || !tierUsage.canUploadVideo) && (
        <div className="bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--gold)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {!tierUsage.canUploadMedia
                ? tierUpgradeMessage(tierUsage, 'media')
                : tierUpgradeMessage(tierUsage, 'video')}
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

      {/* Video Gallery */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-[var(--royal)]/40 uppercase tracking-[0.3em]">Video Memorials</h3>
          <div className="flex-1 h-px bg-[var(--royal)]/5" />
          <Button
            variant="ghost"
            onClick={() => {
              setModalMode('youtube')
              setModalOpen(true)
            }}
            disabled={tierUsage ? !tierUsage.canUploadVideo : false}
            className="text-[11px] font-bold text-[var(--gold)] hover:text-[var(--royal)] uppercase tracking-wider h-auto px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
            </svg>
            Add YouTube Link
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              memoir={v}
              onClick={() => setSelectedMemoir(v)}
              onDelete={() => setDeleteTarget(v)}
            />
          ))}
          {videos.length === 0 && (
            <UploadPlaceholder type="video" onClick={() => { setModalMode('file'); setModalOpen(true) }} />
          )}
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-[var(--royal)]/40 uppercase tracking-[0.3em]">Photo Archives</h3>
          <div className="flex-1 h-px bg-[var(--royal)]/5" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              memoir={p}
              onClick={() => setSelectedMemoir(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
          {photos.length === 0 && (
            <UploadPlaceholder type="photo" onClick={() => { setModalMode('file'); setModalOpen(true) }} />
          )}
        </div>
      </section>

      {/* Upload Modal */}
      <UploadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        uploading={uploading}
        uploadProgress={uploadProgress}
        fileInputRef={fileInputRef}
        onFileUpload={handleFileUpload}
        onYouTubeSave={handleYouTubeSave}
        onYouTubeUpload={handleYouTubeUpload}
        onModeChange={setModalMode}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="max-w-md rounded-[2rem] p-8">
          <AlertDialogHeader>
            <AlertDialogMedia className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 mx-auto">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle className="text-xl font-bold text-royal text-center">
              Delete Memory
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-[var(--royal)]/50 text-center">
              <strong className="text-ink">{deleteTarget?.title}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:flex-row">
            <AlertDialogCancel
              variant="outline"
              className="flex-1 py-3 rounded-xl border-[var(--royal)]/10 text-ink font-bold text-[13px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px]"
              onClick={() => { if (deleteTarget) handleDelete(deleteTarget) }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Memory */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open && !savingEdit) setEditTarget(null) }}>
        <DialogContent className="max-w-md rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-royal">Edit Memory</DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--royal)]/50">
              Update the title and who can see this memory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="memoir-edit-title" className="text-[12px] font-bold text-ink uppercase tracking-wide">Title</Label>
              <Input
                id="memoir-edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Untitled"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-ink uppercase tracking-wide">Visibility</Label>
              <Select value={editVisibility} onValueChange={setEditVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={savingEdit}
              className="flex-1 py-3 rounded-xl border-[var(--royal)]/10 text-ink font-bold text-[13px] h-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex-1 py-3 rounded-xl bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white font-bold text-[13px] h-auto"
            >
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Cinema Viewer (Full-screen Dialog) ──────────────────────────────────

function CinemaViewer({
  memoir,
  open,
  onOpenChange,
  onDelete,
  onEdit,
}: {
  memoir: Memoir | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[1200px] sm:max-w-[1200px] rounded-[3rem] overflow-hidden p-0 border-white/10 bg-white"
      >
        {memoir && (
          <>
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {memoir.type === 'youtube' && memoir.youtubeUrl ? (
                <YouTubeEmbed url={memoir.youtubeUrl} autoplay />
              ) : memoir.type === 'video' ? (
                <video src={memoir.url} controls autoPlay className="max-w-full max-h-full" aria-label={memoir.title}>
                  <track kind="captions" />
                </video>
              ) : (
                <img src={memoir.url} className="max-w-full max-h-full object-contain" alt={memoir.title} />
              )}
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="p-12 bg-white flex justify-between items-center">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-royal tracking-tight">{memoir.title}</h3>
                <div className="flex items-center gap-4 text-[var(--royal)]/40 font-medium">
                  <Badge className="text-[11px] font-bold uppercase tracking-widest bg-[var(--royal)]/10 text-[var(--royal)] border-none">
                    {memoir.type === 'youtube' ? 'YouTube' : memoir.type}
                  </Badge>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--royal)]/10" />
                  <span className="text-sm">{memoir.dateAdded}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="px-6 py-3 rounded-xl border-[var(--royal)]/15 text-[var(--royal)] font-bold text-[12px] hover:bg-[var(--royal)]/5 h-auto"
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={onDelete}
                  className="px-6 py-3 rounded-xl border-red-200 text-red-500 font-bold text-[12px] hover:bg-red-50 h-auto"
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-8 py-3 bg-neutral-faint hover:bg-[var(--royal)]/5 rounded-xl text-ink font-bold text-[13px] border-[var(--royal)]/10 h-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────

function UploadModal({
  open,
  onOpenChange,
  mode,
  uploading,
  uploadProgress,
  fileInputRef,
  onFileUpload,
  onYouTubeSave,
  onYouTubeUpload,
  onModeChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'file' | 'youtube'
  uploading: boolean
  uploadProgress: number
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileUpload: (title: string, type: string, visibility: string, file: File) => void
  onYouTubeSave: (title: string, youtubeUrl: string, visibility: string) => void
  onYouTubeUpload: (title: string, description: string, file: File) => void
  onModeChange: (mode: 'file' | 'youtube') => void
}) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [mediaType, setMediaType] = useState('video')
  const [visibility, setVisibility] = useState('private')
  const [uploadDest, setUploadDest] = useState<'cloud' | 'youtube'>('cloud')
  const [description, setDescription] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (!f) return
    // Assign file to the file input ref via DataTransfer
    const dt = new DataTransfer()
    dt.items.add(f)
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files
    }
    setSelectedFileName(f.name)
    if (f.type.startsWith('video/')) setMediaType('video')
    else if (f.type.startsWith('image/')) setMediaType('photo')
  }, [fileInputRef])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [], 'image/*': [] },
    multiple: false,
    noClick: false,
  })

  // Detect if the selected file is a video for showing YouTube upload option
  const isVideoFile = mediaType === 'video'
  const maxSizeMB = uploadDest === 'youtube' ? 256 : 50

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-xl rounded-[3rem] p-12 border-[var(--royal)]/10">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-royal tracking-tight">
            Add New Memory
          </DialogTitle>
          <DialogDescription className="text-[var(--royal)]/40 font-medium text-sm">
            Upload a file or paste a YouTube link to preserve a memory.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs */}
        <Tabs
          value={mode}
          onValueChange={(val) => onModeChange(val as 'file' | 'youtube')}
          className="mt-2"
        >
          <TabsList className="w-full bg-neutral-faint p-1.5 rounded-2xl h-auto">
            <TabsTrigger
              value="file"
              className="flex-1 py-3 rounded-xl text-[12px] font-bold data-active:bg-[var(--royal)] data-active:text-white data-active:shadow-md text-[var(--royal)]/50 hover:text-[var(--royal)]"
            >
              Upload File
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="flex-1 py-3 rounded-xl text-[12px] font-bold data-active:bg-[var(--royal)] data-active:text-white data-active:shadow-md text-[var(--royal)]/50 hover:text-[var(--royal)]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
              </svg>
              YouTube Link
            </TabsTrigger>
          </TabsList>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const title = formData.get('title') as string

              if (mode === 'youtube') {
                if (!youtubeUrl) { toast.error('Please paste a YouTube URL.'); return }
                onYouTubeSave(title, youtubeUrl, visibility)
              } else {
                const file = fileInputRef.current?.files?.[0]
                if (!file) { toast.error('Please select a file.'); return }

                // Route video files to YouTube upload when that destination is selected
                if (uploadDest === 'youtube' && file.type.startsWith('video/')) {
                  if (file.size > 256 * 1024 * 1024) {
                    toast.error('File exceeds the 256MB YouTube upload limit.')
                    return
                  }
                  onYouTubeUpload(title, description, file)
                } else {
                  if (file.size > 50 * 1024 * 1024) {
                    toast.error('File exceeds the 50MB Cloud Storage upload limit.')
                    return
                  }
                  onFileUpload(title, mediaType, visibility, file)
                }
              }
            }}
            className="space-y-8 mt-4"
          >
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                Title
              </Label>
              <Input
                name="title"
                required
                className="w-full px-6 py-4 h-auto rounded-2xl border-[var(--royal)]/10 bg-neutral-faint focus:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/5 font-bold text-ink placeholder:text-[var(--royal)]/20"
                placeholder="e.g. Family Reunion 2025"
              />
            </div>

            <TabsContent value="youtube" className="mt-0 space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                YouTube URL
              </Label>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-6 py-4 h-auto rounded-2xl border-[var(--royal)]/10 bg-neutral-faint focus:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/5 font-bold text-ink placeholder:text-[var(--royal)]/20"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {youtubeUrl && extractYouTubeId(youtubeUrl) && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-[var(--royal)]/10">
                  <img
                    src={`https://img.youtube.com/vi/${extractYouTubeId(youtubeUrl)}/hqdefault.jpg`}
                    alt="YouTube preview"
                    className="w-full h-[200px] object-cover"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="file" className="mt-0 space-y-8">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                  Media Type
                </Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-[var(--royal)]/10 bg-neutral-faint font-bold text-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                  File
                </Label>
                <div
                  {...getRootProps()}
                  aria-label="Upload a memoir file"
                  className={`w-full h-36 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer group ${
                    isDragActive
                      ? 'border-[var(--royal)] bg-[var(--royal)]/5'
                      : 'border-[var(--royal)]/15 bg-neutral-faint hover:bg-white hover:border-[var(--royal)]/30'
                  }`}
                >
                  <input {...getInputProps()} aria-label="Upload a memoir file" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="video/*,image/*"
                    aria-label="Upload a memoir file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      setSelectedFileName(f?.name || '')
                      if (f?.type.startsWith('video/')) setMediaType('video')
                      else if (f?.type.startsWith('image/')) setMediaType('photo')
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-white border border-[var(--royal)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--royal)] group-hover:text-white transition-all duration-500 text-[var(--royal)]/30">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--royal)]/30 uppercase tracking-[0.2em] group-hover:text-[var(--royal)]">
                    {isDragActive ? 'Drop file here' : selectedFileName || 'Drag & drop or click to select'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-center">
                  <CameraCaptureButton onFile={(f) => onDrop([f])} />
                </div>
              </div>

              {/* Upload Destination — only shown for video files */}
              {isVideoFile && selectedFileName && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                    Upload Destination
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUploadDest('cloud')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        uploadDest === 'cloud'
                          ? 'border-[var(--royal)] bg-[var(--royal)]/5'
                          : 'border-[var(--royal)]/10 bg-neutral-faint hover:border-[var(--royal)]/20'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--royal)]/60" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                      </svg>
                      <span className="text-[11px] font-bold text-ink uppercase tracking-wider">Cloud Storage</span>
                      <span className="text-[10px] text-[var(--royal)]/40 font-medium">Max 50MB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadDest('youtube')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        uploadDest === 'youtube'
                          ? 'border-red-500 bg-red-50'
                          : 'border-[var(--royal)]/10 bg-neutral-faint hover:border-red-300'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                        <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
                      </svg>
                      <span className="text-[11px] font-bold text-ink uppercase tracking-wider">YouTube</span>
                      <span className="text-[10px] text-[var(--royal)]/40 font-medium">Max 256MB &middot; Unlisted</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Description — shown when YouTube destination is selected */}
              {uploadDest === 'youtube' && isVideoFile && selectedFileName && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                    Description <span className="normal-case tracking-normal font-medium">(optional)</span>
                  </Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-6 py-4 h-auto rounded-2xl border-[var(--royal)]/10 bg-neutral-faint focus:bg-white focus-visible:border-[var(--royal)] focus-visible:ring-[var(--royal)]/5 font-bold text-ink placeholder:text-[var(--royal)]/20"
                    placeholder="A brief description for this video"
                  />
                </div>
              )}

              {/* File size limit hint */}
              {selectedFileName && (
                <p className="text-[10px] font-medium text-[var(--royal)]/30 text-center">
                  Maximum file size: {maxSizeMB}MB
                  {uploadDest === 'youtube' && isVideoFile && ' — Video will be uploaded as unlisted on YouTube'}
                </p>
              )}
            </TabsContent>

            {/* Visibility */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                Visibility
              </Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-full px-6 py-4 h-auto rounded-2xl border-[var(--royal)]/10 bg-neutral-faint font-bold text-ink">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — Only You</SelectItem>
                  <SelectItem value="shared">Shared with Heirs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--royal)]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--royal)] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadProgress === 100 && (
                  <p className="text-[10px] font-medium text-[var(--royal)]/40 text-center">
                    Processing...
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={uploading}
                className="flex-1 py-4 h-auto rounded-2xl border-[var(--royal)]/10 font-bold text-[var(--royal)]/40 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className={`flex-1 py-4 h-auto rounded-2xl text-white font-bold text-sm shadow-lg disabled:opacity-50 ${
                  mode === 'file' && uploadDest === 'youtube' && isVideoFile && selectedFileName
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[var(--royal)] hover:bg-[var(--royal-blue)]'
                }`}
              >
                {uploading
                  ? uploadProgress > 0
                    ? `Uploading ${uploadProgress}%`
                    : 'Saving...'
                  : mode === 'youtube'
                    ? 'Save YouTube Link'
                    : uploadDest === 'youtube' && isVideoFile && selectedFileName
                      ? 'Upload to YouTube'
                      : 'Upload & Save'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ─── Video Card ─────────────────────────────────────────────────────────────

function VideoCard({
  memoir,
  onClick,
  onDelete,
}: {
  memoir: Memoir
  onClick: () => void
  onDelete: () => void
}) {
  const isYouTube = memoir.type === 'youtube' && memoir.youtubeUrl

  return (
    <Card className="rounded-[2.5rem] border-[var(--royal)]/10 overflow-hidden shadow-sm group hover:border-[var(--royal)]/20 hover:shadow-xl transition-all relative p-0 gap-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Play ${memoir.title}`}
        className="block w-full aspect-video bg-royal relative overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--royal)] focus-visible:ring-offset-2"
      >
        {isYouTube && memoir.youtubeUrl ? (
          <YouTubeThumbnail url={memoir.youtubeUrl} />
        ) : memoir.url ? (
          <>
            <video
              src={`${memoir.url}#t=0.001`}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-[1500ms]"
              muted
              playsInline
              preload="metadata"
              aria-label={`${memoir.title} preview`}
            >
              <track kind="captions" />
            </video>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[var(--royal)] transition-all duration-500">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1">
                  <polygon points="5 3 19 12 5 21" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          </div>
        )}
        {isYouTube && (
          <Badge className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider border-none rounded-lg h-auto px-3 py-1">
            YouTube
          </Badge>
        )}
      </button>
      <CardContent className="p-8 space-y-3">
        <h4 className="font-bold text-royal text-lg tracking-tight group-hover:text-[var(--royal)] transition-colors">
          {memoir.title}
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-[var(--royal)]/30 uppercase tracking-widest">{memoir.dateAdded}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-[var(--royal)]/15 hover:text-red-500 hover:bg-red-50"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Photo Card ─────────────────────────────────────────────────────────────

function PhotoCard({
  memoir,
  onClick,
  onDelete,
}: {
  memoir: Memoir
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <Card className="rounded-[2rem] border-[var(--royal)]/10 overflow-hidden shadow-sm group hover:border-[var(--royal)]/20 hover:shadow-xl transition-all relative p-0 gap-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={`View ${memoir.title}`}
        className="block w-full aspect-square bg-neutral-faint relative overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--royal)] focus-visible:ring-offset-2"
      >
        {memoir.url ? (
          <img
            src={memoir.url}
            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[1500ms]"
            alt={memoir.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--royal)]/10">
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </button>
      <CardContent className="p-6 border-t border-[var(--royal)]/5 flex items-center justify-between">
        <div className="min-w-0">
          <h4 className="font-bold text-royal text-sm truncate group-hover:text-[var(--royal)] transition-colors">
            {memoir.title}
          </h4>
          <p className="text-[10px] font-bold text-[var(--royal)]/20 uppercase tracking-widest mt-0.5">{memoir.dateAdded}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-[var(--royal)]/15 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
          title="Delete"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Upload Placeholder ─────────────────────────────────────────────────────

function UploadPlaceholder({ type, onClick }: { type: string; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={`rounded-[2.5rem] border-2 border-dashed border-[var(--royal)]/10 flex flex-col items-center justify-center gap-5 text-[var(--royal)]/20 hover:border-[var(--royal)]/30 hover:bg-[var(--royal)]/[0.02] hover:text-[var(--royal)] transition-all ${
        type === 'video' ? 'aspect-video' : 'aspect-square'
      } group shadow-sm cursor-pointer p-0 bg-transparent ring-0`}
    >
      <div className="w-14 h-14 rounded-full border border-[var(--royal)]/10 flex items-center justify-center group-hover:bg-[var(--royal)] group-hover:text-white transition-all duration-500">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Add {type}</span>
    </Card>
  )
}

// ─── YouTube Helpers ──────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function YouTubeEmbed({ url, autoplay = false }: { url: string; autoplay?: boolean }) {
  const videoId = extractYouTubeId(url)
  if (!videoId) return <div className="w-full h-full bg-black flex items-center justify-center text-white/30">Invalid YouTube URL</div>

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?${autoplay ? 'autoplay=1&' : ''}modestbranding=1&rel=0`}
      className="w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title="YouTube video"
    />
  )
}

function YouTubeThumbnail({ url }: { url: string }) {
  const videoId = extractYouTubeId(url)
  if (!videoId) return null

  return (
    <>
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[1500ms]"
        alt="YouTube thumbnail"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center text-white group-hover:bg-red-600 transition-all duration-500">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        </div>
      </div>
    </>
  )
}
