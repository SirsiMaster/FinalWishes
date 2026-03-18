import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/memoirs')({
  component: MemoirsPage,
})

function MemoirsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/memoirs' });
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estateId, setEstateId ] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);
  const [selectedMemoir, setSelectedMemoir] = useState<any>(null);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

  const { data, isLoading } = useQuery({
    queryKey: ['memoirs', estateId],
    queryFn: () => estateClient.listMemoirs({ estateId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (vars: { title: string, type: string, file: File }) => {
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId: estateId,
        fileName: vars.file.name,
        contentType: vars.file.type
      });

      if (uploadUrl && !uploadUrl.includes('localhost')) {
         const response = await fetch(uploadUrl, {
           method: 'PUT',
           headers: { 'Content-Type': vars.file.type },
           body: vars.file,
         });
         if (!response.ok) throw new Error('Failed to upload file to storage');
      }

      return estateClient.uploadMemoir({
        estateId: estateId,
        title: vars.title,
        type: vars.type,
        url: finalUrl || `/memoirs/placeholder.${vars.type === 'video' ? 'mp4' : 'jpg'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoirs'] });
      setModalOpen(false);
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
      alert('Upload failed. Ensure Cloud Storage bucket is configured.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const memoirs = data?.memoirs || [];
  const videos = memoirs.filter(m => m.type === 'video');
  const photos = memoirs.filter(m => m.type === 'photo');

  return (
    <div className="max-w-[1440px] mx-auto p-12 space-y-16 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Viewer (Cinema Grade) ── */}
      {selectedMemoir && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0F172A]/95 backdrop-blur-xl p-8 animate-in fade-in duration-500"
          onClick={() => setSelectedMemoir(null)}
        >
          <div 
            className="relative bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-500 max-w-[1200px] w-full border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {selectedMemoir.type === 'video' ? (
                <video src={selectedMemoir.url} controls autoPlay className="max-w-full max-h-full" />
              ) : (
                <img src={selectedMemoir.url} className="max-w-full max-h-full object-contain" alt={selectedMemoir.title} />
              )}
              <button 
                onClick={() => setSelectedMemoir(null)}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-[#0F172A] transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-12 bg-white flex justify-between items-center group/viewer">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-[#0F172A] tracking-tight">{selectedMemoir.title}</h3>
                <div className="flex items-center gap-4 text-slate-400 font-medium">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#133378]">{selectedMemoir.type}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="text-sm">Added on {selectedMemoir.dateAdded}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMemoir(null)} className="px-8 py-4 bg-[#F8FAFC] hover:bg-slate-100 rounded-xl text-[#0F172A] font-bold text-sm transition-all border border-slate-100">
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex justify-between items-end border-b border-slate-50 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[11px] font-bold text-royal/40 uppercase tracking-[0.2em] mb-2">
            <div className="w-10 h-px bg-royal/20" />
            <span>Estate Heritage Vault</span>
          </div>
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] tracking-tight">Life Stories & Memories</h2>
          <p className="text-[#64748B] text-lg font-medium max-w-2xl leading-relaxed">
            Preserve your legacy with high-fidelity video recordings and photo collections for your future generations.
          </p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-10 py-5 rounded-2xl font-bold text-[14px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.1)] flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add to Vault
        </button>
      </div>

      {/* ── Video Gallery ── */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Cinematic Memoirs</h3>
           <div className="flex-1 h-px bg-slate-50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {videos.map(v => (
            <VideoCard key={v.id} memoir={v} onClick={() => setSelectedMemoir(v)} />
          ))}
          <UploadPlaceholder type="video" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* ── Photo Gallery ── */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Photo Archives</h3>
           <div className="flex-1 h-px bg-slate-50" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {photos.map(p => (
            <PhotoCard key={p.id} memoir={p} onClick={() => setSelectedMemoir(p)} />
          ))}
          <UploadPlaceholder type="photo" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* ── Upload Modal (Refined) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-16 max-w-xl w-full border border-slate-100 shadow-2xl animate-in zoom-in duration-500 relative">
            <h3 className="text-3xl font-bold text-[#0F172A] mb-3 tracking-tight">Add New Memory</h3>
            <p className="text-slate-500 font-medium text-sm mb-12">Select your media file and provide a descriptive title for the archive.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const file = fileInputRef.current?.files?.[0];
              if (!file) {
                alert('Please select a file.');
                return;
              }
              setUploading(true);
              uploadMutation.mutate({ 
                title: formData.get('title') as string, 
                type: formData.get('type') as string,
                file: file
              });
            }} className="space-y-10">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Memory Title</label>
                <input name="title" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] focus:ring-8 focus:ring-[#133378]/5 outline-none font-bold text-[#0F172A] transition-all placeholder:text-slate-300 text-lg" placeholder="e.g. Lockhart Family History" />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Media Format</label>
                  <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none text-lg transition-all">
                    <option value="video">Video Memoir</option>
                    <option value="photo">Photo Still</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Security Level</label>
                  <select name="visibility" className="w-full px-8 py-5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#133378] outline-none font-bold text-[#0F172A] appearance-none text-lg transition-all">
                    <option value="private">Private Archive</option>
                    <option value="shared">Share with Heirs</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Media Archive</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-[#133378]/20 transition-all cursor-pointer group/upload"
                >
                  <div className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-4 group-hover/upload:scale-110 group-hover/upload:bg-[#133378] group-hover/upload:text-white transition-all duration-500 shadow-sm text-slate-400">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] group-hover/upload:text-[#133378]">
                    {fileInputRef.current?.files?.[0]?.name || "Select Media File"}
                  </span>
                  <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" onChange={() => setUploading(false)} />
                </div>
              </div>

              <div className="flex gap-6 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-slate-100 font-bold text-slate-400 text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-5 rounded-2xl bg-[#133378] text-white font-bold text-sm transition-all hover:bg-[#1E3A5F] shadow-xl disabled:opacity-50">
                  {uploading ? 'Processing Architecture...' : 'Commit to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function VideoCard({ memoir, onClick }: any) {
  const videoUrl = memoir.url ? `${memoir.url}#t=0.001` : null;
  return (
    <div onClick={onClick} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm group hover:border-[#133378]/20 hover:shadow-2xl transition-all cursor-pointer">
      <div className="aspect-video bg-[#0F172A] relative overflow-hidden">
        {videoUrl && <video src={videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-[1500ms]" muted playsInline preload="auto" />}
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#133378] transition-all duration-500">
             <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1"><polygon points="5 3 19 12 5 21" /></svg>
           </div>
        </div>
      </div>
      <div className="p-10 space-y-4">
        <h4 className="font-bold text-[#0F172A] text-2xl tracking-tight leading-tight group-hover:text-[#133378] transition-colors">{memoir.title}</h4>
        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-300">
           <span>{memoir.dateAdded}</span>
           <span className="text-[#133378]/40">Secured Memoir</span>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ memoir, onClick }: any) {
  return (
    <div onClick={onClick} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm group hover:border-[#133378]/20 hover:shadow-2xl transition-all cursor-pointer">
      <div className="aspect-square bg-slate-50 relative overflow-hidden">
        {memoir.url && <img src={memoir.url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[1500ms]" alt={memoir.title} />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#133378]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-8 border-t border-slate-50">
        <h4 className="font-bold text-[#0F172A] text-sm truncate group-hover:text-[#133378] transition-colors">{memoir.title}</h4>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{memoir.dateAdded}</p>
      </div>
    </div>
  );
}

function UploadPlaceholder({ type, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6 text-slate-300 hover:border-[#133378]/50 hover:bg-[#133378]/[0.02] hover:text-[#133378] transition-all aspect-${type === 'video' ? 'video' : 'square'} group shadow-sm`}
    >
      <div className="w-16 h-16 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-[#133378] group-hover:text-white transition-all duration-500">
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-60">Add {type}</span>
    </button>
  );
}
