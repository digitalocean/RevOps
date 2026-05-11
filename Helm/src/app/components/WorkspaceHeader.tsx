import { Plus, User, Search, LogOut, Sparkles, Menu, MoreHorizontal, Trash2, Copy } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Project } from '../data/useMeridianData';

const PROJECT_DOT_COLORS = ['#22c55e', '#7c3aed', '#2563eb', '#ea580c', '#dc2626', '#0891b2'];

function projectDot(project: Project, index: number): string {
  if (project.color && /^#[0-9A-Fa-f]{6}$/.test(project.color)) return project.color;
  return PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];
}

interface WorkspaceHeaderProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  onDeleteProject?: (projectId: string) => void | Promise<void>;
  onDuplicateProject?: (projectId: string, name?: string) => void | Promise<void>;
  onToggleActivity?: () => void;
  selectedProjectName?: string;
  sprintLabel?: string;
  currentUser?: { name?: string; email?: string; initials?: string } | null;
  onLogin?: () => void;
  onLogout?: () => void;
  /** @deprecated No longer shown; kept for API compatibility */
  connected?: boolean;
  /** When set, show error message on the left */
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
  onDuplicateProject,
  currentUser = null,
  onLogin,
  onLogout,
  connected: _connected = false,
  connectionError = null,
  onRetry,
  onOpenItem,
  onToggleMobileSidebar,
}: WorkspaceHeaderProps) {
  return (
    <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 min-h-[56px]">
        {/* Left: mobile hamburger + connection status + search */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[360px]">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {connectionError ? (
            <span className="text-xs text-amber-700 truncate flex items-center gap-2">
              {connectionError}
              {onRetry && (
                <button type="button" onClick={onRetry} className="underline hover:no-underline shrink-0">Retry</button>
              )}
            </span>
          ) : (
            <div className="hidden md:flex items-center w-full">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search tasks, projects, people…"
                  className="w-full h-9 pl-9 pr-12 text-sm rounded-lg bg-[var(--secondary)] border border-transparent text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-indigo-200 focus:ring-[3px] focus:ring-indigo-100 outline-none transition-all"
                  aria-label="Search"
                />
                <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 shadow-sm">
                  ⌘K
                </kbd>
              </div>
            </div>
          )}
        </div>

        {/* Center: project tabs with project color dot for active */}
        <div className="flex items-center gap-0.5 -mb-[1px] overflow-x-auto scrollbar-hide">
          {projects.map((proj, idx) => {
            const isActive = selectedProjectId === proj.id;
            const dot = projectDot(proj, idx);
            return (
              <button
                type="button"
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`group inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-[var(--secondary)] text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-transform ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`}
                  style={{ backgroundColor: dot }}
                />
                <span className="truncate max-w-[180px]">{proj.name}</span>
              </button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 ml-0.5 text-gray-500 hover:text-indigo-600"
            onClick={onOpenNewProject}
            title="New project"
            aria-label="New project"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {selectedProjectId && (onDeleteProject || onDuplicateProject) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 ml-0.5 text-gray-400 hover:text-gray-600" title="Project options">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {onDuplicateProject && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onSelect={() => {
                      const name = projects.find((p) => p.id === selectedProjectId)?.name ?? 'this project';
                      const suggested = `${name} (Copy)`;
                      const choice = window.prompt(`Duplicate "${name}" — new project name:`, suggested);
                      if (choice != null && choice.trim()) {
                        onDuplicateProject(selectedProjectId, choice.trim());
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" /> Duplicate project
                  </DropdownMenuItem>
                )}
                {onDeleteProject && (
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
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: AI, date, user */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="Ask AI"
            aria-label="Ask AI"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <span className="hidden md:inline-flex items-center text-xs text-gray-600 px-2.5 py-1.5 bg-[var(--secondary)] rounded-lg font-medium">
            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-white shadow-[0_2px_4px_rgba(79,70,229,0.25)] flex items-center justify-center text-white text-[12px] font-semibold tracking-wide"
                title={currentUser.name || currentUser.email}
              >
                {currentUser.initials || currentUser.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-gray-700 hidden lg:inline max-w-[140px] truncate font-medium">
                {currentUser.name || currentUser.email}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onLogout} title="Log out" aria-label="Log out">
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
