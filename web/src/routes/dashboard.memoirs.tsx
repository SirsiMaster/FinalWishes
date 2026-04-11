import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/memoirs')({
  component: MemoirsPage,
})

function MemoirsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estateId, setEstateId ] = useState('');
  const [selectedMemoir, setSelectedMemoir] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['memoirs', estateId],
    queryFn: () => estateClient.listMemoirs({ estateId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (vars: { title: string, type: string, file: File }) => {
      // 1. Generate Signed URL
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId: estateId,
        fileName: vars.file.name,
        contentType: vars.file.type
      });

      // 2. Upload to GCS
      if (uploadUrl && !uploadUrl.includes('localhost')) {
         const response = await fetch(uploadUrl, {
           method: 'PUT',
           headers: { 'Content-Type': vars.file.type },
           body: vars.file,
         });
         if (!response.ok) throw new Error('Failed to upload file to storage');
      }

      // 3. Save Metadata to Firestore
      return estateClient.uploadMemoir({
        estateId: estateId,
        title: vars.title,
        type: vars.type,
        url: finalUrl || `/memoirs/placeholder.${vars.type === 'video' ? 'mp4' : 'jpg'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memoirs', estateId] });
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
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      {/* Full Fidelity Memoir Modal — Light Premium Identity */}
      {selectedMemoir && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-royal/[0.05] backdrop-blur-3xl p-8 animate-in fade-in duration-300 pointer-events-auto"
          onClick={() => setSelectedMemoir(null)}
        >
          <div 
            className="relative max-w-6xl w-full bg-white rounded-[3.5rem] overflow-hidden border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-[2] bg-royal/[0.02] flex items-center justify-center relative min-h-[300px]">
              {selectedMemoir.type === 'video' ? (
                <video 
                  src={selectedMemoir.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-2xl"
                />
              ) : (
                <img 
                  src={selectedMemoir.url} 
                  className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-2xl" 
                  alt={selectedMemoir.title} 
                />
              )}
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setSelectedMemoir(null)}
                  className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md border border-royal/10 flex items-center justify-center text-royal hover:bg-white transition-all shadow-sm group"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-[380px] p-12 bg-white flex flex-col shrink-0 overflow-y-auto relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5" />
              <div className="mb-auto">
                <div className="flex items-center gap-2 mb-8">
                  <div className={`w-2 h-2 rounded-full bg-royal animate-pulse`} />
                  <span className="text-[10px] font-black text-royal/30 uppercase tracking-[0.2em]">{selectedMemoir.type} · Lockhart Estate</span>
                </div>
                <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-8 leading-tight">{selectedMemoir.title}</h3>
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black text-royal/20 uppercase tracking-widest block mb-2 transition-colors group-hover:text-royal/40">Operational Status</label>
                    <div className="text-royal font-black text-sm uppercase tracking-tighter">Verified & Secured</div>
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-black text-royal/20 uppercase tracking-widest block mb-2 transition-colors group-hover:text-royal/40">Capture Date</label>
                    <div className="text-royal font-black text-sm uppercase tracking-tighter tabular-nums">{selectedMemoir.dateAdded}</div>
                  </div>
                  <div className="group">
                    <label className="text-[10px] font-black text-royal/20 uppercase tracking-widest block mb-1 opacity-50 transition-colors group-hover:text-royal/40">Visibility</label>
                    <div className="px-3 py-1 bg-royal/[0.02] rounded-xl border border-royal/10 inline-block text-[10px] text-royal font-black uppercase tracking-widest shadow-sm">
                      {selectedMemoir.visibility === 'private' ? 'Owner Only' : 'Shared With Family'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-10 mt-10 border-t border-royal/5">
                <button className="w-full py-5 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_8px_24px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] border border-white/10">
                  Execute 4K Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b border-royal/10 pb-8">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Memoirs & Legacy</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Curate your life story through video messages and photo troves.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all border border-white/10"
        >
          + Capture Memoir
        </button>
      </div>

      {/* Video Section */}
      <section className="bg-white rounded-[3rem] p-10 border border-royal/10 shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
        <h3 className="text-[12px] font-black text-royal uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
          The Legacy Tape Archive
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {videos.map(v => (
            <VideoCard key={v.id} memoir={v} onClick={() => setSelectedMemoir(v)} />
          ))}
          <UploadPlaceholder type="video" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* Photo Section */}
      <section className="bg-white rounded-[3rem] p-10 border border-royal/10 shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
        <h3 className="text-[12px] font-black text-royal uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#C8A951] animate-pulse" />
          Documentary Photo Trove
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {photos.map(p => (
            <PhotoCard key={p.id} memoir={p} onClick={() => setSelectedMemoir(p)} />
          ))}
          <UploadPlaceholder type="photo" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* Upload Modal — Light Glass Identity */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-2 uppercase tracking-wide">New Legacy Element</h3>
            <p className="text-[11px] text-royal/30 mb-10 font-black uppercase tracking-widest leading-relaxed">Your digital legacy, securely encrypted and stored.</p>
            
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
            }} className="space-y-8">
              <div className="group">
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Title</label>
                <input name="title" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white focus:border-royal focus:shadow-sm outline-none font-black text-royal transition-all placeholder:text-royal/10" placeholder="e.g. Message to my Grandkids" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Media Content Type</label>
                  <div className="relative">
                    <select name="type" required className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal appearance-none transition-all">
                      <option value="video">Video Recording</option>
                      <option value="photo">High-Res Photo</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-royal/20">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1 group-focus-within:text-royal transition-colors">Visibility</label>
                  <div className="relative">
                    <select name="visibility" className="w-full px-6 py-4.5 rounded-2xl border border-royal/10 bg-royal/[0.02] focus:bg-white outline-none font-black text-royal appearance-none transition-all">
                      <option value="private">Owner Primary</option>
                      <option value="shared">Limited Heirs</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-royal/20">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] mb-2.5 block ml-1">Evidence Log Selection</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-royal/10 rounded-[2.5rem] flex flex-col items-center justify-center bg-royal/[0.01] hover:bg-royal/[0.03] hover:border-royal/30 transition-all cursor-pointer group shadow-inner"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-royal/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-royal group-hover:text-white transition-all shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-royal/30 uppercase tracking-[0.2em] group-hover:text-royal/60">
                    {fileInputRef.current?.files?.[0]?.name || "Choose File"}
                  </span>
                  <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" onChange={() => setUploading(false)} />
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4.5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all">Discard</button>
                <button type="submit" disabled={uploading} className="flex-1 py-4.5 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_8px_24px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] border border-white/10">
                  {uploading ? 'Saving...' : 'Save Memoir'}
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
    <div 
      onClick={onClick}
      className="bg-white rounded-[2.5rem] border border-royal/10 overflow-hidden shadow-[0_2px_16px_rgba(19,51,120,0.03)] group hover:border-royal/30 hover:shadow-[0_20px_50px_rgba(19,51,120,0.1)] transition-all relative cursor-pointer active:scale-[0.99]"
    >
      <div className="aspect-video bg-royal/[0.03] relative flex items-center justify-center overflow-hidden">
        {videoUrl ? (
           <video 
             src={videoUrl} 
             className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
             autoPlay 
             muted 
             loop 
             playsInline 
             preload="auto"
           />
        ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-royal/5 to-sapphire/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-royal/20 via-transparent to-transparent opacity-60" />
        <button className="w-16 h-16 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 flex items-center justify-center text-royal scale-90 group-hover:scale-105 group-hover:rotate-3 transition-all shadow-xl z-10">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1"><polygon points="5 3 19 12 5 21" /></svg>
        </button>
        <div className="absolute top-5 left-5 bg-white/80 backdrop-blur-md px-3 py-1 rounded-xl border border-royal/10 text-[9px] font-black text-royal uppercase tracking-widest shadow-sm">4K SHARD</div>
      </div>
      <div className="p-8">
        <h4 className="font-black text-royal text-xl leading-tight mb-4 uppercase tracking-tight group-hover:text-sapphire transition-colors font-[family-name:var(--font-cinzel)]">{memoir.title}</h4>
        <div className="flex justify-between items-center mt-6 border-t border-royal/5 pt-5">
          <span className="text-[10px] text-royal/20 font-black uppercase tracking-[0.2em] group-hover:text-royal/40 transition-colors tabular-nums">{memoir.dateAdded}</span>
          <div className="flex items-center gap-2 px-3 py-1 bg-royal/[0.02] rounded-xl border border-royal/5 shadow-sm group-hover:border-royal/20 transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-royal animate-pulse" />
            <span className="text-[9px] font-black text-royal uppercase tracking-tighter">Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ memoir, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[2.5rem] border border-royal/10 overflow-hidden shadow-[0_2px_16px_rgba(19,51,120,0.03)] group hover:border-[#C8A951]/40 hover:shadow-[0_20px_50px_rgba(200,169,81,0.1)] transition-all relative cursor-pointer active:scale-[0.99] group"
    >
      <div className="aspect-square bg-royal/[0.02] relative overflow-hidden">
        {memoir.url && !memoir.url.startsWith('/memoirs') ? (
           <img src={memoir.url} alt={memoir.title} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000 grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100" />
        ) : (
           <div className="absolute inset-0 flex items-center justify-center text-royal/5">
             <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="0.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
           </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-royal/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
      </div>
      <div className="p-6 border-t border-royal/5 bg-white">
        <h4 className="font-black text-royal text-[13px] truncate uppercase tracking-tight group-hover:text-sapphire transition-colors mb-1 font-[family-name:var(--font-cinzel)]">{memoir.title}</h4>
        <div className="text-[9px] text-royal/20 uppercase font-black tracking-widest group-hover:text-royal/40 transition-colors">{memoir.dateAdded}</div>
      </div>
    </div>
  );
}

function UploadPlaceholder({ type, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-[2.5rem] border-2 border-dashed border-royal/10 flex flex-col items-center justify-center gap-4 text-royal/20 hover:border-royal/40 hover:bg-royal/[0.02] hover:text-royal transition-all aspect-${type === 'video' ? 'video' : 'square'} group shadow-inner relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-royal/5 rounded-bl-[4rem] translate-x-4 -translate-y-4 group-hover:bg-royal/10 transition-colors" />
      <div className="w-14 h-14 rounded-2xl border border-royal/5 bg-white flex items-center justify-center group-hover:scale-110 group-hover:border-royal group-hover:bg-royal group-hover:text-white transition-all shadow-sm">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:opacity-100 opacity-60 text-royal/40 group-hover:text-royal transition-colors">Synchronize New {type}</span>
    </button>
  );
}
