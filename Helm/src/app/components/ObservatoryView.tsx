import { Zap, Mountain, AlertTriangle, Hourglass, TrendingDown, Users } from 'lucide-react';
import type { KpiData } from './KPIStatsBar';

interface ObservatoryViewProps {
  kpiData: KpiData;
  totalPoints?: number;
  sprintLabel?: string;
}

export function ObservatoryView({ kpiData, totalPoints = 0, sprintLabel = 'Sprint' }: ObservatoryViewProps) {
  const peaksReached = kpiData.solvedYTD ?? 0;
  const activeBlockers = kpiData.atRiskBlocked ?? 0;
  const daysToSummit = 9; // placeholder

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">Total Points</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{totalPoints}</p>
          <p className="text-xs text-gray-500 mt-1">+0pt vs previous</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Mountain className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">Peaks Reached</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{peaksReached}</p>
          <p className="text-xs text-gray-500 mt-1">0% velocity</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-medium uppercase">Active Blockers</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{activeBlockers}</p>
          <p className="text-xs text-gray-500 mt-1">+0 today</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Hourglass className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">Days to Summit</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{daysToSummit}</p>
          <p className="text-xs text-gray-500 mt-1">—</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Burndown – {sprintLabel}</h3>
        <p className="text-sm text-gray-500 mb-4">Story points remaining per day</p>
        <div className="h-48 flex items-end gap-1">
          {[100, 85, 70, 55, 40, 30, 20].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-teal-500 to-amber-400 rounded-t min-h-[20%]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          Crew Workload
        </h3>
        <p className="text-sm text-gray-500 mt-2">Assignments and capacity by crew member.</p>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
          No crew assignments yet. Add crew from the sidebar and assign items.
        </div>
      </div>
    </div>
  );
}
