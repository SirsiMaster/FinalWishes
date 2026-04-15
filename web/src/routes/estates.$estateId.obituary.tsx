/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useDocument, useEstateHeirs } from '../lib/firestore'
import { doc, setDoc, addDoc, collection, serverTimestamp, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { estateClient } from '../lib/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const Route = createFileRoute('/estates/$estateId/obituary')({
  component: ObituaryPage,
})

interface ObitDocument {
  content?: string;
  status?: string;
  signature?: string;
  signedAt?: Timestamp;
  last_updated?: Timestamp;
}

function ObituaryPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/obituary' });
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const estateId = routeId;
  const { user, profile } = useAuth();
  const userName = profile?.displayName || '';
  const profilePhoto = profile?.profilePhotoUrl;

  const { data: obit, loading: isLoading } = useDocument<ObitDocument>(`estates/${estateId}/governance/obituary`);
  const { data: heirs } = useEstateHeirs(estateId);

  const isSigned = !!obit?.signature;

  // Format the last_updated timestamp for display
  const lastUpdateDisplay = useMemo(() => {
    if (!obit?.last_updated) return 'Never';
    const ts = obit.last_updated;
    // Firestore Timestamp has toDate()
    const tsObj = ts as { toDate?: () => Date };
    const date = typeof tsObj.toDate === 'function' ? tsObj.toDate() : new Date(ts as unknown as string);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (diffHours < 48) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }, [obit?.last_updated]);

  // Generate initials for placeholder avatar
  const initials = useMemo(() => {
    if (!userName) return '?';
    const parts = userName.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
  }, [userName]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);

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
      toast.error('Failed to save obituary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    try {
      await setDoc(doc(db, `estates/${estateId}/governance`, 'obituary'), {
        signature: userName || 'Legal Guardian',
        signedAt: serverTimestamp(),
        status: 'Finalized',
        last_updated: serverTimestamp(),
      }, { merge: true });
      setTimeout(() => setModalOpen(false), 800);
    } catch (err) {
      console.error('[SignObituary] Error:', err);
      toast.error('Failed to sign obituary. Please try again.');
    }
  };

  const handleAIDraft = async () => {
    setAiLoading(true);
    try {
      const survivorNames = heirs?.map((h) => h.fullName).filter(Boolean) || [];
      const prompt = `Write a respectful obituary draft for ${userName || 'the estate principal'}. Survivors include: ${survivorNames.length > 0 ? survivorNames.join(', ') : 'family members (not yet specified)'}. Keep the tone dignified and warm.`;

      const token = user ? await user.getIdToken() : null;
      const res = await fetch(`${API_BASE}/api/v1/guidance/assist-obituary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, estateId }),
      });

      if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
      const data = await res.json();
      const draft = data.content || data.text || data.response || '';

      // Populate the textarea — switch to editing mode if not already
      if (!editing) setEditing(true);
      // Use a short delay so the textarea renders before we set its value
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.value = draft;
        }
      }, 100);
    } catch (err) {
      console.error('[AIDraft] Error:', err);
      toast.error('Failed to generate AI draft. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleShare = async () => {
    if (!obit?.content) return;
    setShareLoading(true);
    try {
      // Create a mail document in Firestore — triggers SendGrid via Firebase Extension
      await addDoc(collection(db, 'mail'), {
        to: profile?.email || '',
        message: {
          subject: `Obituary: ${userName || 'Estate Record'}`,
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
              <h1 style="font-family: 'Cinzel', serif; color: #0F172A; font-size: 28px; margin-bottom: 8px;">Final Record</h1>
              <p style="color: #64748B; font-size: 14px; margin-bottom: 24px;">Official obituary for the ${userName || 'estate'} record.</p>
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; white-space: pre-wrap; color: #0F172A; font-size: 16px; line-height: 1.7;">
                ${obit.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
              </div>
              ${isSigned ? `<p style="margin-top: 24px; color: #16a34a; font-weight: bold;">Signed by: ${obit.signature}</p>` : ''}
              <p style="margin-top: 32px; color: #94A3B8; font-size: 11px;">Sent from FinalWishes Estate Platform</p>
            </div>
          `,
        },
        estateId,
        createdAt: serverTimestamp(),
      });
      toast.success('Obituary shared via email.');
    } catch (err) {
      console.error('[ShareObituary] Error:', err);
      toast.error('Failed to share obituary. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUpdatePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId,
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
      });

      // Upload to Cloud Storage via signed URL
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      // Update user profile with new photo URL
      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          profilePhotoUrl: finalUrl,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.error('[UpdatePhoto] Error:', err);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [estateId, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Loading record...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:p-8 lg:p-12 space-y-8 md:space-y-16 pb-20">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpdatePhoto}
      />

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] rounded-[2rem] p-0 overflow-hidden border-slate-200" showCloseButton={false}>
          {profilePhoto ? (
            <img
              src={profilePhoto}
              className="max-w-full max-h-[80vh] object-contain block mx-auto"
              alt="Heritage Portrait"
            />
          ) : (
            <div className="flex items-center justify-center h-[50vh] bg-[#133378]/5">
              <span className="text-8xl font-[family-name:var(--font-cinzel)] font-bold text-[#133378]/30">{initials}</span>
            </div>
          )}
          <div className="w-full p-6 bg-white border-t border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Heritage Portrait</h3>
              <p className="text-[13px] text-[#64748B] font-medium">{userName || 'Estate Principal'}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPhotoModal(false)}
              className="px-5 py-2 rounded-xl font-bold text-[12px]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-end pb-8">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Final Record</h2>
          <p className="text-lg text-[#64748B] font-medium">Draft, manage, and distribute the official life story for your estate.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleAIDraft}
            disabled={aiLoading || isSigned}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Drafting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                AI Draft
              </>
            )}
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Review & Sign
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareLoading || !obit?.content}
            className="bg-[#C8A951] hover:bg-[#b8993f] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-50"
          >
            {shareLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                Share
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator className="mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 md:gap-8">
        <div className="space-y-6">
          {/* Portrait */}
          <Card
            className="aspect-[3/4] relative group overflow-hidden shadow-sm cursor-pointer rounded-[2rem] p-0 border-slate-200"
            onClick={() => setShowPhotoModal(true)}
          >
             {profilePhoto ? (
               <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Portrait" />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center bg-[#133378]/5">
                 <span className="text-6xl font-[family-name:var(--font-cinzel)] font-bold text-[#133378]/20">{initials}</span>
               </div>
             )}
             <Button
               className="absolute bottom-4 left-4 right-4 w-[calc(100%-2rem)] py-2.5 bg-white/90 backdrop-blur-md rounded-xl text-[#0F172A] font-bold text-[12px] translate-y-12 group-hover:translate-y-0 transition-transform shadow-md hover:bg-white/95 h-auto border-none"
               onClick={(e) => {
                 e.stopPropagation();
                 fileInputRef.current?.click();
               }}
               disabled={photoUploading}
             >
               {photoUploading ? 'Uploading...' : 'Update Photo'}
             </Button>
          </Card>

          {/* Vital Stats */}
          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <StatRow label="Status" value={isSigned ? "Finalized" : obit?.status || "Not Started"} color={isSigned ? "green" : "blue"} />
                <StatRow label="Last Update" value={lastUpdateDisplay} />
                <StatRow label="Visibility" value="Family Only" />
                <StatRow label="Verification" value={isSigned ? "Verified" : "Pending review"} color={isSigned ? "green" : "amber"} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <Card className="rounded-[2rem] border-slate-100 shadow-sm flex flex-col min-h-[500px] p-0">
          <CardHeader className="bg-[#F8FAFC] px-6 py-4 flex-row justify-between items-center border-b border-slate-100 rounded-t-[2rem]">
             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Obituary Draft</span>
             {!editing && !isSigned && (
               <Button variant="link" onClick={() => setEditing(true)} className="text-[#133378] font-bold text-[12px] p-0 h-auto">Edit</Button>
             )}
             {editing && (
               <Button variant="link" onClick={handleSave} className="text-green-600 font-bold text-[12px] p-0 h-auto">{saving ? 'Saving...' : 'Save Draft'}</Button>
             )}
             {isSigned && (
               <div className="flex items-center gap-1.5 text-green-600 font-bold text-[11px]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Finalized
               </div>
             )}
          </CardHeader>
          <CardContent className="flex-1 p-8">
             {editing ? (
               <Textarea
                  ref={textAreaRef}
                  defaultValue={obit?.content}
                  className="w-full h-full min-h-[400px] border-none focus-visible:ring-0 focus-visible:border-transparent text-[#0F172A] font-[family-name:var(--font-inter)] leading-relaxed text-lg outline-none resize-none"
                  placeholder="Start drafting the final record here..."
               />
             ) : (
               <p className="text-[#0F172A] font-[family-name:var(--font-inter)] leading-relaxed text-lg whitespace-pre-wrap">
                 {obit?.content || "No content drafted yet. Click 'Edit' to begin writing the record."}
               </p>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Sign Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] p-12 border-slate-100 shadow-2xl" showCloseButton={false}>
          <DialogHeader className="text-center items-center">
            <div className="w-16 h-16 bg-[#133378] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Review & Sign</DialogTitle>
            <DialogDescription className="text-[#64748B] font-medium max-w-md mx-auto">By signing this document, you are establishing the official record for your estate.</DialogDescription>
          </DialogHeader>

          <div className="bg-[#F8FAFC] p-6 rounded-2xl mb-4 border border-slate-100 max-h-[200px] overflow-y-auto">
             <p className="text-[#64748B] text-sm italic leading-relaxed">"{obit?.content || 'No content drafted yet...'}"</p>
          </div>

          <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-slate-200 mb-4 text-center">
             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Signature</label>
             <div className="h-20 border-b-2 border-[#0F172A]/30 flex items-center justify-center text-slate-300 font-serif italic text-3xl select-none">
                {isSigned ? <span className="text-[#0F172A] font-[family-name:var(--font-cinzel)]">{obit?.signature || userName || 'Legal Guardian'}</span> : 'Sign here'}
             </div>
          </div>

          <DialogFooter className="flex-row gap-4 bg-transparent border-none mx-0 mb-0 p-0 rounded-none">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-4 h-auto rounded-2xl border-slate-200 font-bold text-[#64748B] text-sm hover:bg-slate-50 active:scale-95"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={isSigned}
              className="flex-1 py-4 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-white font-bold text-sm shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSigned ? 'Signed & Sealed' : 'Sign Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <Badge variant="outline" className={`text-[11px] font-bold px-2.5 py-1 rounded-lg h-auto ${badgeStyle}`}>{value}</Badge>
      ) : (
        <span className="text-[13px] font-bold text-[#0F172A]">{value}</span>
      )}
    </div>
  );
}
