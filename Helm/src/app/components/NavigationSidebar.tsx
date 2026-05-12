import { useState } from 'react';
import { LayoutDashboard, FileText, BarChart3, GripVertical, Triangle, Plus, ChevronRight, ChevronDown, Settings, Anchor, Layers, Inbox, Users, ListTodo, Trash2, Pencil, LineChart } from 'lucide-react';
import type { Project } from '../data/useMeridianData';
import type { Initiative, TrackerSection as TrackerSectionType } from '../data/mockData';
import { Button } from './ui/button';

const PROJECT_DOT_COLORS = ['#22c55e', '#7c3aed', '#2563eb', '#ea580c', '#dc2626', '#0891b2'];

function projectDotColor(project: Project, index: number): string {
  if (project.color && /^#[0-9A-Fa-f]{6}$/.test(project.color)) return project.color;
  return PROJECT_DOT_COLORS[index % PROJECT_DOT_COLORS.length];
}

export type NavView = 'summit_board' | 'manifest' | 'expedition_map' | 'field_notes' | 'observatory' | 'base_camp' | 'my_tasks' | 'personal_tasks' | 'reports';

// Board last; Tracker = Trackers view
const VIEW_ORDER: NavView[] = ['my_tasks', 'manifest', 'expedition_map', 'field_notes', 'observatory', 'reports', 'base_camp', 'summit_board'];
const VIEW_LABELS: Record<NavView, string> = {
  summit_board: 'Board', manifest: 'Trackers', expedition_map: 'Gantt',
  field_notes: 'Field Notes', observatory: 'Analytics', base_camp: 'Base Camp', my_tasks: 'My Tasks',
  personal_tasks: 'Personal tasks', reports: 'Reports',
};
const VIEW_ICONS: Record<NavView, React.ReactNode> = {
  summit_board: <LayoutDashboard className="w-3.5 h-3.5" />,
  manifest: <GripVertical className="w-3.5 h-3.5" />,
  expedition_map: <BarChart3 className="w-3.5 h-3.5" />,
  field_notes: <FileText className="w-3.5 h-3.5" />,
  observatory: <BarChart3 className="w-3.5 h-3.5" />,
  base_camp: <Triangle className="w-3.5 h-3.5" />,
  my_tasks: <Inbox className="w-3.5 h-3.5" />,
  personal_tasks: <ListTodo className="w-3.5 h-3.5" />,
  reports: <LineChart className="w-3.5 h-3.5" />,
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
  onOpenAddCrew?: () => void;
  onOpenCustomFields: () => void;
  currentView: NavView;
  onNavigateView: (view: NavView) => void;
  onOpenPersonalTasks?: () => void;
  fieldNotesCount?: number;
  myTasksCount?: number;
  onOpenItem?: (itemId: string) => void;
  onDeleteSection?: (trackerId: string) => void;
  onRenameSection?: (trackerId: string, newName: string) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
}

export function NavigationSidebar({
  projects, selectedProjectId, onSelectProject, onOpenNewProject,
  trackerSections = [], crew: _crew, onOpenAddCrew: _onOpenAddCrew, currentView, onNavigateView, onOpenPersonalTasks,
  fieldNotesCount = 0, myTasksCount = 0,   onOpenItem, onDeleteSection, onRenameSection, onRenameProject,
}: NavigationSidebarProps) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(selectedProjectId ? [selectedProjectId] : [])
  );
  const [expandedTasksPerProject, setExpandedTasksPerProject] = useState<Set<string>>(new Set());
  const [expandedTrackers, setExpandedTrackers] = useState<Set<string>>(new Set());
  const [showMoreTrackers, setShowMoreTrackers] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const sidebarContent = (
    <div className="w-[244px] flex-shrink-0 h-screen flex flex-col border-r border-[var(--border-soft)] bg-white">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_2px_6px_rgba(79,70,229,0.35)]">
            <Anchor className="w-4 h-4" aria-hidden />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">ToDo</span>
            <span className="text-[11px] text-gray-500">Get things done.</span>
          </div>
          <button
            className="ml-auto md:hidden p-1 text-gray-400 hover:text-gray-600"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Personal tasks */}
        {onOpenPersonalTasks && (
          <div className="px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={onOpenPersonalTasks}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium transition-colors ${
                currentView === 'personal_tasks' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <ListTodo className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Personal tasks</span>
            </button>
          </div>
        )}
        {/* My Tasks global link */}
        <div className="px-3 pt-2 pb-1">
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
        {/* Reports global link */}
        <div className="px-3 pb-2">
          <button type="button" onClick={() => onNavigateView('reports')}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm font-medium transition-colors ${
              currentView === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}>
            <LineChart className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Reports</span>
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
              <div key={p.id} className="mb-0.5 group">
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => toggleSet(setExpandedProjects, p.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button"
                    onClick={() => { if (editingProjectId !== p.id) { onSelectProject(p.id); if (!isExpanded) toggleSet(setExpandedProjects, p.id); } }}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm truncate transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 font-semibold shadow-[inset_2px_0_0_rgb(79_70_229)]'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                    {editingProjectId === p.id ? (
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onBlur={() => {
                          if (onRenameProject && editingProjectName.trim() && editingProjectName.trim() !== p.name) {
                            onRenameProject(p.id, editingProjectName.trim());
                          }
                          setEditingProjectId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (onRenameProject && editingProjectName.trim() && editingProjectName.trim() !== p.name) {
                              onRenameProject(p.id, editingProjectName.trim());
                            }
                            setEditingProjectId(null);
                          } else if (e.key === 'Escape') {
                            setEditingProjectName(p.name);
                            setEditingProjectId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white border border-blue-300 rounded px-1.5 py-0.5 text-sm text-gray-900"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="truncate flex-1"
                        title="Double-click to rename"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (onRenameProject) {
                            setEditingProjectId(p.id);
                            setEditingProjectName(p.name);
                          }
                        }}
                      >
                        {p.name}
                      </span>
                    )}
                  </button>
                  {onRenameProject && editingProjectId !== p.id && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setEditingProjectId(p.id); setEditingProjectName(p.name); }} title="Rename project">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="ml-5 pl-2 border-l border-gray-100 mb-1">
                    {/* Tracker (default open): view links */}
                    <div className="mb-1">
                      <div className="px-2 py-0.5 flex items-center gap-1">
                        <GripVertical className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tracker</span>
                      </div>
                      <div className="ml-1">
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
                      </div>
                    </div>

                    {/* Tasks (default closed): top 5 + more */}
                    {projectTrackers.length > 0 && (
                      <div className="mt-1">
                        <button type="button" onClick={() => toggleSet(setExpandedTasksPerProject, p.id)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-xs text-gray-600 hover:bg-gray-50">
                          {expandedTasksPerProject.has(p.id) ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tasks</span>
                        </button>
                        {expandedTasksPerProject.has(p.id) && (
                          <div className="ml-1 mt-0.5">
                        {projectTrackers.map((tracker) => {
                          const isTrackerOpen = expandedTrackers.has(tracker.id);
                          const allTasks = tracker.initiatives || [];
                          const showingMore = showMoreTrackers.has(tracker.id);
                          const visible = showingMore ? allTasks : allTasks.slice(0, TASKS_LIMIT);
                          const hiddenCount = allTasks.length - TASKS_LIMIT;

                          return (
                            <div key={tracker.id} className="mb-0.5 flex items-center gap-0.5 group">
                              <button type="button" onClick={() => toggleSet(setExpandedTrackers, tracker.id)}
                                className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors">
                                {isTrackerOpen ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                <span className="truncate font-medium">{tracker.title}</span>
                                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 tabular-nums">{allTasks.length}</span>
                              </button>
                              {tracker.id !== 'uncategorized' && (trackerSections?.length ?? 0) > 1 && (onDeleteSection || onRenameSection) && (
                                <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {onRenameSection && (
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); const n = window.prompt('Section name', tracker.title); if (n != null && n.trim()) onRenameSection(tracker.id, n.trim()); }} title="Edit section name">
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {onDeleteSection && (
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${tracker.title}"?`)) onDeleteSection(tracker.id); }} title="Delete section">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </span>
                              )}

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
                )}
              </div>
            );
          })}
        </div>

      </div>

      <div className="px-3 py-3 border-t border-[var(--border-soft)] flex justify-end">
        <button type="button" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Settings">
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
