import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Calendar, Tag, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import type { Initiative, Status } from '../data/mockData';
import { TaskDetailDrawer } from './TaskDetailDrawer';

const STATUS_DOT: Record<Status, string> = {
  'On Track': 'bg-emerald-500', 'At Risk': 'bg-amber-500', 'In Review': 'bg-violet-500',
  'Complete': 'bg-blue-500', 'Blocked': 'bg-red-500', 'Not Started': 'bg-gray-300',
};

type FilterMode = 'all' | 'due_today' | 'overdue' | 'blocked' | 'in_review' | 'complete';

function taskAssignedToMe(i: Initiative, u: { id: string; email?: string }): boolean {
  if (i.assignee_user_id && i.assignee_user_id === u.id) return true;
  const ue = (u.email || '').toLowerCase().trim();
  if (ue && i.assignee_email && String(i.assignee_email).toLowerCase().trim() === ue) return true;
  return false;
}

interface MyTasksViewProps {
  initiatives: Initiative[];
  crew: { id: string; name: string; initials?: string }[];
  currentUser: { id: string; name: string; email?: string } | null;
  projects: { id: string; name: string }[];
  onUpdateItem: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  onDeleteItem: (id: string) => Promise<void>;
  canDeleteTask?: (initiative: Initiative) => boolean;
  loading?: boolean;
  /** Reload tasks from all projects (manual + called after saves) */
  onRefresh?: () => Promise<void>;
}

export function MyTasksView({ initiatives, crew, currentUser, projects, onUpdateItem, onDeleteItem, canDeleteTask, loading, onRefresh }: MyTasksViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Initiative | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setManualRefreshing(false);
    }
  };

  const showRefreshSpinner = manualRefreshing || (Boolean(loading) && initiatives.length > 0);

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  /** Tasks assigned to me, narrowed to the selected project scope. */
  const myTasks = useMemo(() => {
    const baseTasks = currentUser
      ? initiatives.filter((i) => taskAssignedToMe(i, currentUser))
      : initiatives;
    if (projectFilter === 'all') return baseTasks;
    return baseTasks.filter((i) => i.project_id === projectFilter);
  }, [initiatives, currentUser, projectFilter]);

  /** Project dropdown options — only projects where I have ≥1 assigned task. */
  const projectOptions = useMemo(() => {
    const allAssigned = currentUser
      ? initiatives.filter((i) => taskAssignedToMe(i, currentUser))
      : initiatives;
    const ids = new Set<string>();
    allAssigned.forEach((i) => { if (i.project_id) ids.add(i.project_id); });
    return projects
      .filter((p) => ids.has(p.id))
      .map((p) => ({ id: p.id, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initiatives, currentUser, projects]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'due_today': return myTasks.filter(i => i.endDate && i.endDate >= today && i.endDate < tomorrow && i.status !== 'Complete');
      case 'overdue': return myTasks.filter(i => i.endDate && i.endDate < today && i.status !== 'Complete');
      case 'blocked': return myTasks.filter(i => i.status === 'Blocked');
      case 'in_review': return myTasks.filter(i => i.status === 'In Review');
      case 'complete': return myTasks.filter(i => i.status === 'Complete');
      default: return myTasks.filter(i => i.status !== 'Complete');
    }
  }, [myTasks, filter, today, tomorrow]);

  const counts = useMemo(() => ({
    all: myTasks.filter(i => i.status !== 'Complete').length,
    due_today: myTasks.filter(i => i.endDate && i.endDate >= today && i.endDate < tomorrow && i.status !== 'Complete').length,
    overdue: myTasks.filter(i => i.endDate && i.endDate < today && i.status !== 'Complete').length,
    blocked: myTasks.filter(i => i.status === 'Blocked').length,
    in_review: myTasks.filter(i => i.status === 'In Review').length,
    complete: myTasks.filter(i => i.status === 'Complete').length,
  }), [myTasks, today, tomorrow]);

  const filters: { id: FilterMode; label: string; icon: React.ReactNode; countKey: FilterMode; urgent?: boolean }[] = [
    { id: 'all', label: 'All Active', icon: <Inbox className="w-3.5 h-3.5" />, countKey: 'all' },
    { id: 'due_today', label: 'Due Today', icon: <Clock className="w-3.5 h-3.5" />, countKey: 'due_today', urgent: counts.due_today > 0 },
    { id: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-3.5 h-3.5" />, countKey: 'overdue', urgent: counts.overdue > 0 },
    { id: 'blocked', label: 'Blocked', icon: <AlertTriangle className="w-3.5 h-3.5" />, countKey: 'blocked', urgent: counts.blocked > 0 },
    { id: 'in_review', label: 'In Review', icon: <CheckCircle2 className="w-3.5 h-3.5" />, countKey: 'in_review' },
    { id: 'complete', label: 'Done', icon: <CheckCircle2 className="w-3.5 h-3.5" />, countKey: 'complete' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Tasks</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser ? `Tasks assigned to ${currentUser.name}` : 'All tasks across projects'}
            {projectFilter === 'all' ? ' — across all your projects' : (projectMap[projectFilter] ? ` — scoped to ${projectMap[projectFilter]}` : '')}
            {' — '}
            <span className="font-semibold text-gray-700">{myTasks.length}</span> total
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {projectOptions.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 hidden sm:inline">Project:</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-9 rounded-lg border border-[var(--border)] bg-white px-2.5 text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] focus:outline-none focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-100 transition-all"
                aria-label="Filter My Tasks by project"
              >
                <option value="all">All projects</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void handleRefresh()}
              disabled={manualRefreshing}
              title="Reload tasks from all projects"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${showRefreshSpinner ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === f.id
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-[0_4px_12px_rgba(79,70,229,0.30)]'
                : f.urgent
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-white text-gray-700 border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#D1D5DB] hover:bg-gray-50'
            }`}>
            {f.icon}
            {f.label}
            {counts[f.countKey] > 0 && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold tabular-nums ${
                filter === f.id ? 'bg-white/25 text-white' : f.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>{counts[f.countKey]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading && myTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border-soft)] text-gray-500 text-sm">Loading tasks from all your projects…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 mx-auto mb-4 shadow-[0_8px_20px_rgba(16,185,129,0.30)]">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <p className="text-lg font-semibold text-gray-800 tracking-tight">
            {filter === 'all' ? "You're all caught up" : `No ${filters.find(f => f.id === filter)?.label.toLowerCase()} tasks`}
          </p>
          <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
            {filter === 'all' ? 'No tasks assigned to you. Assign a task to yourself in Trackers, or link your crew profile to your user.' : 'Check other filters or add new tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(init => {
            const dot = STATUS_DOT[init.status] || 'bg-gray-300';
            const isOverdue = init.endDate && init.endDate < today && init.status !== 'Complete';
            const isDueToday = init.endDate && init.endDate >= today && init.endDate < tomorrow;
            const dueStr = init.endDate && !isNaN(init.endDate.getTime())
              ? init.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(init.endDate.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) })
              : null;

            return (
              <div key={init.id}
                onClick={() => setSelected(init)}
                className="bg-white border border-[var(--border-soft)] rounded-xl px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-indigo-200 hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] transition-all group shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {/* Status dot */}
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${init.status === 'Complete' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {init.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {init.project_id && projectMap[init.project_id] && (
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{projectMap[init.project_id]}</span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Tag className="w-3 h-3" />{init.category}
                    </span>
                    {dueStr && (
                      <span className={`text-xs flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-600' : 'text-gray-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}{dueStr}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      init.priority === 'P0' ? 'bg-red-100 text-red-700' :
                      init.priority === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>{init.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium`} style={{
                      background: dot.replace('bg-', '').includes('emerald') ? '#f0fdf4' :
                        dot.includes('amber') ? '#fffbeb' : dot.includes('blue') ? '#eff6ff' :
                        dot.includes('red') ? '#fef2f2' : dot.includes('violet') ? '#f5f3ff' : '#f9fafb'
                    }}>{init.status}</span>
                  </div>
                </div>

                {/* Progress */}
                {init.progress > 0 && init.progress < 100 && (
                  <div className="flex-shrink-0 text-xs text-gray-400 tabular-nums">{init.progress}%</div>
                )}

                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TaskDetailDrawer
          initiative={selected}
          crew={crew}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onSave={async (id, payload) => { await onUpdateItem(id, payload as Record<string, unknown>); }}
          onDelete={
            selected && (!canDeleteTask || canDeleteTask(selected))
              ? async (id) => {
                  await onDeleteItem(id);
                  setSelected(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
