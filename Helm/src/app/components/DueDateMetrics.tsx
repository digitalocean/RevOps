import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Initiative } from '../data/mockData';

interface DueDateMetricsProps {
  initiatives: Initiative[];
}

export function DueDateMetrics({ initiatives }: DueDateMetricsProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  let overdue = 0;
  let dueThisWeek = 0;
  let dueLater = 0;
  let noDate = 0;

  initiatives.forEach((i) => {
    const end = i.endDate?.getTime();
    if (!end || isNaN(end)) {
      noDate++;
      return;
    }
    if (end < today) overdue++;
    else if (end < today + oneWeek) dueThisWeek++;
    else dueLater++;
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            By Due Date
          </h3>
          <p className="text-sm text-gray-500 mt-1">Real due dates from work items</p>
        </div>
      </div>

      {initiatives.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No work items yet. Add items and set due dates to see metrics here.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
              <AlertCircle className="w-4 h-4" />
              Overdue
            </div>
            <p className="text-2xl font-bold text-red-800">{overdue}</p>
            <p className="text-xs text-red-600 mt-0.5">items past due</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
              <Clock className="w-4 h-4" />
              Due this week
            </div>
            <p className="text-2xl font-bold text-amber-900">{dueThisWeek}</p>
            <p className="text-xs text-amber-700 mt-0.5">items</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
              <Calendar className="w-4 h-4" />
              Due later
            </div>
            <p className="text-2xl font-bold text-blue-800">{dueLater}</p>
            <p className="text-xs text-blue-600 mt-0.5">items</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600 font-medium mb-1">
              <Calendar className="w-4 h-4" />
              No date
            </div>
            <p className="text-2xl font-bold text-gray-800">{noDate}</p>
            <p className="text-xs text-gray-500 mt-0.5">items</p>
          </div>
        </div>
      )}
    </Card>
  );
}
