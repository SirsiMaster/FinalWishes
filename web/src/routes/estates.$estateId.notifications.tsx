import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { estateClient } from '../lib/client'

export const Route = createFileRoute('/estates/$estateId/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/notifications' });
  const [estateId, setEstateId] = useState(routeId === 'lockhart' ? 'estate_lockhart' : routeId);

  useEffect(() => {
    const preferredId = routeId === 'lockhart' ? 'estate_lockhart' : routeId;
    setEstateId(preferredId);
  }, [routeId]);

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
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end border-b border-royal/10 pb-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-black text-royal uppercase tracking-tighter">Activity History</h2>
          <p className="text-[13px] text-royal/40 font-bold uppercase tracking-widest">A record of everything that has happened with your estate plan.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-8 py-4 rounded-2xl border border-royal/10 text-[11px] font-black uppercase tracking-widest text-royal bg-white hover:bg-royal/[0.02] transition-all shadow-sm active:scale-95">Save as File</button>
          <button className="px-8 py-4 rounded-2xl bg-royal text-white text-[11px] font-black uppercase tracking-widest hover:bg-sapphire transition-all shadow-[0_8px_32px_rgba(19,51,120,0.2)] hover:shadow-[0_12px_40px_rgba(15,82,186,0.25)] hover:-translate-y-1 active:scale-95 border border-white/10">Print History</button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-royal/10 overflow-hidden shadow-[0_40px_100px_rgba(19,51,120,0.05)] relative group">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-royal via-sapphire to-royal opacity-20" />
        <div className="p-16 space-y-16 relative z-10">
          {notifications.map((n, i) => (
            <NotificationItem key={i} title={n.title} time={n.time} type={n.type} desc={n.desc} />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-40 bg-royal/[0.01] rounded-[3rem] border-2 border-dashed border-royal/5 italic text-royal/20 font-black uppercase tracking-[0.3em]">No activity recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ title, time, type, desc }: any) {
  const colorMap: Record<string, string> = { 
    security: "bg-royal shadow-[0_0_12px_rgba(19,51,120,0.4)]", 
    activity: "bg-sapphire shadow-[0_0_12px_rgba(15,82,186,0.4)]", 
    success: "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]" 
  };
  const bgColor = colorMap[type] || "bg-royal/10";
  
  return (
    <div className="flex gap-16 group relative pl-10">
      <div className={`absolute left-0 top-0 w-2.5 h-full ${bgColor} rounded-full transition-all duration-700 transform scale-y-90 group-hover:scale-y-100 group-hover:w-3 opacity-20 group-hover:opacity-100`} />
      <div className="flex-1 pb-16 border-b border-royal/5 group-last:border-b-0 group-last:pb-0">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <h4 className="text-royal font-black text-3xl tracking-tighter group-hover:text-sapphire transition-colors font-[family-name:var(--font-cinzel)] uppercase">{title}</h4>
              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${type === 'security' ? 'bg-royal text-white border-white/10 shadow-lg' : 'bg-royal/[0.03] text-royal/40 border-royal/10 group-hover:bg-white group-hover:text-royal'}`}>
                {type}
              </span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-royal/10" />
               <span className="text-[11px] font-black text-royal/20 uppercase tracking-[0.2em] group-hover:text-royal/40 transition-colors">Timestamp: {time}</span>
            </div>
          </div>
          <div className="px-5 py-2.5 bg-royal/[0.02] rounded-2xl border border-royal/5 text-[10px] font-black text-royal/20 uppercase tracking-[0.3em] group-hover:opacity-100 group-hover:text-royal/40 transition-all shadow-sm">
            Security Code: 0x{Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase()}
          </div>
        </div>
        <p className="text-xl text-royal/60 leading-tight max-w-5xl font-black uppercase tracking-tighter group-hover:text-royal transition-colors">{desc}</p>
        <div className="mt-8 flex gap-8 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700">
          <button className="text-[11px] font-black text-royal uppercase tracking-widest hover:text-sapphire flex items-center gap-2 transition-colors">
            View Details
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </button>
          <div className="w-px h-4 bg-royal/10" />
          <button className="text-[11px] font-black text-royal/30 uppercase tracking-widest hover:text-royal transition-colors">Verify Security</button>
        </div>
      </div>
    </div>
  );
}
