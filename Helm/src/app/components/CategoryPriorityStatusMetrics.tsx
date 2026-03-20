import { useMemo } from 'react';
import { PieChart, Tag, Flag, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Initiative, Category, Priority, Status } from '../data/mockData';

interface CategoryPriorityStatusMetricsProps {
  initiatives: Initiative[];
}

export function CategoryPriorityStatusMetrics({ initiatives }: CategoryPriorityStatusMetricsProps) {
  const byCategory = initiatives.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const byPriority = initiatives.reduce<Record<string, number>>((acc, i) => {
    acc[i.priority] = (acc[i.priority] || 0) + 1;
    return acc;
  }, {});
  const byStatus = initiatives.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  const categoryKeys = useMemo(() => {
    const defaults: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];
    const fromData = new Set<string>();
    for (const i of initiatives) {
      if (i.category) fromData.add(i.category);
    }
    return Array.from(new Set([...defaults, ...fromData])).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [initiatives]);
  const priorities: Priority[] = ['P0', 'P1', 'P2'];
  const statuses: Status[] = ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete'];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            By Category, Priority & Status
          </h3>
          <p className="text-sm text-gray-500 mt-1">Real breakdown from work items</p>
        </div>
      </div>

      {initiatives.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No work items yet. Add items in Manifest or Summit Board to see metrics here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Category
            </h4>
            <div className="space-y-2">
              {categoryKeys.map((cat) => (
                <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{cat}</span>
                  <Badge variant="secondary">{byCategory[cat] ?? 0}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Priority
            </h4>
            <div className="space-y-2">
              {priorities.map((p) => (
                <div key={p} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{p}</span>
                  <Badge variant="secondary">{byPriority[p] ?? 0}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Status
            </h4>
            <div className="space-y-2">
              {statuses.map((s) => (
                <div key={s} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{s}</span>
                  <Badge variant="secondary">{byStatus[s] ?? 0}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
