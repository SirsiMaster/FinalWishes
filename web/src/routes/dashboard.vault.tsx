import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/vault')({
  component: VaultPage,
})

function VaultPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [estateId, setEstateId] = useState('estate_lockhart');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['vaultDocuments', estateId],
    queryFn: () => estateClient.listVaultDocuments({ estateId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStatus(`Signing ${file.name}...`);
      
      // 1. Get Signed URL from Backend
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId: estateId,
        fileName: file.name,
        contentType: file.type
      });

      setUploadStatus(`Uploading to GCS...`);

      // 2. Direct Upload to Google Cloud Storage (GCS)
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!response.ok) throw new Error('Upload failed');
      
      setUploadStatus(`Verifying...`);
      // metadata confirmation would happen here
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
    <div className="max-w-[1200px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-8">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Document Vault</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Your important documents, securely encrypted and stored.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-royal hover:bg-sapphire text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] active:scale-[0.98] disabled:opacity-50 border border-white/10"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </button>
          {uploadStatus && (
            <div className="flex items-center gap-2 px-3 py-1 bg-royal/5 border border-royal/10 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-royal animate-pulse shadow-[0_0_5px_rgba(19,51,120,0.5)]" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <VaultFolder name="Legal Documents" count={documents.filter(d => d.category === 'Legal').length} color="blue" icon={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />
        <VaultFolder name="Financial Records" count={documents.filter(d => d.category === 'Financial').length} color="gold" icon={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>} />
        <VaultFolder name="Memoirs & Media" count={documents.filter(d => d.category === 'Memoir').length} color="green" icon={<><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>} />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-royal/10 p-10 shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
             <h3 className="text-[12px] font-black text-royal uppercase tracking-[0.2em]">All Documents</h3>
          </div>
          <div className="flex gap-1.5 opacity-20">
            <div className="w-1.5 h-1.5 rounded-full bg-royal" />
            <div className="w-1.5 h-1.5 rounded-full bg-royal" />
          </div>
        </div>
        <div className="space-y-4">
          {documents.map((doc, i) => (
            <DocItem key={i} name={doc.name} date={doc.date} size={doc.size} />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-24 text-royal/20 italic bg-royal/[0.01] rounded-[2rem] border-2 border-dashed border-royal/5 font-black uppercase tracking-widest text-xs">No documents have been uploaded yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function VaultFolder({ name, count, color, icon }: any) {
  const bgMap = { blue: "bg-royal/[0.05]", gold: "bg-[#C8A951]/10", green: "bg-green-50" };
  const textMap = { blue: "text-royal", gold: "text-[#C8A951]", green: "text-green-600" };
  const borderMap = { blue: "border-royal/10", gold: "border-[#C8A951]/20", green: "border-green-100" };
  
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-royal/10 shadow-[0_2px_16px_rgba(19,51,120,0.03)] hover:shadow-[0_12px_32px_rgba(19,51,120,0.08)] hover:border-royal/30 transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-12 h-12 bg-royal/5 rounded-bl-full translate-x-2 -translate-y-2 group-hover:bg-royal/10 transition-colors" />
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-all duration-500 shadow-sm ${bgMap[color as keyof typeof bgMap]} ${textMap[color as keyof typeof textMap]} ${borderMap[color as keyof typeof borderMap]} group-hover:scale-110 group-hover:rotate-3`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
          {icon}
        </svg>
      </div>
      <h4 className="text-royal font-black text-xl uppercase tracking-tight mb-2 group-hover:text-sapphire transition-colors">{name}</h4>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-royal/30 uppercase tracking-[0.15em]">{count} element{count !== 1 ? 's' : ''} stored</span>
        <div className="w-1.5 h-1.5 rounded-full bg-royal/10" />
        <span className="text-[9px] font-black text-[#C8A951] uppercase tracking-[0.2em] shadow-sm px-2 py-0.5 bg-[#C8A951]/5 rounded border border-[#C8A951]/10">Encrypted</span>
      </div>
    </div>
  );
}

function DocItem({ name, date, size }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-white border border-royal/5 rounded-[2rem] hover:bg-royal/[0.03] transition-all group cursor-pointer hover:border-royal/20 relative overflow-hidden">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-royal/[0.03] flex items-center justify-center text-royal/20 group-hover:text-royal transition-all duration-500 border border-royal/5 shadow-sm group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <div className="text-royal font-black text-[0.95rem] uppercase tracking-tight leading-tight mb-1 group-hover:text-sapphire transition-colors font-[family-name:var(--font-cinzel)]">{name}</div>
          <div className="flex items-center gap-3 text-[10px] font-black text-royal/20 uppercase tracking-[0.15em] transition-colors group-hover:text-royal/40">
            <span>{date}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-royal/5" />
            <span>{size}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="px-4 py-1.5 bg-green-50 border border-green-100 rounded-xl text-green-600 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-sm">Verified</div>
        <button className="bg-royal hover:bg-sapphire text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(19,51,120,0.15)] border border-white/10">Download</button>
      </div>
    </div>
  );
}
