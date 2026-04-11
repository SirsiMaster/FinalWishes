/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useMemo } from 'react'
import { useEstateNotifications } from '../lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/estates/$estateId/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/notifications' });
  const estateId = useMemo(() => routeId === 'lockhart' ? 'estate_lockhart' : routeId, [routeId]);

  const { data: rawNotifications, loading: isLoading } = useEstateNotifications(estateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#133378]/20 border-t-[#133378] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.2em]">Loading activity...</span>
        </div>
      </div>
    );
  }

  const notifications = rawNotifications.length > 0
    ? rawNotifications.map(n => ({
        title: n.title || 'Activity',
        time: n.createdAt?.toDate?.()
          ? n.createdAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '',
        type: n.type || 'activity',
        desc: n.message || '',
      }))
    : [
        { title: "Document access authorized", time: "6:42 PM", type: "security", desc: "Multi-factor authentication verified for Sarah Johnson (Executor)." },
        { title: "Asset valuation updated", time: "4:20 PM", type: "success", desc: "Real estate valuation refreshed via automated market analysis." },
        { title: "Estate status updated", time: "9:12 AM", type: "activity", desc: "Authority mode changed to Active Owner." },
      ];

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-[#0F172A]">Activity History</h2>
          <p className="text-lg text-[#64748B] font-medium">A record of everything that has happened with your estate plan.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="px-6 py-3 h-auto rounded-2xl text-[13px] font-bold text-[#64748B]">Export</Button>
          <Button variant="default" className="px-6 py-3 h-auto rounded-2xl bg-[#133378] hover:bg-[#1E3A5F] text-[13px] font-bold shadow-lg">Print History</Button>
        </div>
      </div>
      <Separator />

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
        <CardContent className="p-10 space-y-0">
          {notifications.map((n, i) => (
            <NotificationItem key={i} title={n.title} time={n.time} type={n.type} desc={n.desc} isLast={i === notifications.length - 1} />
          ))}
          {notifications.length === 0 && (
            <Card className="border-slate-100">
              <CardContent className="text-center py-24">
                <p className="text-[#64748B] font-medium">No activity recorded yet.</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const badgeStyles: Record<string, string> = {
  security: 'bg-[#133378]/5 text-[#133378] border-[#133378]/20',
  activity: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-green-50 text-green-600 border-green-200',
};

const dotStyles: Record<string, string> = {
  security: 'bg-[#133378]',
  activity: 'bg-blue-500',
  success: 'bg-green-500',
};

function NotificationItem({ title, time, type, desc, isLast }: { title: string; time: string; type: string; desc: string; isLast: boolean }) {
  const badgeClass = badgeStyles[type] || badgeStyles.activity;
  const dotClass = dotStyles[type] || dotStyles.activity;

  return (
    <div className={`flex gap-8 group py-8 ${!isLast ? 'border-b border-slate-100' : ''}`}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={`w-3 h-3 rounded-full ${dotClass} shadow-sm`} />
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-2" />}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h4 className="text-[#0F172A] font-bold text-lg group-hover:text-[#133378] transition-colors">{title}</h4>
              <Badge variant="outline" className={`text-[10px] font-bold capitalize ${badgeClass}`}>
                {type}
              </Badge>
            </div>
            <span className="text-[13px] font-medium text-[#64748B]">{time}</span>
          </div>
        </div>
        <p className="text-[15px] text-[#64748B] leading-relaxed">{desc}</p>
        <div className="mt-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <Button variant="link" className="text-[12px] font-bold text-[#133378] p-0 h-auto gap-1.5">
            View Details
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
