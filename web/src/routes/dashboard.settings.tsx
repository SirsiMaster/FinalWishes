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
    <div className="max-w-[1000px] mx-auto space-y-10 pb-20 px-4">
      <div className="border-b border-royal/10 pb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Account Settings</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">Manage your security settings, authorized contacts, and preferences for this estate.</p>
        </div>
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-royal/[0.03] border border-royal/10 rounded-2xl shadow-sm">
           <div className="w-2 h-2 rounded-full bg-royal animate-pulse" />
           <span className="text-[10px] font-black text-royal uppercase tracking-widest leading-none">Status Verification Verified</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-12">
        <section className="bg-white rounded-[3rem] border border-royal/10 overflow-hidden shadow-[0_2px_20px_rgba(19,51,120,0.03)] hover:shadow-[0_20px_50px_rgba(19,51,120,0.08)] hover:border-royal/20 transition-all group relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
          <SettingsSection title="Security Settings">
            <SettingsItem label="Bipartite Multi-Factor Auth" value={s?.mfaEnabled ? "Enabled" : "Disabled"} type="toggle" />
            <SettingsItem label="Zero-Knowledge Recovery Key" value={s?.recoveryKeyStatus || "Verified"} type="status" />
            <SettingsItem label="Biometric Release Verification" value={s?.biometricRelease ? "Enabled" : "Disabled"} type="toggle" />
          </SettingsSection>
        </section>

        <section className="bg-white rounded-[3rem] border border-royal/10 overflow-hidden shadow-[0_2px_20px_rgba(19,51,120,0.03)] hover:shadow-[0_20px_50px_rgba(19,51,120,0.08)] hover:border-royal/20 transition-all group relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
          <SettingsSection title="Notification Governance">
            <SettingsItem label="Encrypted Email Alerts" value={s?.emailAlerts ? "Enabled" : "Disabled"} type="toggle" />
            <SettingsItem label="Status Report Frequency" value={s?.statusReportsFrequency || "Weekly"} type="select" />
            <SettingsItem label="AI Guidance Interface" value="Disabled" type="toggle" />
          </SettingsSection>
        </section>
        
        <div className="p-12 bg-royal/[0.02] rounded-[3rem] border-2 border-dashed border-royal/5 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-royal/[0.02] rounded-bl-[5rem] translate-x-4 -translate-y-4 group-hover:bg-royal/[0.04] transition-colors" />
            <p className="text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] mb-6">Operational Domain Registry</p>
            <div className="flex justify-center gap-20 items-center">
               <div className="text-center group/id">
                  <span className="block text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] mb-2 group-hover:text-royal/40 transition-colors">Estate ID</span>
                  <span className="text-[14px] font-mono font-black text-royal uppercase tracking-widest">{estateId}</span>
               </div>
               <div className="w-px h-8 bg-royal/5" />
               <div className="text-center group/loc">
                  <span className="block text-[9px] font-black text-royal/20 uppercase tracking-[0.2em] mb-2 group-hover:text-royal/40 transition-colors">Jurisdiction</span>
                  <span className="text-[14px] font-black text-royal uppercase tracking-[0.15em]">Maryland, Illinois, Minnesota</span>
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
      <div className="bg-royal/[0.03] px-10 py-6 border-b border-royal/5">
        <h3 className="text-royal font-black text-[11px] uppercase tracking-[0.3em]">{title}</h3>
      </div>
      <div className="divide-y divide-royal/5">{children}</div>
    </div>
  );
}

function SettingsItem({ label, value, type }: any) {
  return (
    <div className="flex items-center justify-between px-10 py-7 hover:bg-royal/[0.01] transition-all group cursor-pointer relative">
      <div className="absolute left-0 top-0 w-1 h-full bg-royal opacity-0 group-hover:opacity-20 transition-all" />
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-royal/20 uppercase tracking-[0.2em] mb-1 leading-none group-hover:text-royal/40 transition-colors">Governance Element</span>
        <span className="text-[15px] font-black text-royal uppercase tracking-tight group-hover:text-sapphire transition-colors">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        {type === 'toggle' ? (
          <div className={`w-14 h-7 rounded-full relative cursor-pointer transition-all border ${value === 'Enabled' ? 'bg-royal border-royal shadow-[0_4px_12px_rgba(19,51,120,0.2)]' : 'bg-royal/[0.05] border-royal/10'}`}>
            <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-md ${value === 'Enabled' ? 'left-8.5' : 'left-1'}`} />
          </div>
        ) : type === 'status' ? (
          <span className="text-[9px] font-black text-green-600 uppercase tracking-[0.2em] px-4 py-1.5 bg-green-50 border border-green-100 rounded-xl shadow-sm">{value}</span>
        ) : (
          <div className="flex items-center gap-3 group/val px-4 py-2 bg-royal/[0.02] border border-royal/5 rounded-xl hover:bg-royal/[0.05] transition-all">
            <span className="text-[11px] text-royal font-black uppercase tracking-widest">{value}</span>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-royal/30 group-hover/val:text-royal transition-all" fill="none" stroke="currentColor" strokeWidth="4"><path d="M19 9l-7 7-7-7"/></svg>
          </div>
        )}
      </div>
    </div>
  );
}
