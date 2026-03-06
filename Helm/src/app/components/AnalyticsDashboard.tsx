import { TrendingUp, TrendingDown, Activity, Target, Zap, Users } from 'lucide-react';
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
  ResponsiveContainer 
} from 'recharts';
import { mockInitiatives } from '../data/mockData';

const statusDistribution = [
  { name: 'On Track', value: mockInitiatives.filter(i => i.status === 'On Track').length, color: '#10b981' },
  { name: 'At Risk', value: mockInitiatives.filter(i => i.status === 'At Risk').length, color: '#f59e0b' },
  { name: 'Blocked', value: mockInitiatives.filter(i => i.status === 'Blocked').length, color: '#ef4444' },
  { name: 'Complete', value: mockInitiatives.filter(i => i.status === 'Complete').length, color: '#3b82f6' },
  { name: 'Not Started', value: mockInitiatives.filter(i => i.status === 'Not Started').length, color: '#9ca3af' },
];

const categoryPerformance = [
  { category: 'Engineering', initiatives: 2, avgProgress: 65, velocity: 8.2 },
  { category: 'Operations', initiatives: 3, avgProgress: 43, velocity: 6.1 },
  { category: 'Product', initiatives: 2, avgProgress: 62, velocity: 7.5 },
  { category: 'Sales', initiatives: 2, avgProgress: 43, velocity: 5.8 },
  { category: 'Design', initiatives: 1, avgProgress: 72, velocity: 9.1 },
];

const velocityTrend = [
  { week: 'Week 1', velocity: 5.2, target: 7 },
  { week: 'Week 2', velocity: 6.1, target: 7 },
  { week: 'Week 3', velocity: 7.5, target: 7 },
  { week: 'Week 4', velocity: 8.3, target: 7 },
  { week: 'Week 5', velocity: 7.8, target: 7 },
  { week: 'Week 6', velocity: 8.9, target: 7 },
];

const riskMetrics = [
  { name: 'Low Risk', value: 5, color: '#10b981' },
  { name: 'Medium Risk', value: 3, color: '#f59e0b' },
  { name: 'High Risk', value: 2, color: '#ef4444' },
];

export function AnalyticsDashboard() {
  const totalInitiatives = mockInitiatives.length;
  const completionRate = Math.round((mockInitiatives.filter(i => i.status === 'Complete').length / totalInitiatives) * 100);
  const avgProgress = Math.round(mockInitiatives.reduce((acc, i) => acc + i.progress, 0) / totalInitiatives);
  const onTimeDelivery = 87; // Mock data
  const teamUtilization = 76; // Mock data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Analytics & Insights</h2>
        <p className="text-sm text-gray-600">
          Real-time performance metrics and trends across all initiatives
        </p>
      </div>

      {/* Key Metrics Grid */}
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
              <span>+8% this month</span>
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            <CardDescription>Current state of all initiatives</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Velocity Trend */}
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
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Performance</CardTitle>
            <CardDescription>Average progress by category</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk Analysis</CardTitle>
            <CardDescription>Initiative risk distribution</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
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
                        className={cat.velocity >= 7 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                      >
                        {cat.velocity >= 7 ? 'On Track' : 'Needs Attention'}
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
