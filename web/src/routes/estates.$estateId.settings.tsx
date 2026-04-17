/* eslint-disable react-refresh/only-export-components */
/**
 * Settings Page — Estate Governance + Profile
 *
 * Reads governance settings from Firestore.
 * Allows profile viewing and estate-level setting management.
 * MFA enrollment and team invitation components are integrated.
 *
 * @version 3.0.0 — Refactored to shadcn/ui primitives
 */

import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  useDocument,
  useCollection,
  useEstate,
  useEstateAssets,
  useEstateHeirs,
  useEstateDocuments,
  useLockboxItems,
  useDirectives,
  useTimeCapsules,
  useHeirlooms,
} from '../lib/firestore'
import { doc, setDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { estateClient } from '../lib/client'
import { getMFAStatus } from '../lib/mfa'
import { exportEstateData, downloadBlob } from '../lib/export'
import { MFAEnrollment } from '../components/identity/MFAEnrollment'
import { InviteTeamMember } from '../components/estate/InviteTeamMember'
import { SettlementPanel } from '../components/estate/SettlementPanel'
import { auth } from '../lib/firebase'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

const ROLE_DISPLAY: Record<string, string> = {
  principal: 'Estate Owner',
  admin: 'Administrator',
  executor: 'Legal Executor',
  heir: 'Beneficiary',
  legal: 'Legal Counsel',
  cpa: 'CPA Advisor',
};

export const Route = createFileRoute('/estates/$estateId/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/settings' });
  const { user, profile } = useAuth();
  const estateId = routeId;

  const { data: settingsDoc, loading: isLoading } = useDocument<Record<string, unknown>>(`estates/${estateId}/governance/settings`);

  // ── Estate data hooks for ZIP export ──
  const { data: estate } = useEstate(estateId);
  const { data: assets } = useEstateAssets(estateId);
  const { data: heirs } = useEstateHeirs(estateId);
  const { data: documents } = useEstateDocuments(estateId);
  const { data: lockboxItems } = useLockboxItems(estateId);
  const { data: directives } = useDirectives(estateId);
  const { data: capsules } = useTimeCapsules(estateId);
  const { data: heirlooms } = useHeirlooms(estateId);
  const memoirConstraints = useMemo(() => [orderBy('createdAt', 'desc')], []);
  const { data: memoirs } = useCollection<Record<string, unknown>>(
    estateId ? `estates/${estateId}/memoirs` : null,
    memoirConstraints,
  );

  // Local settings state for toggle changes
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Guardian Protocol state
  const [guardianStatus, setGuardianStatus] = useState<{
    lastActivityAt: string | null;
    daysSinceActivity: number;
    inactivityThreshold: number;
    escalationLevel: string;
    settlementType: string | null;
  } | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!estateId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || cancelled) return;
        const res = await fetch(`${API_BASE}/api/v1/guardian/status?estate_id=${estateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          setGuardianStatus(await res.json());
        }
      } catch {
        // Silent — guardian status is best-effort on the settings page
      }
    })();
    return () => { cancelled = true; };
  }, [estateId, API_BASE]);

  // Profile photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      const { uploadUrl, finalUrl } = await estateClient.generateUploadUrl({
        estateId,
        fileName: `profile-photo-${user.uid}.${file.name.split('.').pop() || 'jpg'}`,
        contentType: file.type || 'image/jpeg',
      });

      // Upload to Cloud Storage via signed URL
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      // Update user profile with new photo URL
      await setDoc(doc(db, 'users', user.uid), {
        profilePhotoUrl: finalUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Profile photo updated');
    } catch (err) {
      console.error('[Settings] Photo upload error:', err);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [estateId, user]);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportDone(false);
    try {
      const estateName = estate?.name || 'Estate';
      const blob = await exportEstateData({
        estateId,
        estateName,
        assets: assets as unknown as Record<string, unknown>[],
        heirs: heirs as unknown as Record<string, unknown>[],
        documents: documents as unknown as Record<string, unknown>[],
        lockboxItems: lockboxItems as unknown as Record<string, unknown>[],
        directives: directives as unknown as Record<string, unknown>[],
        capsules: capsules as unknown as Record<string, unknown>[],
        heirlooms: heirlooms as unknown as Record<string, unknown>[],
        memoirs: memoirs as unknown as Record<string, unknown>[],
      });
      const filename = `${estateName.replace(/\s+/g, '_')}_export_${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, filename);
      setExportDone(true);
      toast.success('Estate data exported successfully');
      setTimeout(() => setExportDone(false), 4000);
    } catch (err) {
      console.error('[Settings] Export error:', err);
      toast.error('Failed to export estate data');
    } finally {
      setExporting(false);
    }
  }, [estateId, estate, assets, heirs, documents, lockboxItems, directives, capsules, heirlooms, memoirs]);

  // Merge Firestore doc with local overrides
  const s = useMemo(() => ({ ...settingsDoc, ...localSettings }), [settingsDoc, localSettings]);

  const handleToggle = useCallback((key: string, currentValue: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: !currentValue }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Separate guardian threshold — lives on estate doc, not governance/settings
      const { guardianThreshold, ...govSettings } = localSettings;
      await setDoc(
        doc(db, `estates/${estateId}/governance`, 'settings'),
        {
          ...govSettings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      // Write guardianThreshold to estate doc if changed
      if (guardianThreshold != null) {
        await updateDoc(doc(db, 'estates', estateId), {
          guardianThreshold: Number(guardianThreshold),
        });
      }
      setSaved(true);
      setLocalSettings({}); // Clear local overrides — Firestore hook will pick up
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[Settings] Save error:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [estateId, localSettings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Loading settings...</span>
        </div>
      </div>
    );
  }

  const mfaStatus = getMFAStatus(user);
  const isFiduciary = profile?.role && ['heir', 'executor', 'legal', 'cpa'].includes(profile.role);
  const isPrincipalOrAdmin = profile?.role === 'principal' || profile?.role === 'admin';
  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="max-w-[1000px] mx-auto space-y-10 pb-20">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Settings</h2>
          <p className="text-lg text-[#64748B] font-medium">Manage your profile, security, and estate preferences.</p>
        </div>
        {isPrincipalOrAdmin && <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          variant={saved ? 'default' : hasChanges ? 'default' : 'secondary'}
          size="lg"
          className={`px-8 py-3.5 rounded-2xl font-bold text-[13px] shadow-lg transition-all active:scale-95 ${
            saved
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              : hasChanges
                ? 'bg-[#133378] hover:bg-[#1E3A5F] text-white border-[#133378]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border-slate-100'
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Saved
            </span>
          ) : 'Save Changes'}
        </Button>}
      </div>

      {/* ── Profile Card ── */}
      <Card className="rounded-[3rem] border-slate-100 shadow-sm py-0 gap-0">
        <div className="bg-gradient-to-r from-[#133378]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#133378]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[#133378]/60 uppercase tracking-[0.3em]">Your Profile</h3>
        </div>
        <CardContent className="p-10 flex items-start gap-8">
          {/* Avatar — clickable for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            className="relative w-24 h-24 rounded-[2rem] shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#133378] focus-visible:ring-offset-2"
            aria-label="Upload profile photo"
          >
            {photoUploading ? (
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-[#133378] to-[#1E3A5F] flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : profile?.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt="Profile"
                className="w-full h-full rounded-[2rem] object-cover shadow-lg"
              />
            ) : (
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-[#133378] to-[#1E3A5F] flex items-center justify-center text-white text-3xl font-[family-name:var(--font-cinzel)] font-bold shadow-lg">
                {(profile?.firstName?.[0] || profile?.displayName?.[0] || 'U').toUpperCase()}
              </div>
            )}
            {/* Camera overlay on hover */}
            {!photoUploading && (
              <div className="absolute inset-0 rounded-[2rem] bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            )}
          </button>
          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">{profile?.displayName || 'User'}</h3>
              <p className="text-[#64748B] font-medium text-[15px] mt-0.5">{user?.email || ''}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="px-4 py-1.5 h-auto bg-[#133378]/5 border-[#133378]/10 rounded-xl text-[11px] font-black text-[#133378] uppercase tracking-[0.15em]">
                {ROLE_DISPLAY[profile?.role || 'principal'] || profile?.role}
              </Badge>
              {mfaStatus.enrolled && (
                <Badge variant="outline" className="px-4 py-1.5 h-auto bg-green-50 border-green-200 rounded-xl text-[11px] font-black text-green-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  MFA Active
                </Badge>
              )}
              {user?.emailVerified && (
                <Badge variant="outline" className="px-4 py-1.5 h-auto bg-blue-50 border-blue-200 rounded-xl text-[11px] font-black text-blue-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MFA Enrollment (Shared Component) ── */}
      <MFAEnrollment user={user} mfaStatus={mfaStatus} isFiduciary={!!isFiduciary} />

      {/* ── Estate Team Invitations ── */}
      <InviteTeamMember estateId={estateId} />

      {/* ── Guardian Protocol (principal/admin only) ── */}
      {isPrincipalOrAdmin && (
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm py-0 gap-0">
          <div className="bg-gradient-to-r from-[#133378]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#133378]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-[11px] font-black text-[#133378]/60 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Guardian Protocol</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <SettingsSelect
              label="Inactivity threshold"
              description={`If you are inactive for this many days, your executor will be notified.`}
              value={String(localSettings.guardianThreshold ?? estate?.guardianThreshold ?? 90)}
              options={['60', '90', '120', '180']}
              onChange={(v) => { setLocalSettings(prev => ({ ...prev, guardianThreshold: Number(v) })); setSaved(false); }}
            />
            <SettingsStatus
              label="Emergency contact"
              description="Your designated executor will be notified if you become inactive."
              value={estate?.executorName || 'Not set'}
            />
            {guardianStatus && (
              <>
                <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-[#F8FAFC] transition-all group">
                  <div className="flex flex-col">
                    <span className="text-[#0F172A] font-bold text-[15px] leading-tight group-hover:text-[#133378] transition-colors">Days since last activity</span>
                    <span className="text-[13px] text-[#64748B] font-medium mt-1">Based on your last check-in with FinalWishes</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`h-auto px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2 ${
                      guardianStatus.daysSinceActivity > (guardianStatus.inactivityThreshold * 0.75)
                        ? 'bg-amber-50 border border-amber-200 text-amber-600'
                        : 'bg-green-50 border border-green-200 text-green-600'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      guardianStatus.daysSinceActivity > (guardianStatus.inactivityThreshold * 0.75)
                        ? 'bg-amber-400'
                        : 'bg-green-400'
                    }`} />
                    {guardianStatus.daysSinceActivity} days
                  </Badge>
                </div>
                <SettingsStatus
                  label="Escalation level"
                  description="Current state of the Guardian Protocol for this estate"
                  value={guardianStatus.escalationLevel === 'none' ? 'All Clear' :
                    guardianStatus.escalationLevel === 'reminder_sent' ? 'Reminder Sent' :
                    guardianStatus.escalationLevel === 'executor_notified' ? 'Executor Notified' :
                    guardianStatus.escalationLevel === 'in_settlement' ? 'In Settlement' :
                    guardianStatus.escalationLevel}
                />
              </>
            )}
          </div>
        </Card>
      )}

      {/* ── Settlement Panel (executor only) ── */}
      {profile?.role === 'executor' && (
        <SettlementPanel
          estateId={estateId}
          ownerName={estate?.ownerName}
          estateStatus={estate?.status}
          settlementType={estate?.settlementType}
          settlementReportedAt={estate?.settlementReportedAt}
        />
      )}

      {/* ── Settings Panels (principal/admin only) ── */}
      {isPrincipalOrAdmin && (
      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm py-0 gap-0">
        <SettingsSection title="Security" first>
          <SettingsToggle
            label="Two-factor authentication"
            description="Add an extra layer of security to your account"
            checked={mfaStatus.enrolled}
            disabled
          />
          <SettingsStatus label="Recovery key" description="Backup key for account recovery" value={String(s?.recoveryKeyStatus || "Active")} />
          <SettingsToggle
            label="Biometric verification"
            description="Use Face ID or fingerprint to unlock sensitive actions"
            checked={!!s?.biometricRelease}
            onChange={() => handleToggle('biometricRelease', !!s?.biometricRelease)}
          />
          <SettingsStatus label="Encryption standard" description="All data is encrypted at rest and in transit" value="AES-256" />
        </SettingsSection>

        <Separator />

        <SettingsSection title="Notifications">
          <SettingsToggle
            label="Email alerts"
            description="Get notified about important estate changes"
            checked={s?.emailAlerts !== false}
            onChange={() => handleToggle('emailAlerts', s?.emailAlerts !== false)}
          />
          <SettingsSelect
            label="Status reports"
            description="Periodic summary of your estate status"
            value={String(s?.statusReportsFrequency || 'Weekly')}
            options={['Daily', 'Weekly', 'Monthly', 'Never']}
            onChange={(v) => { setLocalSettings(prev => ({ ...prev, statusReportsFrequency: v })); setSaved(false); }}
          />
          <SettingsToggle
            label="AI suggestions"
            description="Receive personalized guidance from the AI engine"
            checked={s?.aiSuggestions !== false}
            onChange={() => handleToggle('aiSuggestions', s?.aiSuggestions !== false)}
          />
        </SettingsSection>

        <Separator />

        <SettingsSection title="Legal & Jurisdiction">
          <SettingsSelect
            label="Primary state"
            description="The state that governs your estate laws"
            value={String(s?.primaryState || 'Maryland')}
            options={['Maryland', 'Illinois', 'Minnesota', 'Virginia', 'District of Columbia']}
            onChange={(v) => { setLocalSettings(prev => ({ ...prev, primaryState: v })); setSaved(false); }}
          />
          <SettingsStatus label="Beneficiary access" description="Control what your beneficiaries can see" value="Restricted" />
        </SettingsSection>
      </Card>
      )}

      {/* ── Data Export (principal/admin only) ── */}
      {isPrincipalOrAdmin && (
      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm py-0 gap-0">
        <div className="bg-gradient-to-r from-[#133378]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#133378]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[#133378]/60 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Data Export</h3>
        </div>
        <CardContent className="px-10 py-8 flex items-center justify-between">
          <div>
            <span className="text-[#0F172A] font-bold text-[15px] leading-tight">Export Estate Data</span>
            <p className="text-[13px] text-[#64748B] font-medium mt-1 max-w-md">
              Download a complete ZIP archive of your estate data for compliance and portability.
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className={`px-6 py-2.5 rounded-xl font-bold text-[12px] shadow-md transition-all active:scale-95 ${
              exportDone
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                : 'bg-[#133378] hover:bg-[#1E3A5F] text-white border-[#133378]'
            }`}
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </span>
            ) : exportDone ? (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                Downloaded
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Estate Data
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
      )}

    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SettingsSection({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div>
      <div className={`bg-[#F8FAFC] px-10 py-5 ${first ? '' : ''}border-b border-slate-100`}>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange?: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col">
        <span className="text-[#0F172A] font-bold text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <Switch
        checked={!!checked}
        onCheckedChange={() => onChange?.()}
        disabled={disabled}
        className="data-[state=checked]:bg-[#133378]"
      />
    </div>
  );
}

function SettingsStatus({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col">
        <span className="text-[#0F172A] font-bold text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <Badge variant="secondary" className="h-auto px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold text-green-600 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        {value}
      </Badge>
    </div>
  );
}

function SettingsSelect({ label, description, value, options, onChange }: {
  label: string; description: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col">
        <span className="text-[#0F172A] font-bold text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="text-[13px] text-[#133378] font-bold bg-transparent border-slate-200 rounded-lg px-3 py-1.5 h-auto focus:border-[#133378] cursor-pointer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
