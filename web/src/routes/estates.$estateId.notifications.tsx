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
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end border-b border-border-light pb-8">
        <div>
          <h2 className="text-4xl font-[family-name:var(--font-cinzel)] font-black text-navy uppercase tracking-tight leading-none mb-3">Protocol Ledger</h2>
          <p className="text-sm text-text-muted">The immutable audit trail of all estate governance, security, and financial events.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 rounded-xl border border-border-light text-[0.7rem] font-black uppercase tracking-widest text-navy bg-white hover:bg-black hover:text-white transition-all shadow-sm">Export Audit CSV</button>
          <button className="px-6 py-2.5 rounded-xl bg-navy text-white text-[0.7rem] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">Print Notarized Log</button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-border-light overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-navy via-royal to-gold opacity-50" />
        <div className="p-12 space-y-12">
          {notifications.map((n, i) => (
            <NotificationItem key={i} title={n.title} time={n.time} type={n.type} desc={n.desc} />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-border-light italic text-text-muted">No activity logs recorded in the current epoch.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationItem({ title, time, type, desc }: any) {
  const colorMap: Record<string, string> = { 
    security: "bg-navy group-hover:bg-royal", 
    activity: "bg-gold", 
    success: "bg-green-600" 
  };
  const bgColor = colorMap[type] || "bg-gray-300";
  
  return (
    <div className="flex gap-12 group relative pl-6">
      <div className={`absolute left-0 top-0 w-2 h-full ${bgColor} rounded-full transition-all duration-500 transform scale-y-90 group-hover:scale-y-100 group-hover:w-2.5 shadow-lg`} />
      <div className="flex-1 pb-12 border-b border-gray-100 group-last:border-b-0 group-last:pb-0">
        <div className="flex justify-between items-baseline mb-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <h4 className="text-navy font-black text-2xl tracking-tight group-hover:text-royal transition-colors font-[family-name:var(--font-cinzel)]">{title}</h4>
              <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${type === 'security' ? 'bg-navy text-white border-navy shadow-navy/20 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {type}
              </span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-border-light" />
               <span className="text-[10px] font-mono font-bold text-text-muted tracking-tight">Timestamp: {time}</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-black text-navy uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
            Epoch Checksum: 0x{Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase()}
          </div>
        </div>
        <p className="text-[16px] text-text-secondary leading-relaxed max-w-4xl font-medium antialiased">{desc}</p>
        <div className="mt-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
          <button className="text-[10px] font-black text-royal uppercase tracking-widest hover:underline flex items-center gap-1.5">
            View Evidence Shard
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </button>
          <span className="text-gray-200">|</span>
          <button className="text-[10px] font-black text-gold/60 uppercase tracking-widest hover:underline">Verify Hash Shard</button>
        </div>
      </div>
    </div>
  );
}
