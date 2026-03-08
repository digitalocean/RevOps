import { useState } from 'react';
import { LayoutDashboard, FileText, BarChart3, GripVertical, Triangle, Plus, ChevronRight, ChevronDown, Settings, Anchor, Layers, Inbox, Users } from 'lucide-react';
import type { Project } from '../data/useMeridianData';
import type { Initiative, TrackerSection as TrackerSectionType } from '../data/mockData';

const PROJECT_DOT_COLORS = ['#22c55e', '#7c3aed', '#2563eb', '#ea580c', '#dc2626', '#0891b2'];

function projectDotColor(project: Project, index: number): string {
  if (project.color && /^#[0-9A-Fa-f]{6}$/.test(project.color)) return project.color;
  return PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];
}

export type NavView = 'summit_board' | 'manifest' | 'expedition_map' | 'field_notes' | 'observatory' | 'base_camp' | 'my_tasks' | 'workload';

const VIEW_ORDER: NavView[] = ['my_tasks', 'manifest', 'expedition_map', 'field_notes', 'observatory', 'workload', 'base_camp', 'summit_board'];
const VIEW_LABELS: Record<NavView, string> = {
  summit_board: 'Board', manifest: 'Trackers', expedition_map: 'Gantt',
  field_notes: 'Field Notes', observatory: 'Analytics', base_camp: 'Base Camp', my_tasks: 'My Tasks', workload: 'Workload',
};
const VIEW_ICONS: Record<NavView, React.ReactNode> = {
  summit_board: <LayoutDashboard className="w-3.5 h-3.5" />,
  manifest: <GripVertical className="w-3.5 h-3.5" />,
  expedition_map: <BarChart3 className="w-3.5 h-3.5" />,
  field_notes: <FileText className="w-3.5 h-3.5" />,
  observatory: <BarChart3 className="w-3.5 h-3.5" />,
  base_camp: <Triangle className="w-3.5 h-3.5" />,
  my_tasks: <Inbox className="w-3.5 h-3.5" />,
  workload: <Users className="w-3.5 h-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  'On Track': '#16a34a', 'At Risk': '#d97706', 'Blocked': '#dc2626',
  'Complete': '#2563eb', 'In Review': '#7c3aed', 'Not Started': '#9ca3af',
};

const TASKS_LIMIT = 5;

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
  myTasksCount?: number;
  onOpenItem?: (itemId: string) => void;
}

export function NavigationSidebar({
  projects, selectedProjectId, onSelectProject, onOpenNewProject,
  trackerSections = [], crew, onOpenAddCrew, currentView, onNavigateView, fieldNotesCount = 0,
  myTasksCount = 0, onOpenItem,
}: NavigationSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(selectedProjectId ? [selectedProjectId] : [])
  );
  const [expandedTrackers, setExpandedTrackers] = useState<Set<string>>(new Set());
  const [showMoreTrackers, setShowMoreTrackers] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const sidebarContent = (
    <div className="w-[240px] flex-shrink-0 h-screen flex flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-sm font-bold text-gray-900">To-DO</h2>
          <button
            className="ml-auto md:hidden p-1 text-gray-400 hover:text-gray-600"
            onClick={() => setMobileOpen(false)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">Get things done.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My Tasks global link */}
        <div className="px-3 pt-3 pb-2">
          <button type="button" onClick={() => onNavigateView('my_tasks')}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium transition-colors ${
              currentView === 'my_tasks' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}>
            <Inbox className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">My Tasks</span>
            {myTasksCount > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${currentView === 'my_tasks' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                {myTasksCount}
              </span>
            )}
          </button>
        </div>
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Projects</span>
            <button type="button" onClick={onOpenNewProject} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
              + New
            </button>
          </div>

          {projects.length === 0 && <p className="text-xs text-gray-400 px-1 py-1">No projects yet.</p>}

          {projects.map((p, idx) => {
            const isExpanded = expandedProjects.has(p.id);
            const isActive = selectedProjectId === p.id;
            const dotColor = projectDotColor(p, idx);
            const projectTrackers = isActive ? trackerSections : [];

            return (
              <div key={p.id} className="mb-0.5">
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => toggleSet(setExpandedProjects, p.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button"
                    onClick={() => { onSelectProject(p.id); if (!isExpanded) toggleSet(setExpandedProjects, p.id); }}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm truncate transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                    <span className="truncate">{p.name}</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-5 pl-2 border-l border-gray-100 mb-1">
                    {/* View links */}
                    {VIEW_ORDER.map((viewId) => {
                      const isViewActive = isActive && currentView === viewId;
                      return (
                        <button key={viewId} type="button"
                          onClick={() => { onSelectProject(p.id); onNavigateView(viewId); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors ${
                            isViewActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`}>
                          <span className="flex-shrink-0 text-gray-400">{VIEW_ICONS[viewId]}</span>
                          <span className="flex-1 truncate">{VIEW_LABELS[viewId]}</span>
                          {viewId === 'field_notes' && fieldNotesCount > 0 && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{fieldNotesCount}</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Trackers tree */}
                    {projectTrackers.length > 0 && (
                      <div className="mt-1">
                        <div className="px-2 py-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300">Trackers</span>
                        </div>
                        {projectTrackers.map((tracker) => {
                          const isTrackerOpen = expandedTrackers.has(tracker.id);
                          const allTasks = tracker.initiatives || [];
                          const showingMore = showMoreTrackers.has(tracker.id);
                          const visible = showingMore ? allTasks : allTasks.slice(0, TASKS_LIMIT);
                          const hiddenCount = allTasks.length - TASKS_LIMIT;

                          return (
                            <div key={tracker.id} className="mb-0.5">
                              <button type="button" onClick={() => toggleSet(setExpandedTrackers, tracker.id)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors">
                                {isTrackerOpen ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                <span className="truncate font-medium">{tracker.title}</span>
                                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 tabular-nums">{allTasks.length}</span>
                              </button>

                              {isTrackerOpen && (
                                <div className="ml-3 pl-2 border-l border-gray-100">
                                  {allTasks.length === 0 && <p className="text-[11px] text-gray-400 px-2 py-1">No tasks</p>}
                                  {visible.map((task) => (
                                    <div key={task.id} title={task.name}
                                      onClick={() => onOpenItem?.(task.id)}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors group">
                                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: STATUS_COLORS[task.status] || '#9ca3af' }} />
                                      <span className="truncate flex-1">{task.name.length > 24 ? task.name.slice(0, 24) + '…' : task.name}</span>
                                    </div>
                                  ))}
                                  {!showingMore && hiddenCount > 0 && (
                                    <button type="button" onClick={() => toggleSet(setShowMoreTrackers, tracker.id)}
                                      className="w-full text-left px-2 py-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium">
                                      + {hiddenCount} more…
                                    </button>
                                  )}
                                  {showingMore && hiddenCount > 0 && (
                                    <button type="button" onClick={() => toggleSet(setShowMoreTrackers, tracker.id)}
                                      className="w-full text-left px-2 py-1 text-[11px] text-gray-400 hover:text-gray-600">
                                      Show less
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CREW */}
        <div className="px-3 pt-3 pb-4 border-t border-gray-100 mt-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Crew</span>
            <button type="button" onClick={onOpenAddCrew}
              className="flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Add crew">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {crew.length === 0 && <p className="text-xs text-gray-400 px-1 py-1">No crew. Click + to add.</p>}
            {crew.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-1 py-1.5 rounded-md hover:bg-gray-50">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                  {c.initials || c.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate text-xs text-gray-600">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-t border-gray-100 flex justify-end">
        <button type="button" className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <Layers className="w-4 h-4 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}
