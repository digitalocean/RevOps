import { Plus, User, Search, LogOut, Sparkles, Menu, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Project } from '../data/useMeridianData';

interface WorkspaceHeaderProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onDeleteProject?: (projectId: string) => void | Promise<void>;
  onToggleActivity?: () => void;
  selectedProjectName?: string;
  sprintLabel?: string;
  progressPercent?: number;
  currentUser?: { name?: string; email?: string; initials?: string } | null;
  onLogin?: () => void;
  onLogout?: () => void;
  /** When true, show "Connected to To-DO" on the left */
  connected?: boolean;
  /** When set, show error message on the left instead of connected */
  connectionError?: string | null;
  onRetry?: () => void;
  onOpenItem?: (itemId: string) => void;
  onToggleMobileSidebar?: () => void;
}

export function WorkspaceHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  onDeleteProject,
  currentUser = null,
  onLogin,
  onLogout,
  connected = false,
  connectionError = null,
  onRetry,
  onOpenItem,
  onToggleMobileSidebar,
}: WorkspaceHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between gap-4 px-4 py-3 min-h-[56px]">
        {/* Left: mobile hamburger + app name + connection status */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <span className="text-sm font-bold text-gray-900 shrink-0">To-DO</span>
          {connectionError ? (
            <span className="text-xs text-amber-700 truncate flex items-center gap-2">
              To-DO API: {connectionError}
              {onRetry && (
                <button type="button" onClick={onRetry} className="underline hover:no-underline shrink-0">Retry</button>
              )}
            </span>
          ) : connected ? (
            <span className="text-xs text-gray-500 truncate">Connected to To-DO — showing tasks from your workspace.</span>
          ) : null}
        </div>

        {/* Center: project tabs with blue underline for active */}
        <div className="flex items-center gap-1 border-b border-gray-200 -mb-[1px]">
          {projects.map((proj) => {
            const isActive = selectedProjectId === proj.id;
            return (
              <button
                type="button"
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {proj.name}
              </button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 ml-1 text-gray-500 hover:text-gray-700"
            onClick={onOpenNewProject}
            title="New project"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {selectedProjectId && onDeleteProject && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 ml-0.5 text-gray-400 hover:text-gray-600" title="Project options">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-700 gap-2 cursor-pointer"
                  onSelect={() => {
                    const name = projects.find((p) => p.id === selectedProjectId)?.name ?? 'this project';
                    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
                      onDeleteProject(selectedProjectId);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: search, AI, date, user */}
        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-500">
            <Search className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-500" title="AI">
            <Sparkles className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-600 px-2 py-1 border border-gray-200 rounded-md">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                {currentUser.initials || currentUser.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 hidden sm:inline max-w-[120px] truncate">
                {currentUser.name || currentUser.email}
              </span>
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
