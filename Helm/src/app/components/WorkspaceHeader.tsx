import { Plus, User, Bell, Search, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { Project } from '../data/useMeridianData';

interface WorkspaceHeaderProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onToggleActivity?: () => void;
  selectedProjectName?: string;
  sprintLabel?: string;
  progressPercent?: number;
}

export function WorkspaceHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  onToggleActivity,
  selectedProjectName,
  sprintLabel,
  progressPercent = 0,
}: WorkspaceHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          {projects.map((proj) => (
            <button
              type="button"
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedProjectId === proj.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {proj.name}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onOpenNewProject}
            title="New project"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Search className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 relative"
            onClick={onToggleActivity}
          >
            <Activity className="w-4 h-4" />
          </Button>

          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Badge>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cursor-pointer">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

    </div>
  );
}
