import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/vault')({
  component: VaultPage,
})

function VaultPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/vault' });
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [estateId, setEstateId] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

  const { data, isLoading } = useQuery({
    queryKey: ['vaultDocuments', estateId],
    queryFn: () => estateClient.listVaultDocuments({ estateId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStatus(`Signing ${file.name}...`);
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId: estateId,
        fileName: file.name,
        contentType: file.type
      });

      setUploadStatus(`Uploading to GCS...`);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!response.ok) throw new Error('Upload failed');
      setUploadStatus(`Verifying...`);
      return finalUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultDocuments', estateId] });
      setUploadStatus(null);
    },
    onError: (err) => {
      console.error(err);
      setUploadStatus(`Error: ${err.message}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const documents = data?.documents || [];

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tighter">The Archive</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">All your documents are safely stored and encrypted here.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-royal hover:bg-sapphire text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_8px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.3)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 border border-white/10 flex items-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploadMutation.isPending ? 'Saving File...' : 'Upload New Document'}
          </button>
          {uploadStatus && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-royal/[0.03] border border-royal/10 rounded-xl shadow-sm">
              <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
              <span className="text-[9px] font-black text-royal uppercase tracking-widest">{uploadStatus}</span>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <VaultFolder name="Legal Documents" count={documents.filter(d => d.category === 'Legal').length} color="blue" icon={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />
        <VaultFolder name="Financial Records" count={documents.filter(d => d.category === 'Financial').length} color="sapphire" icon={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>} />
        <VaultFolder name="Personal Memories" count={documents.filter(d => d.category === 'Memoir').length} color="royal" icon={<><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>} />
      </div>

      <div className="bg-white rounded-[4rem] border border-royal/10 p-12 shadow-[0_2px_40px_rgba(19,51,120,0.05)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal/[0.01] rounded-bl-[10rem] pointer-events-none group-hover:bg-royal/[0.02] transition-colors" />
        <div className="flex items-center gap-3 mb-12 relative z-10 px-4">
          <div className="w-2.5 h-2.5 rounded-full bg-royal shadow-[0_0_12px_rgba(19,51,120,0.3)]" />
          <h3 className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em]">All Files</h3>
        </div>
        <div className="space-y-6 relative z-10">
          {documents.map((doc, i) => (
            <DocItem key={i} name={doc.name} date={doc.date} size={doc.size} />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-40 text-royal/20 italic font-black uppercase tracking-[0.3em] bg-royal/[0.01] rounded-[3rem] border-2 border-dashed border-royal/5">No files have been added to this estate yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function VaultFolder({ name, count, color, icon }: any) {
  const bgMap = { blue: "bg-royal/[0.03]", sapphire: "bg-sapphire/[0.03]", royal: "bg-royal/[0.05]" };
  const textMap = { blue: "text-royal", sapphire: "text-sapphire", royal: "text-royal" };
  const borderMap = { blue: "border-royal/10", sapphire: "border-sapphire/10", royal: "border-royal/10" };
  
  return (
    <div className={`bg-white p-10 rounded-[3.5rem] border border-royal/10 shadow-[0_2px_40px_rgba(19,51,120,0.05)] hover:border-royal/30 hover:shadow-[0_20px_60px_rgba(19,51,120,0.08)] transition-all cursor-pointer group active:scale-[0.98]`}>
      <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 border transition-all duration-500 shadow-sm ${bgMap[color as keyof typeof bgMap]} ${textMap[color as keyof typeof textMap]} ${borderMap[color as keyof typeof borderMap]} group-hover:bg-royal group-hover:text-white group-hover:scale-110`}>
        <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5">
          {icon}
        </svg>
      </div>
      <h4 className="text-royal font-black text-2xl uppercase tracking-tighter mb-4 group-hover:text-sapphire transition-colors">{name}</h4>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black text-royal/30 uppercase tracking-widest">{count} file{count !== 1 ? 's' : ''}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-royal/10" />
        <div className="flex items-center gap-1.5 bg-royal/[0.03] px-3 py-1 rounded-lg border border-royal/10 shadow-sm group-hover:bg-white transition-all">
           <div className="w-1.5 h-1.5 rounded-full bg-sapphire animate-pulse shadow-[0_0_8px_rgba(15,82,186,0.3)]" />
           <span className="text-[9px] font-black text-sapphire uppercase tracking-widest">Protected</span>
        </div>
      </div>
    </div>
  );
}

function DocItem({ name, date, size }: any) {
  return (
    <div className="flex items-center justify-between p-8 bg-white border border-royal/10 rounded-[2.5rem] hover:bg-royal/[0.03] transition-all group cursor-pointer hover:border-royal/30 hover:shadow-[0_12px_40px_rgba(19,51,120,0.05)] relative overflow-hidden active:scale-[0.995]">
      <div className="flex items-center gap-8 relative z-10">
        <div className="w-16 h-16 rounded-[1.5rem] bg-royal/[0.03] flex items-center justify-center text-royal/20 group-hover:bg-royal group-hover:text-white transition-all duration-500 border border-royal/10 shadow-sm">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <div className="text-royal font-black text-xl uppercase tracking-tight leading-tight mb-2 group-hover:text-sapphire transition-colors">{name}</div>
          <div className="flex items-center gap-4 text-[11px] font-black text-royal/30 uppercase tracking-widest">
            <span>{date}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-royal/10" />
            <span>{size}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 relative z-10">
        <div className="px-4 py-1.5 bg-white border border-royal/10 rounded-xl text-royal font-black text-[9px] uppercase tracking-widest shadow-sm translate-x-8 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 hidden md:block">Securely Saved</div>
        <button className="bg-royal hover:bg-sapphire text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-0 translate-x-12 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-700 shadow-xl hover:shadow-[0_12px_24px_rgba(15,82,186,0.3)] active:scale-95 border border-white/10">Download File</button>
      </div>
    </div>
  );
}
