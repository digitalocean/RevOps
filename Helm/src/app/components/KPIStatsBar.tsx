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
  color: string;
  bgColor: string;
}

function KPITile({ label, value, icon, color, bgColor }: KPITileProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-semibold ${color} mb-1`}>
        {value}
      </div>
      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</div>
    </div>
  );
}

interface KPIStatsBarProps {
  kpiData?: KpiData;
}

export function KPIStatsBar({ kpiData = defaultKpiData }: KPIStatsBarProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-6 py-5">
        <div className="grid grid-cols-4 gap-4 mb-5">
          <KPITile
            label="SOLVED / DONE"
            value={kpiData.solvedYTD}
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <KPITile
            label="IN PROGRESS"
            value={kpiData.inProgress}
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <KPITile
            label="AT RISK / BLOCKED"
            value={kpiData.atRiskBlocked}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <KPITile
            label="ITEMS"
            value={kpiData.totalItems ?? (kpiData.bigRocksCount + kpiData.solvedYTD + kpiData.inProgress + kpiData.atRiskBlocked)}
            icon={<Target className="w-5 h-5 text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>
      </div>
    </div>
  );
}