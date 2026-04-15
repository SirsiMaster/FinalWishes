/**
 * NotificationBell — Real-time notification dropdown for AdminHeader.
 *
 * Subscribes to unread notifications via Firestore onSnapshot.
 * Shows a red badge with unread count and a dropdown with recent items.
 */

import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useUnreadNotifications, type EstateNotification } from '@/lib/firestore';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/estate-actions';
function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

interface NotificationBellProps {
  estateId: string;
}

const typeColors: Record<string, string> = {
  security: 'bg-[#133378]/10 text-[#133378]',
  activity: 'bg-blue-50 text-blue-600',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-red-50 text-red-600',
};

function NotificationRow({
  notification,
  estateId,
  onNavigate,
}: {
  notification: EstateNotification;
  estateId: string;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const colors = typeColors[notification.type || 'activity'] || typeColors.activity;

  const createdDate = notification.createdAt?.toDate?.()
    ? notification.createdAt.toDate()
    : new Date();

  const handleClick = async () => {
    await markNotificationRead(estateId, notification.id);
    onNavigate();
    navigate({ to: `/estates/${estateId}/notifications` });
  };

  return (
    <DropdownMenuItem
      className="flex flex-col items-start gap-1 px-3 py-2.5 cursor-pointer focus:bg-royal/5"
      onSelect={handleClick}
    >
      <div className="flex items-center gap-2 w-full">
        <span className="text-[13px] font-bold text-[#0F172A] truncate flex-1">
          {notification.title || 'Activity'}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colors}`}>
          {notification.type || 'activity'}
        </span>
      </div>
      <span className="text-[11px] text-[#64748B] font-medium">
        {timeAgo(createdDate)}
      </span>
    </DropdownMenuItem>
  );
}

export function NotificationBell({ estateId }: NotificationBellProps) {
  const { data: unread, loading } = useUnreadNotifications(estateId);
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const unreadCount = unread.length;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await markAllNotificationsRead(estateId);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate({ to: `/estates/${estateId}/notifications` });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="p-2 text-royal/30 hover:bg-royal/5 hover:text-royal transition-all relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* Unread badge */}
          {!loading && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-none shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Static dot when no unread (loading or zero) */}
          {(loading || unreadCount === 0) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-royal/20 rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#133378]">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-bold text-[#133378] hover:underline uppercase tracking-wider"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading && (
          <div className="px-3 py-6 text-center">
            <span className="text-[12px] text-[#64748B] font-medium">Loading...</span>
          </div>
        )}

        {!loading && unreadCount === 0 && (
          <div className="px-3 py-6 text-center">
            <span className="text-[12px] text-[#64748B] font-medium">No unread notifications</span>
          </div>
        )}

        {!loading && unread.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            estateId={estateId}
            onNavigate={() => setOpen(false)}
          />
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="justify-center py-2.5 cursor-pointer"
          onSelect={handleViewAll}
        >
          <span className="text-[11px] font-bold text-[#133378] uppercase tracking-widest">
            View All Activity
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
