import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['governanceSettings'],
    queryFn: () => estateClient.getGovernanceSettings({ estateId: 'test-estate' }),
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Settings & Governance</h2>
        <p className="text-sm text-text-muted">Manage your security protocols and platform preferences.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-border-light overflow-hidden shadow-sm">
        <SettingsSection title="Security Protocol">
          <SettingsItem label="Bipartite Multi-Factor Auth" value={s?.mfaEnabled ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Zero-Knowledge Recovery Key" value={s?.recoveryKeyStatus} type="status" />
          <SettingsItem label="Biometric Release Verification" value={s?.biometricRelease ? "Enabled" : "Disabled"} type="toggle" />
        </SettingsSection>
        
        <SettingsSection title="Notification Preferences">
          <SettingsItem label="Email Alerts" value={s?.emailAlerts ? "Enabled" : "Disabled"} type="toggle" />
          <SettingsItem label="Legal Status Reports" value={s?.statusReportsFrequency} type="select" />
          <SettingsItem label="AI Guidance Tips" value="Disabled" type="toggle" />
        </SettingsSection>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: any) {
  return (
    <div className="border-b border-border-light last:border-b-0">
      <div className="bg-navy/5 px-6 py-4">
        <h3 className="text-navy font-bold text-[0.65rem] uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-border-light">{children}</div>
    </div>
  );
}

function SettingsItem({ label, value, type }: any) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-royal-subtle transition-colors">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <div className="flex items-center gap-3">
        {type === 'toggle' ? (
          <div className={`w-10 h-5 rounded-full relative cursor-pointer ${value === 'Enabled' ? 'bg-royal' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value === 'Enabled' ? 'left-6' : 'left-1'}`} />
          </div>
        ) : type === 'status' ? (
          <span className="text-[11px] font-bold text-success uppercase tracking-widest px-2.5 py-0.5 bg-green-50 rounded-full">{value}</span>
        ) : (
          <span className="text-sm text-royal font-bold cursor-pointer hover:underline">{value}</span>
        )}
      </div>
    </div>
  );
}
