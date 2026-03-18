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
  const [estateId, setEstateId ] = useState('test-estate');
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
        estateId: 'test-estate',
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
    <div className="space-y-10 pb-20">
      {/* Full Fidelity Memoir Modal */}
      {selectedMemoir && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-navy/95 backdrop-blur-3xl p-8 animate-in fade-in duration-300 pointer-events-auto"
          onClick={() => setSelectedMemoir(null)}
        >
          <div 
            className="relative max-w-6xl w-full bg-black rounded-[3rem] overflow-hidden border-4 border-gold shadow-2xl animate-in zoom-in duration-500 flex flex-col md:flex-row max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-[2] bg-black flex items-center justify-center relative min-h-[300px]">
              {selectedMemoir.type === 'video' ? (
                <video 
                  src={selectedMemoir.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : (
                <img 
                  src={selectedMemoir.url} 
                  className="max-w-full max-h-[70vh] object-contain" 
                  alt={selectedMemoir.title} 
                />
              )}
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setSelectedMemoir(null)}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-[350px] p-10 bg-gradient-to-br from-navy to-navy-mid border-l border-white/10 flex flex-col shrink-0 overflow-y-auto">
              <div className="mb-auto">
                <div className="flex items-center gap-2 mb-6">
                  <div className={`w-2 h-2 rounded-full ${selectedMemoir.type === 'video' ? 'bg-royal shadow-[0_0_8px_rgba(37,99,235,0.5)]' : 'bg-gold shadow-[0_0_8px_rgba(200,169,81,0.5)]'}`} />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{selectedMemoir.type} Shard · Lockhart Estate</span>
                </div>
                <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-white uppercase tracking-wider mb-4 leading-tight">{selectedMemoir.title}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-gold/60 uppercase tracking-widest block mb-1 opacity-50">Operational Status</label>
                    <div className="text-white font-bold text-sm">Verified & Secured</div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gold/60 uppercase tracking-widest block mb-1 opacity-50">Capture Date</label>
                    <div className="text-white font-bold text-sm">{selectedMemoir.dateAdded}</div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gold/60 uppercase tracking-widest block mb-1 opacity-50">Visibility Shard</label>
                    <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 inline-block text-[10px] text-gold font-black uppercase tracking-widest">
                      {selectedMemoir.visibility === 'private' ? 'Owner Shard Only' : 'Unified Heirs Access'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-10 mt-10 border-t border-white/10">
                <button className="w-full py-4 rounded-2xl bg-gold text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                  Download 4K Shard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Memoirs & Legacy</h2>
          <p className="text-sm text-text-muted">Curate your life story through video messages and photo troves.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-gold text-black px-8 py-3 rounded-2xl font-black text-[0.7rem] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          + Capture Memoir
        </button>
      </div>

      {/* Video Section */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-border-light shadow-sm">
        <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-3 opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-royal" />
          The Legacy Tape Archive
        </h3>
        <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
          {videos.map(v => (
            <VideoCard key={v.id} memoir={v} onClick={() => setSelectedMemoir(v)} />
          ))}
          <UploadPlaceholder type="video" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* Photo Section */}
      <section className="bg-white rounded-[2.5rem] p-8 border border-border-light shadow-sm">
        <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-3 opacity-60">
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
          Documentary Photo Trove
        </h3>
        <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2">
          {photos.map(p => (
            <PhotoCard key={p.id} memoir={p} onClick={() => setSelectedMemoir(p)} />
          ))}
          <UploadPlaceholder type="photo" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full border border-border-light shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-navy mb-2 uppercase tracking-wide">New Legacy Element</h3>
            <p className="text-sm text-text-muted mb-8 italic">Your digital legacy is stored in the vault shard with AES-256 state encryption.</p>
            
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
            }} className="space-y-6">
              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Protocol Title</label>
                <input name="title" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white focus:border-royal focus:ring-4 focus:ring-royal/5 outline-none font-bold text-navy transition-all" placeholder="e.g. Message to my Grandkids" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Media Content Type</label>
                  <select name="type" required className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy appearance-none">
                    <option value="video">Video Recording</option>
                    <option value="photo">High-Res Photo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Visibility Shard</label>
                  <select name="visibility" className="w-full px-5 py-4 rounded-2xl border border-border-light bg-gray-50 focus:bg-white outline-none font-bold text-navy appearance-none">
                    <option value="private">Owner Primary</option>
                    <option value="shared">Limited Heirs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[0.6rem] font-black text-navy opacity-40 uppercase tracking-[0.2em] mb-2 block">Evidence Log Selection</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-border-light rounded-[2rem] flex flex-col items-center justify-center bg-gray-50 hover:bg-royal/5 hover:border-royal transition-all cursor-pointer group"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-navy/20 group-hover:text-royal transition-colors mb-2" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <span className="text-[0.6rem] font-black text-navy/40 uppercase tracking-widest">
                    {fileInputRef.current?.files?.[0]?.name || "Drop Shard File (MP4, JPG, PNG)"}
                  </span>
                  <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" onChange={() => setUploading(false) /* trigger redraw */} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-border-light font-black text-navy text-xs uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors">Discard</button>
                <button type="submit" disabled={uploading} className="flex-1 py-4 rounded-2xl bg-navy text-white font-black text-xs uppercase tracking-[0.15em] hover:bg-black shadow-xl transition-all disabled:opacity-50">
                  {uploading ? 'Synchronizing Shard...' : 'Commit to Vault'}
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
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm group hover:border-royal/40 hover:shadow-2xl transition-all relative cursor-pointer"
    >
      <div className="aspect-video bg-navy relative flex items-center justify-center overflow-hidden">
        {memoir.url ? (
           <video 
             src={memoir.url} 
             className="w-full h-full object-cover" 
             autoPlay 
             muted 
             loop 
             playsInline 
             preload="auto"
           />
        ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-navy to-royal opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy to-transparent opacity-80" />
        <button className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all shadow-inner">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1"><polygon points="5 3 19 12 5 21" /></svg>
        </button>
        <div className="absolute top-4 left-4 bg-navy/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-[8px] font-black text-white uppercase tracking-widest">4K Protocol</div>
      </div>
      <div className="p-6">
        <h4 className="font-black text-navy text-lg leading-tight mb-2 uppercase tracking-tight">{memoir.title}</h4>
        <div className="flex justify-between items-center mt-4">
          <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">{memoir.dateAdded}</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-royal/5 rounded-lg border border-royal/10">
            <div className="w-1.5 h-1.5 rounded-full bg-royal" />
            <span className="text-[9px] font-black text-royal uppercase tracking-tighter">Secured Shard</span>
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
      className="bg-white rounded-3xl border border-border-light overflow-hidden shadow-sm group hover:border-gold/40 hover:shadow-2xl transition-all relative cursor-pointer"
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {memoir.url && !memoir.url.startsWith('/memoirs') ? (
           <img src={memoir.url} alt={memoir.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
           <div className="absolute inset-0 flex items-center justify-center text-navy/5">
             <svg viewBox="0 0 24 24" className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth="0.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
           </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 border-t border-gray-50">
        <h4 className="font-black text-navy text-xs truncate uppercase tracking-tight">{memoir.title}</h4>
        <div className="text-[9px] text-text-muted mt-1 uppercase font-black tracking-widest opacity-60">{memoir.dateAdded}</div>
      </div>
    </div>
  );
}

function UploadPlaceholder({ type, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-3xl border-2 border-dashed border-border-light flex flex-col items-center justify-center gap-3 text-text-muted hover:border-royal/40 hover:bg-royal/5 hover:text-royal transition-all aspect-${type === 'video' ? 'video' : 'square'} group`}
    >
      <div className="w-12 h-12 rounded-full border border-border-light flex items-center justify-center group-hover:scale-110 group-hover:border-royal transition-all">
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Synchronize New {type}</span>
    </button>
  );
}
