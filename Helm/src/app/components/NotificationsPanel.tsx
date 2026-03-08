import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, AtSign, Clock, AlertTriangle, MessageSquare, CheckCircle2 } from 'lucide-react';
import { get, post, patch } from '../api/meridian';

interface Notification {
  id: string;
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

interface NotificationsPanelProps {
  onOpenItem?: (itemId: string) => void;
}

export function NotificationsBell({ onOpenItem }: NotificationsPanelProps) {
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
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (id: string) => {
    await patch(`/api/notifications/${id}/read`, {}).catch(() => {});
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await post('/api/notifications/read-all', {}).catch(() => {});
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 && (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">Mentions and due dates will show up here</p>
                </div>
              )}
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => { markRead(n.id); if (n.item_title) setOpen(false); }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    {TYPE_ICON[n.type] || <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'} truncate`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}{n.project_name ? ` · ${n.project_name}` : ''}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
