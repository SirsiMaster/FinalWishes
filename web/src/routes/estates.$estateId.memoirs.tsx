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
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      {/* Full Fidelity Memory Viewer */}
      {selectedMemoir && (
        <div 
          className="fixed inset-0 z-[500] flex items-center justify-center bg-royal/[0.05] backdrop-blur-3xl p-4 animate-in fade-in duration-500 pointer-events-auto"
          onClick={() => setSelectedMemoir(null)}
        >
          <div 
            className="relative bg-white rounded-[4rem] overflow-hidden border border-royal/10 shadow-[0_40px_120px_rgba(19,51,120,0.2)] animate-in zoom-in duration-500 max-w-[95vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative group w-full bg-black/5 flex items-center justify-center min-h-[400px]">
              {selectedMemoir.type === 'video' ? (
                <video 
                  src={selectedMemoir.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[75vh] block shadow-2xl"
                />
              ) : (
                <img 
                  src={selectedMemoir.url} 
                  className="max-w-full max-h-[75vh] object-contain block shadow-2xl" 
                  alt={selectedMemoir.title} 
                />
              )}
              
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setSelectedMemoir(null)}
                  className="w-14 h-14 rounded-full bg-white/40 backdrop-blur-xl border border-white/40 flex items-center justify-center text-royal hover:bg-white hover:scale-110 hover:rotate-90 transition-all duration-500 shadow-xl"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="w-full p-12 bg-white flex justify-between items-center border-t border-royal/5">
              <div className="text-left space-y-3">
                <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight leading-tight">{selectedMemoir.title}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-sapphire uppercase tracking-widest bg-royal/[0.03] px-4 py-1.5 rounded-xl border border-royal/10 shadow-sm">{selectedMemoir.type} memory · safely saved</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-royal/10" />
                  <span className="text-[10px] font-black text-royal/30 uppercase tracking-[0.2em]">{selectedMemoir.dateAdded}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMemoir(null)}
                className="px-10 py-5 bg-royal hover:bg-sapphire border border-white/10 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_8px_24px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.25)] active:scale-95"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b border-royal/10 pb-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tighter">Life Stories & Memories</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Upload and save your personal videos and photos to share with your family.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-royal hover:bg-sapphire text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_8px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.3)] hover:-translate-y-1 active:scale-95 border border-white/10 flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
          Upload New Memory
        </button>
      </div>

      <section className="bg-white rounded-[4rem] p-12 border border-royal/5 shadow-[0_10px_50px_rgba(19,51,120,0.03)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal/[0.01] rounded-bl-[10rem] pointer-events-none group-hover:bg-royal/[0.03] transition-colors" />
        <h3 className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] mb-12 flex items-center gap-3 relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-royal shadow-[0_0_12px_rgba(19,51,120,0.3)]" />
          Personal Video Gallery
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 relative z-10">
          {videos.map(v => (
            <VideoCard key={v.id} memoir={v} onClick={() => setSelectedMemoir(v)} />
          ))}
          <UploadPlaceholder type="video" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      <section className="bg-white rounded-[4rem] p-12 border border-royal/5 shadow-[0_10px_50px_rgba(19,51,120,0.03)] relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sapphire/[0.01] rounded-tr-[10rem] pointer-events-none group-hover:bg-sapphire/[0.03] transition-colors" />
        <h3 className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] mb-12 flex items-center gap-3 relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-sapphire shadow-[0_0_12px_rgba(15,82,186,0.3)]" />
          Photo Collection
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          {photos.map(p => (
            <PhotoCard key={p.id} memoir={p} onClick={() => setSelectedMemoir(p)} />
          ))}
          <UploadPlaceholder type="photo" onClick={() => setModalOpen(true)} />
        </div>
      </section>

      {/* Upload Modal — Light Premium Glass */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-3 uppercase tracking-tight">Add New Memory</h3>
            <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest mb-10 italic">Your memories are kept safe and private in our secure vault.</p>
            
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
              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Name of Memory</label>
                <input name="title" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal focus:ring-[12px] focus:ring-royal/[0.03] outline-none font-black text-royal transition-all placeholder:text-royal/10 text-lg uppercase tracking-tight" placeholder="e.g. MESSAGE TO MY GRANDKIDS" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="group/field">
                  <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Type of Media</label>
                  <div className="relative">
                    <select name="type" required className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal appearance-none text-lg transition-all uppercase tracking-tight">
                      <option value="video">Video Recording</option>
                      <option value="photo">High-Res Photo</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-royal/30 group-hover/field:text-royal transition-colors">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>
                <div className="group/field">
                  <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Who can see this?</label>
                  <div className="relative">
                    <select name="visibility" className="w-full px-8 py-5 rounded-2xl border border-royal/10 bg-royal/[0.01] focus:bg-white focus:border-royal outline-none font-black text-royal appearance-none text-lg transition-all uppercase tracking-tight">
                      <option value="private">Only Me</option>
                      <option value="shared">My Heirs</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-royal/30 group-hover/field:text-royal transition-colors">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group/field">
                <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em] mb-3 block group-hover/field:text-royal/60 transition-colors">Select File to Upload</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-royal/10 rounded-[3rem] flex flex-col items-center justify-center bg-royal/[0.01] hover:bg-royal/[0.03] hover:border-royal/30 transition-all cursor-pointer group/upload"
                >
                  <div className="w-16 h-16 rounded-full bg-royal/[0.03] border border-royal/5 flex items-center justify-center mb-4 group-hover/upload:scale-110 group-hover/upload:bg-royal group-hover/upload:text-white transition-all duration-500 shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-royal/20 uppercase tracking-[0.25em] group-hover/upload:text-royal/50 transition-colors text-center px-10">
                    {fileInputRef.current?.files?.[0]?.name || "CHOOSE MP4, JPG, OR PNG FILE"}
                  </span>
                  <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" onChange={() => setUploading(false)} />
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all active:scale-95">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-5 rounded-2xl bg-royal text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-sapphire shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 active:scale-95 border border-white/10">
                  {uploading ? 'UPLOADING...' : 'Save Memory'}
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
  // Use a hack to force a preview frame if autoplay is blocked
  const videoUrl = memoir.url ? `${memoir.url}#t=0.001` : null;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[2.5rem] border border-royal/10 overflow-hidden shadow-[0_4px_25px_rgba(19,51,120,0.03)] group hover:border-royal/40 hover:shadow-[0_20px_60px_rgba(19,51,120,0.08)] transition-all relative cursor-pointer active:scale-[0.98]"
    >
      <div className="aspect-video bg-royal/95 relative flex items-center justify-center overflow-hidden">
        {videoUrl ? (
           <video 
             src={videoUrl} 
             className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-[1000ms]" 
             autoPlay 
             muted 
             loop 
             playsInline 
             preload="auto"
           />
        ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-royal to-sapphire opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-royal/60 to-transparent group-hover:opacity-40 transition-opacity" />
        <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 flex items-center justify-center text-white scale-90 group-hover:scale-110 group-hover:bg-white group-hover:text-royal transition-all duration-500 shadow-2xl relative z-10">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current ml-2"><polygon points="5 3 19 12 5 21" /></svg>
        </button>
        <div className="absolute top-6 left-6 bg-royal/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-[9px] font-black text-white uppercase tracking-widest shadow-lg">High Quality</div>
      </div>
      <div className="p-10">
        <h4 className="font-black text-royal text-2xl leading-tight mb-3 uppercase tracking-tight group-hover:text-sapphire transition-colors">{memoir.title}</h4>
        <div className="flex justify-between items-center mt-6">
          <span className="text-[10px] text-royal/30 font-black uppercase tracking-[0.2em]">{memoir.dateAdded}</span>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-royal/[0.03] rounded-xl border border-royal/10 group-hover:bg-white group-hover:border-royal/30 transition-all shadow-sm">
            <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
            <span className="text-[9px] font-black text-royal uppercase tracking-widest">Secure Memory</span>
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
      className="bg-white rounded-[2.5rem] border border-royal/10 overflow-hidden shadow-[0_4px_25px_rgba(19,51,120,0.03)] group hover:border-sapphire/40 hover:shadow-[0_20px_60px_rgba(15,82,186,0.08)] transition-all relative cursor-pointer active:scale-[0.98]"
    >
      <div className="aspect-square bg-royal/[0.01] relative overflow-hidden">
        {memoir.url ? (
           <img src={memoir.url} alt={memoir.title} className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]" />
        ) : (
           <div className="absolute inset-0 flex items-center justify-center text-royal/5">
             <svg viewBox="0 0 24 24" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="0.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
           </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-royal/50 to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
      </div>
      <div className="p-8 border-t border-royal/5">
        <h4 className="font-black text-royal text-sm truncate uppercase tracking-tight mb-2 group-hover:text-sapphire transition-colors">{memoir.title}</h4>
        <div className="text-[9px] text-royal/20 uppercase font-black tracking-[0.2em]">{memoir.dateAdded}</div>
      </div>
    </div>
  );
}

function UploadPlaceholder({ type, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-[2.5rem] border-2 border-dashed border-royal/10 flex flex-col items-center justify-center gap-6 text-royal/30 hover:border-royal/50 hover:bg-royal/[0.02] hover:text-royal transition-all aspect-${type === 'video' ? 'video' : 'square'} group active:scale-95`}
    >
      <div className="w-20 h-20 rounded-full border border-royal/10 flex items-center justify-center group-hover:scale-110 group-hover:border-royal group-hover:bg-royal group-hover:text-white transition-all duration-500 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">Add New {type}</span>
    </button>
  );
}
