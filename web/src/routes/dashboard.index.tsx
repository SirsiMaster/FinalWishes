import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
})

function DashboardIndex() {
  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ['estateMetadata'],
    queryFn: () => estateClient.getEstateMetadata({ estateId: 'test-estate' }),
  });

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => estateClient.listAssets({ estateId: 'test-estate' }),
  });

  const { data: beneData, isLoading: beneLoading } = useQuery({
    queryKey: ['beneficiaries'],
    queryFn: () => estateClient.listBeneficiaries({ estateId: 'test-estate' }),
  });

  const { data: insightData, isLoading: insightLoading } = useQuery({
    queryKey: ['aiInsight'],
    queryFn: () => estateClient.getAIInsight({ estateId: 'test-estate' }),
  });

  if (metaLoading || assetsLoading || beneLoading || insightLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-navy to-royal text-white p-6 rounded-2xl mb-8 flex items-center justify-between shadow-lg border border-white/10 relative overflow-hidden">
        <div className="z-10 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-gold rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-navy fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <span className="font-bold text-[0.6rem] uppercase tracking-widest text-gold">Gemini Guidance Engine AI</span>
          </div>
          <p className="text-sm font-medium leading-relaxed max-w-2xl">{insightData?.insight}</p>
        </div>
        <div className="z-10 ml-6">
          <button 
            onClick={() => window.location.href = insightData?.actionUrl || '#'}
            className="bg-white/15 h-10 px-6 rounded-lg font-bold text-[0.7rem] uppercase tracking-widest hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
          >
            {insightData?.actionLabel}
          </button>
        </div>
        {/* Abstract design elements */}
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-royal rounded-full blur-[100px] opacity-20 pointer-events-none" />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCard
          label="Estate Completion"
          value={`${metadata?.completionPercentage}%`}
          track="34%"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          iconColor="blue"
          change="+8% this month"
          changeDir="up"
        />
        <StatCard
          label="Total Assets"
          value={assetsData?.totalCount.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
          iconColor="gold"
          change="3 pending review"
        />
        <StatCard
          label="Documents"
          value="3" // Count from Vault
          icon={<svg viewBox="0 0 24/24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          iconColor="green"
          change="5 uploaded this week"
          changeDir="up"
        />
        <StatCard
          label="Beneficiaries"
          value={beneData?.beneficiaries.length.toString() || "0"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          iconColor="blue"
          change="2 executors, 4 heirs"
        />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6 max-lg:grid-cols-1">
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
              <ActivityItem text={<span><strong>Life Insurance Policy</strong> uploaded to Document Vault</span>} time="2 hours ago" />
              <ActivityItem text={<span><strong>Marcus Johnson</strong> accepted executor invitation</span>} time="Yesterday" />
              <ActivityItem text={<span><strong>Investment Account</strong> added to financial assets</span>} time="3 days ago" />
              <ActivityItem text={<span><strong>Family Home</strong> valuation updated to $485,000</span>} time="1 week ago" />
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

          <Card title="Estate Status">
            <div className="space-y-3">
              <StatusRow label="Status" value={metadata?.status || "Active"} color="green" />
              <StatusRow label="Tier" value={metadata?.tier || "Concierge"} color="gold" />
              <StatusRow label="MFA" value={metadata?.mfaEnabled ? "Enabled" : "Disabled"} color="green" />
              <StatusRow label="Last Login" value="Today" />
              <StatusRow label="Next Review" value="Apr 15, 2026" />
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
    <div className="bg-white rounded-2xl p-6 border border-border-light shadow-[0_4px_6px_-1px\_rgba(0,0,0,0.07)] transition-all hover:shadow-[0\_10px_15_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-5">
        <span className="font-[family-name:var(--font-cinzel)] text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-navy">{label}</span>
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${bgMap[iconColor as keyof typeof bgMap]} ${textMap[iconColor as keyof typeof textMap]}`}>
          <span className="w-5 h-5">{icon}</span>
        </div>
      </div>
      <div className="text-[2rem] font-bold text-navy leading-none mb-1">{value}</div>
      {change && <div className={`text-xs font-semibold mt-2 ${changeDir === "up" ? "text-success" : changeDir === "down" ? "text-danger" : "text-text-muted"}`}>{change}</div>}
    </div>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border-light shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
      <div className="mb-5">
        <h3 className="font-[family-name:var(--font-cinzel)] text-[0.9rem] font-semibold uppercase tracking-[0.08em] text-navy">{title}</h3>
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
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-xs font-semibold text-navy">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-600 ${fillMap[color as keyof typeof fillMap]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: any) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#F3F4F6] last:border-b-0">
      <div className="w-2 h-2 rounded-full bg-royal mt-1.5 shrink-0" />
      <div>
        <div className="text-[13px] text-text-secondary leading-snug">{text}</div>
        <div className="text-[11px] text-text-muted mt-0.5">{time}</div>
      </div>
    </div>
  );
}

function QuickAction({ label, icon }: any) {
  return (
    <button className="flex flex-col items-center gap-2 p-4 bg-[#FAFBFC] border border-[#E5E7EB] rounded-xl cursor-pointer transition-all hover:bg-royal-subtle hover:border-royal/20 group">
      <span className="w-6 h-6 text-royal group-hover:text-navy transition-colors">{icon}</span>
      <span className="text-[11px] font-semibold text-navy uppercase tracking-[0.05em]">{label}</span>
    </button>
  );
}

function StatusRow({ label, value, color }: any) {
  const badgeMap: Record<string, string> = { green: "bg-[#ecfdf5] text-success", gold: "bg-gold-dim text-gold", blue: "bg-royal-subtle text-royal" };
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#F3F4F6] last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      {color ? <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeMap[color]}`}>{value}</span> : <span className="text-sm font-medium text-navy">{value}</span>}
    </div>
  );
}
