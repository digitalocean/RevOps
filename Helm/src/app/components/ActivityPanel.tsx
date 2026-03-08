import { useState, useEffect, useRef } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, UserCheck, Trash2, Edit3, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { get } from '../api/meridian';

interface ActivityPanelProps {
  onClose: () => void;
  projectId: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: { title?: string; from?: string; to?: string; assignee?: string };
  created_at: string;
  crew_name?: string | null;
  crew_initials?: string | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  item_created:      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  item_updated:      <Edit3 className="w-3.5 h-3.5 text-blue-600" />,
  item_deleted:      <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  status_changed:    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  priority_changed:  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
  assignee_changed:  <UserCheck className="w-3.5 h-3.5 text-violet-600" />,
  default:           <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

const STATUS_COLORS: Record<string, string> = {
  'On Track': 'bg-emerald-100 text-emerald-700',
  'At Risk': 'bg-amber-100 text-amber-700',
  'Blocked': 'bg-red-100 text-red-700',
  'Complete': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-violet-100 text-violet-700',
  'Not Started': 'bg-gray-100 text-gray-600',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function getMessage(row: ActivityItem): React.ReactNode {
  const title = row.details?.title ? `"${row.details.title}"` : 'an item';
  const actor = <span className="font-semibold text-gray-900">{row.crew_name || 'Someone'}</span>;

  switch (row.action) {
    case 'item_created':
      return <>{actor} created {title}</>;
    case 'item_deleted':
      return <>{actor} deleted {title}</>;
    case 'item_updated':
      return <>{actor} updated {title}</>;
    case 'status_changed':
      return (
        <>
          {actor} changed status of {title} {row.details?.from && (
            <>from <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.details.from] || 'bg-gray-100 text-gray-600'}`}>{row.details.from}</span></>
          )} to <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.details?.to || ''] || 'bg-gray-100 text-gray-600'}`}>{row.details?.to}</span>
        </>
      );
    case 'priority_changed':
      return <>{actor} changed priority of {title} to <span className="font-medium">{row.details?.to}</span></>;
    case 'assignee_changed':
      return <>{actor} assigned {title} to <span className="font-medium">{row.details?.assignee || row.details?.to || 'someone'}</span></>;
    default:
      return <>{actor} — {title}</>;
  }
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500'];
function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type FilterType = 'all' | 'status' | 'created' | 'assigned';

export function ActivityPanel({ onClose, projectId }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!projectId) { setActivities([]); setLoading(false); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await get<ActivityItem[]>(`/api/activity?project_id=${projectId}&limit=100`);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      // silently fail on auto-refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [projectId]);

  const filtered = activities.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'status') return a.action === 'status_changed';
    if (filter === 'created') return a.action === 'item_created';
    if (filter === 'assigned') return a.action === 'assignee_changed';
    return true;
  });

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'created', label: 'Created' },
    { id: 'status', label: 'Status' },
    { id: 'assigned', label: 'Assigned' },
  ];

  return (
    <div className="w-[380px] border-l border-gray-200 bg-white flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => load()}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {!projectId && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Select a project to see activity.</p>
          </div>
        )}
        {projectId && loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        {projectId && !loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No activity yet.</p>
            <p className="text-xs mt-1">Changes will appear here.</p>
          </div>
        )}
        {projectId && !loading && filtered.length > 0 && (
          <div className="divide-y divide-gray-50">
            {filtered.map((activity) => {
              const name = activity.crew_name || '?';
              const initials = activity.crew_initials || name.slice(0, 2).toUpperCase();
              const icon = ACTION_ICONS[activity.action] || ACTION_ICONS.default;
              const color = avatarColor(name);

              return (
                <div key={activity.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5 mb-0.5">
                      <span className="flex-shrink-0 mt-0.5">{icon}</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{getMessage(activity)}</p>
                    </div>
                    <p className="text-[10px] text-gray-400">{formatTime(activity.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
