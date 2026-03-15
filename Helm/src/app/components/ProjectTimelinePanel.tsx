import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Edit3,
  Trash2,
  UserCheck,
  LayoutList,
  RefreshCw,
  Calendar,
  Tag,
  Type,
  ListChecks,
} from 'lucide-react';
import { get } from '../api/meridian';

interface ProjectTimelinePanelProps {
  projectId: string | null;
  expanded: boolean;
  onToggle: () => void;
  refreshKey?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  crew_name?: string | null;
  crew_initials?: string | null;
}

const ACTION_META: Record<
  string,
  { label: string; icon: React.ReactNode; bg: string; text: string }
> = {
  item_created: {
    label: 'Created',
    icon: <CheckCircle2 className="w-3 h-3" />,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  item_deleted: {
    label: 'Deleted',
    icon: <Trash2 className="w-3 h-3" />,
    bg: 'bg-red-100',
    text: 'text-red-700',
  },
  item_updated: {
    label: 'Updated',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
  title_changed: {
    label: 'Title',
    icon: <Type className="w-3 h-3" />,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  status_changed: {
    label: 'Status',
    icon: <ListChecks className="w-3 h-3" />,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  priority_changed: {
    label: 'Priority',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  assignee_changed: {
    label: 'Owner',
    icon: <UserCheck className="w-3 h-3" />,
    bg: 'bg-violet-100',
    text: 'text-violet-700',
  },
  due_date_changed: {
    label: 'Due date',
    icon: <Calendar className="w-3 h-3" />,
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
  },
  category_changed: {
    label: 'Category',
    icon: <Tag className="w-3 h-3" />,
    bg: 'bg-teal-100',
    text: 'text-teal-700',
  },
  tracker_created: {
    label: 'Tracker',
    icon: <LayoutList className="w-3 h-3" />,
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
  },
  tracker_updated: {
    label: 'Tracker',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
  },
  project_updated: {
    label: 'Project',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
};

const DEFAULT_ACTION = {
  label: 'Update',
  icon: <Clock className="w-3 h-3" />,
  bg: 'bg-gray-100',
  text: 'text-gray-600',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTimeGroup(iso: string): 'today' | 'yesterday' | 'week' | 'older' {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = start.getTime() - d.getTime();
  if (d >= start) return 'today';
  if (diff < 86400000) return 'yesterday';
  if (diff < 604800000) return 'week';
  return 'older';
}

const TIME_GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  older: 'Older',
};

function parseDetails(details: unknown): Record<string, unknown> {
  if (details && typeof details === 'object') return details as Record<string, unknown>;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function avatarColor(name: string | null | undefined): string {
  if (!name) return 'bg-gray-400';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  const hue = Math.abs(h % 360);
  return `hsl(${hue}, 55%, 45%)`;
}

function getMessage(row: ActivityItem): React.ReactNode {
  const details = parseDetails(row.details) as {
    title?: string;
    name?: string;
    from?: string;
    to?: string;
    assignee?: string;
  };
  const taskTitle = details?.title ? `"${details.title}"` : 'a task';
  const actor = row.crew_name || 'Someone';

  switch (row.action) {
    case 'item_created':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> created task </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'item_deleted':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> deleted </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'item_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> updated </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'title_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> renamed to </span>
          <span className="font-medium text-gray-800">&quot;{details?.to ?? taskTitle}&quot;</span>
        </>
      );
    case 'status_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set status to </span>
          <span className="font-medium text-amber-700">{details?.to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'priority_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set priority to </span>
          <span className="font-medium text-orange-700">{details?.to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'assignee_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> assigned </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-violet-700">{details?.to ?? 'Unassigned'}</span>
        </>
      );
    case 'due_date_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set due date to </span>
          <span className="font-medium text-cyan-700">
            {details?.to ? new Date(String(details.to)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'category_changed':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set category to </span>
          <span className="font-medium text-teal-700">{details?.to ?? '—'}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'tracker_created':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> created tracker </span>
          <span className="font-medium text-indigo-700">&quot;{details?.name ?? 'Tracker'}&quot;</span>
        </>
      );
    case 'tracker_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> renamed tracker to </span>
          <span className="font-medium text-indigo-700">&quot;{details?.name ?? 'Tracker'}&quot;</span>
        </>
      );
    case 'project_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> renamed project to </span>
          <span className="font-medium text-slate-700">&quot;{details?.name ?? 'Project'}&quot;</span>
        </>
      );
    default:
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> — </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
  }
}

export function ProjectTimelinePanel({
  projectId,
  expanded,
  onToggle,
  refreshKey = 0,
}: ProjectTimelinePanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!projectId) {
      setActivities([]);
      setLoadError(false);
      return;
    }
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const query = `project_id=${projectId}&limit=80`;
      let data: ActivityItem[] | undefined;
      try {
        data = await get<ActivityItem[]>(`/api/activity?${query}`);
      } catch {
        try {
          data = await get<ActivityItem[]>(`/activity?${query}`);
        } catch (_) {
          data = undefined;
        }
      }
      setActivities(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) setLoadError(true);
    } catch {
      setActivities([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) load();
    intervalRef.current = setInterval(() => projectId && load(true), 45000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projectId, refreshKey]);

  const grouped = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = { today: [], yesterday: [], week: [], older: [] };
    activities.forEach((a) => {
      const key = formatTimeGroup(a.created_at);
      if (groups[key]) groups[key].push(a);
    });
    return groups;
  }, [activities]);

  if (!projectId) return null;

  return (
    <div
      className={`flex flex-col h-full bg-gradient-to-b from-slate-50/80 to-white border-l border-slate-200 transition-all duration-200 shrink-0 ${
        expanded ? 'w-[320px] min-w-[320px] shadow-sm' : 'w-11 min-w-11'
      }`}
    >
      {expanded ? (
        <>
          {/* Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                  Activity
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All changes to tasks & project
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => load()}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Collapse"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-500 mt-3">Loading activity…</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn’t load activity</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  Be sure you’re signed in and the API is running. Dev: start the backend (e.g. <code className="text-[10px] bg-slate-100 px-1 rounded">npm run dev</code> in backend), then reload. Prod: set <code className="text-[10px] bg-slate-100 px-1 rounded">VITE_API_URL</code> to your API URL at build time.
                </p>
                <button
                  type="button"
                  onClick={() => load()}
                  className="mt-4 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No activity yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Create or update tasks to see interactions here
                </p>
              </div>
            ) : (
              <div className="py-3 px-3">
                {(['today', 'yesterday', 'week', 'older'] as const).map((groupKey) => {
                  const items = grouped[groupKey];
                  if (!items.length) return null;
                  return (
                    <div key={groupKey} className="mb-6 last:mb-0">
                      <div className="sticky top-0 z-10 py-1.5 px-2 mb-2 flex items-center gap-2 bg-gradient-to-b from-slate-50/95 to-transparent">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {TIME_GROUP_LABELS[groupKey]}
                        </span>
                        <span className="flex-1 h-px bg-slate-200/80" />
                      </div>
                      <ul className="space-y-0">
                        {items.map((a, idx) => {
                          const meta = ACTION_META[a.action] || DEFAULT_ACTION;
                          const initials = (a.crew_initials || a.crew_name?.slice(0, 2) || '?').toUpperCase();
                          const color = avatarColor(a.crew_name || a.crew_initials);
                          return (
                            <li
                              key={`${a.id}-${idx}`}
                              className="group relative flex gap-3 py-2.5 px-2 rounded-lg hover:bg-white/70 transition-colors"
                            >
                              {/* Timeline line */}
                              {idx < items.length - 1 && (
                                <div
                                  className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200/60"
                                  aria-hidden
                                />
                              )}
                              {/* Avatar */}
                              <div
                                className="relative z-0 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shadow-sm ring-2 ring-white"
                                style={{ backgroundColor: color }}
                              >
                                {initials}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.bg} ${meta.text}`}
                                  >
                                    {meta.icon}
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-slate-500 shrink-0">
                                    {formatRelative(a.created_at)}
                                  </span>
                                </div>
                                <p className="text-[13px] text-slate-700 leading-snug mt-1.5 pr-1">
                                  {getMessage(a)}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-col items-center justify-center h-full py-4 w-full text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 transition-colors"
          title="Expand activity"
        >
          <ChevronLeft className="w-4 h-4 mb-1" />
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-1">Activity</span>
        </button>
      )}
    </div>
  );
}
