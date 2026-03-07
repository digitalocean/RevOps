import { useState } from 'react';
import { LayoutDashboard, FileText, BarChart3, GripVertical, Triangle, Plus, ChevronRight, ChevronDown, Settings, Anchor } from 'lucide-react';
import type { Project } from '../data/useMeridianData';

const PROJECT_DOT_COLORS = ['#22c55e', '#7c3aed', '#2563eb', '#ea580c', '#dc2626', '#0891b2'];

function projectDotColor(project: Project, index: number): string {
  if (project.color && /^#[0-9A-Fa-f]{6}$/.test(project.color)) return project.color;
  return PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];
}
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
  crew,
  onOpenAddCrew,
  currentView,
  onNavigateView,
  fieldNotesCount = 0,
}: NavigationSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map((p) => p.id)));

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="w-[220px] flex-shrink-0 h-screen flex flex-col border-r border-white/10"
      style={{ backgroundColor: 'var(--bg-sidebar)' }}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-blue-400 shrink-0" />
          <h2 className="text-sm font-bold text-white">To-DO</h2>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Get things done.</p>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {/* PROJECTS */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Projects</span>
            <button
              type="button"
              onClick={onOpenNewProject}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New project
            </button>
          </div>
          <div className="space-y-0">
            {projects.length === 0 && (
              <p className="text-xs text-gray-500 px-2 py-1">No projects yet.</p>
            )}
            {projects.map((p, idx) => {
              const isExpanded = expandedProjects.has(p.id);
              const isActive = selectedProjectId === p.id;
              const dotColor = projectDotColor(p, idx);
              return (
                <div key={p.id} className="rounded-md overflow-hidden">
                  <div className="flex items-center gap-0">
                    <button
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-300"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium truncate transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  </div>
                  {/* View links under expanded project */}
                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-white/10 space-y-0">
                      {VIEW_ORDER.map((viewId) => {
                        const isViewActive = selectedProjectId === p.id && currentView === viewId;
                        return (
                          <button
                            key={viewId}
                            type="button"
                            onClick={() => {
                              onSelectProject(p.id);
                              onNavigateView(viewId);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm font-medium transition-colors ${
                              isViewActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                            }`}
                          >
                            <span className="flex-shrink-0 w-4 [&>svg]:w-4 [&>svg]:h-4 text-gray-500">{VIEW_ICONS[viewId]}</span>
                            <span className="flex-1 truncate">{VIEW_LABELS[viewId]}</span>
                            {viewId === 'field_notes' && fieldNotesCount > 0 && (
                              <span className="text-xs text-gray-500 tabular-nums bg-white/10 px-1.5 py-0.5 rounded">
                                {fieldNotesCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CREW MEMBERS */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Crew members</span>
            <button
              type="button"
              onClick={onOpenAddCrew}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-white/10 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"
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
                className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-400"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {c.initials || c.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-white/10 flex justify-end">
        <button type="button" className="p-1.5 rounded-md text-gray-500 hover:bg-white/5 hover:text-gray-300" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
