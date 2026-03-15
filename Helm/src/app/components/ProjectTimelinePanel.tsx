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
  Sparkles,
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
    label: 'Task created',
    icon: <CheckCircle2 className="w-3 h-3" />,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
  },
  item_deleted: {
    label: 'Task deleted',
    icon: <Trash2 className="w-3 h-3" />,
    bg: 'bg-red-100',
    text: 'text-red-700',
  },
  item_updated: {
    label: 'Task updated',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
  title_changed: {
    label: 'Title changed',
    icon: <Type className="w-3 h-3" />,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  status_changed: {
    label: 'Status changed',
    icon: <ListChecks className="w-3 h-3" />,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  priority_changed: {
    label: 'Priority changed',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  assignee_changed: {
    label: 'Owner changed',
    icon: <UserCheck className="w-3 h-3" />,
    bg: 'bg-violet-100',
    text: 'text-violet-700',
  },
  due_date_changed: {
    label: 'Due date changed',
    icon: <Calendar className="w-3 h-3" />,
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
  },
  category_changed: {
    label: 'Category changed',
    icon: <Tag className="w-3 h-3" />,
    bg: 'bg-teal-100',
    text: 'text-teal-700',
  },
  tracker_created: {
    label: 'Tracker created',
    icon: <LayoutList className="w-3 h-3" />,
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
  },
  tracker_updated: {
    label: 'Tracker renamed',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
  },
  project_updated: {
    label: 'Project renamed',
    icon: <Edit3 className="w-3 h-3" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  },
};

const DEFAULT_ACTION = {
  label: 'Edited',
  icon: <Edit3 className="w-3 h-3" />,
  bg: 'bg-gray-100',
  text: 'text-gray-600',
};

function getActionLabel(action: string): { label: string; icon: React.ReactNode; bg: string; text: string } {
  const meta = ACTION_META[action];
  if (meta) return meta;
  if (action && action !== 'item_updated') {
    const label = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, icon: <Edit3 className="w-3 h-3" />, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
  return DEFAULT_ACTION;
}

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

const TIME_GROUP_STYLES: Record<string, { icon: React.ReactNode; dot: string; text: string }> = {
  today: { icon: <Sparkles className="w-3 h-3" />, dot: 'bg-emerald-500', text: 'text-emerald-700' },
  yesterday: { icon: <Clock className="w-3 h-3" />, dot: 'bg-amber-500', text: 'text-amber-700' },
  week: { icon: <Calendar className="w-3 h-3" />, dot: 'bg-blue-500', text: 'text-blue-700' },
  older: { icon: <Clock className="w-3 h-3" />, dot: 'bg-slate-400', text: 'text-slate-500' },
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

// Normalize name/initials from API (snake_case or camelCase)
function getCrewName(row: ActivityItem): string | null {
  const r = row as Record<string, unknown>;
  const name = (r.crew_name ?? r.crewName) ?? null;
  return name != null && String(name).trim() ? String(name).trim() : null;
}
function getCrewInitials(row: ActivityItem): string | null {
  const r = row as Record<string, unknown>;
  const initials = (r.crew_initials ?? r.crewInitials) ?? null;
  return initials != null && String(initials).trim() ? String(initials).trim() : null;
}

function getActorDisplayName(row: ActivityItem): string {
  const name = getCrewName(row);
  if (name) return name;
  const initials = getCrewInitials(row);
  if (initials) return initials;
  return 'Someone';
}

function formatDate(val: unknown): string {
  if (!val) return '—';
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
  const actor = getActorDisplayName(row);
  const from = details?.from != null && String(details.from).trim() !== '' ? String(details.from).trim() : null;
  const to = details?.to != null ? String(details.to).trim() : null;
  const hasFromTo = from !== null && to !== null && to !== '' && from !== to;

  switch (row.action) {
    case 'item_created':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> added task </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'item_deleted':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> removed </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'item_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed </span>
          <span className="font-medium text-gray-800">{taskTitle}</span>
        </>
      );
    case 'title_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed title from </span>
          <span className="font-medium text-gray-700">&quot;{from}&quot;</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-blue-700">&quot;{to}&quot;</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set title to </span>
          <span className="font-medium text-blue-700">&quot;{to ?? taskTitle}&quot;</span>
        </>
      );
    case 'status_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed status from </span>
          <span className="font-medium text-amber-600">{from}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-amber-700">{to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set status to </span>
          <span className="font-medium text-amber-700">{to ?? '—'}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'priority_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed priority from </span>
          <span className="font-medium text-orange-600">{from}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-orange-700">{to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set priority to </span>
          <span className="font-medium text-orange-700">{to ?? '—'}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'assignee_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed owner from </span>
          <span className="font-medium text-violet-600">{from}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-violet-700">{to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set owner to </span>
          <span className="font-medium text-violet-700">{to ?? 'Unassigned'}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'due_date_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed due date from </span>
          <span className="font-medium text-cyan-600">{formatDate(from)}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-cyan-700">{formatDate(to)}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set due date to </span>
          <span className="font-medium text-cyan-700">{formatDate(to)}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'category_changed':
      return hasFromTo ? (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed category from </span>
          <span className="font-medium text-teal-600">{from}</span>
          <span className="text-gray-600"> to </span>
          <span className="font-medium text-teal-700">{to}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> set category to </span>
          <span className="font-medium text-teal-700">{to ?? '—'}</span>
          <span className="text-gray-600"> for </span>
          <span className="text-gray-700">{taskTitle}</span>
        </>
      );
    case 'tracker_created':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> added tracker </span>
          <span className="font-medium text-indigo-700">&quot;{details?.name ?? 'Tracker'}&quot;</span>
        </>
      );
    case 'tracker_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed tracker name to </span>
          <span className="font-medium text-indigo-700">&quot;{details?.name ?? 'Tracker'}&quot;</span>
        </>
      );
    case 'project_updated':
      return (
        <>
          <span className="font-medium text-gray-900">{actor}</span>
          <span className="text-gray-600"> changed project name to </span>
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
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [apiCheckStatus, setApiCheckStatus] = useState<'idle' | 'checking' | 'ok' | 'html' | 'error'>('idle');
  const [apiCheckMessage, setApiCheckMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkApiReachable = async () => {
    setApiCheckStatus('checking');
    setApiCheckMessage(null);
    try {
      const url = `${window.location.origin}/api/health`;
      const res = await fetch(url, { credentials: 'include', method: 'GET' });
      const contentType = res.headers.get('content-type') ?? '';
      const text = await res.text();
      if (contentType.includes('application/json')) {
        const data = text ? JSON.parse(text) : {};
        if (data.status === 'ok') {
          setApiCheckStatus('ok');
          setApiCheckMessage('API is reachable. If activity still fails, try Retry or sign in again.');
        } else {
          setApiCheckStatus('ok');
          setApiCheckMessage('API responded; activity may need a valid project.');
        }
      } else {
        setApiCheckStatus('html');
        setApiCheckMessage(
          'Request returned a page instead of JSON. In DigitalOcean, add an Ingress rule: path prefix /api → api component (before the / rule), then redeploy.'
        );
      }
    } catch (e) {
      setApiCheckStatus('error');
      setApiCheckMessage(e instanceof Error ? e.message : 'Check failed');
    }
  };

  const load = async (silent = false) => {
    if (!projectId) {
      setActivities([]);
      setLoadError(false);
      setLoadErrorMessage(null);
      return;
    }
    if (!silent) setLoading(true);
    setLoadError(false);
    setLoadErrorMessage(null);
    try {
      const query = `project_id=${projectId}&limit=80`;
      let data: ActivityItem[] | undefined;
      let lastError: string | null = null;
      try {
        data = await get<ActivityItem[]>(`/api/activity?${query}`);
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Request failed';
        try {
          data = await get<ActivityItem[]>(`/activity?${query}`);
        } catch (e2) {
          lastError = e2 instanceof Error ? e2.message : lastError;
          data = undefined;
        }
      }
      setActivities(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) {
        setLoadError(true);
        setLoadErrorMessage(lastError);
      }
    } catch (e) {
      setActivities([]);
      setLoadError(true);
      setLoadErrorMessage(e instanceof Error ? e.message : 'Request failed');
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
      className={`flex flex-col h-full border-l transition-all duration-200 shrink-0 ${
        expanded
          ? 'w-[320px] min-w-[320px] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 shadow-lg shadow-slate-200/50'
          : 'w-11 min-w-11 bg-gradient-to-b from-slate-50/80 to-white'
      } border-slate-200/80`}
    >
      {expanded ? (
        <>
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 border-b border-slate-200/80 bg-gradient-to-r from-indigo-500/10 via-white to-amber-500/10 backdrop-blur-sm rounded-tr-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  Activity
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
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
                {loadErrorMessage && (
                  <p className="text-xs text-amber-700 mt-1 max-w-[220px] font-medium">
                    {loadErrorMessage}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  On DigitalOcean: ensure Ingress has path <code className="text-[10px] bg-slate-100 px-1 rounded">/api</code> → api component, then redeploy. Use “Check API” below to verify.
                </p>
                {projectId && (
                  <p className="text-[11px] mt-2 max-w-[260px]">
                    <a
                      href={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/activity?project_id=${projectId}&limit=10`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline break-all"
                    >
                      Open activity URL in new tab
                    </a>
                    {' — if you see JSON (or “project_id required”), the API is reachable; if you see the app page, /api is not routed to the API.'}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => load()}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={checkApiReachable}
                    disabled={apiCheckStatus === 'checking'}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {apiCheckStatus === 'checking' ? 'Checking…' : 'Check API'}
                  </button>
                </div>
                {apiCheckStatus !== 'idle' && apiCheckStatus !== 'checking' && apiCheckMessage && (
                  <p
                    className={`mt-3 text-[11px] max-w-[260px] ${
                      apiCheckStatus === 'ok' ? 'text-emerald-700' : apiCheckStatus === 'html' ? 'text-amber-700' : 'text-red-700'
                    }`}
                  >
                    {apiCheckMessage}
                  </p>
                )}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center mb-4 ring-4 ring-white shadow-inner">
                  <Clock className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No activity yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  Create or update tasks to see interactions here
                </p>
              </div>
            ) : (
              <div className="py-3 px-3">
                {(['today', 'yesterday', 'week', 'older'] as const).map((groupKey) => {
                  const items = grouped[groupKey];
                  if (!items.length) return null;
                  const groupStyle = TIME_GROUP_STYLES[groupKey] || TIME_GROUP_STYLES.older;
                  return (
                    <div key={groupKey} className="mb-6 last:mb-0">
                      <div className="sticky top-0 z-10 py-2 px-2 mb-2 flex items-center gap-2 bg-gradient-to-b from-white/95 to-transparent">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${groupStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${groupStyle.dot} shrink-0`} />
                          {groupStyle.icon}
                          {TIME_GROUP_LABELS[groupKey]}
                        </span>
                        <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                      </div>
                      <ul className="space-y-1.5">
                        {items.map((a, idx) => {
                          const meta = getActionLabel(a.action);
                          const crewName = getCrewName(a);
                          const crewInitials = getCrewInitials(a);
                          const initials = (crewInitials || crewName?.slice(0, 2) || '?').toUpperCase();
                          const color = avatarColor(crewName || crewInitials);
                          return (
                            <li
                              key={`${a.id}-${idx}`}
                              className="group relative flex gap-3 py-2.5 pl-4 pr-3 rounded-xl border border-slate-100 bg-white/80 hover:bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50 transition-all duration-200"
                            >
                              {/* Colored left accent by action type */}
                              <div
                                className={`absolute left-0 top-2 bottom-2 w-1 rounded-l-xl ${meta.bg} opacity-90`}
                                aria-hidden
                              />
                              {/* Timeline line (between cards) */}
                              {idx < items.length - 1 && (
                                <div
                                  className="absolute left-[34px] top-12 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent pointer-events-none"
                                  aria-hidden
                                />
                              )}
                              {/* Avatar */}
                              <div
                                className="relative z-0 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white ring-offset-2 ring-offset-slate-50/80 group-hover:ring-offset-white transition-all"
                                style={{ backgroundColor: color }}
                              >
                                {initials}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pt-0.5 pl-0.5">
                                <div className="flex items-center flex-wrap gap-2">
                                  <span
                                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${meta.bg} ${meta.text}`}
                                  >
                                    {meta.icon}
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
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
          className="flex flex-col items-center justify-center h-full py-4 w-full text-slate-500 hover:text-indigo-600 hover:bg-gradient-to-b from-indigo-50/50 to-white transition-all rounded-l-lg"
          title="Expand activity"
        >
          <ChevronLeft className="w-4 h-4 mb-1" />
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-semibold mt-1">Activity</span>
        </button>
      )}
    </div>
  );
}
