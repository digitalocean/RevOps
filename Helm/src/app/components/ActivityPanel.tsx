import { X, MessageSquare, Clock, CheckCircle2, AlertCircle, FileText, Upload, Users } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface ActivityPanelProps {
  onClose: () => void;
}

interface Activity {
  id: string;
  type: 'comment' | 'status_change' | 'file_upload' | 'assignment' | 'completion';
  user: string;
  userInitials: string;
  initiative: string;
  message: string;
  timestamp: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    fileName?: string;
  };
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'comment',
    user: 'Sarah Chen',
    userInitials: 'SC',
    initiative: 'Revenue Intelligence Platform Migration',
    message: 'API integration is on track. Testing phase starts next week.',
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    type: 'status_change',
    user: 'Marcus Rodriguez',
    userInitials: 'MR',
    initiative: 'Deal Desk Automation Workflow',
    message: 'changed status from On Track to At Risk',
    timestamp: '4 hours ago',
    metadata: {
      oldStatus: 'On Track',
      newStatus: 'At Risk'
    }
  },
  {
    id: '3',
    type: 'completion',
    user: 'Emily Watson',
    userInitials: 'EW',
    initiative: 'Sales Compensation Dashboard V2',
    message: 'marked this initiative as Complete',
    timestamp: '1 day ago'
  },
  {
    id: '4',
    type: 'file_upload',
    user: 'David Park',
    userInitials: 'DP',
    initiative: 'Territory Planning Tool',
    message: 'uploaded pilot_results_west_region.pdf',
    timestamp: '1 day ago',
    metadata: {
      fileName: 'pilot_results_west_region.pdf'
    }
  },
  {
    id: '5',
    type: 'assignment',
    user: 'Lisa Kumar',
    userInitials: 'LK',
    initiative: 'Forecasting Model Refinement',
    message: 'assigned this to themselves',
    timestamp: '2 days ago'
  },
  {
    id: '6',
    type: 'comment',
    user: 'Nina Patel',
    userInitials: 'NP',
    initiative: 'Customer Health Score Automation',
    message: 'Blocked by data pipeline issues. Need engineering team support ASAP.',
    timestamp: '2 days ago'
  },
  {
    id: '7',
    type: 'status_change',
    user: 'Alex Thompson',
    userInitials: 'AT',
    initiative: 'RevOps Design System',
    message: 'changed status from Not Started to On Track',
    timestamp: '3 days ago',
    metadata: {
      oldStatus: 'Not Started',
      newStatus: 'On Track'
    }
  },
  {
    id: '8',
    type: 'comment',
    user: 'Robert Kim',
    userInitials: 'RK',
    initiative: 'Quote Approval Streamlining',
    message: 'Need to align with stakeholders before moving forward.',
    timestamp: '3 days ago'
  }
];

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-blue-600" />;
    case 'status_change':
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    case 'file_upload':
      return <Upload className="w-4 h-4 text-purple-600" />;
    case 'assignment':
      return <Users className="w-4 h-4 text-green-600" />;
    case 'completion':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  }
}

export function ActivityPanel({ onClose }: ActivityPanelProps) {
  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Activity Feed</h3>
          <p className="text-xs text-gray-500 mt-0.5">Recent updates and changes</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {mockActivities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                    {activity.userInitials}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-900">{activity.user}</span>
                        {' '}
                        <span className="text-gray-600">{activity.message}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.initiative}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {index < mockActivities.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200">
        <Button variant="outline" size="sm" className="w-full">
          View All Activity
        </Button>
      </div>
    </div>
  );
}
