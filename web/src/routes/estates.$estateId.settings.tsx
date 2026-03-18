import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/settings' });
  const [estateId, setEstateId ] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const s = data?.settings;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end border-b border-border-light pb-8">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Governance Settings</h2>
          <p className="text-sm text-text-muted">Manage your security protocols and platform preferences for this governance shard.</p>
        </div>
        <button className="bg-navy text-white px-8 py-3 rounded-2xl font-black text-[0.7rem] uppercase tracking-widest shadow-xl hover:bg-black transition-all">
          Commit Protocol Changes
        </button>
      </div>
      
      <div className="bg-white rounded-[3rem] border border-border-light overflow-hidden shadow-2xl">
        <SettingsSection title="Security Protocol Ledger">
          <SettingsItem label="Bipartite Multi-Factor Auth" value={s?.mfaEnabled ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Zero-Knowledge Recovery Key" value={s?.recoveryKeyStatus || "Active Shard"} type="status" />
          <SettingsItem label="Biometric Release Verification" value={s?.biometricRelease ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="AES-256 State Encryption" value="Hardened" type="status" />
        </SettingsSection>
        
        <SettingsSection title="Notification Logic Shards">
          <SettingsItem label="Real-time Audit Alerts" value={s?.emailAlerts ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Legal Shard Reports" value={s?.statusReportsFrequency || "Weekly Epoch"} type="select" />
          <SettingsItem label="AI Guidance Pulse" value="Enabled" type="toggle" />
        </SettingsSection>

        <SettingsSection title="Jurisdiction Controls">
          <SettingsItem label="Primary Legal State" value="Maryland" type="select" />
          <SettingsItem label="Heir Access Shards" value="Restricted" type="status" />
        </SettingsSection>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: any) {
  return (
    <div className="border-b border-border-light last:border-b-0">
      <div className="bg-navy/5 px-10 py-5">
        <h3 className="text-navy font-black text-[0.7rem] uppercase tracking-[0.2em] opacity-40">{title}</h3>
      </div>
      <div className="divide-y divide-border-light">{children}</div>
    </div>
  );
}

function SettingsItem({ label, value, type }: any) {
  return (
    <div className="flex items-center justify-between px-10 py-6 hover:bg-royal-subtle transition-all group">
      <div className="flex flex-col">
        <span className="text-navy font-black text-sm uppercase tracking-tight leading-tight group-hover:text-royal transition-colors">{label}</span>
        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-60">Verified Governance Parameter</span>
      </div>
      <div className="flex items-center gap-4">
        {type === 'toggle' ? (
          <div className={`w-12 h-6 rounded-full relative cursor-pointer border shadow-inner transition-all ${value === 'Enabled' ? 'bg-royal border-royal' : 'bg-gray-100 border-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${value === 'Enabled' ? 'left-7' : 'left-1'}`} />
          </div>
        ) : type === 'status' ? (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-100 rounded-lg">
             <div className="w-1.5 h-1.5 rounded-full bg-success" />
             <span className="text-[9px] font-black text-success uppercase tracking-widest">{value}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 group-hover:bg-white px-3 py-1.5 rounded-lg border border-transparent group-hover:border-border-light transition-all cursor-pointer">
            <span className="text-[10px] text-royal font-black uppercase tracking-widest">{value}</span>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-royal/40" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 10l5 5 5-5"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}
