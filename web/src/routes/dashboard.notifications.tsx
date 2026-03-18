import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/dashboard/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const [estateId, setEstateId] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('finalwishes_user');
    if (session) {
      const u = JSON.parse(session);
      const preferredId = u.name === 'Tameeka Lockhart' ? 'estate_lockhart' : (u.primaryEstateId || 'estate_lockhart');
      setEstateId(preferredId);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', estateId],
    queryFn: () => estateClient.listNotifications({ estateId }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal"></div>
      </div>
    );
  }

  const notifications = data?.notifications || [
    { title: "Vault Access Authorized", time: "18:42:01", type: "security", desc: "Multi-factor authentication verified for 'Sarah Johnson' (Executor)." },
    { title: "Asset Shard Synchronized", time: "16:20:15", type: "success", desc: "Real estate valuation updated via Zillow API integration." },
    { title: "Governance Mode Change", time: "09:12:44", type: "activity", desc: "Authority mode refreshed to 'OWNER_ACTIVE' (Protocol 4A)." },
  ];

  return (
    <div className="max-w-[1100px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-8">
        <div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tight mb-2">Activity History</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">A complete record of all estate updates, security events, and changes.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-8 py-3.5 rounded-2xl border border-royal/10 text-[11px] font-black uppercase tracking-widest text-royal/40 bg-royal/[0.01] hover:bg-royal hover:text-white hover:shadow-[0_8px_24px_rgba(19,51,120,0.2)] transition-all active:scale-[0.98]">Export History (CSV)</button>
          <button className="px-8 py-3.5 rounded-2xl border border-royal/10 text-[11px] font-black uppercase tracking-widest text-royal bg-white shadow-sm hover:shadow-xl hover:border-royal/20 transition-all active:scale-[0.98]">Print Official Log</button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-royal/10 overflow-hidden shadow-[0_2px_40px_rgba(19,51,120,0.05)] relative group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="p-12 space-y-12">
          {notifications.map((n, i) => (
            <NotificationItem key={i} title={n.title} time={n.time} type={n.type} desc={n.desc} />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-32 bg-royal/[0.01] rounded-[2.5rem] border border-dashed border-royal/10 italic text-[11px] font-black text-royal/20 uppercase tracking-[0.3em]">No activity has been recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ title, time, type, desc }: any) {
  const typeStyles: Record<string, { bg: string, text: string, dot: string }> = { 
    security: { bg: "bg-royal shadow-[0_2px_8px_rgba(19,51,120,0.2)]", text: "text-royal", dot: "bg-royal" }, 
    activity: { bg: "bg-[#C8A951] shadow-[0_2px_8px_rgba(200,169,81,0.2)]", text: "text-[#C8A951]", dot: "bg-[#C8A951]" }, 
    success: { bg: "bg-green-500 shadow-[0_2px_8px_rgba(34,197,94,0.2)]", text: "text-green-600", dot: "bg-green-500" } 
  };
  const style = typeStyles[type] || { bg: "bg-royal/20", text: "text-royal/40", dot: "bg-royal/10" };
  
  return (
    <div className="flex gap-12 group relative pl-6">
      <div className={`absolute left-0 top-2 w-2 h-2 rounded-full ${style.dot} animate-pulse shadow-sm z-10 transition-all duration-500 group-hover:scale-150 group-hover:bg-sapphire`} />
      <div className="flex-1 pb-12 border-b border-royal/5 group-last:border-b-0 group-last:pb-0 relative">
        <div className="absolute left-[-29px] top-6 w-[2px] h-[calc(100%+24px)] bg-royal/5 group-last:h-0 transition-colors group-hover:bg-royal/10" />
        <div className="flex justify-between items-baseline mb-4">
          <div className="flex items-center gap-4">
            <h4 className="text-royal font-black text-xl tracking-tight group-hover:text-sapphire transition-colors font-[family-name:var(--font-cinzel)] uppercase">{title}</h4>
            <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${type === 'security' ? 'bg-royal text-white border-white/10' : 'bg-royal/[0.02] text-royal/40 border-royal/5'}`}>
              {type}
            </span>
          </div>
          <span className="text-[11px] font-mono font-black text-royal/30 bg-royal/[0.01] px-3 py-1.5 rounded-xl border border-royal/5 tabular-nums transition-all group-hover:text-royal/60 group-hover:bg-royal/[0.03]">{time}</span>
        </div>
        <p className="text-[15px] text-royal/60 leading-relaxed max-w-4xl font-black uppercase tracking-tight antialiased group-hover:text-royal/80 transition-colors">{desc}</p>
        <div className="mt-8 flex gap-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
          <button className="text-[10px] font-black text-royal uppercase tracking-widest hover:text-sapphire hover:scale-105 active:scale-95 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View Details
          </button>
          <div className="w-1 h-1 rounded-full bg-royal/10 self-center" />
          <button className="text-[10px] font-black text-royal/30 uppercase tracking-widest hover:text-royal hover:scale-105 active:scale-95 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Verify Integrity
          </button>
        </div>
      </div>
    </div>
  );
}
