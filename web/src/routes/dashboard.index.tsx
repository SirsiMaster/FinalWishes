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
    <div className="max-w-[1600px] mx-auto px-10 py-10">
      {/* ── Guidance Engine Protocol Banner (Hardened) ── */}
      <div className="bg-[#133378] rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 mb-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-gold/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-gold/5 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-8 h-8 bg-gold/20 rounded-xl flex items-center justify-center border border-gold/30 shadow-inner">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gold fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </div>
              <span className="text-[11px] font-black text-gold uppercase tracking-[0.4em]">Guidance Engine Protocol</span>
              <div className="h-[1px] w-20 bg-gold/20" />
            </div>
            <h1 className="font-[family-name:var(--font-cinzel)] text-4xl font-black text-white tracking-widest leading-tight mb-4 uppercase">
              {userName ? (
                <>Welcome back, <span className="text-gold">{userName}</span>.</>
              ) : 'Estate Shard Active.'}
            </h1>
            <p className="text-[17px] text-white/70 leading-relaxed font-bold max-w-2xl">
              {insightData?.insight || "Protocol detected. Tameeka, your estate is 88% synchronized. We recommend verifying the 'Primary Residence' valuation shard to reach 90% completion."}
            </p>
          </div>
          <button className="px-10 py-5 bg-gold hover:bg-gold-bright text-black font-black text-[14px] uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(200,169,81,0.3)] hover:shadow-[0_15px_40px_rgba(200,169,81,0.4)] transition-all active:scale-[0.98] whitespace-nowrap border border-black/10">
            {insightData?.actionLabel || 'Verify Asset Shard →'}
          </button>
        </div>
      </div>

      {/* ── Key Metrics (Royal Shard Grid) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          title="Shard Completion"
          subtitle="+8% Protocol Shift"
          value={`${completion}%`}
          color="royal"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          title="Total Assets"
          subtitle="Real-time Audit Active"
          value={assetsData?.totalCount || 0}
          color="gold"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          title="Vault Evidence"
          subtitle="Encrypted & Immutable"
          value={vaultData?.documents.length || 0}
          color="green"
        />
        <MetricCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          title="Legal Heirs"
          subtitle="Verified Lineage"
          value={beneData?.beneficiaries.length || 0}
          color="royal"
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left: 2 columns */}
        <div className="lg:col-span-2 space-y-10">
          {/* Estate Setup Progress */}
          <DashboardCard title="Estate Setup Progress" subtitle="Monitoring secure enclave synchronization">
            <div className="space-y-8 py-2">
              <ProgressRow label="Personal Information" percent={100} color="green" />
              <ProgressRow label="Asset Inventory" percent={60} color="gold" />
              <ProgressRow label="Document Upload" percent={45} color="royal" />
              <ProgressRow label="Beneficiary Designations" percent={30} color="gold" />
              <ProgressRow label="Executor Assignment" percent={80} color="green" />
            </div>
          </DashboardCard>

          {/* Recent Activity */}
          <DashboardCard title="Recent Activity" subtitle="Verified audit trail of estate changes">
            <div className="space-y-0 -mx-4">
              <ActivityRow icon="📄" title="Document uploaded" desc="Heritage deed added to Evidence Vault" time="2 hours ago" />
              <ActivityRow icon="👤" title="Beneficiary verified" desc="Primary heirs confirmed and lineage verified" time="Yesterday" />
              <ActivityRow icon="🎬" title="Memoir entry saved" desc="Legacy tape 01 recorded in Memoirs Shard" time="3 days ago" />
              <ActivityRow icon="🏠" title="Asset valuation" desc="Primary residence valuation verified by audit" time="1 week ago" />
            </div>
          </DashboardCard>
        </div>

        {/* Right: 1 column */}
        <div className="lg:col-span-1 space-y-10">
          {/* Quick Actions */}
          <DashboardCard title="Quick Actions" subtitle="Deploying new estate protocols">
            <div className="grid grid-cols-2 gap-5">
              <ActionButton icon="📦" label="Add Asset" desc="Inventory" />
              <ActionButton icon="📎" label="Upload Doc" desc="Evidence" />
              <ActionButton icon="👥" label="Add Heir" desc="Lineage" />
              <ActionButton icon="🎥" label="AI Guidance" desc="Decision" />
            </div>
          </DashboardCard>

          {/* Secure Shard Status */}
          <DashboardCard title="Shard Status" subtitle="Security & Governance Hierarchy">
            <div className="space-y-5 py-2">
              <StatusRow label="Current Status" value={metadata?.status || "Active Shard"} color="green" />
              <StatusRow label="Identity Tier" value={metadata?.tier || "Estate Owner"} color="gold" />
              <StatusRow label="Encryption Shroud" value={metadata?.mfaEnabled ? "Hardened" : "Bipartite"} color="green" />
              <StatusRow label="Compliance" value="SOC 2 + HIPAA" color="royal" />
              <StatusRow label="Architecture" value={`Enclave-${estateId.slice(-4).toUpperCase()}`} />
            </div>
          </DashboardCard>

          {/* AI Guidance Engine (Clean High-Fidelity Shard) */}
          <div className="bg-[#133378]/5 rounded-[2.5rem] border border-[#133378]/10 p-10 relative overflow-hidden group shadow-sm">
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl group-hover:bg-gold/10 transition-colors" />
            <div className="flex items-center gap-5 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-2xl border border-gold/20 animate-pulse">✨</div>
              <div>
                <h4 className="text-[14px] font-black text-royal uppercase tracking-[0.2em]">Smart Suggestion</h4>
                <p className="text-[10px] text-royal/40 font-black uppercase tracking-[0.2em]">Guidance Engine active</p>
              </div>
            </div>
            <p className="text-[17px] text-[#0F172A] leading-relaxed font-black">
              {insightData?.insight || "Consider uploading your homeowner's insurance policy. This ensures your family has quick access to it if something unexpected happens."}
            </p>
            <div className="mt-8 flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-[0.3em] cursor-pointer hover:gap-4 transition-all">
              Execute Protocol <svg viewBox="0 0 24 24" className="w-3 h-3 text-gold stroke-[3]" stroke="currentColor" fill="none"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components (Hardened for Royal Neo-Deco) ── */

function MetricCard({ icon, title, subtitle, value, color }: any) {
  const colors = {
    royal: 'text-royal bg-royal/5 border-royal/10 hover:border-royal/30 shadow-royal/5',
    gold: 'text-gold bg-gold/5 border-gold/10 hover:border-gold/30 shadow-gold/5',
    green: 'text-green-600 bg-green-50 border-green-100 hover:border-green-200 shadow-green-500/5',
  };
  const active = colors[color as keyof typeof colors] || colors.royal;

  return (
    <div className={`rounded-[2rem] border p-8 transition-all duration-700 group cursor-default shadow-xl ${active} bg-white`}>
      <div className="flex items-center justify-between mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 bg-white border border-inherit shadow-lg`}>
          {icon}
        </div>
        <span className="font-[family-name:var(--font-cinzel)] text-4xl font-black text-[#0F172A] tabular-nums tracking-tighter group-hover:text-gold transition-colors">{value}</span>
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-30 group-hover:opacity-100 group-hover:text-gold transition-all">{title}</h3>
      <p className="text-[15px] font-black text-[#0F172A] leading-snug tracking-tight">{subtitle}</p>
    </div>
  );
}

function DashboardCard({ title, subtitle, children }: any) {
  return (
    <div className="bg-white rounded-[3rem] border border-[#E8ECF1] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] p-10 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] transition-all duration-700 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-gold/5" />
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h3 className="text-[22px] font-black text-[#0F172A] mb-1.5 uppercase tracking-widest font-[family-name:var(--font-cinzel)]">{title}</h3>
          <p className="text-[11px] text-royal/40 font-black uppercase tracking-[0.3em]">{subtitle}</p>
        </div>
        <div className="flex gap-2 opacity-10">
          <div className="w-2 h-2 rounded-full bg-gold" />
          <div className="w-2 h-2 rounded-full bg-gold" />
          <div className="w-2 h-2 rounded-full bg-gold" />
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
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-black text-[#0F172A]/40 uppercase tracking-[0.2em] group-hover:text-royal transition-colors">{label}</span>
        <span className="text-[15px] font-black text-[#0F172A] tabular-nums">{percent}%</span>
      </div>
      <div className="h-3 bg-[#F1F5F9] rounded-full overflow-hidden shadow-inner border border-black/5 p-[1px]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-lg ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ActivityRow({ icon, title, desc, time }: any) {
  return (
    <div className="flex items-start gap-6 py-6 px-6 border-b border-[#F1F5F9] last:border-0 hover:bg-gold/[0.03] transition-all group relative overflow-hidden cursor-pointer">
      <div className="absolute left-0 top-0 w-[2px] h-full bg-gold scale-y-0 group-hover:scale-y-100 transition-all duration-500" />
      <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8ECF1] flex items-center justify-center text-xl shadow-md group-hover:scale-110 group-hover:border-gold/30 transition-all group-active:scale-95">{icon}</div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[16px] font-black text-[#0F172A] uppercase tracking-tight group-hover:text-royal transition-colors">{title}</p>
        <p className="text-[13px] text-[#0F172A]/40 font-bold mt-1.5 truncate">{desc}</p>
      </div>
      <div className="text-right pt-1">
        <span className="text-[11px] text-[#0F172A]/30 font-black uppercase tracking-widest whitespace-nowrap">{time}</span>
        <div className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em] mt-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">Verified</div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, desc }: any) {
  return (
    <button className="flex flex-col items-center gap-4 p-8 bg-[#FAFBFC] border border-[#E8ECF1] rounded-[2.5rem] hover:bg-white hover:border-gold/30 hover:shadow-[0_20px_40px_rgba(200,169,81,0.08)] transition-all active:scale-[0.95] group text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-12 h-12 bg-gold/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all" />
      <div className="w-16 h-16 rounded-[1.25rem] bg-white border border-[#E8ECF1] flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 group-hover:border-gold/30 transition-all group-hover:shadow-gold/10">{icon}</div>
      <div>
        <span className="block text-[13px] font-black text-[#0F172A] uppercase tracking-widest mb-1.5 group-hover:text-gold transition-colors">{label}</span>
        <span className="block text-[10px] text-royal/30 font-black uppercase tracking-tighter">{desc}</span>
      </div>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    gold: 'bg-gold/5 text-gold border-gold/20',
    royal: 'bg-royal/5 text-royal border-royal/10',
    default: 'bg-gray-50 text-[#0F172A] border-[#E8ECF1]'
  };
  const active = colors[color as keyof typeof colors] || colors.default;

  return (
    <div className="flex items-center justify-between py-4 border-b border-[#F1F5F9] last:border-0 group cursor-default">
      <span className="text-[12px] text-royal/30 font-black uppercase tracking-[0.2em] group-hover:text-royal group-hover:translate-x-1 transition-all">{label}</span>
      <span className={`text-[11px] font-black px-4 py-1.5 rounded-xl border border-inherit uppercase tracking-[0.2em] shadow-sm group-hover:shadow-md transition-all ${active}`}>{value}</span>
    </div>
  );
}
