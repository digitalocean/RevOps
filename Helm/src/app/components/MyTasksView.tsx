import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Calendar, Tag, ArrowRight, Inbox } from 'lucide-react';
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
  loading?: boolean;
}

export function MyTasksView({ initiatives, crew, currentUser, projects, onUpdateItem, onDeleteItem, loading }: MyTasksViewProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selected, setSelected] = useState<Initiative | null>(null);

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  const myTasks = useMemo(() => {
    if (!currentUser) return initiatives;
    return initiatives.filter((i) => taskAssignedToMe(i, currentUser));
  }, [initiatives, currentUser]);

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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
        <p className="text-sm text-gray-500 mt-1">
          {currentUser ? `Tasks assigned to ${currentUser.name}` : 'All tasks across projects'} — {myTasks.length} total
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === f.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : f.urgent
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}>
            {f.icon}
            {f.label}
            {counts[f.countKey] > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                filter === f.id ? 'bg-white/20 text-white' : f.urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>{counts[f.countKey]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading && myTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">Loading tasks from all your projects…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-700">
            {filter === 'all' ? "You're all caught up!" : `No ${filters.find(f => f.id === filter)?.label.toLowerCase()} tasks`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'all' ? 'No tasks assigned to you (by account or email). Assign a task to yourself in Trackers, or link your crew profile to your user.' : 'Check other filters or add new tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(init => {
            const dot = STATUS_DOT[init.status] || 'bg-gray-300';
            const isOverdue = init.endDate && init.endDate < today && init.status !== 'Complete';
            const isDueToday = init.endDate && init.endDate >= today && init.endDate < tomorrow;
            const dueStr = init.endDate && !isNaN(init.endDate.getTime())
              ? init.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: init.endDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
              : null;

            return (
              <div key={init.id}
                onClick={() => setSelected(init)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all group">
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
          onDelete={async (id) => { await onDeleteItem(id); setSelected(null); }}
        />
      )}
    </div>
  );
}
