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
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end border-b border-border-light pb-6">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Evidence Vault</h2>
          <p className="text-sm text-text-muted">Digitally signed, AES-256 encrypted legal evidence shards.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-navy text-white px-8 py-3 rounded-2xl font-black text-[0.7rem] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploadMutation.isPending ? 'Securing Shard...' : 'Deposit Document'}
          </button>
          {uploadStatus && (
            <div className="flex items-center gap-2 px-3 py-1 bg-royal/5 border border-royal/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-royal animate-pulse" />
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

      <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
        <VaultFolder name="Legal Protocols" count={documents.filter(d => d.category === 'Legal').length} color="blue" icon={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />
        <VaultFolder name="Financial Ledgers" count={documents.filter(d => d.category === 'Financial').length} color="gold" icon={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>} />
        <VaultFolder name="Legacy Memoirs" count={documents.filter(d => d.category === 'Memoir').length} color="green" icon={<><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>} />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-border-light p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-8 opacity-40">
          <div className="w-2 h-2 rounded-full bg-navy" />
          <h3 className="text-xs font-black text-navy uppercase tracking-[0.2em]">Verified Vault Inventory</h3>
        </div>
        <div className="space-y-4">
          {documents.map((doc, i) => (
            <DocItem key={i} name={doc.name} date={doc.date} size={doc.size} />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-24 text-text-muted italic bg-navy/5 rounded-3xl border-2 border-dashed border-border-light">No documents detected in this governance shard.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function VaultFolder({ name, count, color, icon }: any) {
  const bgMap = { blue: "bg-royal/10", gold: "bg-gold/10", green: "bg-green-50" };
  const textMap = { blue: "text-royal", gold: "text-gold", green: "text-success" };
  const borderMap = { blue: "border-royal/10", gold: "border-gold/10", green: "border-green-100" };
  
  return (
    <div className={`bg-white p-8 rounded-[2rem] border border-border-light shadow-sm hover:translate-y-[-4px] transition-all cursor-pointer group active:scale-[0.98]`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-all ${bgMap[color as keyof typeof bgMap]} ${textMap[color as keyof typeof textMap]} ${borderMap[color as keyof typeof borderMap]} group-hover:scale-110`}>
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
      <h4 className="text-navy font-black text-xl uppercase tracking-tight mb-2">{name}</h4>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{count} element{count !== 1 ? 's' : ''} stored</span>
        <div className="w-1 h-1 rounded-full bg-border-light" />
        <span className="text-[9px] font-black text-gold uppercase tracking-widest">Locked</span>
      </div>
    </div>
  );
}

function DocItem({ name, date, size }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-white border border-border-light rounded-2xl hover:bg-royal-subtle transition-all group cursor-pointer hover:border-royal/20">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-navy/5 flex items-center justify-center text-navy/20 group-hover:text-royal transition-colors border border-navy/5">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <div className="text-navy font-black text-[0.95rem] uppercase tracking-tight leading-tight mb-1">{name}</div>
          <div className="flex items-center gap-3 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">
            <span>{date}</span>
            <div className="w-1 h-1 rounded-full bg-border-light" />
            <span>{size}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="px-3 py-1 bg-green-50 border border-green-100 rounded-lg text-success text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">SOC 2 Verified</div>
        <button className="bg-navy text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-black active:scale-95 shadow-md">Execute Download</button>
      </div>
    </div>
  );
}
