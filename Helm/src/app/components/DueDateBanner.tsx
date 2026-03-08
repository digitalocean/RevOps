import { useState } from 'react';
import { AlertTriangle, Clock, X, ChevronRight } from 'lucide-react';
import type { Initiative } from '../data/mockData';

interface DueDateBannerProps {
  initiatives: Initiative[];
  onOpenItem: (id: string) => void;
}

export function DueDateBanner({ initiatives, onOpenItem }: DueDateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdue = initiatives.filter(i =>
    i.endDate && i.endDate < today && i.status !== 'Complete'
  );
  const dueToday = initiatives.filter(i =>
    i.endDate && i.endDate >= today && i.endDate < tomorrow && i.status !== 'Complete'
  );

  if (overdue.length === 0 && dueToday.length === 0) return null;

  const isUrgent = overdue.length > 0;

  return (
    <div className={`border-b px-6 py-2.5 flex items-center gap-4 text-sm ${
      isUrgent
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      {isUrgent
        ? <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
      }
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        {overdue.length > 0 && (
          <span className="font-semibold">
            {overdue.length} task{overdue.length !== 1 ? 's' : ''} overdue
          </span>
        )}
        {dueToday.length > 0 && (
          <span className={overdue.length > 0 ? 'text-amber-700' : 'font-semibold'}>
            {dueToday.length} due today
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[...overdue.slice(0, 2), ...dueToday.slice(0, 2 - Math.min(overdue.length, 2))].map(item => (
            <button
              key={item.id}
              onClick={() => onOpenItem(item.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${
                isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {item.name.length > 28 ? item.name.slice(0, 28) + '…' : item.name}
              <ChevronRight className="w-3 h-3" />
            </button>
          ))}
          {(overdue.length + dueToday.length) > 4 && (
            <span className="text-xs opacity-70">+{overdue.length + dueToday.length - 4} more</span>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
