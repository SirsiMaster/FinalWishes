import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/obituary')({
  component: ObituaryPage,
})

function ObituaryPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['obituary'],
    queryFn: () => estateClient.getObituary({ estateId: 'test-estate' }),
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) => estateClient.saveObituary({ estateId: 'test-estate', content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obituary'] });
      setEditing(false);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const obit = data;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b border-border-light pb-6">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-navy mb-1 uppercase tracking-tight">The Final Record</h2>
          <p className="text-sm text-text-muted">Draft, manage, and distribute the canonical life story for publication.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-navy text-white px-6 py-2.5 rounded-xl font-bold text-[0.7rem] uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Review & Sign
          </button>
          <button className="bg-gold text-black px-6 py-2.5 rounded-xl font-bold text-[0.7rem] uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            Distribute Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-10 max-md:grid-cols-1">
        {/* Profile/Media */}
        <div className="space-y-6">
          <div className="aspect-[3/4] rounded-2xl bg-navy relative border-4 border-gold group overflow-hidden shadow-2xl">
             <div className="absolute inset-0 flex items-center justify-center text-white/5 bg-gradient-to-b from-navy/50 to-navy text-center p-8">
               <svg viewBox="0 0 24 24" className="w-20 h-20 mb-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
               <span className="text-xs font-bold uppercase tracking-widest">Profile Portrait Placeholder</span>
             </div>
             <button className="absolute bottom-4 left-4 right-4 py-2.5 bg-gold/90 backdrop-blur-md rounded-xl text-black font-bold text-[0.65rem] uppercase tracking-widest translate-y-12 group-hover:translate-y-0 transition-transform">Update Photo</button>
          </div>
          
          <div className="bg-white rounded-2xl border border-border-light p-6">
            <h4 className="text-[0.65rem] font-bold text-navy uppercase tracking-widest mb-4">Vital Statistics</h4>
            <div className="space-y-3">
              <StatRow label="Status" value={isSigned ? "Locked" : obit?.status} color={isSigned ? "green" : "blue"} />
              <StatRow label="Last Update" value="Today, 9:02 PM" />
              <StatRow label="Review Type" value="Family Only" />
              <StatRow label="Verification" value={isSigned ? "Verified" : "Pending"} color={isSigned ? "green" : "gold"} />
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="bg-white rounded-2xl border border-border-light shadow-sm flex flex-col min-h-[500px] relative">
          <div className="bg-navy/5 px-6 py-4 flex justify-between items-center">
             <span className="text-[0.65rem] font-bold text-navy uppercase tracking-widest">Obituary Content Draft</span>
             {!editing && !isSigned && (
               <button onClick={() => setEditing(true)} className="text-royal font-bold text-xs uppercase tracking-widest hover:underline">Edit Entry</button>
             )}
             {editing && (
               <button onClick={() => {
                 const content = textAreaRef.current?.value || "";
                 saveMutation.mutate(content);
               }} className="text-success font-bold text-xs uppercase tracking-widest hover:underline">Save Draft</button>
             )}
             {isSigned && (
               <div className="flex items-center gap-1.5 text-success font-bold text-[0.6rem] uppercase tracking-widest">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Immutable Record Locked
               </div>
             )}
          </div>
          <div className="flex-1 p-8">
             {editing ? (
               <textarea 
                  ref={textAreaRef}
                  defaultValue={obit?.content}
                  className="w-full h-full min-h-[400px] border-none focus:ring-0 text-navy font-[family-name:var(--font-inter)] leading-relaxed text-lg outline-none resize-none"
                  placeholder="Start drafting the final record here..."
               />
             ) : (
               <p className="text-navy font-[family-name:var(--font-inter)] leading-relaxed text-lg whitespace-pre-wrap">
                 {obit?.content || "No content drafted yet. Use the 'Edit Entry' button to begin the record."}
               </p>
             )}
          </div>
          {!editing && !isSigned && (
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-white to-transparent h-24 flex items-end justify-center pointer-events-none">
              <span className="text-[10px] text-text-muted italic">Draft stored in secure vault. Legal sign-off required for distribution.</span>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full border border-border-light shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-navy text-gold rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gold shadow-lg">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-wider mb-2">Legal Review & Sign</h3>
              <p className="text-sm text-text-muted max-w-md mx-auto">By signing this document, you are establishing the canonical record for your estate. This action will be immutably recorded in the Protocol Ledger.</p>
            </div>
            
            <div className="bg-navy/5 p-6 rounded-2xl mb-8 border border-navy/10 max-h-[200px] overflow-y-auto scrollbar-thin">
               <p className="text-text-secondary text-sm italic leading-relaxed">"{obit?.content || 'Unfinished record...'}"</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 mb-8">
               <label className="text-[0.65rem] font-black text-navy uppercase tracking-[0.2em] mb-4 block opacity-40 text-center">Protocol Signature Area</label>
               <div className="h-20 border-b-2 border-navy/40 flex items-center justify-center text-navy/20 font-serif italic text-3xl select-none">
                  {isSigned ? <span className="text-navy font-[family-name:var(--font-cinzel)] opacity-100">Marcus Aurelius</span> : 'Sign here with owner key'}
               </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-4 rounded-2xl border border-border-light font-black text-navy text-xs uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsSigned(true);
                  setTimeout(() => setModalOpen(false), 800);
                }}
                className="flex-1 py-4 rounded-2xl bg-navy text-white font-black text-xs uppercase tracking-[0.15em] hover:bg-black transition-all shadow-xl hover:shadow-navy/20 active:scale-[0.98]"
              >
                {isSigned ? 'Locked & Secured' : 'Execute & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { 
    blue: "bg-royal-subtle text-royal", 
    green: "bg-green-100 text-green-700", 
    gold: "bg-gold-dim text-gold" 
  };
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border-light last:border-b-0 space-x-2">
      <span className="text-[0.7rem] text-text-muted font-bold uppercase tracking-tighter shrink-0">{label}</span>
      {color ? (
        <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${badgeMap[color]}`}>{value}</span>
      ) : (
        <span className="text-[0.75rem] font-black text-navy tracking-tight truncate">{value}</span>
      )}
    </div>
  );
}
