import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const [estateId, setEstateId] = useState('estate_lockhart');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
      setUserName(u.name || '');
    }
  }, []);

  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ['estateMetadata', estateId],
    queryFn: () => estateClient.getEstateMetadata({ estateId }),
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', estateId],
    queryFn: () => estateClient.listAssets({ estateId }),
  });

  const { data: beneData, isLoading: beneLoading } = useQuery({
    queryKey: ['beneficiaries', estateId],
    queryFn: () => estateClient.listBeneficiaries({ estateId }),
  });

  const { data: vaultData, isLoading: vaultLoading } = useQuery({
    queryKey: ['vaultDocs', estateId],
    queryFn: () => estateClient.listVaultDocuments({ estateId }),
  });

  const { data: insightData, isLoading: insightLoading } = useQuery({
    queryKey: ['aiInsight', estateId],
    queryFn: () => estateClient.getAIInsight({ estateId }),
  });

  if (metaLoading || assetsLoading || beneLoading || insightLoading || vaultLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-royal/20 border-t-royal rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-royal uppercase tracking-[0.2em]">Authenticating Shard...</span>
        </div>
      </div>
    );
  }

  const completion = metadata?.completionPercentage || 0;

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-6">
      {/* ── Guidance Engine Banner (Royal/Sapphire Light Shard) ── */}
      <div className="bg-white rounded-[2rem] border border-royal/10 shadow-[0_2px_20px_rgba(19,51,120,0.04)] p-8 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-royal/[0.06] to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-royal rounded-full flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </div>
              <span className="text-[10px] font-black text-royal uppercase tracking-[0.25em]">Guidance Engine Protocol</span>
            </div>
            <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-black text-royal tracking-tight leading-tight mb-2 uppercase">
              {userName ? (
                <>Protocol: <span className="text-sapphire">{userName}</span> detected.</>
              ) : 'Estate Shard Active.'}
            </h1>
            <p className="text-[15px] text-royal/60 leading-relaxed font-bold">
              {insightData?.insight || "Your estate is currently 88% synchronized. We recommend verifying the 'Primary Residence' valuation shard to reach 90% completion."}
            </p>
          </div>
          <button className="px-8 py-4 bg-royal hover:bg-sapphire text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-[0_4px_16px_rgba(19,51,120,0.25)] hover:shadow-[0_8px_24px_rgba(15,82,186,0.3)] transition-all active:scale-[0.98] whitespace-nowrap border border-white/10">
            {insightData?.actionLabel || 'Deploy Protocol →'}
          </button>
        </div>
      </div>

      {/* ── Key Metrics (Enclave Grid) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          title="Shard Completion"
          subtitle="+8% Protocol Shift"
          value={`${completion}%`}
          color="royal"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          title="Total Assets"
          subtitle="Real-time Audit Active"
          value={assetsData?.totalCount || 0}
          color="gold"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          title="Vault Evidence"
          subtitle="Encrypted & Immutable"
          value={vaultData?.documents.length || 0}
          color="green"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          title="Legal Heirs"
          subtitle="Verified Lineage"
          value={beneData?.beneficiaries.length || 0}
          color="royal"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Estate Setup Progress */}
          <DashboardCard title="Estate Setup Progress" subtitle="Monitoring secure enclave synchronization">
            <div className="space-y-6">
              <ProgressRow label="Personal Information" percent={100} color="royal" />
              <ProgressRow label="Asset Inventory" percent={60} color="gold" />
              <ProgressRow label="Important Documents" percent={45} color="royal" />
              <ProgressRow label="Beneficiary Designations" percent={30} color="gold" />
              <ProgressRow label="Trust & Power of Attorney" percent={80} color="green" />
            </div>
          </DashboardCard>

          {/* Recent Activity */}
          <DashboardCard title="Recent Activity" subtitle="Verified audit trail of estate changes">
            <div className="space-y-0 -mx-2">
              <ActivityRow icon="📄" title="Document uploaded" desc="Heritage deed added to Evidence Vault" time="2 hours ago" />
              <ActivityRow icon="👤" title="Beneficiary verified" desc="Primary heirs confirmed and lineage verified" time="Yesterday" />
              <ActivityRow icon="🎬" title="Memoir entry saved" desc="Legacy tape 01 recorded in Memoirs Shard" time="3 days ago" />
              <ActivityRow icon="🏠" title="Asset valuation" desc="Primary residence valuation verified by audit" time="1 week ago" />
            </div>
          </DashboardCard>
        </div>

        {/* Right: 1 column */}
        <div className="lg:col-span-1 space-y-8">
          {/* Quick Actions */}
          <DashboardCard title="Quick Actions" subtitle="Deploying new estate protocols">
            <div className="grid grid-cols-2 gap-4">
              <ActionButton icon="📦" label="Add Asset" desc="Inventory" />
              <ActionButton icon="📎" label="Upload Doc" desc="Evidence" />
              <ActionButton icon="👥" label="Add Heir" desc="Lineage" />
              <ActionButton icon="🎥" label="AI Guidance" desc="Decision" />
            </div>
          </DashboardCard>

          {/* Secure Shard Status (New Port) */}
          <DashboardCard title="Shard Status" subtitle="Security & Governance Hierarchy">
            <div className="space-y-4">
              <StatusRow label="Current Status" value={metadata?.status || "Active"} color="green" />
              <StatusRow label="Identity Tier" value={metadata?.tier || "Concierge"} color="gold" />
              <StatusRow label="Encryption MFA" value={metadata?.mfaEnabled ? "Hardened" : "Bipartite"} color="green" />
              <StatusRow label="Data Compliance" value="HIPAA / PCI DSS" color="royal" />
              <StatusRow label="Secure Shard" value={`Enclave-${estateId.slice(-4).toUpperCase()}`} />
            </div>
          </DashboardCard>

          {/* AI Guidance Engine */}
          <div className="bg-royal/[0.04] rounded-[2.5rem] border border-royal/10 p-8 relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-royal/5 rounded-full blur-2xl group-hover:bg-royal/10 transition-colors" />
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg text-xl border border-royal/10 text-royal">✨</div>
              <div>
                <h4 className="text-[14px] font-black text-royal uppercase tracking-wider">Smart Suggestion</h4>
                <p className="text-[11px] text-royal/40 font-bold uppercase tracking-[0.15em]">Guidance Engine active</p>
              </div>
            </div>
            <p className="text-[15px] text-royal/80 leading-relaxed font-black">
              {insightData?.insight || "Consider uploading your homeowner's insurance policy. This ensures your family has quick access to it if something unexpected happens."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components (High-Fidelity Accents) ── */

function MetricCard({ icon, title, subtitle, value, color }: any) {
  const colorMap = {
    royal: 'text-royal bg-royal/5 border-royal/10',
    gold: 'text-[#C8A951] bg-[#C8A951]/10 border-[#C8A951]/20',
    green: 'text-green-600 bg-green-50 border-green-100',
  };
  const activeColor = colorMap[color as keyof typeof colorMap] || colorMap.royal;

  return (
    <div className="bg-white rounded-3xl border border-royal/5 shadow-[0_2px_16px_rgba(19,51,120,0.03)] p-6 hover:shadow-[0_8px_30px_rgba(19,51,120,0.08)] hover:border-royal/20 transition-all duration-500 group">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm`}>
          {icon}
        </div>
        <span className="font-[family-name:var(--font-cinzel)] text-3xl font-black text-royal tabular-nums tracking-tighter group-hover:text-sapphire transition-colors">{value}</span>
      </div>
      <h3 className="text-[11px] font-black text-royal/30 uppercase tracking-[0.2em] mb-1 group-hover:text-royal transition-colors">{title}</h3>
      <p className="text-[13px] font-black text-royal/60 leading-snug tracking-tight">{subtitle}</p>
    </div>
  );
}

function DashboardCard({ title, subtitle, children }: any) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-royal/10 shadow-[0_2px_16px_rgba(19,51,120,0.03)] p-8 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-royal/5 group-hover:bg-royal/10 transition-colors" />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-black text-royal mb-1 uppercase tracking-widest font-[family-name:var(--font-cinzel)]">{title}</h3>
          <p className="text-[11px] text-royal/30 font-black uppercase tracking-[0.2em]">{subtitle}</p>
        </div>
        <div className="flex gap-1.5 opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-royal" />
          <div className="w-1.5 h-1.5 rounded-full bg-royal" />
        </div>
      </div>
      {children}
    </div>
  );
}

function ProgressRow({ label, percent, color }: any) {
  const barColor = color === 'royal' ? 'bg-royal' : color === 'gold' ? 'bg-[#C8A951]' : 'bg-green-500';
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black text-royal/30 uppercase tracking-[0.2em] group-hover:text-royal transition-colors">{label}</span>
        <span className="text-[15px] font-black text-royal tabular-nums transition-colors group-hover:text-sapphire">{percent}%</span>
      </div>
      <div className="h-2.5 bg-royal/[0.03] border border-royal/5 rounded-full overflow-hidden shadow-inner p-[1px]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ActivityRow({ icon, title, desc, time }: any) {
  return (
    <div className="flex items-start gap-4 py-5 px-4 border-b border-royal/5 last:border-0 hover:bg-royal/[0.03] transition-all group cursor-pointer rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-white border border-royal/10 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 group-hover:border-royal/30 transition-all">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-black text-royal uppercase tracking-tight group-hover:text-sapphire transition-colors">{title}</p>
        <p className="text-[13px] text-royal/30 font-bold mt-1.5 truncate leading-none">{desc}</p>
      </div>
      <div className="text-right">
        <span className="text-[11px] text-royal/20 font-black uppercase tracking-widest whitespace-nowrap">{time}</span>
        <div className="text-[9px] text-green-500 font-black uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Verified</div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, desc }: any) {
  return (
    <button className="flex flex-col items-center gap-3 p-6 bg-white border border-royal/10 rounded-[2rem] hover:bg-royal/[0.02] hover:border-royal/30 hover:shadow-[0_12px_32px_rgba(19,51,120,0.08)] transition-all active:scale-[0.97] group text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-8 h-8 bg-royal/5 rounded-bl-full translate-x-1 -translate-y-1" />
      <div className="w-12 h-12 rounded-2xl bg-white border border-royal/10 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:border-royal/30 transition-all">{icon}</div>
      <div>
        <span className="block text-[13px] font-black text-royal uppercase tracking-tight group-hover:text-sapphire transition-colors">{label}</span>
        <span className="block text-[10px] text-royal/20 font-black uppercase tracking-tighter mt-1">{desc}</span>
      </div>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    gold: 'bg-[#C8A951]/10 text-[#C8A951] border-[#C8A951]/20',
    royal: 'bg-royal/5 text-royal border-royal/10',
    default: 'bg-royal/5 text-royal border-royal/10'
  };
  const activeColor = colors[color as keyof typeof colors] || colors.default;

  return (
    <div className="flex items-center justify-between py-3 border-b border-royal/5 last:border-0 group cursor-default">
      <span className="text-[11px] text-royal/30 font-black uppercase tracking-[0.15em] group-hover:text-royal transition-colors">{label}</span>
      <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest shadow-sm transition-all group-hover:shadow-md ${activeColor}`}>{value}</span>
    </div>
  );
}
