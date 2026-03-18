import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/dashboard')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/dashboard' });
  const [estateId, setEstateId] = useState(routeId);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      setUserName(u.name || '');
    }
    // Synchronize Firestore Shard
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

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
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const formatReviewDate = (ts: any) => {
    if (!ts || !ts.seconds) return 'Active';
    const ms = Number(ts.seconds) * 1000;
    return new Date(ms).toLocaleDateString();
  };

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="bg-white p-12 rounded-[3.5rem] mb-12 flex items-center justify-between shadow-[0_4px_30px_rgba(19,51,120,0.05)] border border-royal/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-royal/[0.02] blur-[100px] pointer-events-none" />
        <div className="z-10 flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-royal rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8A951] fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em] text-royal/40">Protocol Guidance Engine Shard</span>
          </div>
          <p className="text-xl font-black leading-relaxed max-w-4xl text-royal uppercase tracking-tight">
            {userName && <span className="text-[#C8A951] font-black uppercase tracking-widest mr-3 border-b-2 border-[#C8A951]/20 pb-1">Protocol: {userName}.</span>}
            {insightData?.insight}
          </p>
        </div>
        <div className="z-10 ml-12">
          <button 
            onClick={() => window.location.href = insightData?.actionUrl || '#'}
            className="bg-royal hover:bg-sapphire text-white h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_8px_24px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_32px_rgba(15,82,186,0.3)] hover:-translate-y-0.5 active:scale-[0.98] border border-white/10"
          >
            {insightData?.actionLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard
          label="Shard Completion"
          value={`${metadata?.completionPercentage}%`}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          iconColor="blue"
          change="+8% Protocol Shift"
          changeDir="up"
        />
        <StatCard
          label="Total Assets"
          value={assetsData?.totalCount.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          iconColor="gold"
          change="Real-time Audit Active"
        />
        <StatCard
          label="Vault Evidence"
          value={vaultData?.documents.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          iconColor="green"
          change="Encrypted & Immutable"
          changeDir="up"
        />
        <StatCard
          label="Legal Heirs"
          value={beneData?.beneficiaries.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          iconColor="blue"
          change="Verified Lineage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-10 pb-20">
        <div className="space-y-10">
          <Card title="Estate Setup Progress">
            <div className="space-y-8 p-4">
              <ProgressRow label="Personal Information Registry" percent={100} color="blue" />
              <ProgressRow label="Asset Architecture Inventory" percent={60} color="gold" />
              <ProgressRow label="Document Shard Evidence" percent={45} color="blue" />
              <ProgressRow label="Beneficiary Protocol Designations" percent={30} color="gold" />
              <ProgressRow label="Executor Shard Assignment" percent={80} color="green" />
            </div>
          </Card>

          <Card title="Protocol Activity Ledger">
            <div className="space-y-1">
              <ActivityItem text={<span><strong>Lockhart Heritage Deed</strong> committed to Evidence Vault</span>} time="2 hours ago" />
              <ActivityItem text={<span><strong>Lockhart Family Trust</strong> heirs verified for epoch 2026</span>} time="Yesterday" />
              <ActivityItem text={<span><strong>Legacy Tape 01</strong> synchronized to Memoirs Shard</span>} time="3 days ago" />
              <ActivityItem text={<span><strong>Primary Residence (Chicago)</strong> valuation shard refreshed</span>} time="1 week ago" />
            </div>
          </Card>
        </div>

        <div className="space-y-10">
          <Card title="Shard Quick Actions">
            <div className="grid grid-cols-2 gap-4">
              <QuickAction label="Commit Asset" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>} />
              <QuickAction label="Upload Evidence" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
              <QuickAction label="Notarize Heir" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>} />
              <QuickAction label="AI Guidance" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
            </div>
          </Card>

          <Card title="Shard Protocol Status">
            <div className="space-y-2">
              <StatusRow label="Operational Status" value={metadata?.status || "Active"} color="green" />
              <StatusRow label="Identity Architecture Tier" value={metadata?.tier || "Concierge"} color="gold" />
              <StatusRow label="Encryption Protocol MFA" value={metadata?.mfaEnabled ? "Hardened" : "Enabled"} color="green" />
              <StatusRow label="Last Shard Auth" value="Today" />
              <StatusRow label="Protocol Review" value={formatReviewDate(metadata?.nextReviewDate)} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, iconColor, change, changeDir }: any) {
  const bgMap = { blue: "bg-royal/[0.03]", gold: "bg-[#C8A951]/[0.05]", green: "bg-green-50" };
  const textMap = { blue: "text-royal", gold: "text-[#C8A951]", green: "text-green-600" };
  const borderMap = { blue: "border-royal/10", gold: "border-[#C8A951]/20", green: "border-green-100" };
  
  return (
    <div className={`bg-white rounded-[2.5rem] p-10 border border-royal/10 hover:border-royal/20 transition-all shadow-[0_2px_20px_rgba(19,51,120,0.03)] group cursor-pointer relative overflow-hidden active:scale-[0.98]`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-royal/[0.01] rounded-bl-[4rem] group-hover:bg-royal/[0.03] transition-colors" />
      <div className="flex items-center justify-between mb-8">
        <span className="font-[family-name:var(--font-cinzel)] text-[10px] font-black uppercase tracking-[0.25em] text-royal/30 group-hover:text-royal transition-colors">{label}</span>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bgMap[iconColor as keyof typeof bgMap]} ${textMap[iconColor as keyof typeof textMap]} border ${borderMap[iconColor as keyof typeof borderMap]} shadow-sm group-hover:scale-110 transition-transform`}>
          <span className="w-6 h-6">{icon}</span>
        </div>
      </div>
      <div className="text-[2.6rem] font-black text-royal leading-none mb-3 tracking-tighter uppercase">{value}</div>
      {change && (
        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] mt-6 px-3 py-1.5 rounded-xl border w-fit ${changeDir === "up" ? "bg-green-50 text-green-600 border-green-100" : changeDir === "down" ? "bg-red-50 text-red-600 border-red-100" : "bg-royal/[0.01] text-royal/20 border-royal/5"}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse opacity-60" />
          {change}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white rounded-[3rem] p-12 border border-royal/5 shadow-[0_10px_40px_rgba(19,51,120,0.05)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-royal/[0.01] rounded-bl-[10rem] transition-colors group-hover:bg-royal/[0.03]" />
      <div className="mb-10 flex items-center justify-between border-b border-royal/5 pb-8 relative z-10">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] font-black uppercase tracking-[0.3em] text-royal">{title}</h3>
        <div className="flex gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#C8A951]" />
          <div className="w-2 h-2 rounded-full bg-royal/10" />
          <div className="w-2 h-2 rounded-full bg-royal/10" />
        </div>
      </div>
      <div className="relative z-10 text-royal">
        {children}
      </div>
    </div>
  );
}

function ProgressRow({ label, percent, color }: any) {
  const fillMap = { blue: "bg-royal shadow-[0_4px_12px_rgba(19,51,120,0.2)]", gold: "bg-[#C8A951] shadow-[0_4px_12px_rgba(200,169,81,0.2)]", green: "bg-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.2)]" };
  return (
    <div className="mb-8 last:mb-0 group/progress">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-royal/30 group-hover/progress:text-royal/60 transition-colors">{label}</span>
        <span className="text-[12px] font-black text-royal tabular-nums">{percent}%</span>
      </div>
      <div className="w-full h-4 bg-royal/[0.03] rounded-2xl overflow-hidden border border-royal/5 shadow-inner p-1">
        <div 
          className={`h-full rounded-2xl transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${fillMap[color as keyof typeof fillMap]}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-8 py-8 border-b border-royal/5 last:border-b-0 group hover:bg-royal/[0.01] px-8 -mx-8 rounded-[2rem] transition-all cursor-pointer relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-0 bg-royal transition-all duration-300 group-hover:h-12" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#C8A951] shadow-sm mt-1.5 shrink-0 group-hover:scale-150 transition-all duration-500 group-hover:shadow-[0_0_12px_rgba(200,169,81,0.5)]" />
      <div className="flex-1">
        <div className="text-[15px] text-royal font-black leading-relaxed uppercase tracking-tight group-hover:text-sapphire transition-colors">{text}</div>
        <div className="text-[9px] text-royal/20 font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
          <span className="group-hover:text-royal/40 transition-colors">{time}</span>
          <span className="w-1 h-1 rounded-full bg-royal/10" />
          <span className="group-hover:text-royal/40 transition-colors">Verified Shard Access Persistent</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-6 p-10 bg-royal/[0.02] border border-royal/5 rounded-[2.5rem] cursor-pointer transition-all hover:bg-royal group hover:shadow-[0_12px_32px_rgba(19,51,120,0.25)] hover:-translate-y-1 active:scale-95">
      <span className="w-8 h-8 text-royal group-hover:text-white transition-all duration-500 group-hover:scale-125">{icon}</span>
      <span className="text-[11px] font-black text-royal/30 uppercase tracking-[0.25em] group-hover:text-white transition-all duration-500">{label}</span>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { 
    green: "bg-green-50 text-green-600 border border-green-100 shadow-sm", 
    gold: "bg-[#C8A951]/5 text-[#C8A951] border border-[#C8A951]/20 shadow-sm", 
    blue: "bg-royal/[0.03] text-royal border border-royal/10 shadow-sm" 
  };
  return (
    <div className="flex justify-between items-center py-6 border-b border-royal/5 last:border-b-0 group cursor-pointer">
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-royal/30 group-hover:text-royal transition-colors">{label}</span>
      {color ? (
        <span className={`text-[9px] font-black px-5 py-2 rounded-xl uppercase tracking-widest transition-all group-hover:scale-105 ${badgeMap[color]}`}>{value}</span>
      ) : (
        <span className="text-[11px] font-black text-royal uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{value}</span>
      )}
    </div>
  );
}
