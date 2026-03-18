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
  const [estateId, setEstateId] = useState('test-estate');

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
      // Here you would normally call a "ConfirmUpload" RPC to store metadata in Firestore
      return finalUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultDocuments', estateId] });
      setUploadStatus(null);
      alert('Vault Document Secured via GCS');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">Document Vault</h2>
          <p className="text-sm text-text-muted">Digitally signed, AES-256 encrypted legal evidence.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-navy text-white px-6 py-2.5 rounded-xl font-bold text-[0.7rem] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploadMutation.isPending ? 'Securing...' : 'Upload Document'}
          </button>
          {uploadStatus && <span className="text-[10px] font-bold text-royal uppercase tracking-widest animate-pulse">{uploadStatus}</span>}
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

      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
        <VaultFolder name="Legal Docs" count={documents.filter(d => d.category === 'Legal').length} color="blue" />
        <VaultFolder name="Financials" count={documents.filter(d => d.category === 'Financial').length} color="gold" />
        <VaultFolder name="Memoirs" count={documents.filter(d => d.category === 'Memoir').length} color="green" />
      </div>

      <div className="bg-white rounded-2xl border border-border-light p-6">
        <h3 className="text-navy font-bold text-sm uppercase tracking-widest mb-4">Recent Documents</h3>
        <div className="space-y-3">
          {documents.map((doc, i) => (
            <DocItem key={i} name={doc.name} date={doc.date} size={doc.size} />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-10 text-text-muted italic">No documents in the vault.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function VaultFolder({ name, count, color }: any) {
  const bgMap = { blue: "bg-royal-subtle", gold: "bg-gold-dim", green: "bg-green-50" };
  const textMap = { blue: "text-royal", gold: "text-gold", green: "text-success" };
  return (
    <div className="bg-white p-5 rounded-2xl border border-border-light shadow-sm hover:border-royal/20 transition-all cursor-pointer group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bgMap[color as keyof typeof bgMap]} ${textMap[color as keyof typeof textMap]}`}>
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h4 className="text-navy font-bold text-lg leading-tight group-hover:text-royal transition-colors">{name}</h4>
      <p className="text-xs text-text-muted mt-1">{count} items saved</p>
    </div>
  );
}

function DocItem({ name, date, size }: any) {
  return (
    <div className="flex items-center justify-between p-4 border border-border-light rounded-xl hover:bg-royal-subtle transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center text-navy/40">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <div className="text-navy font-semibold text-sm">{name}</div>
          <div className="text-[11px] text-text-muted">{date} · {size}</div>
        </div>
      </div>
      <button className="text-royal font-bold text-xs uppercase tracking-widest hover:underline">Download</button>
    </div>
  );
}
