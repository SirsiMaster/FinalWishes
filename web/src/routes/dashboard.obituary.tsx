import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef, useEffect } from 'react'
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
  const [estateId, setEstateId ] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
      setUserName(u.name || '');
      setProfilePhoto('/assets/tameeka/mom memorial.jpg'); // The memorial photo for obituary
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['obituary', estateId],
    queryFn: () => estateClient.getObituary({ estateId }),
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) => estateClient.saveObituary({ estateId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obituary', estateId] });
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
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      {/* Photo Modal — Light Premium Identity */}
      {showPhotoModal && profilePhoto && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-royal/[0.05] backdrop-blur-3xl p-8 animate-in fade-in duration-300 pointer-events-auto"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white rounded-[3.5rem] overflow-hidden border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.15)] animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-royal/[0.02] p-12 flex-1 flex items-center justify-center overflow-hidden">
               <img 
                 src={profilePhoto} 
                 className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl" 
                 alt="Full Fidelity Portrait" 
               />
            </div>
            <div className="absolute top-8 right-8">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPhotoModal(false); }}
                className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md border border-royal/10 flex items-center justify-center text-royal hover:bg-white transition-all shadow-sm group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-12 bg-white border-t border-royal/5 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/10" />
              <div className="flex justify-between items-end text-left">
                <div>
                  <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Heritage Record Portrait</h3>
                  <p className="text-[11px] text-royal/30 font-black uppercase tracking-[0.2em]">{userName || "Tameeka Lockhart"} · Final Wishes Record</p>
                </div>
                <div className="px-5 py-2.5 bg-royal/[0.03] border border-royal/10 text-royal rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm">4K PROTOCOL</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b border-royal/10 pb-10">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal mb-2 uppercase tracking-tight">The Final Record</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Draft, manage, and distribute the canonical life story for publication.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-royal hover:bg-sapphire text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-[0_4px_16px_rgba(19,51,120,0.2)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all border border-white/10 flex items-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Review & Sign
          </button>
          <button className="bg-white hover:bg-royal/[0.02] text-royal px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-royal/10 shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            Share With Family
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">
        {/* Profile/Media — High Fidelity */}
        <div className="space-y-8">
          <div 
            className="aspect-[3/4] rounded-[3rem] bg-royal/[0.02] relative border-4 border-[#C8A951]/20 group overflow-hidden shadow-[0_20px_50px_rgba(19,51,120,0.1)] cursor-pointer transition-all hover:border-[#C8A951]/40"
            onClick={() => setShowPhotoModal(true)}
          >
             {profilePhoto ? (
               <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-[2000ms] group-hover:scale-110" alt="Portrait" />
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-royal/5 bg-gradient-to-b from-royal/[0.02] to-royal/[0.05] text-center p-10">
                 <svg viewBox="0 0 24 24" className="w-20 h-20 mb-6 mx-auto" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">Heritage Portrait</span>
               </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-royal/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
             <button className="absolute bottom-6 left-6 right-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl text-royal font-black text-[10px] uppercase tracking-widest translate-y-20 group-hover:translate-y-0 transition-all duration-500 shadow-xl border border-white">Update Photo</button>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-royal/10 p-10 shadow-[0_2px_16px_rgba(19,51,120,0.03)] group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
            <h4 className="text-[10px] font-black text-royal uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-royal animate-pulse" />
              Vital Statistics
            </h4>
            <div className="space-y-4">
              <StatRow label="Operational Status" value={isSigned ? "Locked" : obit?.status} color={isSigned ? "green" : "blue"} />
              <StatRow label="Last Updated" value="Today, 9:02 PM" />
              <StatRow label="Registry" value="Maryland Legacy" />
              <StatRow label="Verification State" value={isSigned ? "Verified" : "Pending"} color={isSigned ? "green" : "gold"} />
            </div>
          </div>
        </div>

        {/* Editor Area — Premium Light Typing */}
        <div className="bg-white rounded-[3rem] border border-royal/10 shadow-[0_10px_40px_rgba(19,51,120,0.05)] flex flex-col min-h-[640px] relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-royal/5 group-hover:bg-royal/10 transition-colors" />
          <div className="bg-royal/[0.02] px-10 py-7 flex justify-between items-center border-b border-royal/5">
             <span className="text-[10px] font-black text-royal/40 uppercase tracking-[0.2em] group-hover:text-royal/60 transition-colors">Obituary Content Vault Draft</span>
             {!editing && !isSigned && (
               <button onClick={() => setEditing(true)} className="text-royal font-black text-[11px] uppercase tracking-widest hover:text-sapphire transition-all border-b border-royal/20 hover:border-sapphire">Begin Amendment</button>
             )}
             {editing && (
               <button onClick={() => {
                 const content = textAreaRef.current?.value || "";
                 saveMutation.mutate(content);
               }} className="text-green-600 font-black text-[11px] uppercase tracking-widest hover:text-green-700 transition-all bg-green-50 px-4 py-2 rounded-xl border border-green-100">Commit Draft</button>
             )}
             {isSigned && (
               <div className="flex items-center gap-2.5 text-green-600 font-black text-[10px] uppercase tracking-[0.15em] bg-green-50 px-4 py-2 rounded-xl border border-green-100 shadow-sm animate-in fade-in duration-700">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                  Immutable Record Locked
               </div>
             )}
          </div>
          <div className="flex-1 p-12 relative">
             {editing ? (
               <textarea 
                  ref={textAreaRef}
                  defaultValue={obit?.content}
                  className="w-full h-full min-h-[440px] border-none focus:ring-0 text-royal font-[family-name:var(--font-inter)] leading-relaxed text-xl outline-none resize-none placeholder:text-royal/10 bg-transparent"
                  placeholder="Begin writing your final wishes and memorial..."
               />
             ) : (
               <p className="text-royal font-[family-name:var(--font-inter)] leading-[1.8] text-xl whitespace-pre-wrap selection:bg-royal/10 selection:text-royal">
                 {obit?.content || "No content written yet. Click 'Edit' to begin your final wishes."}
               </p>
             )}
          </div>
          {!editing && !isSigned && (
            <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-white via-white/80 to-transparent h-40 flex items-end justify-center pointer-events-none">
              <div className="flex items-center gap-3 px-6 py-2.5 bg-royal/[0.02] border border-royal/5 rounded-2xl shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-royal animate-pulse" />
                <span className="text-[10px] font-black text-royal/20 uppercase tracking-[0.2em]">Draft stored in verified vault. Cryptographic sign-off required.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review & Sign Modal — High Fidelity Glass */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-royal/[0.05] backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[3.5rem] p-16 max-w-2xl w-full border border-royal/10 shadow-[0_40px_100px_rgba(19,51,120,0.2)] animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-royal text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform border border-white/20">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-4">Legal Review & Sign</h3>
              <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">By signing below, you are finalizing the official record of your final wishes. This document will be securely stored and shared with your designated family members.</p>
            </div>
            
            <div className="bg-royal/[0.02] p-8 rounded-[2.5rem] mb-12 border border-royal/5 max-h-[240px] overflow-y-auto scrollbar-thin shadow-inner">
               <p className="text-royal/60 text-[15px] italic leading-[1.8] font-medium font-[family-name:var(--font-inter)]">"{obit?.content || 'Awaiting record establishing...'}"</p>
            </div>

            <div className="bg-royal/[0.01] p-10 rounded-[3rem] border border-royal/10 mb-12 relative group/sig">
               <div className="absolute top-0 right-0 w-24 h-24 bg-royal/[0.02] rounded-bl-[4rem] group-hover/sig:bg-royal/5 transition-colors" />
               <label className="text-[9px] font-black text-royal/20 uppercase tracking-[0.3em] mb-6 block text-center">Digital Signature</label>
               <div className="h-24 border-b-2 border-royal/10 flex items-center justify-center text-royal/10 font-[family-name:var(--font-cinzel)] italic text-4xl select-none group-hover/sig:text-royal/20 transition-all">
                  {isSigned ? <span className="text-royal not-italic opacity-100 animate-in slide-in-from-bottom-2 duration-700">{userName || 'Legal Guardian'}</span> : 'EXECUTE SIGNATURE SHARD'}
               </div>
            </div>

            <div className="flex gap-6">
              <button 
                onClick={() => setModalOpen(false)}
                className="flex-1 py-5 rounded-2xl border border-royal/10 font-black text-royal/40 text-[11px] uppercase tracking-[0.2em] hover:bg-royal/[0.02] hover:text-royal transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsSigned(true);
                  setTimeout(() => setModalOpen(false), 1200);
                }}
                className={`flex-1 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] border border-white/10 ${isSigned ? 'bg-green-600 text-white shadow-green-500/20' : 'bg-royal hover:bg-sapphire text-white shadow-royal/20'}`}
              >
                {isSigned ? 'Record Locked & Secured' : 'Sign & Finalize'}
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
    blue: "bg-royal/[0.05] text-royal border-royal/10", 
    green: "bg-green-50 text-green-600 border-green-100", 
    gold: "bg-[#C8A951]/5 text-[#C8A951] border-[#C8A951]/20" 
  };
  return (
    <div className="flex justify-between items-center py-4 border-b border-royal/5 last:border-b-0 space-x-4 group/row">
      <span className="text-[10px] text-royal/20 font-black uppercase tracking-widest shrink-0 group-hover/row:text-royal/40 transition-colors">{label}</span>
      {color ? (
        <span className={`text-[9px] font-black px-3.5 py-1 rounded-xl uppercase tracking-widest border shadow-sm ${badgeMap[color]}`}>{value}</span>
      ) : (
        <span className="text-[12px] font-black text-royal tracking-tight truncate group-hover/row:text-royal transition-colors">{value}</span>
      )}
    </div>
  );
}

