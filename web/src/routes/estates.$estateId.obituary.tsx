/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useDocument } from '../lib/firestore'
import { EditorSkeleton } from '@/components/skeletons/EditorSkeleton'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const Route = createFileRoute('/estates/$estateId/obituary')({
  component: ObituaryPage,
})

function ObituaryPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/obituary' });
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);
  const { user, profile } = useAuth();
  const userName = profile?.displayName || '';
  const profilePhoto = profile?.profilePhotoUrl || '/assets/tameeka/mom memorial.jpg';
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [aiAssisting, setAiAssisting] = useState(false);

  const { data: obit, loading: isLoading } = useDocument<{ content?: string; status?: string }>(`estates/${estateId}/governance/obituary`);

  const handleAiAssist = useCallback(async () => {
    if (!user) return;
    const currentContent = textAreaRef.current?.value || obit?.content || '';
    setAiAssisting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/v1/guidance/assist-obituary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estateId, prompt: currentContent }),
      });
      if (!res.ok) throw new Error('AI assist failed');
      const data = await res.json();
      if (data.content && textAreaRef.current) {
        textAreaRef.current.value = data.content;
      }
      // Switch to editing mode if not already
      if (!editing) setEditing(true);
    } catch (err) {
      console.error('[Obituary] AI assist failed:', err);
      alert('AI assistance is temporarily unavailable. Please try again.');
    } finally {
      setAiAssisting(false);
    }
  }, [user, estateId, obit?.content, editing]);

  const handleSave = async () => {
    const content = textAreaRef.current?.value || '';
    setSaving(true);
    try {
      await setDoc(doc(db, `estates/${estateId}/governance`, 'obituary'), {
        content,
        status: 'Draft',
        last_updated: serverTimestamp(),
      }, { merge: true });
      setEditing(false);
    } catch (err) {
      console.error('[SaveObituary] Error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      {/* Photo Modal */}
      {showPhotoModal && profilePhoto && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="relative bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in duration-500 max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={profilePhoto} 
              className="max-w-full max-h-[80vh] object-contain block mx-auto" 
              alt="Heritage Portrait" 
            />
            <div className="w-full p-6 bg-white border-t border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Heritage Portrait</h3>
                <p className="text-[13px] text-[#64748B] font-medium">{userName || "Tameeka Lockhart"}</p>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="px-5 py-2 bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 rounded-xl text-[#0F172A] font-bold text-[12px] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6 md:pb-8">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Final Record</h2>
          <p className="text-base md:text-lg text-[#64748B] font-medium">Draft, manage, and distribute the official life story for your estate.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-2xl font-bold text-[13px] transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Review & Sign
          </button>
          <button className="bg-[#C8A951] hover:bg-[#b8993f] text-white px-6 py-3 rounded-2xl font-bold text-[13px] transition-all shadow-lg flex items-center gap-2 active:scale-95">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-8 max-md:grid-cols-1">
        <div className="space-y-6">
          {/* Portrait */}
          <div 
            className="aspect-[3/4] rounded-[2rem] bg-[#F8FAFC] relative border border-slate-200 group overflow-hidden shadow-sm cursor-pointer"
            onClick={() => setShowPhotoModal(true)}
          >
             {profilePhoto ? (
               <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Portrait" />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-slate-300 p-8">
                 <svg viewBox="0 0 24 24" className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
               </div>
             )}
             <button className="absolute bottom-4 left-4 right-4 py-2.5 bg-white/90 backdrop-blur-md rounded-xl text-[#0F172A] font-bold text-[12px] translate-y-12 group-hover:translate-y-0 transition-transform shadow-md">Update Photo</button>
          </div>
          
          {/* Vital Stats */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Details</h4>
            <div className="space-y-3">
              <StatRow label="Status" value={isSigned ? "Finalized" : obit?.status} color={isSigned ? "green" : "blue"} />
              <StatRow label="Last Update" value="Today, 9:22 PM" />
              <StatRow label="Visibility" value="Family Only" />
              <StatRow label="Verification" value={isSigned ? "Verified" : "Pending review"} color={isSigned ? "green" : "amber"} />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
          <div className="bg-[#F8FAFC] px-6 py-4 flex justify-between items-center border-b border-slate-100 rounded-t-[2rem]">
             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Obituary Draft</span>
             <div className="flex items-center gap-4">
               {!isSigned && (
                 <button
                   onClick={handleAiAssist}
                   disabled={aiAssisting}
                   className="text-[#C8A951] font-bold text-[12px] hover:text-[#133378] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                 >
                   {aiAssisting ? (
                     <div className="w-3 h-3 border-2 border-[#C8A951]/30 border-t-[#C8A951] rounded-full animate-spin" />
                   ) : (
                     <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                       <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
                       <line x1="9" y1="21" x2="15" y2="21" />
                     </svg>
                   )}
                   {aiAssisting ? 'Generating...' : 'AI Assist'}
                 </button>
               )}
               {!editing && !isSigned && (
                 <button onClick={() => setEditing(true)} className="text-[#133378] font-bold text-[12px] hover:underline">Edit</button>
               )}
               {editing && (
                 <button onClick={handleSave} className="text-green-600 font-bold text-[12px] hover:underline">{saving ? 'Saving...' : 'Save Draft'}</button>
               )}
               {isSigned && (
                 <div className="flex items-center gap-1.5 text-green-600 font-bold text-[11px]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    Finalized
                 </div>
               )}
             </div>
          </div>
          <div className="flex-1 p-8">
             {editing ? (
               <textarea 
                  ref={textAreaRef}
                  defaultValue={obit?.content}
                  className="w-full h-full min-h-[400px] border-none focus:ring-0 text-[#0F172A] font-[family-name:var(--font-inter)] leading-relaxed text-lg outline-none resize-none"
                  placeholder="Start drafting the final record here..."
               />
             ) : (
               <p className="text-[#0F172A] font-[family-name:var(--font-inter)] leading-relaxed text-lg whitespace-pre-wrap">
                 {obit?.content || "No content drafted yet. Click 'Edit' to begin writing the record."}
               </p>
             )}
          </div>
        </div>
      </div>

      {/* Sign Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-xl p-4">
          <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-12 max-w-2xl w-full border border-slate-100 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#133378] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] mb-2">Review & Sign</h3>
              <p className="text-[#64748B] font-medium max-w-md mx-auto">By signing this document, you are establishing the official record for your estate.</p>
            </div>
            
            <div className="bg-[#F8FAFC] p-6 rounded-2xl mb-8 border border-slate-100 max-h-[200px] overflow-y-auto">
               <p className="text-[#64748B] text-sm italic leading-relaxed">"{obit?.content || 'No content drafted yet...'}"</p>
            </div>

            <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-200 mb-8 text-center">
               <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Signature</label>
               <div className="h-20 border-b-2 border-[#0F172A]/30 flex items-center justify-center text-slate-300 font-serif italic text-3xl select-none">
                  {isSigned ? <span className="text-[#0F172A] font-[family-name:var(--font-cinzel)]">{userName || 'Legal Guardian'}</span> : 'Sign here'}
               </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-[#64748B] text-sm hover:bg-slate-50 transition-colors active:scale-95">Cancel</button>
              <button 
                onClick={() => {
                  setIsSigned(true);
                  setTimeout(() => setModalOpen(false), 800);
                }}
                className="flex-1 py-4 rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-sm transition-all shadow-lg active:scale-95"
              >
                {isSigned ? 'Signed & Sealed' : 'Sign Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-[#133378]/5 text-[#133378] border-[#133378]/10',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };
  const badgeStyle = color ? colorMap[color] || '' : '';
  
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-[13px] text-[#64748B] font-medium">{label}</span>
      {color ? (
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badgeStyle}`}>{value}</span>
      ) : (
        <span className="text-[13px] font-bold text-[#0F172A]">{value}</span>
      )}
    </div>
  );
}
