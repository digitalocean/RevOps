import { Activity, Target, Zap, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { KpiData } from './KPIStatsBar';
import type { Initiative, Status, Category } from '../data/mockData';

const CATEGORIES: Category[] = ['Engineering', 'Operations', 'Product', 'Sales', 'Design'];

function buildStatusDistribution(initiatives: Initiative[]) {
  const statusCounts: Record<string, number> = {
    'On Track': 0,
    'At Risk': 0,
    'Blocked': 0,
    'Complete': 0,
    'Not Started': 0,
    'In Review': 0,
  };
  initiatives.forEach((i) => {
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
  });
  return [
    { name: 'On Track', value: statusCounts['On Track'] ?? 0, color: '#10b981' },
    { name: 'At Risk', value: statusCounts['At Risk'] ?? 0, color: '#f59e0b' },
    { name: 'Blocked', value: statusCounts['Blocked'] ?? 0, color: '#ef4444' },
    { name: 'Complete', value: statusCounts['Complete'] ?? 0, color: '#3b82f6' },
    { name: 'Not Started', value: statusCounts['Not Started'] ?? 0, color: '#9ca3af' },
    { name: 'In Review', value: statusCounts['In Review'] ?? 0, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);
}

function buildCategoryPerformance(initiatives: Initiative[]) {
  return CATEGORIES.map((cat) => {
    const items = initiatives.filter((i) => i.category === cat);
    const count = items.length;
    const avgProgress = count ? Math.round(items.reduce((a, i) => a + i.progress, 0) / count) : 0;
    const velocity = count ? (avgProgress / 10) + 5 + (count % 3) * 0.5 : 0;
    return {
      category: cat,
      initiatives: count,
      avgProgress,
      velocity: velocity.toFixed(1),
    };
  });
}

function buildRiskDistribution(initiatives: Initiative[]) {
  const low = initiatives.filter((i) => i.riskLevel === 'low' || !i.riskLevel).length;
  const medium = initiatives.filter((i) => i.riskLevel === 'medium').length;
  const high = initiatives.filter((i) => i.riskLevel === 'high').length;
  return [
    { name: 'Low Risk', value: low || 1, color: '#10b981' },
    { name: 'Medium Risk', value: medium || 0, color: '#f59e0b' },
    { name: 'High Risk', value: high || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);
}

const velocityTrend = [
  { week: 'Week 1', velocity: 5.2, target: 7 },
  { week: 'Week 2', velocity: 6.1, target: 7 },
  { week: 'Week 3', velocity: 7.5, target: 7 },
  { week: 'Week 4', velocity: 8.3, target: 7 },
  { week: 'Week 5', velocity: 7.8, target: 7 },
  { week: 'Week 6', velocity: 8.9, target: 7 },
];

interface ObservatoryViewProps {
  kpiData: KpiData;
  initiatives: Initiative[];
  totalPoints?: number;
  sprintLabel?: string;
}

export function ObservatoryView({
  kpiData,
  initiatives,
  totalPoints = 0,
  sprintLabel = 'Sprint',
}: ObservatoryViewProps) {
  const total = initiatives.length;
  const completionRate = total ? Math.round(((kpiData.solvedYTD ?? 0) / total) * 100) : 0;
  const avgProgress = kpiData.overallProgress ?? 0;
  const onTimeDelivery = 87;
  const teamUtilization = 76;

  const statusDistribution = buildStatusDistribution(initiatives);
  const categoryPerformance = buildCategoryPerformance(initiatives);
  const riskMetrics = buildRiskDistribution(initiatives);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Analytics & Insights</h2>
        <p className="text-sm text-gray-600">
          Real-time performance metrics and trends across all initiatives
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">COMPLETION RATE</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{completionRate}%</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>+12% from last quarter</span>
            </div>
            <Progress value={completionRate} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">AVG PROGRESS</span>
              <Target className="w-4 h-4 text-purple-500" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{avgProgress}%</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>+15% this month</span>
            </div>
            <Progress value={avgProgress} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">ON-TIME DELIVERY</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{onTimeDelivery}%</div>
            <div className="flex items-center gap-1 text-xs text-red-600">
              <TrendingDown className="w-3 h-3" />
              <span>-3% from target</span>
            </div>
            <Progress value={onTimeDelivery} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">TEAM UTILIZATION</span>
              <Users className="w-4 h-4 text-green-500" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900 mb-1">{teamUtilization}%</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>Optimal range</span>
            </div>
            <Progress value={teamUtilization} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            <CardDescription>Current state of all initiatives</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Velocity Trend</CardTitle>
            <CardDescription>Team velocity over the last 6 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={velocityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Actual Velocity"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#9ca3af', r: 4 }}
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Performance</CardTitle>
            <CardDescription>Average progress by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgProgress" fill="#8b5cf6" name="Avg Progress %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk Analysis</CardTitle>
            <CardDescription>Initiative risk distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {riskMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={riskMetrics}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Team Performance Breakdown</CardTitle>
          <CardDescription>Detailed metrics by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Initiatives</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Avg Progress</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Velocity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {categoryPerformance.map((cat) => (
                  <tr key={cat.category} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-sm text-gray-900">{cat.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">{cat.initiatives}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={cat.avgProgress} className="h-1.5 w-20" />
                        <span className="text-sm text-gray-700">{cat.avgProgress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-700">{cat.velocity} pts/week</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          Number(cat.velocity) >= 7
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }
                      >
                        {Number(cat.velocity) >= 7 ? 'On Track' : 'Needs Attention'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
