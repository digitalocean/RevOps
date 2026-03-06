import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Initiative } from '../data/mockData';

interface Sprint {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
}

interface MilestoneTimelineProps {
  initiatives: Initiative[];
  sprints: Sprint[];
}

type MilestoneStatus = 'completed' | 'in-progress' | 'upcoming';

function getMilestoneIcon(status: MilestoneStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'in-progress':
      return <Clock className="w-5 h-5 text-blue-600" />;
    case 'upcoming':
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
}

function getMilestoneColor(status: MilestoneStatus) {
  switch (status) {
    case 'completed':
      return 'border-green-200 bg-green-50';
    case 'in-progress':
      return 'border-blue-200 bg-blue-50';
    case 'upcoming':
      return 'border-gray-200 bg-gray-50';
  }
}

function getStatusBadge(status: MilestoneStatus) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500 text-white text-xs">Completed</Badge>;
    case 'in-progress':
      return <Badge className="bg-blue-500 text-white text-xs">In Progress</Badge>;
    case 'upcoming':
      return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
  }
}

export function MilestoneTimeline({ initiatives, sprints }: MilestoneTimelineProps) {
  const now = Date.now();

  const itemMilestones = initiatives
    .filter((i) => i.endDate && !isNaN(i.endDate.getTime()))
    .map((i) => ({
      id: `item-${i.id}`,
      title: i.name,
      date: i.endDate,
      status: ((): MilestoneStatus => {
        if (i.status === 'Complete') return 'completed';
        if (i.status === 'Not Started') return 'upcoming';
        return 'in-progress';
      })(),
      initiative: i.name,
      category: i.category,
    }));

  const sprintMilestones = sprints
    .filter((s) => s.end_date)
    .map((s) => ({
      id: `sprint-${s.id}`,
      title: s.name,
      date: new Date(s.end_date!),
      status: ((): MilestoneStatus => {
        const end = new Date(s.end_date!).getTime();
        if (end < now) return 'completed';
        const start = s.start_date ? new Date(s.start_date).getTime() : 0;
        if (start <= now && end >= now) return 'in-progress';
        return 'upcoming';
      })(),
      initiative: s.name,
      category: 'Sprint',
    }));

  const allMilestones = [...itemMilestones, ...sprintMilestones].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const nextMilestone = allMilestones.find((m) => m.status === 'in-progress' || m.status === 'upcoming');
  const nextLabel = nextMilestone
    ? `${nextMilestone.title} - ${nextMilestone.status === 'in-progress' ? 'Due' : 'Due'} ${nextMilestone.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'No upcoming milestones';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Milestone Timeline
          </h3>
          <p className="text-sm text-gray-500 mt-1">Key deliverables and checkpoints</p>
        </div>
      </div>

      {allMilestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No milestones yet. Add work items with due dates or sprints with end dates to see them here.
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {allMilestones.map((milestone) => (
                <div key={milestone.id} className="relative flex gap-4">
                  <div
                    className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      milestone.status === 'completed'
                        ? 'bg-green-100 ring-4 ring-green-50'
                        : milestone.status === 'in-progress'
                          ? 'bg-blue-100 ring-4 ring-blue-50'
                          : 'bg-gray-100 ring-4 ring-gray-50'
                    }`}
                  >
                    {getMilestoneIcon(milestone.status)}
                  </div>

                  <div
                    className={`flex-1 rounded-lg border p-4 ${getMilestoneColor(milestone.status)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{milestone.initiative}</p>
                      </div>
                      {getStatusBadge(milestone.status)}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {milestone.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {milestone.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {nextMilestone && (
            <div className="mt-6 flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="text-sm font-semibold text-purple-900">Next Milestone</h4>
                  <p className="text-xs text-purple-700 mt-0.5">{nextLabel}</p>
                </div>
              </div>
              <Badge className="bg-purple-600 text-white">
                {nextMilestone.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Badge>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
