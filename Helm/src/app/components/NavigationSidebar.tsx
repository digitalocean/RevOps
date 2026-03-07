import { useState } from 'react';
import { toast } from 'sonner';
import { Anchor, LayoutDashboard, List, Map, FileText, BarChart3, Tent, Plus, ChevronRight, ChevronDown, FolderOpen, GripVertical, Calendar, Triangle, Settings } from 'lucide-react';
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
  manifest: <GripVertical className="w-4 h-4" />,
  expedition_map: <BarChart3 className="w-4 h-4" />,
  field_notes: <FileText className="w-4 h-4" />,
  observatory: <BarChart3 className="w-4 h-4" />,
  base_camp: <Triangle className="w-4 h-4" />,
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
  workspaces = [],
  selectedWorkspaceId,
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

  const selectedWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId);
  const workspaceName = selectedWorkspace?.name ?? 'To-DO';

  return (
    <div className="w-[220px] flex-shrink-0 bg-[#111318] border-r border-white/10 h-screen flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-bold text-white">{workspaceName}</h2>
        <p className="text-[11px] text-[#C9CAD1] mt-0.5">RevOps Project Management</p>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {/* PROJECTS section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Projects</span>
            <button
              type="button"
              onClick={onOpenNewProject}
              className="text-[10px] font-medium text-[#C9CAD1] hover:text-white"
            >
              + New
            </button>
          </div>
          <div className="space-y-0">
            {projects.length === 0 && (
              <p className="text-[11px] text-[#6B7280] px-2 py-1">No projects yet.</p>
            )}
            {projects.map((p) => {
              const isProjectExpanded = expandedProjects.has(p.id);
              const isTasksExpanded = expandedTasks.has(p.id);
              const projectTasks = tasksByProject[p.id] || [];
              const topTasks = projectTasks.slice(0, TASKS_PREVIEW_COUNT);
              const hasMoreTasks = projectTasks.length > TASKS_PREVIEW_COUNT;
              const isActive = selectedProjectId === p.id;
              return (
                <div key={p.id} className="rounded-md overflow-hidden">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className="p-1 text-[#6B7280] hover:text-[#C9CAD1]"
                    >
                      {isProjectExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium truncate ${
                        isActive ? 'bg-white/10 text-white' : 'text-[#C9CAD1] hover:bg-white/5'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[var(--accent)]" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  </div>
                  {isProjectExpanded && (
                    <div className="ml-4 pl-2 border-l border-white/10 space-y-0">
                      <button
                        type="button"
                        onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm ${
                          selectedProjectId === p.id && currentView === 'manifest' ? 'bg-white/10 text-white' : 'text-[#C9CAD1] hover:bg-white/5'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 flex-shrink-0" />
                        <span>Tracker</span>
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleTasks(p.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-[#C9CAD1] hover:bg-white/5"
                        >
                          {isTasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>Tasks</span>
                          {projectTasks.length > 0 && (
                            <span className="text-[11px] text-[#6B7280]">({projectTasks.length})</span>
                          )}
                        </button>
                        {isTasksExpanded && (
                          <div className="ml-4 pl-2 border-l border-white/10 space-y-0.5 py-1">
                            {topTasks.length === 0 && (
                              <p className="text-[11px] text-[#6B7280] px-2">No tasks yet</p>
                            )}
                            {topTasks.map((t) => (
                              <div key={t.id} className="px-2 py-1 text-xs text-[#C9CAD1] truncate" title={t.name}>
                                {t.name}
                              </div>
                            ))}
                            {hasMoreTasks && (
                              <button
                                type="button"
                                onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                                className="px-2 py-1 text-xs text-[var(--accent)] hover:text-white font-medium"
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

        {/* Trackers, Gantt, Field Notes, Analytics, Base Camp, Board */}
        <div className="mb-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-2 block mb-2">Views</span>
          <div className="space-y-0.5">
            {VIEW_ORDER.map((id) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigateView(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left text-sm font-medium ${
                    isActive ? 'bg-white/10 text-white' : 'text-[#6B7280] hover:bg-white/5 hover:text-[#C9CAD1]'
                  }`}
                >
                  <span className="flex-shrink-0 w-4 [&>svg]:w-4 [&>svg]:h-4">{VIEW_ICONS[id]}</span>
                  <span className="flex-1 truncate">{VIEW_LABELS[id]}</span>
                  {id === 'field_notes' && fieldNotesCount > 0 && (
                    <span className="text-[11px] text-[#6B7280] tabular-nums">{fieldNotesCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CREW MEMBERS */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Crew members</span>
            <button
              type="button"
              onClick={onOpenAddCrew}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-[#C9CAD1] hover:text-white text-sm font-medium"
              title="Add crew"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {crew.length === 0 && (
              <p className="text-[11px] text-[#6B7280] px-2 py-1">No crew. Click + to add.</p>
            )}
            {crew.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-[#C9CAD1]"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--accent)]/80 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {c.initials || c.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-white/10 flex items-center justify-between">
        {onCreateWorkspace && (
          <button
            type="button"
            onClick={() => setShowNewWorkspace(true)}
            className="text-[11px] text-[#6B7280] hover:text-[#C9CAD1]"
          >
            + New workspace
          </button>
        )}
        <button type="button" className="p-1.5 rounded-md text-[#6B7280] hover:bg-white/5 hover:text-[#C9CAD1]" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
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
