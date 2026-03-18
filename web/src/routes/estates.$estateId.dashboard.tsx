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
    <div className="max-w-[1440px] mx-auto p-12 space-y-12 bg-white min-h-screen font-[family-name:var(--font-inter)]">
      {/* ── Page Header ── */}
      <div className="space-y-3 mb-16">
        <div className="flex items-center gap-3 text-[11px] font-bold text-royal/40 uppercase tracking-[0.2em] mb-4">
          <div className="w-10 h-px bg-royal/20" />
          <span>Operational Command</span>
        </div>
        <h1 className="text-[3.5rem] font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A] leading-tight tracking-tight">
          Welcome back, {userName || 'Tameeka'}.
        </h1>
        <p className="text-[#64748B] text-xl font-medium max-w-3xl leading-relaxed">
          The Guidance Engine has detected a status update. Your estate is 88% synchronized. We recommend verifying your latest asset valuations to reach 90% completion.
        </p>
      </div>

      {/* ── Primary Action Card ── */}
      <div className="bg-[#F8FAFC] rounded-[3rem] p-16 flex items-center justify-between border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-royal/[0.015] rounded-bl-full pointer-events-none" />
        <div className="flex-1 space-y-10 relative z-10">
          <div className="space-y-3">
             <div className="text-[11px] font-bold text-[#133378]/30 uppercase tracking-[0.3em]">Estate Setup Protocol</div>
             <div className="flex items-end gap-5">
                <span className="text-8xl font-black text-[#0F172A] tracking-tighter leading-none tabular-nums">88%</span>
                <span className="text-slate-400 font-semibold text-2xl pb-2">complete</span>
             </div>
          </div>
          <div className="w-full max-w-xl h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
             <div className="h-full bg-[#133378] transition-all duration-1000 w-[88%] shadow-[0_0_20px_rgba(19,51,120,0.3)]" />
          </div>
        </div>
        <button className="bg-[#133378] hover:bg-[#1E3A5F] text-white px-14 py-6 rounded-2xl font-bold text-[15px] transition-all shadow-[0_20px_50px_rgba(19,51,120,0.15)] hover:shadow-[0_25px_60px_rgba(19,51,120,0.25)] hover:-translate-y-1 active:scale-95 z-10">
          Continue Setup →
        </button>
      </div>

      {/* ── Stat Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <MiniStat label="Total Assets" value={assetsData?.totalCount.toString() || "2"} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>} />
        <MiniStat label="Stored Documents" value={vaultData?.documents.length.toString() || "3"} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        <MiniStat label="Beneficiaries" value={beneData?.beneficiaries.length.toString() || "2"} icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>} />
        <MiniStat label="Last Updated" value="Today" icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-16 py-12">
        {/* ── Checklist ── */}
        <div className="bg-white rounded-[3rem] p-16 border border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)] space-y-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-[#0F172A] tracking-tight">Estate Setup Checklist</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">8 Steps Total</span>
          </div>
          <div className="space-y-12">
            <ChecklistItem label="Personal Information" percent={100} status="Complete" color="bg-green-500" />
            <ChecklistItem label="Asset Inventory" percent={80} status="In Progress" color="bg-[#133378]" />
            <ChecklistItem label="Important Documents" percent={45} status="Review Required" color="bg-[#133378]/40" />
            <ChecklistItem label="Beneficiary Designations" percent={30} status="Pending" color="bg-[#133378]/20" />
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="space-y-12">
           <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-[0_2px_40px_rgba(15,23,42,0.02)]">
             <h3 className="text-xl font-bold text-[#0F172A] mb-10 tracking-tight">Quick Actions</h3>
             <div className="grid grid-cols-2 gap-8">
                <ActionBtn label="Add Asset" icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12H3m9-9v18" /></svg>} />
                <ActionBtn label="Upload Doc" icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>} />
                <ActionBtn label="Add Heir" icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>} />
                <ActionBtn label="Memory" icon={<svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>} />
             </div>
           </div>

           <div className="bg-[#133378] rounded-[3rem] p-12 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[4rem] group-hover:bg-white/10 transition-colors" />
              <div className="relative z-10">
                <h4 className="text-xl font-bold mb-4 font-[family-name:var(--font-cinzel)] uppercase tracking-widest">Need Support?</h4>
                <p className="text-white/70 text-sm mb-8 leading-relaxed font-medium">Your dedicated Concierge is available 24/7 to help you navigate your estate plan.</p>
                <button className="w-full py-4 bg-white text-[#133378] rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-gold hover:text-white transition-all active:scale-[0.98]">
                  Contact Concierge
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI Components (Benchmark Fidelity) ──

interface MiniStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function MiniStat({ label, value, icon }: MiniStatProps) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_2px_30px_rgba(15,23,42,0.01)] flex flex-col gap-8 group hover:border-[#133378]/20 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#133378] group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.3em] mb-2">{label}</div>
        <div className="text-4xl font-bold text-[#0F172A] tracking-tighter tabular-nums">{value}</div>
      </div>
    </div>
  );
}

interface ChecklistItemProps {
  label: string;
  percent: number;
  status: string;
  color: string;
}

function ChecklistItem({ label, percent, status, color }: ChecklistItemProps) {
  return (
    <div className="space-y-5 group/item">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-bold text-[#0F172A] text-xl tracking-tight group-hover/item:text-[#133378] transition-colors">{label}</h4>
          <p className="text-slate-400 text-[13px] font-semibold tracking-wide mt-1">{status}</p>
        </div>
        <span className="font-bold text-slate-600 text-lg tabular-nums">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
        <div className={`h-full ${color} rounded-full transition-all duration-[1500ms] ease-out shadow-sm`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
}

function ActionBtn({ label, icon }: ActionBtnProps) {
  return (
    <button className="flex flex-col items-center justify-center gap-6 p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-[#133378]/20 hover:shadow-[0_20px_60px_rgba(19,51,120,0.06)] transition-all active:scale-[0.98] group">
      <div className="text-slate-300 group-hover:text-[#133378] transition-all duration-500 scale-110 group-hover:scale-125">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#0F172A] uppercase tracking-[0.2em] mt-2">{label}</span>
    </button>
  );
}
