import { useMemo, useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Initiative, Status } from '../data/mockData';
import { TaskDetailDrawer } from './TaskDetailDrawer';

const STATUS_DOT: Record<Status, string> = {
  'On Track': 'bg-emerald-500', 'At Risk': 'bg-amber-500', 'In Review': 'bg-violet-500',
  'Complete': 'bg-blue-500', 'Blocked': 'bg-red-500', 'Not Started': 'bg-gray-300',
};

interface WorkloadMember {
  id: string;
  name: string;
  initials: string;
  tasks: Initiative[];
  blocked: number;
  overdue: number;
  load: 'light' | 'normal' | 'heavy' | 'overloaded';
}

interface TeamWorkloadViewProps {
  initiatives: Initiative[];
  crew: { id: string; name: string; initials?: string }[];
  currentUser?: { id: string; name: string } | null;
  onUpdateItem: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  onDeleteItem: (id: string) => Promise<void>;
}

function avatarColor(name: string) {
  const colors = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-indigo-500'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function loadBadge(load: WorkloadMember['load']) {
  switch (load) {
    case 'light': return { label: 'Light', bg: 'bg-gray-100', text: 'text-gray-500' };
    case 'normal': return { label: 'Normal', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'heavy': return { label: 'Heavy', bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'overloaded': return { label: 'Overloaded', bg: 'bg-red-100', text: 'text-red-700' };
  }
}

export function TeamWorkloadView({ initiatives, crew, currentUser, onUpdateItem, onDeleteItem }: TeamWorkloadViewProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Initiative | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const members: WorkloadMember[] = useMemo(() => {
    const byMember: Record<string, Initiative[]> = {};
    initiatives.forEach(i => {
      const key = i.assignee_id || 'unassigned';
      if (!byMember[key]) byMember[key] = [];
      byMember[key].push(i);
    });

    const result: WorkloadMember[] = [];

    crew.forEach(c => {
      const tasks = (byMember[c.id] || []).filter(i => i.status !== 'Complete');
      const blocked = tasks.filter(i => i.status === 'Blocked').length;
      const overdue = tasks.filter(i => i.endDate && i.endDate < today).length;
      const count = tasks.length;
      const load: WorkloadMember['load'] =
        count === 0 ? 'light' :
        count <= 3 ? 'normal' :
        count <= 6 ? 'heavy' : 'overloaded';

      result.push({
        id: c.id,
        name: c.name,
        initials: c.initials || c.name.slice(0, 2),
        tasks,
        blocked,
        overdue,
        load,
      });
    });

    // Sort: overloaded first, then by task count desc
    return result.sort((a, b) => {
      const loadOrder = { overloaded: 0, heavy: 1, normal: 2, light: 3 };
      const lo = loadOrder[a.load] - loadOrder[b.load];
      return lo !== 0 ? lo : b.tasks.length - a.tasks.length;
    });
  }, [initiatives, crew, today]);

  const unassigned = useMemo(() =>
    initiatives.filter(i => !i.assignee_id && i.status !== 'Complete'),
  [initiatives]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        {[
          { label: 'Team Members', value: crew.length, icon: <Users className="w-4 h-4 text-indigo-500" />, bg: 'bg-indigo-50' },
          { label: 'Overloaded', value: members.filter(m => m.load === 'overloaded').length, icon: <AlertTriangle className="w-4 h-4 text-red-500" />, bg: 'bg-red-50' },
          { label: 'Unassigned Tasks', value: unassigned.length, icon: <BarChart2 className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'All Complete', value: initiatives.filter(i => i.status === 'Complete').length, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 flex items-center gap-3 border border-white`}>
            <div className="flex-shrink-0">{card.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Member rows */}
      {members.map(member => {
        const badge = loadBadge(member.load);
        const isExpanded = expandedMember === member.id;
        const loadWidth = Math.min(100, (member.tasks.length / 8) * 100);

        return (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedMember(isExpanded ? null : member.id)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full ${avatarColor(member.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {member.initials.toUpperCase()}
              </div>

              {/* Name + load */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                  {member.blocked > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                      {member.blocked} blocked
                    </span>
                  )}
                  {member.overdue > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      {member.overdue} overdue
                    </span>
                  )}
                </div>
                {/* Load bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        member.load === 'overloaded' ? 'bg-red-500' :
                        member.load === 'heavy' ? 'bg-amber-500' :
                        member.load === 'normal' ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${loadWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{member.tasks.length} active</span>
                </div>
              </div>

              {/* Chevron */}
              <div className="flex-shrink-0 text-gray-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded tasks */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {member.tasks.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">No active tasks assigned.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {member.tasks.slice(0, 10).map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] || 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{task.name}</p>
                          {task.endDate && (
                            <p className={`text-xs mt-0.5 ${task.endDate < today ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              Due {task.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          task.priority === 'P0' ? 'bg-red-100 text-red-700' :
                          task.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{task.priority}</span>
                      </button>
                    ))}
                    {member.tasks.length > 10 && (
                      <p className="px-5 py-2.5 text-xs text-gray-400">+{member.tasks.length - 10} more tasks…</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300">
          <button
            onClick={() => setExpandedMember(expandedMember === 'unassigned' ? null : 'unassigned')}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 text-sm font-bold">?</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Unassigned</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{unassigned.length} tasks</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Needs an owner</p>
            </div>
            {expandedMember === 'unassigned' ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedMember === 'unassigned' && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {unassigned.slice(0, 8).map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] || 'bg-gray-300'}`} />
                  <p className="text-sm text-gray-700 flex-1 truncate">{task.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                    task.priority === 'P0' ? 'bg-red-100 text-red-700' :
                    task.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>{task.priority}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          initiative={selectedTask}
          crew={crew}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onSave={async (id, payload) => { await onUpdateItem(id, payload as Record<string, unknown>); }}
          onDelete={async (id) => { await onDeleteItem(id); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
