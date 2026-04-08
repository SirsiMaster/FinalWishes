/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useMemo, useCallback } from 'react'
// YouTube embed via native iframe — zero bundle cost (no react-player)
import { useCollection } from '../lib/firestore'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export const Route = createFileRoute('/estates/$estateId/memoirs')({
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
  const estateId = useMemo(() => (routeId === 'lockhart' ? 'estate_lockhart' : routeId), [routeId])

  const { data: firestoreMemoirs, loading: isLoading } = useCollection<Record<string, string>>(
    `estates/${estateId}/memoirs`,
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'file' | 'youtube'>('file')
  const [uploading, setUploading] = useState(false)
  const [selectedMemoir, setSelectedMemoir] = useState<Memoir | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Memoir | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        setUploading(true)
        const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
          estateId,
          fileName: file.name,
          contentType: file.type,
        })

        if (uploadUrl) {
          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          if (!response.ok) throw new Error('Failed to upload file')
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
        alert('Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [estateId, user],
  )

  // ─── YouTube Link Save ────────────────────────────────────────────────

  const handleYouTubeSave = useCallback(
    async (title: string, youtubeUrl: string, visibility: string) => {
      try {
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
        alert('Failed to save YouTube link.')
      } finally {
        setUploading(false)
      }
    },
    [estateId, user],
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
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#133378]/50 uppercase tracking-[0.2em]">
            Loading memories...
          </span>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen">
      {/* Cinema Viewer */}
      {selectedMemoir && (
        <CinemaViewer
          memoir={selectedMemoir}
          onClose={() => setSelectedMemoir(null)}
          onDelete={() => setDeleteTarget(selectedMemoir)}
        />
      )}

      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-[#133378]/10 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#133378]/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-[#133378]/20" />
            <span>Estate Heritage Vault</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">
            Life Stories & Memories
          </h2>
          <p className="text-[#133378]/50 text-lg font-medium max-w-2xl leading-relaxed">
            Preserve your legacy with video recordings, YouTube memorials, and photo collections for future generations.
          </p>
        </div>
        <button
          onClick={() => {
            setModalMode('file')
            setModalOpen(true)
          }}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] transition-all shadow-lg flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Memory
        </button>
      </div>

      {/* Video Gallery */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-[#133378]/40 uppercase tracking-[0.3em]">Video Memorials</h3>
          <div className="flex-1 h-px bg-[#133378]/5" />
          <button
            onClick={() => {
              setModalMode('youtube')
              setModalOpen(true)
            }}
            className="text-[11px] font-bold text-[#C8A951] hover:text-[#133378] uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
            </svg>
            Add YouTube Link
          </button>
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
          <h3 className="text-sm font-bold text-[#133378]/40 uppercase tracking-[0.3em]">Photo Archives</h3>
          <div className="flex-1 h-px bg-[#133378]/5" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
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
      {modalOpen && (
        <UploadModal
          mode={modalMode}
          uploading={uploading}
          fileInputRef={fileInputRef}
          onClose={() => setModalOpen(false)}
          onFileUpload={handleFileUpload}
          onYouTubeSave={handleYouTubeSave}
          onModeChange={setModalMode}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-[2rem] max-w-md w-full mx-4 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6 mx-auto">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] text-center mb-2">Delete Memory</h3>
            <p className="text-[14px] text-[#133378]/50 text-center mb-8">
              <strong className="text-[#0F172A]">{deleteTarget.title}</strong> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-[#133378]/10 text-[#0F172A] font-bold text-[13px] hover:bg-[#F8FAFC] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cinema Viewer (Full-screen) ──────────────────────────────────────────

function CinemaViewer({
  memoir,
  onClose,
  onDelete,
}: {
  memoir: Memoir
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0F172A]/95 backdrop-blur-xl p-8"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-[3rem] overflow-hidden shadow-2xl max-w-[1200px] w-full border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {memoir.type === 'youtube' && memoir.youtubeUrl ? (
            <YouTubeEmbed url={memoir.youtubeUrl} autoplay />
          ) : memoir.type === 'video' ? (
            <video src={memoir.url} controls autoPlay className="max-w-full max-h-full" />
          ) : (
            <img src={memoir.url} className="max-w-full max-h-full object-contain" alt={memoir.title} />
          )}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#0F172A] transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-12 bg-white flex justify-between items-center">
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-[#0F172A] tracking-tight">{memoir.title}</h3>
            <div className="flex items-center gap-4 text-[#133378]/40 font-medium">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#133378]">
                {memoir.type === 'youtube' ? 'YouTube' : memoir.type}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#133378]/10" />
              <span className="text-sm">{memoir.dateAdded}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDelete}
              className="px-6 py-3 rounded-xl border border-red-200 text-red-500 font-bold text-[12px] hover:bg-red-50 transition-all"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-[#F8FAFC] hover:bg-[#133378]/5 rounded-xl text-[#0F172A] font-bold text-[13px] transition-all border border-[#133378]/10"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────

function UploadModal({
  mode,
  uploading,
  fileInputRef,
  onClose,
  onFileUpload,
  onYouTubeSave,
  onModeChange,
}: {
  mode: 'file' | 'youtube'
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
  onFileUpload: (title: string, type: string, visibility: string, file: File) => void
  onYouTubeSave: (title: string, youtubeUrl: string, visibility: string) => void
  onModeChange: (mode: 'file' | 'youtube') => void
}) {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full border border-[#133378]/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-3xl font-bold text-[#0F172A] mb-3 tracking-tight">Add New Memory</h3>
        <p className="text-[#133378]/40 font-medium text-sm mb-8">
          Upload a file or paste a YouTube link to preserve a memory.
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8 bg-[#F8FAFC] p-1.5 rounded-2xl">
          <button
            onClick={() => onModeChange('file')}
            className={`flex-1 py-3 rounded-xl text-[12px] font-bold transition-all ${
              mode === 'file' ? 'bg-[#133378] text-white shadow-md' : 'text-[#133378]/50 hover:text-[#133378]'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => onModeChange('youtube')}
            className={`flex-1 py-3 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'youtube' ? 'bg-[#133378] text-white shadow-md' : 'text-[#133378]/50 hover:text-[#133378]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
            </svg>
            YouTube Link
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const title = formData.get('title') as string
            const visibility = (formData.get('visibility') as string) || 'private'

            if (mode === 'youtube') {
              if (!youtubeUrl) { alert('Please paste a YouTube URL.'); return }
              onYouTubeSave(title, youtubeUrl, visibility)
            } else {
              const file = fileInputRef.current?.files?.[0]
              const type = (formData.get('type') as string) || 'photo'
              if (!file) { alert('Please select a file.'); return }
              onFileUpload(title, type, visibility, file)
            }
          }}
          className="space-y-8"
        >
          {/* Title */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Title</label>
            <input
              name="title"
              required
              className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
              placeholder="e.g. Family Reunion 2025"
            />
          </div>

          {mode === 'youtube' ? (
            /* YouTube URL Input */
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">YouTube URL</label>
              <input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] focus:ring-4 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-[#133378]/20"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {youtubeUrl && extractYouTubeId(youtubeUrl) && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-[#133378]/10">
                  <img
                    src={`https://img.youtube.com/vi/${extractYouTubeId(youtubeUrl)}/hqdefault.jpg`}
                    alt="YouTube preview"
                    className="w-full h-[200px] object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            /* File Upload */
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Media Type</label>
                <select
                  name="type"
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none transition-all"
                >
                  <option value="video">Video</option>
                  <option value="photo">Photo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-[#133378]/15 rounded-[2rem] flex flex-col items-center justify-center bg-[#F8FAFC] hover:bg-white hover:border-[#133378]/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-[#133378]/10 flex items-center justify-center mb-3 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500 text-[#133378]/30">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.2em] group-hover:text-[#133378]">
                    {selectedFileName || 'Select Media File'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="video/*,image/*"
                    onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || '')}
                  />
                </div>
              </div>
            </>
          )}

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[#133378]/40 uppercase tracking-widest">Visibility</label>
            <select
              name="visibility"
              className="w-full px-6 py-4 rounded-2xl border border-[#133378]/10 bg-[#F8FAFC] focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none transition-all"
            >
              <option value="private">Private — Only You</option>
              <option value="shared">Shared with Heirs</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-[#133378]/10 font-bold text-[#133378]/40 text-sm hover:bg-[#F8FAFC] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-4 rounded-2xl bg-[#133378] text-white font-bold text-sm transition-all hover:bg-[#1E3A5F] shadow-lg disabled:opacity-50"
            >
              {uploading ? 'Saving...' : mode === 'youtube' ? 'Save YouTube Link' : 'Upload & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="bg-white rounded-[2.5rem] border border-[#133378]/10 overflow-hidden shadow-sm group hover:border-[#133378]/20 hover:shadow-xl transition-all relative">
      <div className="aspect-video bg-[#0F172A] relative overflow-hidden cursor-pointer" onClick={onClick}>
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
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#133378] transition-all duration-500">
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
          <div className="absolute top-4 left-4 px-3 py-1 bg-red-600 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
            YouTube
          </div>
        )}
      </div>
      <div className="p-8 space-y-3">
        <h4 className="font-bold text-[#0F172A] text-lg tracking-tight group-hover:text-[#133378] transition-colors cursor-pointer" onClick={onClick}>
          {memoir.title}
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-widest">{memoir.dateAdded}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#133378]/15 hover:text-red-500 transition-all"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
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
    <div className="bg-white rounded-[2rem] border border-[#133378]/10 overflow-hidden shadow-sm group hover:border-[#133378]/20 hover:shadow-xl transition-all relative">
      <div className="aspect-square bg-[#F8FAFC] relative overflow-hidden cursor-pointer" onClick={onClick}>
        {memoir.url ? (
          <img
            src={memoir.url}
            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[1500ms]"
            alt={memoir.title}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#133378]/10">
            <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-6 border-t border-[#133378]/5 flex items-center justify-between">
        <div className="min-w-0">
          <h4 className="font-bold text-[#0F172A] text-sm truncate group-hover:text-[#133378] transition-colors cursor-pointer" onClick={onClick}>
            {memoir.title}
          </h4>
          <p className="text-[10px] font-bold text-[#133378]/20 uppercase tracking-widest mt-0.5">{memoir.dateAdded}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#133378]/15 hover:text-red-500 transition-all flex-shrink-0"
          title="Delete"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Upload Placeholder ─────────────────────────────────────────────────────

function UploadPlaceholder({ type, onClick }: { type: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[2.5rem] border-2 border-dashed border-[#133378]/10 flex flex-col items-center justify-center gap-5 text-[#133378]/20 hover:border-[#133378]/30 hover:bg-[#133378]/[0.02] hover:text-[#133378] transition-all ${
        type === 'video' ? 'aspect-video' : 'aspect-square'
      } group shadow-sm`}
    >
      <div className="w-14 h-14 rounded-full border border-[#133378]/10 flex items-center justify-center group-hover:bg-[#133378] group-hover:text-white transition-all duration-500">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Add {type}</span>
    </button>
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
