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

  return (
    <div className={`flex-shrink-0 border-b px-4 py-2.5 flex items-center gap-3 ${
      overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      {overdue.length > 0 ? (
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
      )}

      <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
        {overdue.length > 0 && (
          <span className="text-sm font-medium text-red-700">
            {overdue.length} task{overdue.length !== 1 ? 's' : ''} overdue
          </span>
        )}
        {dueToday.length > 0 && (
          <span className="text-sm font-medium text-amber-700">
            {dueToday.length} task{dueToday.length !== 1 ? 's' : ''} due today
          </span>
        )}

        {/* Show first few task names as clickable chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[...overdue, ...dueToday].slice(0, 3).map(task => (
            <button
              key={task.id}
              onClick={() => onOpenTask?.(task)}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                overdue.some(o => o.id === task.id)
                  ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                  : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
              }`}
            >
              {task.name.length > 28 ? task.name.slice(0, 28) + '…' : task.name}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))}
          {[...overdue, ...dueToday].length > 3 && (
            <span className="text-xs text-gray-500">
              +{[...overdue, ...dueToday].length - 3} more
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
