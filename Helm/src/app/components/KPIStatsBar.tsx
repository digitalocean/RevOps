import { CheckCircle2, Clock, AlertTriangle, Target } from 'lucide-react';
import { Progress } from './ui/progress';
import { kpiData } from '../data/mockData';

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

export function KPIStatsBar() {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-6 py-5">
        <div className="grid grid-cols-4 gap-4 mb-5">
          <KPITile
            label="Solved YTD"
            value={kpiData.solvedYTD}
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <KPITile
            label="In Progress"
            value={kpiData.inProgress}
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <KPITile
            label="At Risk / Blocked"
            value={kpiData.atRiskBlocked}
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <KPITile
            label="Big Rocks"
            value={kpiData.bigRocksCount}
            icon={<Target className="w-5 h-5 text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>
        
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Overall Progress</span>
            <span className="text-lg font-semibold text-gray-900">
              {kpiData.overallProgress}%
            </span>
          </div>
          <Progress value={kpiData.overallProgress} className="h-2" />
        </div>
      </div>
    </div>
  );
}