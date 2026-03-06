import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  activeInitiatives: number;
  capacity: number;
  utilizationPercent: number;
  trend: 'up' | 'down' | 'stable';
}

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Engineering Lead',
    initials: 'SC',
    activeInitiatives: 2,
    capacity: 3,
    utilizationPercent: 67,
    trend: 'stable'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    role: 'Operations Manager',
    initials: 'MR',
    activeInitiatives: 3,
    capacity: 3,
    utilizationPercent: 100,
    trend: 'up'
  },
  {
    id: '3',
    name: 'Emily Watson',
    role: 'Product Manager',
    initials: 'EW',
    activeInitiatives: 1,
    capacity: 4,
    utilizationPercent: 25,
    trend: 'down'
  },
  {
    id: '4',
    name: 'David Park',
    role: 'Sales Director',
    initials: 'DP',
    activeInitiatives: 2,
    capacity: 3,
    utilizationPercent: 67,
    trend: 'stable'
  },
  {
    id: '5',
    name: 'Lisa Kumar',
    role: 'Operations Lead',
    initials: 'LK',
    activeInitiatives: 2,
    capacity: 3,
    utilizationPercent: 67,
    trend: 'stable'
  }
];

export function TeamCapacityView() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Team Capacity
          </h3>
          <p className="text-sm text-gray-500 mt-1">Current workload distribution across team members</p>
        </div>
      </div>

      <div className="space-y-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {member.initials}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      member.utilizationPercent >= 90 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : member.utilizationPercent >= 70 
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}
                  >
                    {member.utilizationPercent}% utilized
                  </Badge>
                  {member.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                  {member.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress 
                    value={member.utilizationPercent} 
                    className={`h-2 ${
                      member.utilizationPercent >= 90 
                        ? '[&>div]:bg-red-500' 
                        : member.utilizationPercent >= 70 
                        ? '[&>div]:bg-yellow-500' 
                        : '[&>div]:bg-green-500'
                    }`} 
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                  {member.activeInitiatives}/{member.capacity} initiatives
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Team Insights</h4>
            <p className="text-xs text-blue-700 mt-1">
              Marcus Rodriguez is at full capacity. Consider redistributing work or adjusting timelines for optimal team performance.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
