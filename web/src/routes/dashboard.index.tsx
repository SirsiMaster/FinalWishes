import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const [estateId, setEstateId] = useState('test-estate');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      // Force reconciliation for Tameeka Lockhart Shard
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
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const formatReviewDate = (ts: any) => {
    if (!ts || !ts.seconds) return 'Active';
    // Protobuf seconds might be bigint in some environments
    const ms = Number(ts.seconds) * 1000;
    return new Date(ms).toLocaleDateString();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-navy to-royal text-white p-6 rounded-2xl mb-8 flex items-center justify-between shadow-lg border border-white/10 relative overflow-hidden">
        <div className="z-10 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-navy fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <span className="font-bold text-[0.6rem] uppercase tracking-widest text-gold text-white/90">Guidance Engine Protocol</span>
          </div>
          <p className="text-sm font-medium leading-relaxed max-w-2xl">
            {userName && <span className="text-gold font-black uppercase tracking-widest mr-2">Welcome Back, {userName}.</span>}
            {insightData?.insight}
          </p>
        </div>
        <div className="z-10 ml-6">
          <button 
            onClick={() => window.location.href = insightData?.actionUrl || '#'}
            className="bg-white/15 h-10 px-6 rounded-lg font-bold text-[0.7rem] uppercase tracking-widest hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 text-white"
          >
            {insightData?.actionLabel}
          </button>
        </div>
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-royal rounded-full blur-[100px] opacity-20 pointer-events-none" />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="Shard Completion"
          value={`${metadata?.completionPercentage}%`}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          iconColor="blue"
          change="+8% Protocol Shift"
          changeDir="up"
        />
        <StatCard
          label="Total Assets"
          value={assetsData?.totalCount.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          iconColor="gold"
          change="Real-time Audit Active"
        />
        <StatCard
          label="Vault Evidence"
          value={vaultData?.documents.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          iconColor="green"
          change="Encrypted & Immutable"
          changeDir="up"
        />
        <StatCard
          label="Legal Heirs"
          value={beneData?.beneficiaries.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
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
  const bgMap = { blue: "bg-royal-subtle", gold: "bg-gold-dim", green: "bg-[#ecfdf5]" };
  const textMap = { blue: "text-royal", gold: "text-gold", green: "text-success" };
  return (
    <div className="bg-white rounded-2xl p-6 border border-border-light shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)] transition-all hover:shadow-[0_10px_15px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-5">
        <span className="font-[family-name:var(--font-cinzel)] text-[0.8rem] font-black uppercase tracking-[0.1em] text-navy opacity-60">{label}</span>
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${bgMap[iconColor as keyof typeof bgMap]} ${textMap[iconColor as keyof typeof textMap]}`}>
          <span className="w-5 h-5">{icon}</span>
        </div>
      </div>
      <div className="text-[2rem] font-black text-navy leading-none mb-1 tracking-tight">{value}</div>
      {change && <div className={`text-[9px] font-black uppercase tracking-widest mt-2 ${changeDir === "up" ? "text-success" : changeDir === "down" ? "text-danger" : "text-text-muted"}`}>{change}</div>}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-border-light shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
      <div className="mb-6 flex items-center justify-between border-b border-gray-50 pb-4">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[1rem] font-black uppercase tracking-[0.15em] text-navy">{title}</h3>
        <div className="w-2 h-2 rounded-full bg-royal/20" />
      </div>
      {children}
    </div>
  );
}

function ProgressRow({ label, percent, color }: any) {
  const fillMap = { blue: "bg-royal", gold: "bg-gold", green: "bg-success" };
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[0.65rem] font-black uppercase tracking-widest text-navy/40">{label}</span>
        <span className="text-[0.65rem] font-black text-navy">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-[2px]">
        <div className={`h-full rounded-full transition-all duration-600 ${fillMap[color as keyof typeof fillMap]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-4 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 rounded-lg px-2 transition-colors">
      <div className="w-2 h-2 rounded-full bg-gold/40 mt-1.5 shrink-0" />
      <div className="flex-1">
        <div className="text-[13px] text-navy font-medium leading-relaxed">{text}</div>
        <div className="text-[10px] text-navy/30 font-black uppercase tracking-widest mt-1">{time}</div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon }: any) {
  return (
    <button className="flex flex-col items-center gap-3 p-5 bg-[#FAFBFC] border border-[#E5E7EB] rounded-[1.5rem] cursor-pointer transition-all hover:bg-royal hover:border-royal hover:shadow-xl hover:shadow-royal/20 group">
      <span className="w-6 h-6 text-royal group-hover:text-white transition-colors">{icon}</span>
      <span className="text-[10px] font-black text-navy opacity-40 uppercase tracking-[0.1em] group-hover:text-white group-hover:opacity-100 transition-all">{label}</span>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { green: "bg-green-50 text-green-700 border border-green-100", gold: "bg-gold/5 text-gold border border-gold/10", blue: "bg-royal/5 text-royal border border-royal/10" };
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-b-0">
      <span className="text-[0.65rem] font-black uppercase tracking-widest text-navy/40">{label}</span>
      {color ? <span className={`text-[0.6rem] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${badgeMap[color]}`}>{value}</span> : <span className="text-[0.65rem] font-black text-navy uppercase tracking-widest">{value}</span>}
    </div>
  );
}
