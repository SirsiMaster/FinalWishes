import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'
import { useAuth } from '../lib/auth'
import { getMFAStatus } from '../lib/mfa'
import { MFAEnrollment } from '../components/identity/MFAEnrollment'

export const Route = createFileRoute('/estates/$estateId/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/settings' });
  const { user, profile } = useAuth();
  const [estateId, setEstateId] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

  const { data, isLoading } = useQuery({
    queryKey: ['governanceSettings', estateId],
    queryFn: () => estateClient.getGovernanceSettings({ estateId }),
  });

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

  const s = data?.settings;
  const mfaStatus = getMFAStatus(user);
  const isFiduciary = profile?.role && ['heir', 'executor', 'legal', 'cpa'].includes(profile.role);

  return (
    <div className="max-w-[1000px] mx-auto space-y-10 pb-20">
      <div className="flex justify-between items-end border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Settings</h2>
          <p className="text-lg text-[#64748B] font-medium">Manage your security and notification preferences for this estate.</p>
        </div>
        <button className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-8 py-3.5 rounded-2xl font-bold text-[13px] shadow-lg transition-all active:scale-95">
          Save Changes
        </button>
      </div>

      {/* ── MFA Enrollment (Shared Component) ── */}
      <MFAEnrollment user={user} mfaStatus={mfaStatus} isFiduciary={!!isFiduciary} />
      
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <SettingsSection title="Security">
          <SettingsItem label="Two-factor authentication" description="Add an extra layer of security to your account" value={mfaStatus.enrolled ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Recovery key" description="Backup key for account recovery" value={s?.recoveryKeyStatus || "Active"} type="status" />
          <SettingsItem label="Biometric verification" description="Use Face ID or fingerprint to unlock sensitive actions" value={s?.biometricRelease ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Encryption standard" description="All data is encrypted at rest and in transit" value="AES-256" type="status" />
        </SettingsSection>
        
        <SettingsSection title="Notifications">
          <SettingsItem label="Email alerts" description="Get notified about important estate changes" value={s?.emailAlerts ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Status reports" description="Periodic summary of your estate status" value={s?.statusReportsFrequency || "Weekly"} type="select" />
          <SettingsItem label="AI suggestions" description="Receive personalized guidance from the AI engine" value="Enabled" type="toggle" />
        </SettingsSection>

        <SettingsSection title="Legal & Jurisdiction">
          <SettingsItem label="Primary state" description="The state that governs your estate laws" value="Maryland" type="select" />
          <SettingsItem label="Beneficiary access" description="Control what your beneficiaries can see" value="Restricted" type="status" />
        </SettingsSection>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: any) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="bg-[#F8FAFC] px-10 py-5 border-b border-slate-100">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function SettingsItem({ label, description, value, type }: any) {
  return (
    <div className="flex items-center justify-between px-10 py-6 hover:bg-[#F8FAFC] transition-all group">
      <div className="flex flex-col">
        <span className="text-[#0F172A] font-bold text-[15px] leading-tight group-hover:text-[#133378] transition-colors">{label}</span>
        <span className="text-[13px] text-[#64748B] font-medium mt-1">{description}</span>
      </div>
      <div className="flex items-center gap-4">
        {type === 'toggle' ? (
          <div className={`w-12 h-6 rounded-full relative cursor-pointer border shadow-inner transition-all ${value === 'Enabled' ? 'bg-[#133378] border-[#133378]' : 'bg-slate-200 border-slate-200'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${value === 'Enabled' ? 'left-[26px]' : 'left-0.5'}`} />
          </div>
        ) : type === 'status' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
             <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
             <span className="text-[11px] font-bold text-green-600">{value}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 group-hover:bg-white px-3 py-1.5 rounded-lg border border-transparent group-hover:border-slate-200 transition-all cursor-pointer">
            <span className="text-[13px] text-[#133378] font-bold">{value}</span>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 10l5 5 5-5"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}
