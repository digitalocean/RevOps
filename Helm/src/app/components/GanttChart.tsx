import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { Initiative } from '../data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const GANTT_GROUP_KEY = 'meridian-gantt-group-by';

interface TrackerRef {
  id: string;
  title: string;
}

interface CustomFieldRef {
  id: string;
  name: string;
  field_type: string;
}

interface GanttChartProps {
  initiatives: Initiative[];
  trackerSections?: TrackerRef[];
  customFields?: CustomFieldRef[];
}

function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endDate = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= endDate) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function getStatusGradient(status: string): string {
  switch (status) {
    case 'On Track': return 'from-emerald-400 to-emerald-600';
    case 'At Risk': return 'from-yellow-400 to-yellow-600';
    case 'Complete': return 'from-teal-400 to-teal-600';
    case 'Blocked': return 'from-red-400 to-red-600';
    case 'Not Started': return 'from-gray-300 to-gray-400';
    default: return 'from-blue-400 to-blue-600';
  }
}

export function GanttChart({ initiatives, trackerSections = [], customFields = [] }: GanttChartProps) {
  const [groupBy, setGroupBy] = useState(() => {
    try {
      return localStorage.getItem(GANTT_GROUP_KEY) || 'none';
    } catch {
      return 'none';
    }
  });

  const persistGroup = (v: string) => {
    setGroupBy(v);
    try {
      localStorage.setItem(GANTT_GROUP_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const groupOptions = useMemo(() => {
    const base = [
      { id: 'none', label: 'Single list (no grouping)' },
      { id: 'status', label: 'By status' },
      { id: 'category', label: 'By category' },
      { id: 'tracker', label: 'By tracker / section' },
    ];
    const cf = (customFields || [])
      .filter((f) => f.target === 'item' || !f.target || (f as { applies_to?: string }).applies_to === 'task')
      .filter((f) => ['select', 'text', 'number'].includes((f.field_type || '').toLowerCase()))
      .map((f) => ({ id: f.id, label: `By field: ${f.name}` }));
    return [...base, ...cf];
  }, [customFields]);

  const validInitiatives = initiatives.filter((i) => {
    try {
      return (
        i.startDate &&
        i.endDate &&
        !isNaN(i.startDate.getTime()) &&
        !isNaN(i.endDate.getTime()) &&
        i.endDate >= i.startDate
      );
    } catch {
      return false;
    }
  });

  const grouped = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: '_all', label: '', items: validInitiatives }];
    }
    const m = new Map<string, Initiative[]>();
    for (const i of validInitiatives) {
      let k: string;
      if (groupBy === 'status') k = i.status;
      else if (groupBy === 'category') k = i.category;
      else if (groupBy === 'tracker') {
        const t = trackerSections.find((s) => s.id === i.tracker_id);
        k = t?.title || 'Uncategorized';
      } else {
        const v = i.field_values?.[groupBy];
        k = v == null || v === '' ? '—' : String(v);
      }
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(([label, items]) => ({ key: label, label, items }));
  }, [groupBy, validInitiatives, trackerSections]);

  const { months, startDate, endDate } = useMemo(() => {
    if (validInitiatives.length === 0) {
      const now = new Date();
      const later = new Date(now.getFullYear(), now.getMonth() + 3, 1);
      return { months: getMonthsBetween(now, later), startDate: now, endDate: later };
    }
    const allDates = validInitiatives.flatMap((i) => [i.startDate, i.endDate]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    if (minDate.getTime() === maxDate.getTime()) maxDate.setDate(maxDate.getDate() + 30);
    return {
      months: getMonthsBetween(minDate, maxDate),
      startDate: minDate,
      endDate: maxDate,
    };
  }, [validInitiatives]);

  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  function getBarPosition(initiative: Initiative) {
    const startDays = Math.max(
      0,
      Math.ceil((initiative.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const duration = Math.max(
      1,
      Math.ceil((initiative.endDate.getTime() - initiative.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      left: `${(startDays / totalDays) * 100}%`,
      width: `${Math.min(100 - (startDays / totalDays) * 100, (duration / totalDays) * 100)}%`,
    };
  }

  if (validInitiatives.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">📅</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No timeline data yet</h3>
        <p className="text-sm text-gray-500">Add due dates to your tasks to see them on the Gantt timeline.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200/50 shadow-xl p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Gantt Timeline
          </h3>
          <p className="text-sm text-gray-600 mt-1">Group rows by field to compare timelines</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Group by</span>
          <Select value={groupBy} onValueChange={persistGroup}>
            <SelectTrigger className="w-[220px] h-9 text-sm">
              <SelectValue placeholder="Grouping" />
            </SelectTrigger>
            <SelectContent className="z-[100] max-h-[280px]">
              {groupOptions.map((o) => (
                <SelectItem key={o.id} value={o.id} className="text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200/50 text-sm font-semibold text-gray-700">
            {validInitiatives.length} tasks
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className="flex border-b-2 border-gray-200 pb-4 mb-4">
            <div className="w-80 flex-shrink-0 font-bold text-sm text-gray-700 uppercase tracking-wider">
              Task
            </div>
            <div className="flex-1 flex gap-px bg-gray-200 rounded-lg overflow-hidden">
              {months.map((month, idx) => (
                <div
                  key={idx}
                  className="flex-1 text-center py-3 bg-gradient-to-b from-gray-50 to-white text-xs font-bold text-gray-700 uppercase tracking-wider"
                  style={{ minWidth: `${100 / months.length}%` }}
                >
                  {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.key}>
                {group.label !== '' && (
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 px-1 border-l-4 border-indigo-400 pl-2">
                    {group.label}
                  </div>
                )}
                <div className="space-y-4">
                  {group.items.map((initiative, itemIdx) => {
                    const position = getBarPosition(initiative);
                    const gradient = getStatusGradient(initiative.status);
                    return (
                      <motion.div
                        key={initiative.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(itemIdx * 0.02, 0.3) }}
                        className="flex items-center group"
                      >
                        <div className="w-80 flex-shrink-0 pr-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                              {initiative.owner.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {initiative.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{initiative.owner}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 relative h-16">
                          <div className="absolute inset-0 flex gap-px">
                            {months.map((_, midx) => (
                              <div
                                key={midx}
                                className="flex-1 border-r border-gray-100"
                                style={{ minWidth: `${100 / months.length}%` }}
                              />
                            ))}
                          </div>
                          {(initiative as Initiative & { is_milestone?: boolean }).is_milestone ? (
                            <motion.div
                              whileHover={{ scale: 1.3 }}
                              className="absolute top-4 z-10 cursor-pointer"
                              style={{ left: `calc(${position.left} + ${position.width} / 2 - 12px)` }}
                              title={`Milestone: ${initiative.name}`}
                            >
                              <div className="w-6 h-6 bg-amber-400 border-2 border-amber-600 rotate-45 shadow-md" />
                            </motion.div>
                          ) : (
                            <motion.div
                              whileHover={{ y: -3, scale: 1.02 }}
                              className="absolute top-3 h-10 rounded-xl cursor-pointer z-10"
                              style={position}
                            >
                              <div className={`relative h-full rounded-xl bg-gradient-to-r ${gradient} shadow-lg overflow-hidden group/bar`}>
                                <div
                                  className="absolute top-0 left-0 h-full bg-white/20 rounded-l-xl transition-all duration-500"
                                  style={{ width: `${initiative.progress}%` }}
                                />
                                <div className="relative h-full flex items-center justify-between px-4 z-10">
                                  <div className="text-xs font-bold text-white">{initiative.progress}%</div>
                                  {initiative.isBigRock && (
                                    <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse shadow-lg shadow-yellow-500/50" />
                                  )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/bar:translate-x-full transition-transform duration-1000" />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t-2 border-gray-200">
        <div className="flex items-center gap-8 text-xs flex-wrap">
          <div className="font-bold text-gray-700 uppercase tracking-wider">Status:</div>
          {['On Track', 'At Risk', 'Blocked', 'Complete', 'Not Started'].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded bg-gradient-to-r ${getStatusGradient(s)} shadow-md`} />
              <span className="text-gray-700 font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
