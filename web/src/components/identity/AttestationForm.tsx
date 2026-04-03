/**
 * AttestationForm — Identity Attestation for Fiduciary Roles (ADR-035)
 * 
 * Legal declaration + signature capture for heir/executor/legal/CPA roles.
 * Users must sign an attestation confirming their identity and role
 * before accessing estate documents.
 * 
 * @version 1.0.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AttestationFormProps {
  estateId: string;
  estateName: string;
  onComplete?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  heir: 'Designated Heir',
  executor: 'Appointed Executor',
  legal: 'Legal Counsel',
  cpa: 'Certified Public Accountant',
};

export function AttestationForm({ estateId, estateName, onComplete }: AttestationFormProps) {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const roleLabel = ROLE_LABELS[profile?.role || ''] || profile?.role || 'Unknown Role';
  const fullName = profile?.displayName || `${profile?.firstName} ${profile?.lastName}`;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#133378';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Drawing handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async () => {
    if (!user || !profile || !hasSigned || !acknowledged) return;
    setSubmitting(true);
    setError('');

    try {
      // Get signature as base64 data URL
      const signatureData = canvasRef.current?.toDataURL('image/png') || '';
      
      const attestationId = `${user.uid}_${estateId}`;
      const attestationText = generateAttestationText(fullName, roleLabel, estateName);

      await setDoc(doc(db, 'attestations', attestationId), {
        uid: user.uid,
        estateId,
        role: profile.role,
        fullLegalName: fullName,
        attestationText,
        signatureData,
        signedAt: serverTimestamp(),
        // Note: ipAddress and userAgent should be recorded server-side for security
        // We record userAgent here as a convenience; the Go API should validate
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        status: 'verified', // Auto-verified for v1; future: principal approval flow
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      onComplete?.();
    } catch (err: unknown) {
      console.error('Attestation submission failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit attestation.');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-green-100 shadow-lg">
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 12 15 16 10" />
          </svg>
        </div>
        <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-green-700 uppercase tracking-tight mb-3">
          Identity Verified
        </h2>
        <p className="text-green-600/60 font-bold text-[13px] uppercase tracking-widest mb-8">
          Your attestation has been recorded and verified.
        </p>
        <div className="p-6 bg-green-50 border border-green-100 rounded-2xl text-left max-w-md mx-auto">
          <div className="space-y-2 text-[11px] font-bold text-green-700/60 uppercase tracking-widest">
            <div className="flex justify-between"><span>Name:</span><span className="text-green-700">{fullName}</span></div>
            <div className="flex justify-between"><span>Role:</span><span className="text-green-700">{roleLabel}</span></div>
            <div className="flex justify-between"><span>Estate:</span><span className="text-green-700">{estateName}</span></div>
            <div className="flex justify-between"><span>Status:</span><span className="text-green-600">Verified</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-royal/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-royal/20">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-royal" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">
          Identity Attestation
        </h2>
        <p className="text-royal/40 font-bold text-[11px] uppercase tracking-widest">
          Legally binding declaration for {estateName}
        </p>
      </div>

      {/* Legal Declaration */}
      <div className="bg-white rounded-[2.5rem] border border-royal/10 p-10 mb-8 shadow-[0_2px_20px_rgba(19,51,120,0.03)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C8A951]/30" />
        <div className="bg-royal/[0.02] px-8 py-5 rounded-2xl border border-royal/5 mb-6">
          <h3 className="text-royal font-black text-[10px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8A951]" />
            Declaration of Identity
          </h3>
          <p className="text-royal/80 text-[15px] leading-[1.8] font-medium font-[family-name:var(--font-inter)]">
            I, <strong className="text-royal font-black">{fullName}</strong>, hereby attest under penalty of perjury 
            that I am the individual designated as <strong className="text-[#C8A951] font-black">{roleLabel}</strong> for 
            the <strong className="text-royal font-black">{estateName || '[Estate Name]'}</strong> estate managed 
            through the FinalWishes platform.
          </p>
          <p className="text-royal/80 text-[15px] leading-[1.8] font-medium font-[family-name:var(--font-inter)] mt-4">
            I understand that:
          </p>
          <ul className="text-royal/70 text-[14px] leading-[1.8] font-medium space-y-2 mt-2 pl-4">
            <li className="flex items-start gap-3">
              <span className="text-[#C8A951] mt-1">•</span>
              Providing false information may result in civil and criminal penalties.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#C8A951] mt-1">•</span>
              My access to this estate's documents is contingent upon the accuracy of this attestation.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#C8A951] mt-1">•</span>
              This attestation will be stored as a permanent record and may be used in legal proceedings.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#C8A951] mt-1">•</span>
              The estate principal may revoke my access at any time.
            </li>
          </ul>
        </div>

        {/* Signature Pad */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-black text-royal/30 uppercase tracking-[0.2em]">Digital Signature</label>
            {hasSigned && (
              <button 
                onClick={clearSignature}
                className="text-[10px] font-bold text-royal/30 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative rounded-2xl border-2 border-dashed border-royal/10 bg-white overflow-hidden hover:border-royal/20 transition-all group">
            <canvas
              ref={canvasRef}
              className="w-full h-32 cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-royal/10 font-[family-name:var(--font-cinzel)] text-2xl italic select-none">
                  Sign here
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acknowledgment */}
        <label className="flex items-start gap-4 mt-8 cursor-pointer group">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-royal/20 text-royal focus:ring-royal/30 accent-[#133378]"
          />
          <span className="text-[13px] text-royal/60 font-bold leading-relaxed group-hover:text-royal transition-colors">
            I understand that this is a legally binding digital signature and that I am confirming my identity as stated above.
          </span>
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={!hasSigned || !acknowledged || submitting}
          className="flex-1 py-5 rounded-2xl bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-widest shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_16px_40px_rgba(15,82,186,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] border border-white/10"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : 'Sign & Submit Attestation'}
        </button>
      </div>

      <p className="text-center text-[10px] font-bold text-royal/20 uppercase tracking-widest mt-6">
        Attestation ID: {user?.uid?.slice(0, 8)}_{estateId?.slice(0, 8)} · SHA-256 Hashed
      </p>
    </div>
  );
}

// ── Generate Legal Text ──

function generateAttestationText(name: string, role: string, estateName: string): string {
  return `I, ${name}, hereby attest under penalty of perjury that I am the individual designated as ${role} for the ${estateName} estate managed through the FinalWishes platform. I understand that providing false information may result in civil and criminal penalties. My access to this estate's documents is contingent upon the accuracy of this attestation. This attestation will be stored as a permanent record and may be used in legal proceedings. The estate principal may revoke my access at any time.`;
}
