import { useState, useMemo } from 'react';
import { Clock, AlertTriangle, X, ChevronRight } from 'lucide-react';
import type { Initiative } from '../data/mockData';

interface DueBannerProps {
  initiatives: Initiative[];
  onOpenTask?: (initiative: Initiative) => void;
}

export function DueBanner({ initiatives, onOpenTask }: DueBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { dueToday, overdue } = useMemo(() => {
    const active = initiatives.filter(i => i.status !== 'Complete');
    const dueToday = active.filter(i =>
      i.endDate && i.endDate >= today && i.endDate < tomorrow
    );
    const overdue = active.filter(i =>
      i.endDate && i.endDate < today
    );
    return { dueToday, overdue };
  }, [initiatives]);

  if (dismissed) return null;
  if (dueToday.length === 0 && overdue.length === 0) return null;

  const isOverdueOnly = dueToday.length === 0;
  const isDueTodayOnly = overdue.length === 0;

  // Choose visual treatment: red gradient if there's anything overdue,
  // otherwise amber for due-today only.
  const isUrgent = overdue.length > 0;

  return (
    <div className="flex-shrink-0 px-6 pt-3">
      <div
        className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 border shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border-rose-200/70'
            : 'bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 border-amber-200/70'
        }`}
      >
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
            isUrgent ? 'bg-rose-500 text-white shadow-[0_2px_6px_rgba(244,63,94,0.35)]' : 'bg-amber-500 text-white shadow-[0_2px_6px_rgba(245,158,11,0.35)]'
          }`}
        >
          {isUrgent ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        </span>

        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
          {overdue.length > 0 && (
            <span className="text-sm font-semibold text-rose-700">
              {overdue.length} task{overdue.length !== 1 ? 's' : ''} overdue
            </span>
          )}
          {!isOverdueOnly && !isDueTodayOnly && (
            <span className="text-rose-300">·</span>
          )}
          {dueToday.length > 0 && (
            <span className={`text-sm font-semibold ${isUrgent ? 'text-rose-600' : 'text-amber-700'}`}>
              {dueToday.length} task{dueToday.length !== 1 ? 's' : ''} due today
            </span>
          )}

          {/* Show first few task names as clickable chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[...overdue, ...dueToday].slice(0, 3).map(task => {
              const isTaskOverdue = overdue.some(o => o.id === task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => onOpenTask?.(task)}
                  className={`group flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                    isTaskOverdue
                      ? 'bg-white/90 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                      : 'bg-white/90 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                  }`}
                >
                  <span className="truncate max-w-[180px]">
                    {task.name.length > 28 ? task.name.slice(0, 28) + '…' : task.name}
                  </span>
                  <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
            {[...overdue, ...dueToday].length > 3 && (
              <span className="text-[11px] text-gray-500">
                +{[...overdue, ...dueToday].length - 3} more
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/70 transition-colors flex-shrink-0"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
