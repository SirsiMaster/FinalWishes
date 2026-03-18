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
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-navy uppercase tracking-wider">Protocol Ledger</h2>
        <p className="text-sm text-text-muted">The immutable audit trail of all estate governance, security, and financial events.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-border-light overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-royal to-gold opacity-50" />
        <div className="p-10 space-y-10">
          {notifications.map((n, i) => (
            <NotificationItem key={i} title={n.title} time={n.time} type={n.type} desc={n.desc} />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-border-light italic text-text-muted">No activity logs recorded in the current epoch.</div>
          )}
        </div>
      </div>
      
      {/* Export Controls */}
      <div className="flex justify-end gap-3 pt-4">
        <button className="px-6 py-2.5 rounded-xl border border-border-light text-[0.7rem] font-bold uppercase tracking-widest text-navy bg-white hover:bg-gray-50 transition-colors">Export CSV</button>
        <button className="px-6 py-2.5 rounded-xl border border-border-light text-[0.7rem] font-bold uppercase tracking-widest text-navy bg-white hover:bg-gray-50 transition-colors">Print Notarized Log</button>
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
    <div className="flex gap-10 group relative pl-4">
      <div className={`absolute left-0 top-0 w-1.5 h-full ${bgColor} rounded-full transition-all duration-300 transform scale-y-90 group-hover:scale-y-100 group-hover:w-2`} />
      <div className="flex-1 pb-10 border-b border-gray-100 group-last:border-b-0 group-last:pb-0">
        <div className="flex justify-between items-baseline mb-3">
          <div className="flex items-center gap-3">
            <h4 className="text-navy font-black text-lg tracking-tight group-hover:text-royal transition-colors font-[family-name:var(--font-cinzel)] uppercase">{title}</h4>
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${type === 'security' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500'}`}>
              {type}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-text-muted bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{time}</span>
        </div>
        <p className="text-[14px] text-text-secondary leading-relaxed max-w-3xl font-medium antialiased">{desc}</p>
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-[10px] font-bold text-royal uppercase tracking-tighter hover:underline">View Evidence</button>
          <span className="text-gray-200">|</span>
          <button className="text-[10px] font-bold text-text-muted uppercase tracking-tighter hover:underline">Verify Hash</button>
        </div>
      </div>
    </div>
  );
}
