import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useMemo } from 'react'
import { useEstateDocuments, type VaultDocument } from '../lib/firestore'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/vault')({
  component: VaultPage,
})

function VaultPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/vault' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: firestoreDocs, loading: isLoading } = useEstateDocuments(estateId);

  // Map Firestore document shape to display shape
  const documents = firestoreDocs.map((d: VaultDocument) => ({
    name: d.displayName || d.originalName,
    date: d.createdAt?.toDate?.()
      ? d.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    size: d.fileSize ? `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB` : '',
    category: d.folderId || 'General',
  }));

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadStatus(`Preparing ${file.name}...`);
      const { uploadUrl } = await estateClient.generateUploadUrl({
        estateId,
        fileName: file.name,
        contentType: file.type,
      });
      setUploadStatus('Uploading...');
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Upload failed');
      setUploadStatus('Verifying...');
      // Firestore onSnapshot will auto-update the list
      setUploadStatus(null);
    } catch (err: any) {
      console.error(err);
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Loading documents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Document Vault</h2>
          <p className="text-lg text-[#64748B] font-medium">All your important documents are safely stored and encrypted here.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-4 rounded-2xl font-bold text-[13px] transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
          {uploadStatus && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-[#133378] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#133378]">{uploadStatus}</span>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }} 
          />
        </div>
      </div>

      {/* Category Folders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <VaultFolder name="Legal Documents" count={documents.filter((d: any) => d.category === 'Legal').length} icon={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>} />
        <VaultFolder name="Financial Records" count={documents.filter((d: any) => d.category === 'Financial').length} icon={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>} />
        <VaultFolder name="Personal Memories" count={documents.filter((d: any) => d.category === 'Memoir').length} icon={<><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>} />
      </div>

      {/* All Files */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">All Files · Encrypted</h3>
        </div>
        <div className="space-y-4">
          {documents.map((doc: any, i: number) => (
            <DocItem key={i} name={doc.name} date={doc.date} size={doc.size} />
          ))}
          {documents.length === 0 && (
            <div className="text-center py-24 bg-[#F8FAFC] rounded-2xl border border-slate-100">
              <p className="text-[#64748B] font-medium">No files have been added to this estate yet.</p>
              <p className="text-sm text-slate-400 mt-2">Click "Upload Document" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VaultFolder({ name, count, icon }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[#F8FAFC] border border-slate-100 text-[#133378] group-hover:bg-[#133378] group-hover:text-white transition-all duration-500">
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </div>
      <h4 className="text-[#0F172A] font-bold text-lg mb-2 group-hover:text-[#133378] transition-colors">{name}</h4>
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-[#64748B]">{count} file{count !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded border border-green-200">
           <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
           <span className="text-[10px] font-bold text-green-600">Protected</span>
        </div>
      </div>
    </div>
  );
}

function DocItem({ name, date, size }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:bg-[#F8FAFC] transition-all group cursor-pointer hover:border-slate-200">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-slate-300 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500 border border-slate-100">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <div className="text-[#0F172A] font-bold text-base mb-1 group-hover:text-[#133378] transition-colors">{name}</div>
          <div className="flex items-center gap-3 text-[13px] font-medium text-[#64748B]">
            <span>{date}</span>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{size}</span>
          </div>
        </div>
      </div>
      <button className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-5 py-2.5 rounded-xl text-[12px] font-bold opacity-0 translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 shadow-md active:scale-95">Download</button>
    </div>
  );
}
