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
    <>
      <div className="bg-gradient-to-r from-royal-blue to-royal-bright text-white p-8 rounded-[2.5rem] mb-10 flex items-center justify-between shadow-2xl border border-white/20 relative overflow-hidden group">
        <div className="z-10 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-navy-deep fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <span className="font-black text-[0.7rem] uppercase tracking-[0.25em] text-gold-bright drop-shadow-md">Guidance Engine Shard</span>
          </div>
          <p className="text-lg font-bold leading-relaxed max-w-2xl drop-shadow-sm">
            {userName && <span className="text-gold-bright font-black uppercase tracking-widest mr-2 underline decoration-gold/30">Protocol: {userName}.</span>}
            {insightData?.insight}
          </p>
        </div>
        <div className="z-10 ml-8">
          <button 
            onClick={() => window.location.href = insightData?.actionUrl || '#'}
            className="bg-white/10 hover:bg-gold text-white hover:text-black h-12 px-8 rounded-xl font-black text-[0.75rem] uppercase tracking-[0.2em] transition-all backdrop-blur-md border border-white/20 hover:border-gold hover:shadow-[0_0_30px_rgba(200,169,81,0.4)]"
          >
            {insightData?.actionLabel}
          </button>
        </div>
        {/* Animated background highlights */}
        <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-white/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] left-[10%] w-[200px] h-[200px] bg-gold/10 rounded-full blur-[80px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="Shard Completion"
          value={`${metadata?.completionPercentage}%`}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          iconColor="blue"
          change="+8% Protocol Shift"
          changeDir="up"
        />
        <StatCard
          label="Total Assets"
          value={assetsData?.totalCount.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          iconColor="gold"
          change="Real-time Audit Active"
        />
        <StatCard
          label="Vault Evidence"
          value={vaultData?.documents.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          iconColor="green"
          change="Encrypted & Immutable"
          changeDir="up"
        />
        <StatCard
          label="Legal Heirs"
          value={beneData?.beneficiaries.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-full"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          iconColor="blue"
          change="Verified Lineage"
        />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6 max-lg:grid-cols-1 pb-20">
        <div className="space-y-6">
          <Card title="Estate Setup Progress">
            <div className="space-y-4">
              <ProgressRow label="Personal Information" percent={100} color="blue" />
              <ProgressRow label="Asset Inventory" percent={60} color="gold" />
              <ProgressRow label="Document Upload" percent={45} color="blue" />
              <ProgressRow label="Beneficiary Designations" percent={30} color="gold" />
              <ProgressRow label="Executor Assignment" percent={80} color="green" />
            </div>
          </Card>

          <Card title="Recent Activity">
            <div className="space-y-0">
              <ActivityItem text={<span><strong>Lockhart Heritage Deed</strong> uploaded to Evidence Vault</span>} time="2 hours ago" />
              <ActivityItem text={<span><strong>Lockhart Family Trust</strong> heirs verified</span>} time="Yesterday" />
              <ActivityItem text={<span><strong>Legacy Tape 01</strong> uploaded to Memoirs Shard</span>} time="3 days ago" />
              <ActivityItem text={<span><strong>Primary Residence (Chicago)</strong> valuation verified</span>} time="1 week ago" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <QuickAction label="Add Asset" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>} />
              <QuickAction label="Upload Doc" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
              <QuickAction label="Add Heir" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>} />
              <QuickAction label="AI Guidance" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
            </div>
          </Card>

          <Card title="Shard Status">
            <div className="space-y-3">
              <StatusRow label="Current Status" value={metadata?.status || "Active"} color="green" />
              <StatusRow label="Identity Tier" value={metadata?.tier || "Concierge"} color="gold" />
              <StatusRow label="Encryption MFA" value={metadata?.mfaEnabled ? "Hardened" : "Enabled"} color="green" />
              <StatusRow label="Last Auth" value="Today" />
              <StatusRow label="Protocol Review" value={formatReviewDate(metadata?.nextReviewDate)} />
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function StatCard({ label, value, icon, iconColor, change, changeDir }: any) {
  const bgMap = { blue: "bg-royal/20", gold: "bg-gold/20", green: "bg-success/20" };
  const textMap = { blue: "text-royal-bright", gold: "text-gold", green: "text-success" };
  const borderMap = { blue: "border-royal/30", gold: "border-gold/30", green: "border-success/30" };
  
  return (
    <div className={`glass-card rounded-[2rem] p-7 border ${borderMap[iconColor as keyof typeof borderMap]} bg-white/5 hover:bg-white/10 transition-all shadow-2xl group`}>
      <div className="flex items-center justify-between mb-6">
        <span className="font-[family-name:var(--font-cinzel)] text-[0.75rem] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-gold transition-colors">{label}</span>
        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${bgMap[iconColor as keyof typeof bgMap]} ${textMap[iconColor as keyof typeof textMap]} shadow-inner group-hover:scale-110 transition-transform`}>
          <span className="w-6 h-6">{icon}</span>
        </div>
      </div>
      <div className="text-[2.2rem] font-black text-white leading-none mb-2 tracking-tight drop-shadow-lg">{value}</div>
      {change && (
        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mt-4 ${changeDir === "up" ? "text-success" : changeDir === "down" ? "text-danger" : "text-white/30"}`}>
          <div className="w-1 h-1 rounded-full bg-current opacity-60" />
          {change}
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="glass-card rounded-[2.5rem] p-10 border border-white/10 bg-white/5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal/10 blur-[80px] pointer-events-none" />
      <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[1.1rem] font-black uppercase tracking-[0.25em] text-white hero-text">{title}</h3>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

function ProgressRow({ label, percent, color }: any) {
  const fillMap = { blue: "bg-royal-bright shadow-[0_0_15px_rgba(37,99,235,0.5)]", gold: "bg-gold shadow-[0_0_15px_rgba(200,169,81,0.5)]", green: "bg-success shadow-[0_0_15px_rgba(16,185,129,0.5)]" };
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/50">{label}</span>
        <span className="text-[0.8rem] font-black text-gold-bright">{percent}%</span>
      </div>
      <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${fillMap[color as keyof typeof fillMap]}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-5 py-5 border-b border-white/5 last:border-b-0 group hover:bg-white/5 px-4 -mx-4 rounded-xl transition-all">
      <div className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(200,169,81,0.6)] mt-2 shrink-0 group-hover:scale-125 transition-transform" />
      <div className="flex-1">
        <div className="text-[14px] text-white/90 font-bold leading-relaxed">{text}</div>
        <div className="text-[10px] text-gold/40 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
          <span>{time}</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span>Verified Shard Access</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-4 p-7 bg-white/5 border border-white/10 rounded-[2rem] cursor-pointer transition-all hover:bg-gold hover:border-gold hover:shadow-[0_0_40px_rgba(200,169,81,0.3)] group">
      <span className="w-7 h-7 text-royal-bright group-hover:text-black transition-colors">{icon}</span>
      <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-black group-hover:opacity-100 transition-all">{label}</span>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { 
    green: "bg-success/20 text-success border border-success/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]", 
    gold: "bg-gold/20 text-gold border border-gold/40 shadow-[0_0_10px_rgba(200,169,81,0.2)]", 
    blue: "bg-royal/20 text-royal-bright border border-royal/40 shadow-[0_0_10px_rgba(37,99,235,0.2)]" 
  };
  return (
    <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-b-0 group">
      <span className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition-colors">{label}</span>
      {color ? (
        <span className={`text-[0.65rem] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest ${badgeMap[color]}`}>{value}</span>
      ) : (
        <span className="text-[0.75rem] font-black text-white uppercase tracking-widest drop-shadow-md">{value}</span>
      )}
    </div>
  );
}
