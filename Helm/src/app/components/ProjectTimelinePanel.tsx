import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Edit3, Trash2, UserCheck, LayoutList, RefreshCw } from 'lucide-react';
import { get } from '../api/meridian';

interface ProjectTimelinePanelProps {
  projectId: string | null;
  expanded: boolean;
  onToggle: () => void;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: { title?: string; name?: string; from?: string; to?: string; assignee?: string };
  created_at: string;
  crew_name?: string | null;
  crew_initials?: string | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  item_created:      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  tracker_created:   <LayoutList className="w-3.5 h-3.5 text-indigo-600" />,
  item_updated:      <Edit3 className="w-3.5 h-3.5 text-blue-600" />,
  item_deleted:      <Trash2 className="w-3.5 h-3.5 text-red-500" />,
  status_changed:    <Edit3 className="w-3.5 h-3.5 text-amber-500" />,
  priority_changed:  <Edit3 className="w-3.5 h-3.5 text-orange-500" />,
  assignee_changed:  <UserCheck className="w-3.5 h-3.5 text-violet-600" />,
  default:           <Clock className="w-3.5 h-3.5 text-gray-400" />,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getMessage(row: ActivityItem): React.ReactNode {
  const title = row.details?.title ? `"${row.details.title}"` : 'a task';
  const actor = row.crew_name || 'Someone';

  switch (row.action) {
    case 'item_created':
      return <><span className="font-medium text-gray-900">{actor}</span> created task {title}</>;
    case 'item_deleted':
      return <><span className="font-medium text-gray-900">{actor}</span> deleted {title}</>;
    case 'item_updated':
      return <><span className="font-medium text-gray-900">{actor}</span> updated {title}</>;
    case 'tracker_created':
      return <><span className="font-medium text-gray-900">{actor}</span> created tracker &quot;{row.details?.name ?? 'Tracker'}&quot;</>;
    case 'status_changed':
      return <><span className="font-medium text-gray-900">{actor}</span> set status to {row.details?.to} for {title}</>;
    case 'priority_changed':
      return <><span className="font-medium text-gray-900">{actor}</span> set priority to {row.details?.to} for {title}</>;
    case 'assignee_changed':
      return <><span className="font-medium text-gray-900">{actor}</span> updated owner to {row.details?.to ?? 'Unassigned'} for {title}</>;
    default:
      return <><span className="font-medium text-gray-900">{actor}</span> — {title}</>;
  }
}

export function ProjectTimelinePanel({ projectId, expanded, onToggle }: ProjectTimelinePanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!projectId) { setActivities([]); return; }
    if (!silent) setLoading(true);
    try {
      const data = await get<ActivityItem[]>(`/api/activity?project_id=${projectId}&limit=50`);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) load();
    intervalRef.current = setInterval(() => projectId && load(true), 45000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [projectId]);

  if (!projectId) return null;

  return (
    <div
      className={`flex flex-col h-full bg-white border-l border-gray-200 transition-all duration-200 shrink-0 ${
        expanded ? 'w-[300px] min-w-[300px]' : 'w-11 min-w-11'
      }`}
    >
      {expanded ? (
        <>
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Project updates</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Who changed what & when</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={() => load()} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={onToggle} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100" title="Collapse">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="py-8 px-3 text-center text-gray-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No updates yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 py-1">
                {activities.map((a) => {
                  const icon = ACTION_ICONS[a.action] || ACTION_ICONS.default;
                  const initials = (a.crew_initials || a.crew_name?.slice(0, 2) || '?').toUpperCase();
                  return (
                    <li key={a.id} className="px-3 py-2.5 hover:bg-gray-50/80 transition-colors">
                      <div className="flex gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-medium shrink-0">
                          {initials}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 leading-snug">{getMessage(a)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {a.crew_name || 'Someone'} · {formatTime(a.created_at)}
                          </p>
                        </div>
                        <span className="shrink-0 text-gray-300 mt-0.5">{icon}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-col items-center justify-center h-full py-4 w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50/80 transition-colors"
          title="Expand timeline"
        >
          <ChevronLeft className="w-4 h-4 mb-1" />
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-1">Updates</span>
        </button>
      )}
    </div>
  );
}
