import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import type { Initiative } from '../data/mockData';

interface CrewMember {
  id: string;
  name: string;
  initials: string;
  role: string;
}

interface TeamCapacityViewProps {
  crew: CrewMember[];
  initiatives: Initiative[];
}

export function TeamCapacityView({ crew, initiatives }: TeamCapacityViewProps) {
  const memberStats = crew.map((member) => {
    const activeInitiatives = initiatives.filter((i) => i.assignee_id === member.id).length;
    const capacity = Math.max(activeInitiatives, 3);
    const utilizationPercent = capacity ? Math.min(100, Math.round((activeInitiatives / capacity) * 100)) : 0;
    const trend: 'up' | 'down' | 'stable' =
      utilizationPercent >= 90 ? 'up' : utilizationPercent <= 30 ? 'down' : 'stable';
    return {
      ...member,
      activeInitiatives,
      capacity,
      utilizationPercent,
      trend,
    };
  });

  const atCapacity = memberStats.filter((m) => m.utilizationPercent >= 90);
  const insight =
    atCapacity.length > 0
      ? `${atCapacity.map((m) => m.name).join(', ')} ${atCapacity.length === 1 ? 'is' : 'are'} at full capacity. Consider redistributing work or adjusting timelines.`
      : 'Work is distributed across the team.';

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

      {memberStats.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No team members yet. Add crew in the sidebar under Crew to see capacity here.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {memberStats.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {member.initials || member.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role || 'Member'}</p>
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
                <p className="text-xs text-blue-700 mt-1">{insight}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
