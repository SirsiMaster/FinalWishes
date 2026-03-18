import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [estateId, setEstateId] = React.useState('');

  React.useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
    }
  }, []);

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
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="border-b border-border-light pb-8 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight">Governance Shard</h2>
          <p className="text-sm text-text-muted">Manage the security protocols, authority releases, and biometric shards for this estate.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-royal-subtle border border-royal/10 rounded-xl">
           <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
           <span className="text-[10px] font-black text-royal uppercase tracking-widest">Active State Verification</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 pb-20">
        <section className="bg-white rounded-[2.5rem] border border-border-light overflow-hidden shadow-sm hover:shadow-2xl hover:border-royal/20 transition-all">
          <SettingsSection title="Security Protocol [AES-256]">
            <SettingsItem label="Bipartite Multi-Factor Auth" value={s?.mfaEnabled ? "Enabled" : "Disabled"} type="toggle" />
            <SettingsItem label="Zero-Knowledge Recovery Key" value={s?.recoveryKeyStatus || "Verified"} type="status" />
            <SettingsItem label="Biometric Release Verification" value={s?.biometricRelease ? "Enabled" : "Disabled"} type="toggle" />
          </SettingsSection>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-border-light overflow-hidden shadow-sm hover:shadow-2xl hover:border-royal/20 transition-all">
          <SettingsSection title="Notification Governance">
            <SettingsItem label="Encrypted Email Alerts" value={s?.emailAlerts ? "Enabled" : "Disabled"} type="toggle" />
            <SettingsItem label="Legal Status Shard Frequency" value={s?.statusReportsFrequency || "Weekly"} type="select" />
            <SettingsItem label="AI Guidance Interface" value="Disabled" type="toggle" />
          </SettingsSection>
        </section>
        
        <div className="p-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
            <p className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-4">Operational Domain Information</p>
            <div className="flex justify-center gap-12">
               <div>
                  <span className="block text-[8px] font-black text-navy/30 uppercase mb-1">Estate Shard ID</span>
                  <span className="text-xs font-mono font-bold text-navy">{estateId}</span>
               </div>
               <div>
                  <span className="block text-[8px] font-black text-navy/30 uppercase mb-1">Jurisdiction</span>
                  <span className="text-xs font-bold text-navy uppercase tracking-widest">Maryland, IL, MN</span>
               </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: any) {
  return (
    <div>
      <div className="bg-navy px-8 py-5 border-b border-white/10">
        <h3 className="text-gold font-black text-[0.7rem] uppercase tracking-[0.25em]">{title}</h3>
      </div>
      <div className="divide-y divide-border-light">{children}</div>
    </div>
  );
}

function SettingsItem({ label, value, type }: any) {
  return (
    <div className="flex items-center justify-between px-10 py-6 hover:bg-royal-subtle transition-colors group">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-navy/20 uppercase tracking-[0.15em] mb-1 leading-none group-hover:text-royal/40 transition-colors">Protocol Element</span>
        <span className="text-sm font-black text-navy uppercase tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {type === 'toggle' ? (
          <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${value === 'Enabled' ? 'bg-royal shadow-lg shadow-royal/20' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${value === 'Enabled' ? 'left-7' : 'left-1'}`} />
          </div>
        ) : type === 'status' ? (
          <span className="text-[9px] font-black text-green-700 uppercase tracking-[0.2em] px-3 py-1 bg-green-50 border border-green-200 rounded-lg">{value}</span>
        ) : (
          <div className="flex items-center gap-2 group/val cursor-pointer">
            <span className="text-xs text-navy font-black uppercase tracking-widest">{value}</span>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-navy/30 group-hover/val:text-royal transition-colors" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}
