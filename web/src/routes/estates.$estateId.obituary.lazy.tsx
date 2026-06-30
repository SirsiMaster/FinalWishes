/* eslint-disable react-refresh/only-export-components */
import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useDocument, useEstateHeirs, useCollection } from '../lib/firestore'
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, type Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { estateClient } from '../lib/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Download, QrCode } from 'lucide-react'
import { ShareMemorial } from '@/components/estate/ShareMemorial'
import { ObituaryShepherd } from '@/components/estate/ObituaryShepherd'
import { EditorToolbar } from './estates.$estateId.directives.lazy'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export const Route = createLazyFileRoute('/estates/$estateId/obituary')({
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
  const [shareLoading, setShareLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [shareMemorialOpen, setShareMemorialOpen] = useState(false);
  const [shepherdOpen, setShepherdOpen] = useState(false);
  // The freshest accepted obituary HTML, set synchronously by the Shepherd handoff
  // and by editor saves — so delivery (PDF/email/publish) never races the async
  // Firestore write of obit.content. Falls back to obit.content when unset.
  const [liveContent, setLiveContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const estateId = routeId;
  const { user, profile } = useAuth();
  const userName = profile?.displayName || '';
  const profilePhoto = profile?.profilePhotoUrl;

  const { data: obit, loading: isLoading } = useDocument<ObitDocument>(`estates/${estateId}/governance/obituary`);
  const { data: heirs } = useEstateHeirs(estateId);
  const { data: events } = useCollection<{ type: string; date: string; time?: string; location: string; address?: string; notes?: string }>(
    `estates/${estateId}/events`,
    []
  );
  const serviceEvent = events.find(e => e.type === 'funeral' || e.type === 'memorial_service');

  // Planning mode drives the Shepherd's voice: 'after_loss' = settling a loss
  // (speak in third person about "them"); otherwise the principal plans ahead.
  const { data: intake } = useDocument<{ planningMode?: string }>(`estates/${estateId}/metadata/intake`);
  const shepherdSubject: 'self' | 'other' = intake?.planningMode === 'after_loss' ? 'other' : 'self';
  const heirNames = useMemo(() => (heirs?.map((h) => h.fullName).filter(Boolean) as string[]) || [], [heirs]);

  const isSigned = !!obit?.signature;

  // Backwards-compatible: wrap plaintext in <p> tags
  const initialContent = useMemo(() => {
    const raw = obit?.content;
    if (!raw) return '';
    if (raw.trimStart().startsWith('<')) return raw;
    return raw.split('\n').filter(Boolean).map(line => `<p>${line}</p>`).join('');
  }, [obit?.content]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent || '<p>Start drafting the final record here...</p>',
    editable: editing && !isSigned,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none min-h-[400px] focus:outline-none p-8 text-ink font-[family-name:var(--font-inter)] leading-relaxed',
      },
    },
  });

  // Sync editable state when editing or isSigned changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editing && !isSigned);
    }
  }, [editor, editing, isSigned]);

  // Sync loaded content into the editor once the obituary loads from Firestore.
  // TipTap only consumes `content` at creation, so a saved obituary that arrives
  // after mount would otherwise render blank. Don't clobber an in-progress edit.
  useEffect(() => {
    if (editor && initialContent && !editing && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent, editing]);

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
    if (!editor) return;
    const content = editor.getHTML();
    setLiveContent(content);
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

  // Receive the finished draft from the guided Shepherd: drop it into the editor,
  // switch to editing so the family can refine, and persist it as a draft.
  const handleShepherdDraft = useCallback((text: string) => {
    const htmlDraft = text.trimStart().startsWith('<')
      ? text
      : text.split('\n').filter(Boolean).map((line) => `<p>${line}</p>`).join('');
    setLiveContent(htmlDraft);
    setEditing(true);
    setTimeout(() => editor?.commands.setContent(htmlDraft), 100);
    void setDoc(doc(db, `estates/${estateId}/governance`, 'obituary'), {
      content: htmlDraft,
      status: 'Draft',
      last_updated: serverTimestamp(),
    }, { merge: true }).catch((err) => {
      console.error('[ShepherdDraft] Save error:', err);
      toast.error('Draft is in the editor but could not be saved yet — press Save Draft.');
    });
  }, [editor, estateId]);

  // Freshest accepted obituary content — prefers the synchronously-set draft/edit
  // over the async Firestore hook, so delivery right after "Use this draft" is never
  // stale or blank (codex-finalwishes spine validation).
  const resolveContent = useCallback(() => liveContent ?? obit?.content ?? '', [liveContent, obit?.content]);

  // Shared obituary email body. Rendered by the recipient's email client OUTSIDE
  // the app's CSS scope, so colors MUST be literal hex (Royal Neo-Deco ink/muted).
  const buildObitEmail = useCallback(() => ({
    subject: `Obituary: ${userName || 'Estate Record'}`,
    html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
              <h1 style="font-family: 'Cinzel', serif; color: #142848; font-size: 28px; margin-bottom: 8px;">Final Record</h1>
              <p style="color: #4A5C7A; font-size: 14px; margin-bottom: 24px;">Official obituary for the ${userName || 'estate'} record.</p>
              <div style="background: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; white-space: pre-wrap; color: #142848; font-size: 16px; line-height: 1.7;">
                ${resolveContent().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
              </div>
              ${isSigned ? `<p style="margin-top: 24px; color: #16a34a; font-weight: bold;">Signed by: ${obit?.signature}</p>` : ''}
              <p style="margin-top: 32px; color: #4A5C7A; font-size: 11px;">Sent from FinalWishes Estate Platform</p>
            </div>
          `,
  }), [userName, resolveContent, obit?.signature, isSigned]);

  // Email the obituary to a list of recipients (one mail doc each → sendMail trigger).
  // createdBy MUST be the caller (the mail create rule pins it to request.auth.uid).
  const handleEmailTo = useCallback(async (recipients: { name?: string; email: string }[]) => {
    if (!resolveContent()) throw new Error('No obituary to send');
    const list = recipients.length ? recipients : (profile?.email ? [{ email: profile.email }] : []);
    if (!list.length) throw new Error('No recipient email available');
    const { subject, html } = buildObitEmail();
    for (const r of list) {
      await addDoc(collection(db, 'mail'), {
        to: r.email,
        createdBy: user?.uid,
        message: { subject, html },
        estateId,
        createdAt: serverTimestamp(),
      });
    }
  }, [resolveContent, profile?.email, buildObitEmail, user?.uid, estateId]);

  const handleShare = async () => {
    if (!obit?.content) return;
    setShareLoading(true);
    try {
      await handleEmailTo(profile?.email ? [{ email: profile.email }] : []);
      toast.success('Obituary shared via email.');
    } catch (err) {
      console.error('[ShareObituary] Error:', err);
      toast.error('Failed to share obituary. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  // Shepherd media step: upload device photos, return their URLs (for thumbnails).
  // The first becomes the memorial portrait if none is set yet.
  const handleAddDevicePhotos = useCallback(async (files: FileList): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId, fileName: file.name, contentType: file.type || 'image/jpeg',
      });
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file });
      urls.push(finalUrl);
    }
    if (urls.length && user && !profilePhoto) {
      await setDoc(doc(db, 'users', user.uid), { profilePhotoUrl: urls[0], updatedAt: serverTimestamp() }, { merge: true });
    }
    return urls;
  }, [estateId, user, profilePhoto]);

  // Shepherd deliver step: publish the public memorial (mirrors ShareMemorial's
  // public_memorials shape), return its shareable URL.
  const handlePublishMemorial = useCallback(async (): Promise<{ url: string }> => {
    const memorialId = estateId;
    const ref = doc(db, 'public_memorials', memorialId);
    const isUpdate = (await getDoc(ref)).exists();
    await setDoc(ref, {
      estateId,
      personName: userName || 'Memorial',
      obituaryContent: resolveContent(),
      profilePhotoUrl: profilePhoto || null,
      birthDate: profile?.birthDate || null,
      deathDate: profile?.deathDate || null,
      serviceDetails: serviceEvent ? { type: serviceEvent.type, date: serviceEvent.date, time: serviceEvent.time, location: serviceEvent.location, address: serviceEvent.address, notes: serviceEvent.notes } : null,
      publishedBy: user?.uid,
      ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    });
    return { url: `${window.location.origin}/memorial/${memorialId}` };
  }, [estateId, userName, resolveContent, profilePhoto, profile?.birthDate, profile?.deathDate, serviceEvent, user?.uid]);

  const heirContacts = useMemo(
    () => (heirs || [])
      .map((h) => ({ name: h.fullName, email: h.email }))
      .filter((h): h is { name: string; email: string } => !!h.email),
    [heirs],
  );

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

  const handleExportPDF = useCallback(async () => {
    const content = resolveContent();
    if (!content) return;
    const { pdf } = await import('@react-pdf/renderer');
    const { ObituaryPDF } = await import('@/components/pdf/ObituaryPDF');
    const blob = await pdf(
      <ObituaryPDF
        name={userName || 'Estate Principal'}
        content={content}
        photoUrl={profilePhoto}
        date={new Date().toLocaleDateString()}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(userName || 'Obituary').replace(/[^a-zA-Z0-9]/g, '_')}_Obituary.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [resolveContent, userName, profilePhoto]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.2em]">Loading record...</span>
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
        aria-label="Upload profile photo"
      />

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] rounded-[2rem] p-0 overflow-hidden border-neutral-border" showCloseButton={false}>
          {profilePhoto ? (
            <img
              src={profilePhoto}
              className="max-w-full max-h-[80vh] object-contain block mx-auto"
              alt="Heritage Portrait"
            />
          ) : (
            <div className="flex items-center justify-center h-[50vh] bg-[var(--royal)]/5">
              <span className="text-8xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)]/30">{initials}</span>
            </div>
          )}
          <div className="w-full p-6 bg-white border-t border-neutral-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-royal font-[family-name:var(--font-cinzel)]">Heritage Portrait</h3>
              <p className="text-[13px] text-ink-muted font-medium">{userName || 'Estate Principal'}</p>
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
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-royal">Final Record</h2>
          <p className="text-lg text-ink-muted font-medium">Draft, manage, and distribute the official life story for your estate.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShepherdOpen(true)}
            disabled={isSigned}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            {obit?.content ? 'Rewrite with Shepherd' : 'Write with Shepherd'}
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            Review & Sign
          </Button>
          {obit?.content && (
            <Button
              onClick={handleExportPDF}
              className="bg-neutral-faint hover:bg-[var(--neutral-border)] text-ink px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          )}
          <Button
            onClick={() => setShareMemorialOpen(true)}
            disabled={!obit?.content}
            className="bg-[#059669] hover:bg-[#047857] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-sm active:scale-95 disabled:opacity-50"
          >
            <QrCode className="w-4 h-4" />
            Public Memorial
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareLoading || !obit?.content}
            className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white px-6 py-3 h-auto rounded-2xl font-bold text-[13px] shadow-lg active:scale-95 disabled:opacity-50"
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
            className="aspect-[3/4] relative group overflow-hidden shadow-sm cursor-pointer rounded-[2rem] p-0 border-neutral-border"
            onClick={() => setShowPhotoModal(true)}
          >
             {profilePhoto ? (
               <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Portrait" />
             ) : (
               <div className="absolute inset-0 flex items-center justify-center bg-[var(--royal)]/5">
                 <span className="text-6xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)]/20">{initials}</span>
               </div>
             )}
             <Button
               className="absolute bottom-4 left-4 right-4 w-[calc(100%-2rem)] py-2.5 bg-white/90 backdrop-blur-md rounded-xl text-ink font-bold text-[12px] translate-y-12 group-hover:translate-y-0 transition-transform shadow-md hover:bg-white/95 h-auto border-none"
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
          <Card className="rounded-[2rem] border-neutral-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Details</CardTitle>
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
        <Card className="rounded-[2rem] border-neutral-border shadow-sm flex flex-col min-h-[500px] p-0">
          <CardHeader className="bg-neutral-faint px-6 py-4 flex-row justify-between items-center border-b border-neutral-border rounded-t-[2rem]">
             <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Obituary Draft</span>
             {!editing && !isSigned && (
               <Button variant="link" onClick={() => setEditing(true)} className="text-[var(--royal)] font-bold text-[12px] p-0 h-auto">Edit</Button>
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
          {/* Toolbar — only visible when editing */}
          {editing && !isSigned && editor && (
            <EditorToolbar editor={editor} className="mx-6 mt-4" />
          )}
          <CardContent className="flex-1 p-0">
            <EditorContent editor={editor} />
          </CardContent>
        </Card>
      </div>

      {/* Sign Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] p-12 border-neutral-border shadow-2xl" showCloseButton={false}>
          <DialogHeader className="text-center items-center">
            <div className="w-16 h-16 bg-[var(--royal)] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <DialogTitle className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-royal">Review & Sign</DialogTitle>
            <DialogDescription className="text-ink-muted font-medium max-w-md mx-auto">By signing this document, you are establishing the official record for your estate.</DialogDescription>
          </DialogHeader>

          <div className="bg-neutral-faint p-6 rounded-2xl mb-4 border border-neutral-border max-h-[200px] overflow-y-auto">
             <p className="text-ink-muted text-sm italic leading-relaxed">"{obit?.content || 'No content drafted yet...'}"</p>
          </div>

          <div className="bg-neutral-faint p-6 rounded-2xl border border-neutral-border mb-4 text-center">
             <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-4 block">Signature</span>
             <div className="h-20 border-b-2 border-royal/30 flex items-center justify-center text-ink-muted font-serif italic text-3xl select-none">
                {isSigned ? <span className="text-royal font-[family-name:var(--font-cinzel)]">{obit?.signature || userName || 'Legal Guardian'}</span> : 'Sign here'}
             </div>
          </div>

          <DialogFooter className="flex-row gap-4 bg-transparent border-none mx-0 mb-0 p-0 rounded-none">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-4 h-auto rounded-2xl border-neutral-border font-bold text-ink-muted text-sm hover:bg-neutral-faint active:scale-95"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={isSigned}
              className="flex-1 py-4 h-auto rounded-2xl bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white font-bold text-sm shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSigned ? 'Signed & Sealed' : 'Sign Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ObituaryShepherd
        estateId={estateId}
        open={shepherdOpen}
        onOpenChange={setShepherdOpen}
        subjectName={userName}
        subject={shepherdSubject}
        heirNames={heirNames}
        heirContacts={heirContacts}
        service={serviceEvent ? { type: serviceEvent.type, date: serviceEvent.date, time: serviceEvent.time, location: serviceEvent.location, address: serviceEvent.address } : undefined}
        onDraftReady={handleShepherdDraft}
        onAddDevicePhotos={handleAddDevicePhotos}
        onExportPDF={handleExportPDF}
        onEmailTo={handleEmailTo}
        onPublishMemorial={handlePublishMemorial}
      />

      <ShareMemorial
        estateId={estateId}
        open={shareMemorialOpen}
        onOpenChange={setShareMemorialOpen}
        personName={userName || 'Memorial'}
        obituaryContent={obit?.content}
        profilePhotoUrl={profilePhoto}
        birthDate={profile?.birthDate}
        deathDate={profile?.deathDate}
        serviceDetails={serviceEvent ? { type: serviceEvent.type, date: serviceEvent.date, time: serviceEvent.time, location: serviceEvent.location, address: serviceEvent.address, notes: serviceEvent.notes } : undefined}
      />
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-[var(--royal)]/5 text-[var(--royal)] border-[var(--royal)]/10',
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };
  const badgeStyle = color ? colorMap[color] || '' : '';

  return (
    <div className="flex justify-between items-center py-2.5 border-b border-neutral-border last:border-b-0">
      <span className="text-[13px] text-ink-muted font-medium">{label}</span>
      {color ? (
        <Badge variant="outline" className={`text-[11px] font-bold px-2.5 py-1 rounded-lg h-auto ${badgeStyle}`}>{value}</Badge>
      ) : (
        <span className="text-[13px] font-bold text-ink">{value}</span>
      )}
    </div>
  );
}
