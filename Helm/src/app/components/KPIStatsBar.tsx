import { CheckCircle2, Clock, AlertTriangle, Target } from 'lucide-react';
import { kpiData as defaultKpiData } from '../data/mockData';

export interface KpiData {
  solvedYTD: number;
  inProgress: number;
  atRiskBlocked: number;
  bigRocksCount: number;
  overallProgress: number;
  totalItems?: number;
}

interface KPITileProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Tailwind text color class for the headline number */
  valueColor: string;
  /** A two-stop gradient class string for the icon background */
  iconGradient: string;
  /** Caption shown below the label (e.g. "On track", "Needs attention") */
  caption?: string;
  /** Optional progress percentage 0–100 to render a soft rail at the bottom */
  progress?: number;
  /** Tailwind class for the rail fill color */
  progressColor?: string;
}

function KPITile({ label, value, icon, valueColor, iconGradient, caption, progress, progressColor }: KPITileProps) {
  return (
    <div className="group relative bg-white rounded-xl border border-[var(--border-soft)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* Subtle gradient wash on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white via-white to-[var(--secondary)]" aria-hidden />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-[0_4px_10px_rgba(15,23,42,0.08)] ${iconGradient}`}>
            {icon}
          </div>
        </div>
        <div className={`text-[28px] leading-none font-semibold tabular-nums ${valueColor} mb-2`}>
          {value}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">{label}</div>
          {caption ? <div className="text-[11px] text-gray-400">{caption}</div> : null}
        </div>
        {typeof progress === 'number' && (
          <div className="mt-3 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor || 'bg-indigo-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface KPIStatsBarProps {
  kpiData?: KpiData;
}

export function KPIStatsBar({ kpiData = defaultKpiData }: KPIStatsBarProps) {
  const total = kpiData.totalItems ?? (kpiData.bigRocksCount + kpiData.solvedYTD + kpiData.inProgress + kpiData.atRiskBlocked);
  const completionPct = total > 0 ? Math.round((kpiData.solvedYTD / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((kpiData.inProgress / total) * 100) : 0;
  const atRiskPct = total > 0 ? Math.round((kpiData.atRiskBlocked / total) * 100) : 0;

  return (
    <div className="bg-transparent">
      <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPITile
            label="Solved / Done"
            value={kpiData.solvedYTD}
            icon={<CheckCircle2 className="w-5 h-5" />}
            valueColor="text-emerald-600"
            iconGradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
            caption={total > 0 ? `${completionPct}% of total` : undefined}
            progress={completionPct}
            progressColor="bg-emerald-500"
          />
          <KPITile
            label="In Progress"
            value={kpiData.inProgress}
            icon={<Clock className="w-5 h-5" />}
            valueColor="text-indigo-600"
            iconGradient="bg-gradient-to-br from-indigo-400 to-blue-600"
            caption={total > 0 ? `${inProgressPct}% of total` : undefined}
            progress={inProgressPct}
            progressColor="bg-indigo-500"
          />
          <KPITile
            label="At Risk / Blocked"
            value={kpiData.atRiskBlocked}
            icon={<AlertTriangle className="w-5 h-5" />}
            valueColor="text-amber-600"
            iconGradient="bg-gradient-to-br from-amber-400 to-orange-500"
            caption={kpiData.atRiskBlocked === 0 ? 'All clear' : 'Needs attention'}
            progress={atRiskPct}
            progressColor="bg-amber-500"
          />
          <KPITile
            label="Total Items"
            value={total}
            icon={<Target className="w-5 h-5" />}
            valueColor="text-violet-600"
            iconGradient="bg-gradient-to-br from-violet-400 to-purple-600"
            caption={kpiData.bigRocksCount ? `${kpiData.bigRocksCount} milestones` : undefined}
          />
        </div>
      </div>
    </div>
  );
}