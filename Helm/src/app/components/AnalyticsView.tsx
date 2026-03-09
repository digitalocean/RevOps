import { useState, useEffect } from 'react';
import { Activity, Target, Zap, Users, TrendingUp } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { get } from '../api/meridian';

const STATUS_COLORS: Record<string, string> = {
  'on track': 'var(--status-on-track)',
  'at risk': 'var(--priority-p1)',
  blocked: 'var(--status-blocked)',
  complete: 'var(--status-on-track)',
  'not started': 'var(--status-not-started)',
  'in review': 'var(--status-in-review)',
};

interface CustomFieldDistribution {
  fieldId: string;
  fieldName: string;
  data: { name: string; value: number }[];
}

interface AnalyticsData {
  kpi: {
    completionRate: number;
    totalItems: number;
    doneCount: number;
    inProgressCount: number;
    atRiskCount: number;
  };
  statusDistribution: { name: string; value: number }[];
  categoryPerformance: { name: string; value: number }[];
  velocityTrend: { week: string; count: number }[];
  riskItems: { id: string; title: string; status: string; priority: string }[];
  customFieldDistributions?: CustomFieldDistribution[];
}

interface AnalyticsViewProps {
  projectId: string | null;
}

export function AnalyticsView({ projectId }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    get<AnalyticsData>(`/api/projects/${projectId}/analytics`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center py-24 text-[#6B7280]">
        Select a project to view analytics.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="py-24 text-center text-[#6B7280]">
        {error || 'Failed to load analytics.'}
      </div>
    );
  }

  const { kpi, statusDistribution, categoryPerformance, velocityTrend, customFieldDistributions = [] } = data;
  const velocityData = velocityTrend.map((v, i) => ({
    name: `Week ${i + 1}`,
    count: v.count,
    target: 5,
  }));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">Completion Rate</span>
            <Activity className="w-4 h-4 text-[var(--status-on-track)]" />
          </div>
          <div className="text-2xl font-bold text-[#0F0F13]">{kpi.completionRate}%</div>
          <div className="flex items-center gap-1 text-xs text-[var(--status-on-track)] mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>7-day trend</span>
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">Avg Progress</span>
            <Target className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold text-[#0F0F13]">
            {kpi.totalItems ? Math.round((kpi.doneCount / kpi.totalItems) * 100) : 0}%
          </div>
          <p className="text-xs text-[#6B7280] mt-1">This month</p>
        </div>
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">On-Time Delivery</span>
            <Zap className="w-4 h-4 text-[var(--priority-p1)]" />
          </div>
          <div className="text-2xl font-bold text-[#0F0F13]">{kpi.completionRate}%</div>
          <p className="text-xs text-[#6B7280] mt-1">vs target</p>
        </div>
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF]">Team Utilization</span>
            <Users className="w-4 h-4 text-[var(--status-complete)]" />
          </div>
          <div className="text-2xl font-bold text-[#0F0F13]">
            {kpi.totalItems ? Math.min(100, Math.round((kpi.inProgressCount / kpi.totalItems) * 100) + 20) : 0}%
          </div>
          <p className="text-xs text-[#6B7280] mt-1">Optimal range</p>
        </div>
      </div>

      {/* 2x2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution — Donut */}
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F0F13] mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || 'var(--text-muted)'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity Trend — Area */}
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F0F13] mb-4">Velocity Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={velocityData}>
              <defs>
                <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fill="url(#velocityGrad)" name="Completed" />
              <Area type="monotone" dataKey="target" stroke="var(--status-on-track)" strokeWidth={1} strokeDasharray="4 4" fill="transparent" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Performance — Horizontal Bar */}
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F0F13] mb-4">Category Performance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryPerformance} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Items" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk — simple list or scatter placeholder */}
        <div className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0F0F13] mb-4">At Risk / Blocked</h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {data.riskItems.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No blocked or high-priority items.</p>
            ) : (
              data.riskItems.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[#F8F8FB] border border-[#E8E8EC]">
                  <span className="text-sm text-[#0F0F13] truncate flex-1">{r.title}</span>
                  <span className="text-xs font-medium text-[var(--status-blocked)] shrink-0">{r.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dynamic dashboards for custom fields (from templates/imports) */}
      {customFieldDistributions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[#0F0F13] mb-4">Custom field insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {customFieldDistributions.map((cf) => (
              <div key={cf.fieldId} className="rounded-xl border border-[#E8E8EC] bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#0F0F13] mb-4">{cf.fieldName}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cf.data} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
