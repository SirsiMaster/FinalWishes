/* eslint-disable react-refresh/only-export-components */
/**
 * Settings Page — Estate Governance + Profile
 *
 * Reads governance settings from Firestore.
 * Allows profile viewing and estate-level setting management.
 * MFA enrollment and team invitation components are integrated.
 *
 * @version 2.0.0
 */

import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useMemo, useCallback } from 'react'
import { useDocument } from '../lib/firestore'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { getMFAStatus } from '../lib/mfa'
import { MFAEnrollment } from '../components/identity/MFAEnrollment'
import { InviteTeamMember } from '../components/estate/InviteTeamMember'

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
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: settingsDoc, loading: isLoading } = useDocument<Record<string, unknown>>(`estates/${estateId}/governance/settings`);

  // Local settings state for toggle changes
  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Merge Firestore doc with local overrides
  const s = useMemo(() => ({ ...settingsDoc, ...localSettings }), [settingsDoc, localSettings]);

  const handleToggle = useCallback((key: string, currentValue: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: !currentValue }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, `estates/${estateId}/governance`, 'settings'),
        {
          ...localSettings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved(true);
      setLocalSettings({}); // Clear local overrides — Firestore hook will pick up
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[Settings] Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [estateId, localSettings]);

  if (isLoading) {
    return <CardGridSkeleton />;
  }

  const mfaStatus = getMFAStatus(user);
  const isFiduciary = profile?.role && ['heir', 'executor', 'legal', 'cpa'].includes(profile.role);
  const hasChanges = Object.keys(localSettings).length > 0;

  return (
    <div className="max-w-[1000px] mx-auto space-y-8 md:space-y-10 pb-20 px-4 md:px-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-8 md:pb-10">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Settings</h2>
          <p className="text-base md:text-lg text-[#64748B] font-medium">Manage your profile, security, and estate preferences.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-8 py-3.5 rounded-2xl font-bold text-[13px] shadow-lg transition-all active:scale-95 ${
            saved
              ? 'bg-green-600 text-white'
              : hasChanges
                ? 'bg-[#133378] hover:bg-[#1E3A5F] text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
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
        </button>
      </div>

      {/* ── Profile Card ── */}
      <section className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#133378]/[0.04] to-transparent px-5 md:px-10 py-4 md:py-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#133378]/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#133378]" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-[#133378]/60 uppercase tracking-[0.3em]">Your Profile</h3>
        </div>
        <div className="p-5 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-[#133378] to-[#1E3A5F] flex items-center justify-center text-white text-2xl md:text-3xl font-[family-name:var(--font-cinzel)] font-bold shadow-lg shrink-0">
            {(profile?.firstName?.[0] || profile?.displayName?.[0] || 'U').toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">{profile?.displayName || 'User'}</h3>
              <p className="text-[#64748B] font-medium text-[15px] mt-0.5">{user?.email || ''}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-4 py-1.5 bg-[#133378]/5 border border-[#133378]/10 rounded-xl text-[11px] font-black text-[#133378] uppercase tracking-[0.15em]">
                {ROLE_DISPLAY[profile?.role || 'principal'] || profile?.role}
              </span>
              {mfaStatus.enrolled && (
                <span className="px-4 py-1.5 bg-green-50 border border-green-200 rounded-xl text-[11px] font-black text-green-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  MFA Active
                </span>
              )}
              {user?.emailVerified && (
                <span className="px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-black text-blue-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MFA Enrollment (Shared Component) ── */}
      <MFAEnrollment user={user} mfaStatus={mfaStatus} isFiduciary={!!isFiduciary} />

      {/* ── Estate Team Invitations ── */}
      <InviteTeamMember estateId={estateId} />

      {/* ── Settings Panels ── */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <SettingsSection title="Security">
          <SettingsToggle
            label="Two-factor authentication"
            description="Add an extra layer of security to your account"
            checked={mfaStatus.enrolled}
            disabled
          />
          <SettingsStatus label="Recovery key" description="Backup key for account recovery" value={s?.recoveryKeyStatus || "Active"} />
          <SettingsToggle
            label="Biometric verification"
            description="Use Face ID or fingerprint to unlock sensitive actions"
            checked={!!s?.biometricRelease}
            onChange={() => handleToggle('biometricRelease', !!s?.biometricRelease)}
          />
          <SettingsStatus label="Encryption standard" description="All data is encrypted at rest and in transit" value="AES-256" />
        </SettingsSection>

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
            value={s?.statusReportsFrequency || 'Weekly'}
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

        <SettingsSection title="Legal & Jurisdiction">
          <SettingsSelect
            label="Primary state"
            description="The state that governs your estate laws"
            value={s?.primaryState || 'Maryland'}
            options={['Maryland', 'Illinois', 'Minnesota', 'Virginia', 'District of Columbia']}
            onChange={(v) => { setLocalSettings(prev => ({ ...prev, primaryState: v })); setSaved(false); }}
          />
          <SettingsStatus label="Beneficiary access" description="Control what your beneficiaries can see" value="Restricted" />
        </SettingsSection>
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-red-100 overflow-hidden shadow-sm">
        <div className="bg-red-50/50 px-10 py-5 border-b border-red-100">
          <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Danger Zone</h3>
        </div>
        <div className="px-5 md:px-10 py-5 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[#0F172A] font-bold text-[15px] leading-tight">Delete this estate</span>
            <p className="text-[13px] text-[#64748B] font-medium mt-1">
              Permanently remove this estate and all associated data. This action cannot be undone.
            </p>
          </div>
          <button className="px-6 py-2.5 rounded-xl border border-red-200 text-red-500 font-bold text-[12px] hover:bg-red-50 transition-all">
            Delete Estate
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="bg-[#F8FAFC] px-5 md:px-10 py-4 md:py-5 border-b border-slate-100">
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
    <div className="flex items-center justify-between gap-4 px-5 md:px-10 py-5 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col min-w-0">
        <span className="text-[#0F172A] font-bold text-[14px] md:text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[12px] md:text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`w-12 h-6 rounded-full relative border shadow-inner transition-all ${
          checked ? 'bg-[#133378] border-[#133378]' : 'bg-slate-200 border-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${checked ? 'left-[26px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SettingsStatus({ label, description, value }: { label: string; description: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 md:px-10 py-5 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col min-w-0">
        <span className="text-[#0F172A] font-bold text-[14px] md:text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[12px] md:text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-[11px] font-bold text-green-600">{value}</span>
      </div>
    </div>
  );
}

function SettingsSelect({ label, description, value, options, onChange }: {
  label: string; description: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 md:px-10 py-5 md:py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col min-w-0">
        <span className="text-[#0F172A] font-bold text-[14px] md:text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[12px] md:text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[13px] text-[#133378] font-bold bg-transparent border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#133378] transition-all cursor-pointer appearance-none pr-8"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' strokeWidth='3'%3E%3Cpath d='M7 10l5 5 5-5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
