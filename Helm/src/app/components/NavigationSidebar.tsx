import { useState } from 'react';
import { Anchor, LayoutDashboard, List, Map, FileText, BarChart3, Tent, Plus, ChevronRight, ChevronDown, FolderOpen, GripVertical, Calendar, Triangle, Settings } from 'lucide-react';
import type { Project } from '../data/useMeridianData';
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
}: NavigationSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map((p) => p.id)));
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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
    <div className="w-[220px] flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-900">To-DO</h2>
        <p className="text-xs text-gray-500 mt-0.5">RevOps Project Management</p>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {/* PROJECTS section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Projects</span>
            <button
              type="button"
              onClick={onOpenNewProject}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              + New
            </button>
          </div>
          <div className="space-y-0">
            {projects.length === 0 && (
              <p className="text-xs text-gray-500 px-2 py-1">No projects yet.</p>
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
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      {isProjectExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium truncate ${
                        isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  </div>
                    {isProjectExpanded && (
                    <div className="ml-4 pl-2 border-l border-gray-200 space-y-0">
                      <button
                        type="button"
                        onClick={() => { onSelectProject(p.id); onNavigateView('manifest'); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm ${
                          selectedProjectId === p.id && currentView === 'manifest' ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <GripVertical className="w-4 h-4 flex-shrink-0" />
                        <span>Tracker</span>
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleTasks(p.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-gray-600 hover:bg-gray-100"
                        >
                          {isTasksExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>Tasks</span>
                          {projectTasks.length > 0 && (
                            <span className="text-xs text-gray-500">({projectTasks.length})</span>
                          )}
                        </button>
                        {isTasksExpanded && (
                          <div className="ml-4 pl-2 border-l border-gray-200 space-y-0.5 py-1">
                            {topTasks.length === 0 && (
                              <p className="text-xs text-gray-500 px-2">No tasks yet</p>
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
                                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
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
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500 px-2 block mb-2">Views</span>
          <div className="space-y-0.5">
            {VIEW_ORDER.map((id) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigateView(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left text-sm font-medium ${
                    isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex-shrink-0 w-4 [&>svg]:w-4 [&>svg]:h-4">{VIEW_ICONS[id]}</span>
                  <span className="flex-1 truncate">{VIEW_LABELS[id]}</span>
                  {id === 'field_notes' && fieldNotesCount > 0 && (
                    <span className="text-xs text-gray-500 tabular-nums">{fieldNotesCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CREW MEMBERS */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Crew members</span>
            <button
              type="button"
              onClick={onOpenAddCrew}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 text-sm font-medium"
              title="Add crew"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {crew.length === 0 && (
              <p className="text-xs text-gray-500 px-2 py-1">No crew. Click + to add.</p>
            )}
            {crew.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {c.initials || c.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 flex justify-end">
        <button type="button" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
