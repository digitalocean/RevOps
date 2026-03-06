import { Plus, User, Search, Activity, LogOut } from 'lucide-react';
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
  currentUser?: { name?: string; email?: string; initials?: string } | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function WorkspaceHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  onToggleActivity,
  currentUser = null,
  onLogin,
  onLogout,
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
            className="h-9 w-9 p-0"
            onClick={onToggleActivity}
          >
            <Activity className="w-4 h-4" />
          </Button>

          <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Badge>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {currentUser.initials || currentUser.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 hidden sm:inline">{currentUser.name || currentUser.email}</span>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onLogout} title="Log out">
                <LogOut className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onLogin} className="gap-1.5">
              <User className="w-4 h-4" />
              Log in
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
