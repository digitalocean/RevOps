import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, AtSign, Clock, AlertTriangle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { get, post, patch } from '../api/meridian';

interface Notification {
  id: string;
  item_id?: string | null;
  type: 'mention' | 'due_soon' | 'status_change' | 'comment' | string;
  title: string;
  body: string | null;
  item_title: string | null;
  project_name: string | null;
  read: boolean;
  created_at: string;
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  mention: <AtSign className="w-3.5 h-3.5 text-indigo-500" />,
  due_soon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  status_change: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  comment: <MessageSquare className="w-3.5 h-3.5 text-blue-500" />,
};

interface NotificationsBellProps {
  onOpenItem?: (itemId: string) => void;
}

export function NotificationsBell({ onOpenItem }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // not logged in or no notifications table yet
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const markAllRead = async () => {
    try {
      await post('/api/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const markRead = async (id: string) => {
    try {
      await patch(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative h-9 w-9 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No notifications yet.</p>
                </div>
              )}
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.item_id && onOpenItem) { onOpenItem(n.item_id); setOpen(false); }
                  }}
                  className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                    {TYPE_ICON[n.type] || <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'} truncate`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {n.project_name && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{n.project_name}</span>}
                      <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.read && <div className="mt-2 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
