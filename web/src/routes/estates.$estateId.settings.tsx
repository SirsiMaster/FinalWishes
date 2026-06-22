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

import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  useDocument,
  useCollection,
  useEstate,
  useEstateAssets,
  useEstateHeirs,
  useEstateDocuments,
  useLockboxItems,
  useIsEstatePrincipal,
  useDirectives,
  useTimeCapsules,
  useHeirlooms,
} from '../lib/firestore'
import { doc, setDoc, updateDoc, deleteDoc, getDocs, query, where, collection, serverTimestamp, orderBy } from 'firebase/firestore'
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
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  // Estate-principal status (mirrors the firestore rule estate.principalId==uid). Every persona
  // reaches settings (for MFA), but several settings surfaces are principal-only — gate them on
  // this to avoid permission-denied console errors for fiduciaries (lockbox subscription + the
  // team-invitations fetch in InviteTeamMember). NOT the global profile.role (which the persona-QA
  // seed sets to principal for all test accounts).
  const isEstatePrincipal = useIsEstatePrincipal(estateId);
  const { data: lockboxItems } = useLockboxItems(estateId, isEstatePrincipal);
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

  // Navigation
  const navigate = useNavigate();

  // Subscription management state
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = useCallback(async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_BASE}/api/v1/payments/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estateId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to open subscription management');
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open subscription management';
      console.error('[Settings] Portal session error:', err);
      toast.error(message);
      setPortalLoading(false);
    }
  }, [user, estateId, API_BASE]);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Account deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // 1. Delete user's Firestore profile
      await deleteDoc(doc(db, 'users', user.uid));

      // 2. Delete all estate_users records where userId === uid
      //    (removes access from estates where user is heir/executor/etc.)
      const estateUsersQuery = query(
        collection(db, 'estate_users'),
        where('userId', '==', user.uid),
      );
      const estateUsersSnapshot = await getDocs(estateUsersQuery);
      const deletePromises = estateUsersSnapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 3. Sign out via Firebase Auth
      await auth.signOut();

      // 4. Redirect to home
      navigate({ to: '/' });

      // 5. Toast confirmation
      toast.success('Account deleted successfully');
    } catch (err) {
      console.error('[Settings] Account deletion error:', err);
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    }
  }, [user, navigate]);

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
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[var(--royal)]/60 uppercase tracking-[0.2em]">Loading settings...</span>
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
      <div className="flex justify-between items-end border-b border-neutral-border pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[var(--royal)]">Settings</h2>
          <p className="text-lg text-[var(--royal)]/60 font-medium">Manage your profile, security, and estate preferences.</p>
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
                ? 'bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white border-[var(--royal)]'
                : 'bg-neutral-faint text-[var(--royal)]/40 cursor-not-allowed shadow-none border-neutral-border'
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
      <Card className="rounded-[3rem] border-neutral-border shadow-sm py-0 gap-0">
        <div className="bg-gradient-to-r from-[var(--royal)]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-neutral-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--royal)]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[var(--royal)]/60 uppercase tracking-[0.3em]">Your Profile</h3>
        </div>
        <CardContent className="p-10 flex items-start gap-8">
          {/* Avatar — clickable for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            aria-label="Upload profile photo"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            className="relative w-24 h-24 rounded-[2rem] shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--royal)] focus-visible:ring-offset-2"
            aria-label="Upload profile photo"
          >
            {photoUploading ? (
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-[var(--royal)] to-[var(--royal-blue)] flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : profile?.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt="Profile"
                className="w-full h-full rounded-[2rem] object-cover shadow-lg"
              />
            ) : (
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-[var(--royal)] to-[var(--royal-blue)] flex items-center justify-center text-white text-3xl font-[family-name:var(--font-cinzel)] font-bold shadow-lg">
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
              <h3 className="text-2xl font-bold text-[var(--royal)] tracking-tight">{profile?.displayName || 'User'}</h3>
              <p className="text-[var(--royal)]/60 font-medium text-[15px] mt-0.5">{user?.email || ''}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="px-4 py-1.5 h-auto bg-[var(--royal)]/5 border-[var(--royal)]/10 rounded-xl text-[11px] font-black text-[var(--royal)] uppercase tracking-[0.15em]">
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

      {/* ── Estate Team Invitations (principal/admin only — it fetches estate_invitations,
             which firestore.rules restricts to isEstatePrincipal; fiduciaries can't manage the team) ── */}
      {isEstatePrincipal && <InviteTeamMember estateId={estateId} />}

      {/* ── Guardian Protocol (principal/admin only) ── */}
      {isPrincipalOrAdmin && (
        <Card className="rounded-[2.5rem] border-neutral-border shadow-sm py-0 gap-0">
          <div className="bg-gradient-to-r from-[var(--royal)]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-neutral-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--royal)]/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-[11px] font-black text-[var(--royal)]/60 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Guardian Protocol</h3>
          </div>
          <div className="divide-y divide-[var(--neutral-border)]">
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
                <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-neutral-faint transition-all group">
                  <div className="flex flex-col">
                    <span className="text-[var(--royal)] font-bold text-[15px] leading-tight group-hover:text-[var(--royal)] transition-colors">Days since last activity</span>
                    <span className="text-[13px] text-[var(--royal)]/60 font-medium mt-1">Based on your last check-in with FinalWishes</span>
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
      <Card className="rounded-[2.5rem] border-neutral-border shadow-sm py-0 gap-0">
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

      {/* ── Subscription Management (principal/admin on paid plans) ── */}
      {isPrincipalOrAdmin && estate?.tier && estate.tier !== 'free' && (
      <Card className="rounded-[2.5rem] border-neutral-border shadow-sm py-0 gap-0">
        <div className="bg-gradient-to-r from-[var(--royal)]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-neutral-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--royal)]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[var(--royal)]/60 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Subscription</h3>
        </div>
        <CardContent className="px-10 py-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[var(--royal)] font-bold text-[15px] leading-tight">Manage Subscription</span>
              <Badge variant="outline" className="px-3 py-1 h-auto bg-[var(--royal)]/5 border-[var(--royal)]/10 rounded-lg text-[10px] font-black text-[var(--royal)] uppercase tracking-[0.15em]">
                {estate.tier === 'white_glove' ? 'White Glove' : estate.tier === 'concierge' ? 'Concierge' : estate.tier}
              </Badge>
            </div>
            <p className="text-[13px] text-[var(--royal)]/60 font-medium mt-1 max-w-md">
              Update your payment method, change your plan, or cancel your subscription via Stripe.
            </p>
          </div>
          <Button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="px-6 py-2.5 rounded-xl font-bold text-[12px] shadow-md transition-all active:scale-95 bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white border-[var(--royal)]"
          >
            {portalLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Manage Subscription
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* ── Data Export (principal/admin only) ── */}
      {isPrincipalOrAdmin && (
      <Card className="rounded-[2.5rem] border-neutral-border shadow-sm py-0 gap-0">
        <div className="bg-gradient-to-r from-[var(--royal)]/[0.04] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-neutral-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--royal)]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--royal)]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[var(--royal)]/60 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Data Export</h3>
        </div>
        <CardContent className="px-10 py-8 flex items-center justify-between">
          <div>
            <span className="text-[var(--royal)] font-bold text-[15px] leading-tight">Export Estate Data</span>
            <p className="text-[13px] text-[var(--royal)]/60 font-medium mt-1 max-w-md">
              Download a complete ZIP archive of your estate data for compliance and portability.
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className={`px-6 py-2.5 rounded-xl font-bold text-[12px] shadow-md transition-all active:scale-95 ${
              exportDone
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                : 'bg-[var(--royal)] hover:bg-[var(--royal-blue)] text-white border-[var(--royal)]'
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

      {/* ── Delete Account — Danger Zone ── */}
      <Card className="rounded-[2.5rem] border-red-200 shadow-sm py-0 gap-0 bg-red-50/30">
        <div className="bg-gradient-to-r from-red-500/[0.06] to-transparent px-4 py-4 md:px-10 md:py-6 border-b border-red-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-red-600/80 uppercase tracking-[0.3em] font-[family-name:var(--font-cinzel)]">Danger Zone</h3>
        </div>
        <CardContent className="px-10 py-8 flex items-center justify-between gap-6">
          <div>
            <span className="text-[var(--royal)] font-bold text-[15px] leading-tight">Delete Account</span>
            <p className="text-[13px] text-[var(--royal)]/60 font-medium mt-1 max-w-md">
              This will permanently delete your account, all estates you own, and all associated data. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="px-6 py-2.5 rounded-xl font-bold text-[12px] shadow-md transition-all active:scale-95 bg-red-600 hover:bg-red-700 text-white border-red-600 shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* ── Delete Account Confirmation Dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 text-lg font-bold">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[14px] leading-relaxed space-y-3 text-sm text-muted-foreground">
                <p>This action is <strong className="text-foreground">permanent and irreversible</strong>. The following will be deleted:</p>
                <ul className="pl-4 space-y-1 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">&#x2022;</span> Your user account and profile
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">&#x2022;</span> All estates you own and their data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">&#x2022;</span> All documents, assets, and lockbox items
                  </li>
                </ul>
                <p>Your access to estates where you are an heir, executor, or advisor will be removed, but those estates will not be affected.</p>
                <p className="font-semibold mt-2">Type <span className="font-mono bg-red-50 px-1.5 py-0.5 rounded text-red-600 border border-red-200">DELETE</span> to confirm:</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="rounded-xl border-neutral-border focus:border-red-400 focus:ring-red-200 font-mono text-center"
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              onClick={async (e) => {
                e.preventDefault();
                await handleDeleteAccount();
              }}
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Permanently Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SettingsSection({ title, children, first }: { title: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div>
      <div className={`bg-neutral-faint px-10 py-5 ${first ? '' : ''}border-b border-neutral-border`}>
        <h3 className="text-[11px] font-bold text-[var(--royal)]/40 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-[var(--neutral-border)]">{children}</div>
    </div>
  );
}

function SettingsToggle({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange?: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-neutral-faint transition-all group">
      <div className="flex flex-col">
        <span className="text-[var(--royal)] font-bold text-[15px] leading-tight group-hover:text-[var(--royal)] transition-colors">{label}</span>
        <span className="text-[13px] text-[var(--royal)]/60 font-medium mt-1">{description}</span>
      </div>
      <Switch
        checked={!!checked}
        onCheckedChange={() => onChange?.()}
        disabled={disabled}
        className="data-[state=checked]:bg-[var(--royal)]"
      />
    </div>
  );
}

function SettingsStatus({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-neutral-faint transition-all group">
      <div className="flex flex-col">
        <span className="text-[var(--royal)] font-bold text-[15px] leading-tight group-hover:text-[var(--royal)] transition-colors">{label}</span>
        <span className="text-[13px] text-[var(--royal)]/60 font-medium mt-1">{description}</span>
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
    <div className="flex items-center justify-between px-4 py-4 md:px-10 md:py-6 hover:bg-neutral-faint transition-all group">
      <div className="flex flex-col">
        <span className="text-[var(--royal)] font-bold text-[15px] leading-tight group-hover:text-[var(--royal)] transition-colors">{label}</span>
        <span className="text-[13px] text-[var(--royal)]/60 font-medium mt-1">{description}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="text-[13px] text-[var(--royal)] font-bold bg-transparent border-neutral-border rounded-lg px-3 py-1.5 h-auto focus:border-[var(--royal)] cursor-pointer">
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
