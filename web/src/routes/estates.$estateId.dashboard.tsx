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
      <div className="bg-white p-12 rounded-[4rem] mb-12 flex items-center justify-between shadow-[0_4px_40px_rgba(19,51,120,0.05)] border border-royal/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-royal/[0.01] rounded-bl-[10rem] pointer-events-none group-hover:bg-royal/[0.03] transition-colors" />
        <div className="z-10 flex-1">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 bg-royal rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_20px_rgba(19,51,120,0.2)] group-hover:scale-110 transition-transform duration-500">
               <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em] text-royal/30 group-hover:text-royal/60 transition-colors">Guidance Engine</span>
          </div>
          <p className="text-2xl font-black leading-tight max-w-4xl text-royal uppercase tracking-tight">
            {userName && <span className="text-sapphire font-black uppercase tracking-widest mr-4 bg-royal/[0.03] px-4 py-1.5 rounded-xl border border-royal/10 shadow-sm transition-all group-hover:bg-white">Plan: {userName}.</span>}
            {insightData?.insight}
          </p>
        </div>
        <div className="z-10 ml-12">
          <button 
            onClick={() => window.location.href = insightData?.actionUrl || '#'}
            className="bg-royal hover:bg-sapphire text-white h-16 px-12 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_12px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.25)] hover:-translate-y-1 active:scale-[0.98] border border-white/10"
          >
            {insightData?.actionLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard
          label="Plan Completion"
          value={`${metadata?.completionPercentage}%`}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          iconColor="blue"
          change="+8% Progress"
          changeDir="up"
        />
        <StatCard
          label="My Assets"
          value={assetsData?.totalCount.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          iconColor="sapphire"
          change="Everything up to date"
        />
        <StatCard
          label="The Archive"
          value={vaultData?.documents.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          iconColor="royal"
          change="Safe & Secure"
          changeDir="up"
        />
        <StatCard
          label="Family & Heirs"
          value={beneData?.beneficiaries.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-full"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          iconColor="blue"
          change="Verified Roles"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-12 pb-20">
        <div className="space-y-12">
          <Card title="Setup Progress">
            <div className="space-y-10 p-6">
              <ProgressRow label="Personal Details" percent={100} color="blue" />
              <ProgressRow label="My Assets" percent={60} color="sapphire" />
              <ProgressRow label="The Archive" percent={45} color="blue" />
              <ProgressRow label="Family & Heirs" percent={30} color="sapphire" />
              <ProgressRow label="Executor Information" percent={80} color="royalblue" />
            </div>
          </Card>

          <Card title="Activity History">
            <div className="space-y-1">
              <ActivityItem text={<span><strong>Lockhart Heritage Deed</strong> added to The Archive</span>} time="2 hours ago" />
              <ActivityItem text={<span><strong>Lockhart Family Trust</strong> heirs verified for 2026</span>} time="Yesterday" />
              <ActivityItem text={<span><strong>Legacy Tape 01</strong> added to Memories</span>} time="3 days ago" />
              <ActivityItem text={<span><strong>Primary Residence (Chicago)</strong> value updated</span>} time="1 week ago" />
            </div>
          </Card>
        </div>

        <div className="space-y-12">
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-6">
              <QuickAction label="Add Asset" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>} />
              <QuickAction label="Upload File" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
              <QuickAction label="Add Heir" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>} />
              <QuickAction label="Get Advice" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
            </div>
          </Card>

          <Card title="Status Summary">
            <div className="space-y-2">
              <StatusRow label="Overall Status" value={metadata?.status || "Active"} color="green" />
              <StatusRow label="Membership Tier" value={metadata?.tier || "Concierge"} color="sapphire" />
              <StatusRow label="Security Status" value={metadata?.mfaEnabled ? "Protected" : "Enabled"} color="green" />
              <StatusRow label="Last Login" value="Today" />
              <StatusRow label="Next Review" value={formatReviewDate(metadata?.nextReviewDate)} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, iconColor, change, changeDir }: any) {
  const bgMap = { blue: "bg-royal/[0.04]", sapphire: "bg-sapphire/[0.04]", green: "bg-green-50/50", royal: "bg-royal/[0.06]" };
  const textMap = { blue: "text-royal", sapphire: "text-sapphire", green: "text-green-600", royal: "text-royal" };
  const borderMap = { blue: "border-royal/10", sapphire: "border-sapphire/10", green: "border-green-100", royal: "border-royal/10" };
  
  return (
    <div className={`bg-white rounded-[3rem] p-10 border border-royal/10 hover:border-royal/30 hover:shadow-[0_40px_100px_rgba(19,51,120,0.08)] transition-all shadow-[0_2px_40px_rgba(19,51,120,0.03)] group cursor-pointer relative overflow-hidden active:scale-[0.98]`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal/[0.01] rounded-bl-[6rem] group-hover:bg-royal/[0.03] transition-colors" />
      <div className="flex items-center justify-between mb-10">
        <span className="font-[family-name:var(--font-cinzel)] text-[10px] font-black uppercase tracking-[0.3em] text-royal/20 group-hover:text-royal/60 transition-colors">{label}</span>
        <div className={`w-16 h-16 rounded-[1.75rem] flex items-center justify-center shadow-sm duration-500 group-hover:scale-110 transition-all ${bgMap[iconColor as keyof typeof bgMap]} ${textMap[iconColor as keyof typeof textMap]} border ${borderMap[iconColor as keyof typeof borderMap]}`}>
          <span className="w-7 h-7">{icon}</span>
        </div>
      </div>
      <div className="text-[3rem] font-black text-royal leading-none mb-3 tracking-tighter uppercase group-hover:text-sapphire transition-colors">{value}</div>
      {change && (
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mt-8 px-4 py-2 rounded-xl border w-fit shadow-sm transition-all group-hover:bg-white ${changeDir === "up" ? "bg-green-50 text-green-600 border-green-100" : changeDir === "down" ? "bg-red-50 text-red-600 border-red-100" : "bg-royal/[0.03] text-royal/40 border-royal/10"}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse opacity-60" />
          {change}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white rounded-[4rem] p-12 border border-royal/5 shadow-[0_10px_60px_rgba(19,51,120,0.03)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-royal/[0.01] rounded-bl-[10rem] transition-colors group-hover:bg-royal/[0.03] pointer-events-none" />
      <div className="mb-12 flex items-center justify-between border-b border-royal/5 pb-10 relative z-10">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[1.2rem] font-black uppercase tracking-[0.3em] text-royal group-hover:text-sapphire transition-colors">{title}</h3>
        <div className="flex gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-sapphire/20 group-hover:bg-sapphire transition-all duration-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-royal/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-royal/10" />
        </div>
      </div>
      <div className="relative z-10 text-royal">
        {children}
      </div>
    </div>
  );
}

function ProgressRow({ label, percent, color }: any) {
  const fillMap = { blue: "bg-royal shadow-[0_8px_16px_rgba(19,51,120,0.3)]", sapphire: "bg-sapphire shadow-[0_8px_16px_rgba(15,82,186,0.3)]", royalblue: "bg-royal shadow-[0_8px_16px_rgba(19,51,120,0.4)]" };
  return (
    <div className="mb-12 last:mb-0 group/progress">
      <div className="flex justify-between items-center mb-5">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-royal/30 group-hover/progress:text-royal/60 transition-colors uppercase">{label}</span>
        <span className="text-[14px] font-black text-royal group-hover/progress:text-sapphire transition-colors tabular-nums">{percent}%</span>
      </div>
      <div className="w-full h-5 bg-royal/[0.02] rounded-3xl overflow-hidden border border-royal/5 shadow-inner p-1.5">
        <div 
          className={`h-full rounded-2xl transition-all duration-[2000ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${fillMap[color as keyof typeof fillMap]}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-10 py-10 border-b border-royal/5 last:border-b-0 group hover:bg-royal/[0.01] px-10 -mx-10 rounded-[2.5rem] transition-all cursor-pointer relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0 bg-royal rounded-r-full transition-all duration-500 group-hover:h-16" />
      <div className="w-3 h-3 rounded-full bg-sapphire shadow-lg mt-2 shrink-0 group-hover:scale-150 transition-all duration-[700ms] group-hover:shadow-[0_0_15px_rgba(15,82,186,0.6)]" />
      <div className="flex-1">
        <div className="text-lg text-royal font-black leading-snug uppercase tracking-tighter group-hover:text-sapphire transition-colors">{text}</div>
        <div className="text-[10px] text-royal/20 font-black uppercase tracking-[0.4em] mt-4 flex items-center gap-4">
          <span className="group-hover:text-royal/40 transition-colors">{time}</span>
          <div className="w-1.5 h-1.5 rounded-full bg-royal/10" />
          <span className="group-hover:text-royal/40 transition-colors">Everything is secure</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-8 p-12 bg-royal/[0.02] border border-royal/5 rounded-[3.5rem] cursor-pointer transition-all hover:bg-royal group hover:shadow-[0_20px_60px_rgba(19,51,120,0.3)] hover:-translate-y-2 active:scale-95 shadow-sm">
      <div className="w-10 h-10 text-royal group-hover:text-white transition-all duration-500 group-hover:scale-125">
        {icon}
      </div>
      <span className="text-[11px] font-black text-royal/30 uppercase tracking-[0.3em] group-hover:text-white transition-all duration-500">{label}</span>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { 
    green: "bg-green-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)]", 
    sapphire: "bg-sapphire text-white shadow-[0_4px_12px_rgba(15,82,186,0.3)]", 
    blue: "bg-royal text-white shadow-[0_4px_12px_rgba(19,51,120,0.3)]" 
  };
  return (
    <div className="flex justify-between items-center py-7 border-b border-royal/5 last:border-b-0 group cursor-pointer transition-all">
      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-royal/30 group-hover:text-royal/60 transition-colors uppercase">{label}</span>
      {color ? (
        <span className={`text-[10px] font-black px-6 py-2.5 rounded-2xl uppercase tracking-widest transition-all group-hover:scale-110 border border-white/10 ${badgeMap[color]}`}>{value}</span>
      ) : (
        <span className="text-[12px] font-black text-royal uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-all">{value}</span>
      )}
    </div>
  );
}
