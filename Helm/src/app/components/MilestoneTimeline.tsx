import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Milestone {
  id: string;
  title: string;
  date: Date;
  status: 'completed' | 'in-progress' | 'upcoming';
  initiative: string;
  category: string;
}

const mockMilestones: Milestone[] = [
  {
    id: '1',
    title: 'Q1 Planning Complete',
    date: new Date('2026-01-31'),
    status: 'completed',
    initiative: 'Revenue Intelligence Platform Migration',
    category: 'Planning'
  },
  {
    id: '2',
    title: 'Sales Dashboard V2 Launch',
    date: new Date('2026-02-28'),
    status: 'completed',
    initiative: 'Sales Compensation Dashboard V2',
    category: 'Launch'
  },
  {
    id: '3',
    title: 'API Integration Testing',
    date: new Date('2026-03-15'),
    status: 'in-progress',
    initiative: 'Revenue Intelligence Platform Migration',
    category: 'Development'
  },
  {
    id: '4',
    title: 'Design System Beta',
    date: new Date('2026-03-25'),
    status: 'upcoming',
    initiative: 'RevOps Design System',
    category: 'Release'
  },
  {
    id: '5',
    title: 'Forecasting Model V2 Release',
    date: new Date('2026-04-15'),
    status: 'upcoming',
    initiative: 'Forecasting Model Refinement',
    category: 'Launch'
  },
  {
    id: '6',
    title: 'Platform Migration Complete',
    date: new Date('2026-04-30'),
    status: 'upcoming',
    initiative: 'Revenue Intelligence Platform Migration',
    category: 'Completion'
  }
];

function getMilestoneIcon(status: Milestone['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'in-progress':
      return <Clock className="w-5 h-5 text-blue-600" />;
    case 'upcoming':
      return <Circle className="w-5 h-5 text-gray-400" />;
  }
}

function getMilestoneColor(status: Milestone['status']) {
  switch (status) {
    case 'completed':
      return 'border-green-200 bg-green-50';
    case 'in-progress':
      return 'border-blue-200 bg-blue-50';
    case 'upcoming':
      return 'border-gray-200 bg-gray-50';
  }
}

function getStatusBadge(status: Milestone['status']) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500 text-white text-xs">Completed</Badge>;
    case 'in-progress':
      return <Badge className="bg-blue-500 text-white text-xs">In Progress</Badge>;
    case 'upcoming':
      return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
  }
}

export function MilestoneTimeline() {
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

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {mockMilestones.map((milestone, index) => (
            <div key={milestone.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                milestone.status === 'completed' 
                  ? 'bg-green-100 ring-4 ring-green-50' 
                  : milestone.status === 'in-progress'
                  ? 'bg-blue-100 ring-4 ring-blue-50'
                  : 'bg-gray-100 ring-4 ring-gray-50'
              }`}>
                {getMilestoneIcon(milestone.status)}
              </div>

              {/* Milestone card */}
              <div className={`flex-1 rounded-lg border p-4 ${getMilestoneColor(milestone.status)} transition-all hover:shadow-md`}>
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
                    <span>{milestone.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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

      <div className="mt-6 flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-purple-600" />
          <div>
            <h4 className="text-sm font-semibold text-purple-900">Next Milestone</h4>
            <p className="text-xs text-purple-700 mt-0.5">API Integration Testing - Due in 9 days</p>
          </div>
        </div>
        <Badge className="bg-purple-600 text-white">Mar 15</Badge>
      </div>
    </Card>
  );
}
