import { useState, useEffect } from 'react';
import { X, MessageSquare, Clock, CheckCircle2, AlertCircle, Upload, Users } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { get } from '../api/meridian';

interface ActivityPanelProps {
  onClose: () => void;
  projectId: string | null;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: { title?: string };
  created_at: string;
  crew_name?: string | null;
  crew_initials?: string | null;
}

function getActivityIcon(action: string) {
  switch (action) {
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-blue-600" />;
    case 'status_change':
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    case 'item_updated':
      return <AlertCircle className="w-4 h-4 text-orange-600" />;
    case 'item_created':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'file_upload':
      return <Upload className="w-4 h-4 text-purple-600" />;
    case 'assignment':
      return <Users className="w-4 h-4 text-green-600" />;
    case 'completion':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString();
}

function getMessage(row: ActivityItem): string {
  const title = row.details?.title || 'Item';
  switch (row.action) {
    case 'item_created':
      return `created "${title}"`;
    case 'item_updated':
      return `updated "${title}"`;
    default:
      return row.details?.title ? `"${title}"` : 'activity';
  }
}

export function ActivityPanel({ onClose, projectId }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    get(`/api/activity?project_id=${projectId}&limit=50`)
      .then((data: unknown) => setActivities(Array.isArray(data) ? data as ActivityItem[] : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [projectId]);

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
          {!projectId && (
            <p className="text-sm text-gray-500">Select a project to see activity.</p>
          )}
          {projectId && loading && (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
          {projectId && error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {projectId && !loading && !error && activities.length === 0 && (
            <p className="text-sm text-gray-500">No activity yet for this project.</p>
          )}
          {projectId && !loading && activities.length > 0 && activities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                    {activity.crew_initials || activity.crew_name?.slice(0, 2).toUpperCase() || '—'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-900">{activity.crew_name || 'Someone'}</span>
                        {' '}
                        <span className="text-gray-600">{getMessage(activity)}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{formatTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {index < activities.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {projectId && activities.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <Button variant="outline" size="sm" className="w-full" disabled>
            View All Activity
          </Button>
        </div>
      )}
    </div>
  );
}
