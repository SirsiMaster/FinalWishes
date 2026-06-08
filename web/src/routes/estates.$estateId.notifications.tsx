/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useParams } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useEstateNotifications } from '../lib/firestore'
import { markNotificationRead, markAllNotificationsRead } from '../lib/estate-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/estates/$estateId/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const { estateId: routeId } = useParams({ from: '/estates/$estateId/notifications' });
  const estateId = routeId;

  const { data: rawNotifications, loading: isLoading } = useEstateNotifications(estateId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--royal)]/20 border-t-[var(--royal)] rounded-full animate-spin" />
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Loading activity...</span>
        </div>
      </div>
    );
  }

  const [marking, setMarking] = useState(false);

  const notifications = rawNotifications.map(n => ({
    id: n.id,
    title: n.title || 'Activity',
    time: n.createdAt?.toDate?.()
      ? n.createdAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '',
    type: n.type || 'activity',
    desc: n.message || '',
    read: (n as { read?: boolean }).read ?? false,
  }));

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    const res = await markNotificationRead(estateId, id);
    if (!res.success) toast.error('Could not mark as read');
  };

  const handleMarkAllRead = async () => {
    setMarking(true);
    const res = await markAllNotificationsRead(estateId);
    setMarking(false);
    if (res.success) toast.success('All notifications marked as read');
    else toast.error('Could not mark all as read');
  };

  return (
    <div className="max-w-[1240px] mx-auto space-y-10 pb-20 px-4">
      <div className="flex justify-between items-end pb-10">
        <div className="space-y-2">
          <h2 className="text-5xl font-[family-name:var(--font-cinzel)] font-bold text-slate-900">Activity History</h2>
          <p className="text-lg text-slate-500 font-medium">A record of everything that has happened with your estate plan.</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={marking}
            className="rounded-xl border-[var(--royal)]/15 text-[var(--royal)] font-bold text-[13px]"
          >
            {marking ? 'Marking…' : `Mark all read (${unreadCount})`}
          </Button>
        )}
      </div>
      <Separator />

      {notifications.length === 0 ? (
        <Card className="border-0 shadow-none bg-transparent text-center py-24">
          <CardContent className="flex flex-col items-center">
            <div className="w-20 h-20 bg-[var(--royal)]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--royal)]/30" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No notifications yet</h3>
            <p className="text-slate-500">Activity in your estate will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
          <CardContent className="p-10 space-y-0">
            {notifications.map((n, i) => (
              <NotificationItem
                key={n.id}
                title={n.title}
                time={n.time}
                type={n.type}
                desc={n.desc}
                read={n.read}
                isLast={i === notifications.length - 1}
                onMarkRead={() => handleMarkRead(n.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const badgeStyles: Record<string, string> = {
  security: 'bg-[var(--royal)]/5 text-[var(--royal)] border-[var(--royal)]/20',
  activity: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-green-50 text-green-600 border-green-200',
};

const dotStyles: Record<string, string> = {
  security: 'bg-[var(--royal)]',
  activity: 'bg-blue-500',
  success: 'bg-green-500',
};

function NotificationItem({ title, time, type, desc, read, isLast, onMarkRead }: { title: string; time: string; type: string; desc: string; read: boolean; isLast: boolean; onMarkRead: () => void }) {
  const badgeClass = badgeStyles[type] || badgeStyles.activity;
  const dotClass = dotStyles[type] || dotStyles.activity;

  return (
    <div className={`flex gap-8 group py-8 ${!isLast ? 'border-b border-slate-100' : ''} ${read ? 'opacity-60' : ''}`}>
      {/* Timeline dot — solid + ring when unread */}
      <div className="flex flex-col items-center pt-1">
        <div className={`w-3 h-3 rounded-full ${dotClass} shadow-sm ${!read ? 'ring-4 ring-[var(--royal)]/10' : ''}`} />
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-2" />}
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h4 className="text-slate-900 font-bold text-lg group-hover:text-[var(--royal)] transition-colors">{title}</h4>
              <Badge variant="outline" className={`text-[10px] font-bold capitalize ${badgeClass}`}>
                {type}
              </Badge>
              {!read && (
                <Badge variant="outline" className="text-[10px] font-bold bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30">
                  New
                </Badge>
              )}
            </div>
            <span className="text-[13px] font-medium text-slate-500">{time}</span>
          </div>
        </div>
        <p className="text-[15px] text-slate-500 leading-relaxed">{desc}</p>
        {!read && (
          <div className="mt-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              variant="link"
              onClick={onMarkRead}
              className="text-[12px] font-bold text-[var(--royal)] p-0 h-auto gap-1.5"
            >
              Mark as read
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
