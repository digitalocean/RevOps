import { useState } from 'react';
import { toast } from 'sonner';
import { Anchor, LayoutDashboard, List, Map, FileText, BarChart3, Tent, Plus, Users, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import type { Workspace, Project } from '../data/useMeridianData';
import type { Initiative } from '../data/mockData';
import type { TrackerSection as TrackerSectionType } from '../data/mockData';

export type NavView = 'summit_board' | 'manifest' | 'expedition_map' | 'field_notes' | 'observatory' | 'base_camp';

const VIEW_ORDER: NavView[] = ['manifest', 'expedition_map', 'field_notes', 'observatory', 'base_camp', 'summit_board'];
const VIEW_LABELS: Record<NavView, string> = {
  summit_board: 'Board',
  manifest: 'Trackers',
  expedition_map: 'Gantt',
  field_notes: 'Field Notes',
  observatory: 'Analytics',
  base_camp: 'Base Camp',
};
const VIEW_ICONS: Record<NavView, React.ReactNode> = {
  summit_board: <LayoutDashboard className="w-4 h-4" />,
  manifest: <List className="w-4 h-4" />,
  expedition_map: <Map className="w-4 h-4" />,
  field_notes: <FileText className="w-4 h-4" />,
  observatory: <BarChart3 className="w-4 h-4" />,
  base_camp: <Tent className="w-4 h-4" />,
};

const TASKS_PREVIEW_COUNT = 5;

interface NavigationSidebarProps {
  workspaces?: Workspace[];
  selectedWorkspaceId?: string | null;
  onSelectWorkspace?: (id: string) => void;
  onCreateWorkspace?: (name: string) => Promise<unknown>;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  trackerSections?: TrackerSectionType[];
  initiatives?: Initiative[];
  crew: { id: string; name: string; initials?: string }[];
  onOpenAddCrew: () => void;
  onOpenCustomFields: () => void;
  currentView: NavView;
  onNavigateView: (view: NavView) => void;
  fieldNotesCount?: number;
}

export function NavigationSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  trackerSections = [],
  initiatives = [],
  crew,
  onOpenAddCrew,
  onOpenCustomFields,
  currentView,
  onNavigateView,
  fieldNotesCount = 0,
  onCreateWorkspace,
}: NavigationSidebarProps) {
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map((p) => p.id)));
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name || !onCreateWorkspace) return;
    setCreating(true);
    try {
      await onCreateWorkspace(name);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
      toast.success('Workspace created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleTasks = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tasksByProject: Record<string, Initiative[]> = {};
  if (selectedProjectId && initiatives.length) tasksByProject[selectedProjectId] = initiatives;

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-lg">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">To-DO</h1>
            <p className="text-xs text-gray-500">Get things done</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Projects on top with tree */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</span>
            <button
              type="button"
              onClick={onOpenNewProject}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + New project
            </button>
          </div>
          <div className="space-y-0">
            {projects.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-1">No projects yet.</p>
            )}
            {projects.map((p) => {
              const isProjectExpanded = expandedProjects.has(p.id);
              const isTasksExpanded = expandedTasks.has(p.id);
              const projectTasks = tasksByProject[p.id] || [];
              const topTasks = projectTasks.slice(0, TASKS_PREVIEW_COUNT);
              const hasMoreTasks = projectTasks.length > TASKS_PREVIEW_COUNT;
              return (
                <div key={p.id} className="rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      {isProjectExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium truncate ${
                        selectedProjectId === p.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0 text-gray-500" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  </div>
                  {isProjectExpanded && (
                    <div className="ml-4 pl-2 border-l border-gray-200 space-y-0">
                      <button
                        type="button"
                        onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm ${
                          selectedProjectId === p.id && currentView === 'manifest' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <List className="w-4 h-4 flex-shrink-0" />
                        <span>Tracker</span>
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleTasks(p.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-gray-600 hover:bg-gray-50"
                        >
                          {isTasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>Tasks</span>
                          {projectTasks.length > 0 && (
                            <span className="text-xs text-gray-400">({projectTasks.length})</span>
                          )}
                        </button>
                        {isTasksExpanded && (
                          <div className="ml-4 pl-2 border-l border-gray-100 space-y-0.5 py-1">
                            {topTasks.length === 0 && (
                              <p className="text-xs text-gray-400 px-2">No tasks yet</p>
                            )}
                            {topTasks.map((t) => (
                              <div key={t.id} className="px-2 py-1 text-xs text-gray-600 truncate" title={t.name}>
                                {t.name}
                              </div>
                            ))}
                            {hasMoreTasks && (
                              <button
                                type="button"
                                onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                More ({projectTasks.length - TASKS_PREVIEW_COUNT} more)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* View links (no Navigate header): Trackers, Gantt, Field Notes, Analytics, Base Camp, Board last */}
        <div className="mb-4">
          <div className="space-y-1">
            {VIEW_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onNavigateView(id);
                  if (id === 'base_camp') onOpenCustomFields();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm font-medium ${
                  currentView === id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`flex-shrink-0 w-4 ${currentView === id ? 'text-blue-600' : 'text-gray-500'}`}>
                  {VIEW_ICONS[id]}
                </div>
                <span className="flex-1 truncate">{VIEW_LABELS[id]}</span>
                {id === 'field_notes' && fieldNotesCount > 0 && (
                  <span className="text-xs text-gray-500 tabular-nums">{fieldNotesCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Crew members + add */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crew members</span>
            <button
              type="button"
              onClick={onOpenAddCrew}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-sm font-medium"
              title="Add crew"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {crew.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-1">No crew yet. Click + to add.</p>
            )}
            {crew.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {c.initials || c.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        {onCreateWorkspace && (
          <button
            type="button"
            onClick={() => setShowNewWorkspace(true)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            + New workspace
          </button>
        )}
      </div>

      <Dialog open={showNewWorkspace} onOpenChange={setShowNewWorkspace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewWorkspace(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
