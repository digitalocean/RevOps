import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { NavigationSidebar, type NavView } from '../components/NavigationSidebar';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { KPIStatsBar } from '../components/KPIStatsBar';
import { TrackerSection } from '../components/TrackerSection';
import { GanttChart } from '../components/GanttChart';
import { ActivityPanel } from '../components/ActivityPanel';
import { ProjectTimelinePanel } from '../components/ProjectTimelinePanel';
import { CategoryPriorityStatusMetrics } from '../components/CategoryPriorityStatusMetrics';
import { DueDateMetrics } from '../components/DueDateMetrics';
import { GlobalSearch } from '../components/GlobalSearch';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { AddInitiativeDialog } from '../components/AddInitiativeDialog';
import { SpreadsheetImport, type ImportRow } from '../components/SpreadsheetImport';
import { ImportTemplateDialog } from '../components/ImportTemplateDialog';
import { TeamMembersDialog } from '../components/TeamMembersDialog';
import { CustomFieldsDialog } from '../components/CustomFieldsDialog';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { NewSprintDialog } from '../components/NewSprintDialog';
import { AnalyticsView } from '../components/AnalyticsView';
import { SummitBoardKanban } from '../components/SummitBoardKanban';
import { FilterSlidePanel, type FilterRow } from '../components/FilterSlidePanel';
import { FieldNotesView } from '../components/FieldNotesView';
import { PersonalTasksView } from '../components/PersonalTasksView';
import { ColumnsPopover, saveVisibleColumns, loadVisibleColumns, loadColumnOrder, saveColumnOrder } from '../components/ColumnsPopover';
import { BaseCampView } from '../components/BaseCampView';
import { NewSectionDialog } from '../components/NewSectionDialog';
import { ShareProjectDialog } from '../components/ShareProjectDialog';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { AuthDialog } from '../components/AuthDialog';
import { MyTasksView } from '../components/MyTasksView';
import { ProjectTemplatesDialog } from '../components/ProjectTemplatesDialog';
import { EmptyProjectState } from '../components/EmptyProjectState';
import { DueBanner } from '../components/DueBanner';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { HelpCircle, ChevronUp, Filter, Share2, Sparkles, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useMeridianData } from '../data/useMeridianData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import type { Status, Priority, Category, Initiative } from '../data/mockData';
import { get, post, patch } from '../api/meridian';

const VIEW_TABS: { id: NavView; label: string }[] = [
  { id: 'my_tasks', label: 'My Tasks' },
  { id: 'manifest', label: 'Trackers' },
  { id: 'summit_board', label: 'Board' },
  { id: 'expedition_map', label: 'Gantt' },
  { id: 'field_notes', label: 'Field Notes' },
  { id: 'observatory', label: 'Analytics' },
  { id: 'base_camp', label: 'Base Camp' },
];

type AuthUser = { id: string; email?: string; name?: string; initials?: string } | null;

interface DashboardProps {
  /** When provided (e.g. from AuthGate), user is already logged in; no auth UI. */
  currentUser?: AuthUser;
  /** When provided, logout will call this (e.g. AuthGate sets user to null). */
  onLogout?: () => void;
}

export function Dashboard({ currentUser: propsCurrentUser, onLogout: propsOnLogout }: DashboardProps = {}) {
  const {
    initiatives,
    trackerSections,
    kpiData,
    loading,
    error,
    fromApi,
    refresh,
    projects,
    sprints,
    selectedProjectId,
    setSelectedProjectId,
    createProject,
    updateProject,
    createSprint,
    createItem,
    createSection,
    updateItem,
    deleteItem,
    deleteSection,
    deleteProject,
    updateSection,
    reorderSections,
    crew,
    customFields,
    standardFields,
  } = useMeridianData();
  const [currentView, setCurrentView] = useState<NavView>('summit_board');
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [timelinePanelExpanded, setTimelinePanelExpanded] = useState(true);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [showShareProject, setShowShareProject] = useState(false);
  const [addInitiativeParentId, setAddInitiativeParentId] = useState<string | null>(null);
  const [addInitiativeTrackerId, setAddInitiativeTrackerId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate', 'topic']));
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [celebrateCount, setCelebrateCount] = useState(0);
  const [filters, setFilters] = useState({
    status: [] as Status[],
    priority: [] as Priority[],
    category: [] as Category[],
    owner: [] as string[],
    bigRocksOnly: false
  });
  const [showFilterSlide, setShowFilterSlide] = useState(false);
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);
  const [filterAndOr, setFilterAndOr] = useState<'AND' | 'OR'>('AND');
  const [selectedInitiativeFromSearch, setSelectedInitiativeFromSearch] = useState<Initiative | null>(null);
  const [internalUser, setInternalUser] = useState<AuthUser>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showImportTemplate, setShowImportTemplate] = useState(false);
  const [drawerInitiative, setDrawerInitiative] = useState<Initiative | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const refreshActivity = useCallback(() => setActivityRefreshKey((k) => k + 1), []);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState<string | undefined>(undefined);
  const [templatesProjectId, setTemplatesProjectId] = useState<string | null>(null);

  const currentUser = propsCurrentUser !== undefined ? propsCurrentUser : internalUser;

  // Priority/Status options from standard fields (so add/remove in Base Camp is in sync with dropdowns)
  const priorityOptions = useMemo(() => {
    const f = standardFields?.find((s: { field_key?: string }) => s.field_key === 'priority');
    const opts = f?.options_json;
    return Array.isArray(opts) ? opts.map((o: { label?: string; color?: string }) => ({ label: String(o?.label ?? ''), color: o?.color })) : undefined;
  }, [standardFields]);
  const statusOptions = useMemo(() => {
    const f = standardFields?.find((s: { field_key?: string }) => s.field_key === 'status');
    const opts = f?.options_json;
    return Array.isArray(opts) ? opts.map((o: { label?: string; color?: string }) => ({ label: String(o?.label ?? ''), color: o?.color })) : undefined;
  }, [standardFields]);

  // Real-time WebSocket — refresh data on item/comment events
  useWebSocket({
    onMessage: useCallback((msg: { type: string }) => {
      if (['item_updated', 'item_created', 'item_deleted', 'comment_added'].includes(msg.type)) {
        refresh();
      }
    }, [refresh]),
  });

  // Keyboard navigation across all visible tasks
  const allVisibleItems = initiatives.map(i => ({ id: i.id }));
  useKeyboardNav({
    items: allVisibleItems,
    focusedId,
    setFocusedId,
    onOpenItem: (id) => {
      const init = initiatives.find(i => i.id === id);
      if (init) setDrawerInitiative(init);
    },
    onCompleteItem: async (id) => {
      await updateItem(id, { status: 'Complete' });
      refreshActivity();
      toast.success('Marked complete ✓');
    },
    onDeleteItem: async (id) => {
      const init = initiatives.find(i => i.id === id);
      if (init && confirm(`Delete "${init.name}"?`)) {
        await deleteItem(id);
        refreshActivity();
        setFocusedId(null);
      }
    },
    enabled: !showGlobalSearch && !showAddInitiative && !showTeamMembers && !showImport,
  });

  // Auth: fetch current user on load only when not provided by parent (e.g. AuthGate)
  useEffect(() => {
    if (propsCurrentUser !== undefined) return;
    get<{ user: AuthUser }>('/api/auth/me')
      .then((data) => setInternalUser(data.user ?? null))
      .catch(() => setInternalUser(null));
  }, [propsCurrentUser]);

  const handleLogin = () => setShowAuthDialog(true);

  const handleLogout = async () => {
    try {
      await post('/api/auth/logout', {});
      if (propsOnLogout) propsOnLogout();
      else setInternalUser(null);
      toast.success('Signed out');
    } catch {
      if (propsOnLogout) propsOnLogout();
      else setInternalUser(null);
    }
  };

  // Restore filters from localStorage when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    try {
      const saved = localStorage.getItem(`filters_${selectedProjectId}`);
      if (saved) {
        const { rows, andOr } = JSON.parse(saved);
        if (Array.isArray(rows)) {
          setFilterRows(rows);
          if (andOr === 'AND' || andOr === 'OR') setFilterAndOr(andOr);
          // Apply the restored filters immediately
          const derived = rows.reduce((acc: typeof filters, r: { field: string; operator: string; value: string }) => {
            if (r.operator !== 'is') return acc;
            if (r.field === 'Status' && r.value) acc.status = [...acc.status, r.value as typeof filters.status[0]];
            if (r.field === 'Priority' && r.value) acc.priority = [...acc.priority, r.value as typeof filters.priority[0]];
            if (r.field === 'Category' && r.value) acc.category = [...acc.category, r.value as typeof filters.category[0]];
            if (r.field === 'Owner' && r.value) acc.owner = [...acc.owner, r.value];
            return acc;
          }, { status: [], priority: [], category: [], owner: [], bigRocksOnly: false });
          setFilters(derived);
        }
      }
    } catch { /* ignore */ }
  }, [selectedProjectId]);

  // Load saved column selection and column order when project or user changes
  useEffect(() => {
    if (selectedProjectId) {
      setVisibleColumns(loadVisibleColumns(selectedProjectId, currentUser?.id));
      setColumnOrder(loadColumnOrder(selectedProjectId, currentUser?.id));
    } else {
      setVisibleColumns(new Set(['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate', 'topic']));
      setColumnOrder([]);
    }
  }, [selectedProjectId, currentUser?.id]);

  // Handle duplicate item event from TrackerSection three-dot menu
  useEffect(() => {
    const handler = async (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const item = initiatives.find((i) => i.id === id);
      if (!item || !selectedProjectId) return;
      try {
        await createItem(selectedProjectId, {
          title: item.name + ' (copy)',
          description: item.description,
        }, undefined, item.tracker_id ?? undefined);
        refreshActivity();
        toast.success('Item duplicated');
      } catch {
        toast.error('Failed to duplicate item');
      }
    };
    window.addEventListener('todo:duplicate-item', handler);
    return () => window.removeEventListener('todo:duplicate-item', handler);
  }, [initiatives, selectedProjectId, createItem, refreshActivity]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? for keyboard shortcuts help
      if (e.key === '?' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      
      // Cmd/Ctrl + K for global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // Cmd/Ctrl + Shift + A for Observatory
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setCurrentView('observatory');
      }
      
      // Cmd/Ctrl + 1 for Summit Board
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setCurrentView('summit_board');
      }
      
      // Cmd/Ctrl + 2 for Expedition Map
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setCurrentView('expedition_map');
      }
      
      // Cmd/Ctrl + B for Big Rocks filter
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setFilters(prev => ({ ...prev, bigRocksOnly: !prev.bigRocksOnly }));
      }
      
      // Cmd/Ctrl + A for select all (when not in input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSelectedIds(initiatives.map(i => i.id));
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initiatives]);

  const handleImportRows = async (rows: { title: string; description?: string; status?: string; priority?: string; category?: string; due_date?: string }[]) => {
    if (!selectedProjectId) return;
    let created = 0;
    for (const row of rows) {
      try {
        await createItem(selectedProjectId, { title: row.title, description: row.description });
        created++;
      } catch {}
    }
    if (created > 0) { refreshActivity(); toast.success(`Imported ${created} tasks`); }
  };

  const handleBulkStatusChange = async (status: Status) => {
    const count = selectedIds.length;
    try {
      await Promise.all(selectedIds.map((id) => updateItem(id, { status })));
      setSelectedIds([]);
      refreshActivity();
      toast.success(`Updated ${count} item(s) to ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleBulkPriorityChange = async (priority: Priority) => {
    const count = selectedIds.length;
    try {
      await Promise.all(selectedIds.map((id) => updateItem(id, { priority })));
      setSelectedIds([]);
      refreshActivity();
      toast.success(`Updated ${count} item(s) to ${priority}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update priority');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.length;
    if (!confirm(`Delete ${count} item(s)?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteItem(id)));
      setSelectedIds([]);
      refreshActivity();
      toast.success(`Deleted ${count} item(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleBulkAssignOwner = async (assigneeId: string) => {
    const count = selectedIds.length;
    const name = crew.find((c) => c.id === assigneeId)?.name ?? 'Unknown';
    try {
      await Promise.all(selectedIds.map((id) => updateItem(id, { assignee_id: assigneeId })));
      setSelectedIds([]);
      refreshActivity();
      toast.success(`Assigned ${count} item(s) to ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign owner');
    }
  };

  const handleSelectInitiativeFromSearch = (initiative: Initiative) => {
    setDrawerInitiative(initiative);
  };

  const STATUS_TO_SLUG: Record<string, string> = {
    'not_started': 'not_started', 'in_progress': 'in_progress', 'in_review': 'in_review',
    'on_track': 'on_track', 'complete': 'complete', 'blocked': 'blocked', 'at_risk': 'at_risk',
  };
  const PRIORITY_TO_SLUG: Record<string, string> = {
    'critical': 'critical', 'high': 'high', 'medium': 'medium', 'low': 'low',
  };
  const createItemPayload = (row: ImportRow) => ({
    title: row.title,
    description: row.description || '',
    status: STATUS_TO_SLUG[row.status || ''] || 'not_started',
    priority: PRIORITY_TO_SLUG[row.priority || ''] || 'medium',
    category: row.category || undefined,
    due_date: row.due_date || undefined,
  } as Parameters<typeof createItem>[1]);

  const handleSpreadsheetImport = async (data: { rows?: ImportRow[]; sections?: Array<{ name: string; tasks: ImportRow[] }> }) => {
    if (!selectedProjectId) return;
    if (data.sections?.length) {
      for (const sec of data.sections) {
        const section = await createSection(selectedProjectId, sec.name);
        const trackerId = section?.id ?? null;
        for (const row of sec.tasks) {
          await createItem(selectedProjectId, createItemPayload(row), undefined, trackerId ?? undefined);
        }
      }
      refreshActivity();
    } else if (data.rows?.length) {
      const trackerId = trackerSections.find(s => s.id !== 'uncategorized')?.id ?? null;
      await Promise.all(data.rows.map(row =>
        createItem(selectedProjectId, createItemPayload(row), undefined, trackerId ?? undefined)
      ));
      refreshActivity();
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedSprint = sprints[0];
  const sprintLabel = selectedSprint ? selectedSprint.name : 'Sprint';

  useEffect(() => {
    if (celebrateCount > 0) {
      const t = setTimeout(() => setCelebrateCount(0), 3000);
      return () => clearTimeout(t);
    }
  }, [celebrateCount]);

  // Dynamic document.title
  useEffect(() => {
    const proj = selectedProject?.name;
    const view = { manifest: 'Trackers', summit_board: 'Board', expedition_map: 'Gantt', field_notes: 'Notes', observatory: 'Analytics', my_tasks: 'My Tasks', base_camp: 'Settings' }[currentView] || '';
    document.title = proj ? `${proj} · ${view} — To-DO` : 'To-DO';
  }, [selectedProject, currentView]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)]">
      {fromApi && !error && (
        <div className="h-1 flex-shrink-0 bg-green-500" title="Connected to To-DO" />
      )}
      <div className="flex flex-1 min-h-0">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 h-full z-50">
              <NavigationSidebar
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={(id) => { setSelectedProjectId(id); setSidebarOpen(false); }}
                onOpenNewProject={() => { setShowNewProject(true); setSidebarOpen(false); }}
                onOpenPersonalTasks={() => {
                  const personal = projects.find(p => p.is_personal);
                  if (personal) {
                    setSelectedProjectId(personal.id);
                    setCurrentView('personal_tasks');
                    refresh(personal.id);
                  } else {
                    createProject({ name: 'Personal tasks', is_personal: true }).then(() => setCurrentView('personal_tasks'));
                  }
                  setSidebarOpen(false);
                }}
                initiatives={initiatives}
                trackerSections={trackerSections}
                crew={crew}
                onOpenAddCrew={() => setShowTeamMembers(true)}
                onOpenCustomFields={() => setShowCustomFields(true)}
                currentView={currentView}
                onNavigateView={(v) => { setCurrentView(v); setSidebarOpen(false); }}
                fieldNotesCount={0}
                myTasksCount={initiatives.filter(i => currentUser && i.assignee_id === currentUser.id && i.status !== 'Complete').length}
                onOpenItem={(id) => { const init = initiatives.find(i => i.id === id); if (init) setDrawerInitiative(init); }}
                onDeleteSection={deleteSection}
                onRenameSection={async (trackerId, newName) => { await updateSection(trackerId, { name: newName }); refreshActivity(); }}
                onRenameProject={async (projectId, newName) => { await updateProject(projectId, { name: newName }); refreshActivity(); }}
              />
            </div>
          </div>
        )}
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <NavigationSidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onOpenNewProject={() => setShowNewProject(true)}
            onOpenPersonalTasks={() => {
              const personal = projects.find(p => p.is_personal);
              if (personal) {
                setSelectedProjectId(personal.id);
                setCurrentView('personal_tasks');
                refresh(personal.id);
              } else {
                createProject({ name: 'Personal tasks', is_personal: true }).then(() => setCurrentView('personal_tasks'));
              }
            }}
            initiatives={initiatives}
            trackerSections={trackerSections}
            crew={crew}
            onOpenAddCrew={() => setShowTeamMembers(true)}
            onOpenCustomFields={() => setShowCustomFields(true)}
            currentView={currentView}
            onNavigateView={(v) => setCurrentView(v)}
            fieldNotesCount={0}
            myTasksCount={initiatives.filter(i => currentUser && i.assignee_id === currentUser.id && i.status !== 'Complete').length}
            onOpenItem={(id) => { const init = initiatives.find(i => i.id === id); if (init) setDrawerInitiative(init); }}
            onDeleteSection={deleteSection}
            onRenameSection={async (trackerId, newName) => { await updateSection(trackerId, { name: newName }); refreshActivity(); }}
            onRenameProject={async (projectId, newName) => { await updateProject(projectId, { name: newName }); refreshActivity(); }}
          />
        </div>
        <>
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)] min-w-0">
        <WorkspaceHeader
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => setSelectedProjectId(id)}
          onOpenNewProject={() => setShowNewProject(true)}
          onDeleteProject={deleteProject}
          onToggleActivity={() => setShowActivityPanel(!showActivityPanel)}
          selectedProjectName={selectedProject?.name}
          sprintLabel={selectedSprint ? `${selectedSprint.start_date || ''} – ${selectedSprint.end_date || ''}` : undefined}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          connected={fromApi && !error}
          connectionError={error}
          onRetry={refresh}
          onOpenItem={(id) => { const init = initiatives.find(i => i.id === id); if (init) setDrawerInitiative(init); }}
          onToggleMobileSidebar={() => setSidebarOpen(o => !o)}
        />
        <KPIStatsBar kpiData={kpiData} />
        <DueBanner
          initiatives={initiatives}
          onOpenTask={(task) => setDrawerInitiative(task)}
        />
        <div className="flex-1 flex overflow-hidden bg-gray-50 min-w-0">
          <div className="flex-1 overflow-auto min-w-0">
          <div className="max-w-[1600px] mx-auto p-6">
            {projects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to To-DO</h2>
                <p className="text-gray-500 mb-6 max-w-md">Create your first project to start tracking tasks, manage your team, and ship faster.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowNewProject(true)}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Create a project
                  </button>
                  <button onClick={() => setShowTemplates(true)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Start from template
                  </button>
                </div>
              </div>
            )}
            {selectedProject && (
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedProject.name}</h2>
                  {selectedSprint && (
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>
                        {selectedSprint.start_date || '—'} – {selectedSprint.end_date || '—'}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2 rounded-xl"
                  onClick={() => setShowShareProject(true)}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 border-b border-gray-200">
                {VIEW_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setCurrentView(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      currentView === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {(currentView === 'summit_board' || currentView === 'manifest') && (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilterSlide(true)}>
                      <Filter className="w-4 h-4" />
                      Filter
                      {filterRows.length > 0 && (
                        <span className="rounded-full bg-[var(--accent)] bg-opacity-20 text-[var(--accent)] px-1.5 py-0.5 text-xs font-medium">
                          {filterRows.length}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowImportTemplate(true)}
                      title="Import template: column names as custom fields, rows as tasks"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Import template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowImport(true)}
                      title="Import from spreadsheet"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Import
                    </Button>
                    <ColumnsPopover
                      projectId={selectedProjectId}
                      userId={currentUser?.id}
                      visibleColumns={visibleColumns}
                      onVisibleColumnsChange={setVisibleColumns}
                      customFields={customFields}
                      standardFields={standardFields}
                    />
                  </>
                )}
                {(currentView === 'summit_board' || currentView === 'manifest') && (
                  <>
                    {currentView === 'manifest' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewSection(true)}
                      >
                        + Tracker
                      </Button>
                    )}
                    {currentView === 'summit_board' && (
                      <Button
                        type="button"
                        className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => { setAddInitiativeParentId(null); setAddInitiativeTrackerId(null); setShowAddInitiative(true); }}
                      >
                        <ChevronUp className="w-4 h-4" />
                        Add task
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {currentView === 'observatory' ? (
              <AnalyticsView projectId={selectedProjectId} />
            ) : currentView === 'my_tasks' ? (
              <MyTasksView
                initiatives={initiatives}
                crew={crew}
                currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User' } : null}
                projects={projects}
                onUpdateItem={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
                onDeleteItem={async (id) => { await deleteItem(id); refreshActivity(); }}
              />
            ) : currentView === 'personal_tasks' ? (
              <PersonalTasksView
                projectId={selectedProjectId}
                projectName={selectedProject?.name ?? 'Personal tasks'}
                tasks={initiatives}
                onCreateTask={async (payload) => selectedProjectId && createItem(selectedProjectId, payload)}
                onUpdateTask={updateItem}
                onDeleteTask={deleteItem}
                onOpenTask={(task) => setDrawerInitiative(task)}
              />
            ) : currentView === 'expedition_map' ? (
              <GanttChart initiatives={initiatives} />
            ) : currentView === 'field_notes' ? (
              <FieldNotesView projectId={selectedProjectId} onRefresh={refresh} />
            ) : currentView === 'base_camp' ? (
              <BaseCampView
                projectId={selectedProjectId}
                customFields={customFields}
                standardFields={standardFields}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onToggleColumn={(columnId) => {
                  const next = new Set(visibleColumns);
                  if (next.has(columnId)) next.delete(columnId);
                  else next.add(columnId);
                  setVisibleColumns(next);
                  if (selectedProjectId) saveVisibleColumns(selectedProjectId, next, currentUser?.id);
                }}
                onReorderColumns={(orderedIds) => {
                  setColumnOrder(orderedIds);
                  if (selectedProjectId) saveColumnOrder(selectedProjectId, orderedIds, currentUser?.id);
                }}
                onOpenCustomFields={() => setShowCustomFields(true)}
                onOpenShare={() => setShowShareProject(true)}
                onDeleteProject={async (id) => {
                  await deleteProject(id);
                  setSelectedProjectId(null);
                  refresh();
                }}
              />
            ) : currentView === 'summit_board' ? (
              <SummitBoardKanban
                initiatives={initiatives}
                crew={crew}
                onUpdateStatus={async (id, status) => updateItem(id, { status })}
                onUpdateItem={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
                onDeleteItem={async (id) => { await deleteItem(id); refreshActivity(); }}
                onAddItem={() => setShowAddInitiative(true)}
              />
            ) : (
              <div className="space-y-4">
                {initiatives.length === 0 && (!trackerSections || trackerSections.length === 0) && selectedProject ? (
                  <EmptyProjectState
                    projectName={selectedProject.name}
                    onImport={() => setShowImport(true)}
                    onCreateSection={() => setShowNewSection(true)}
                    onUseTemplate={() => setShowTemplates(true)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Trackers</h3>
                    </div>
                {trackerSections.map((section) => {
                  const trackerIds = trackerSections.filter((s) => s.id !== 'uncategorized').map((s) => s.id);
                  const trackerIndex = section.id === 'uncategorized' ? -1 : trackerIds.indexOf(section.id);
                  return (
                  <TrackerSection
                    key={section.id}
                    section={section}
                    crew={crew}
                    currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User' } : null}
                    customFields={customFields}
                    visibleColumns={section.columns?.length ? new Set(section.columns) : visibleColumns}
                    onDeleteSection={deleteSection}
                    onRenameSection={async (trackerId, newName) => { await updateSection(trackerId, { name: newName }); refreshActivity(); }}
                    onMoveUp={trackerIndex >= 0 ? () => {
                      if (!selectedProjectId || trackerIndex <= 0) return;
                      const next = [...trackerIds];
                      [next[trackerIndex], next[trackerIndex - 1]] = [next[trackerIndex - 1], next[trackerIndex]];
                      reorderSections(selectedProjectId, next);
                    } : undefined}
                    onMoveDown={trackerIndex >= 0 ? () => {
                      if (!selectedProjectId || trackerIndex >= trackerIds.length - 1) return;
                      const next = [...trackerIds];
                      [next[trackerIndex], next[trackerIndex + 1]] = [next[trackerIndex + 1], next[trackerIndex]];
                      reorderSections(selectedProjectId, next);
                    } : undefined}
                    canMoveUp={trackerIndex > 0}
                    canMoveDown={trackerIndex >= 0 && trackerIndex < trackerIds.length - 1}
                    showSectionActions={section.id !== 'uncategorized'}
                    onUpdateFieldValue={async (taskId, fieldId, value) => {
                      const payload: { fieldId: string; valueText?: string; valueNumber?: number; valueDate?: string; valueBoolean?: boolean } = { fieldId };
                      if (typeof value === 'string') payload.valueText = value;
                      else if (typeof value === 'number') payload.valueNumber = value;
                      else if (typeof value === 'boolean') payload.valueBoolean = value;
                      await patch(`/api/tasks/${taskId}/field-values`, { values: [payload] });
                      refresh();
                    }}
                    viewMode="grid"
                    filters={filters}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    projectId={selectedProjectId}
                    focusedId={focusedId}
                    onFocusChange={setFocusedId}
                    onAddItem={() => {
                      setAddInitiativeParentId(null);
                      setAddInitiativeTrackerId(section.id === 'uncategorized' ? null : section.id);
                      setShowAddInitiative(true);
                    }}
                    onCreateItem={async (projectId, payload, trackerId) => {
                      await createItem(projectId, payload, undefined, trackerId ?? undefined);
                    }}
                    onUpdateItem={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
                    onDeleteItem={async (id) => { await deleteItem(id); refreshActivity(); }}
                    onCreateSubItem={(parentId) => { setAddInitiativeParentId(parentId); setAddInitiativeTrackerId(null); setShowAddInitiative(true); }}
                    onItemCompleted={() => setCelebrateCount((c) => c + 1)}
                    priorityOptions={priorityOptions}
                    statusOptions={statusOptions}
                  />
                  );
                })}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <CategoryPriorityStatusMetrics initiatives={initiatives} />
                  <DueDateMetrics initiatives={initiatives} />
                </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
          {selectedProjectId && (
            <ProjectTimelinePanel
              projectId={selectedProjectId}
              expanded={timelineExpanded}
              onToggle={() => setTimelineExpanded((e) => !e)}
              refreshKey={activityRefreshKey}
            />
          )}
        </div>
      </div>

      {showActivityPanel && (
        <ActivityPanel projectId={selectedProjectId} onClose={() => setShowActivityPanel(false)} />
      )}

      {(selectedInitiativeFromSearch || drawerInitiative) && (
        <TaskDetailDrawer
          initiative={(drawerInitiative || selectedInitiativeFromSearch)!}
          crew={crew}
          currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User' } : null}
          onClose={() => { setDrawerInitiative(null); setSelectedInitiativeFromSearch(null); }}
          onSave={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
          onDelete={async (id) => {
            await deleteItem(id);
            refreshActivity();
            setDrawerInitiative(null);
            setSelectedInitiativeFromSearch(null);
          }}
          priorityOptions={priorityOptions}
          statusOptions={statusOptions}
        />
      )}

      {showImport && (
        <SpreadsheetImport
          projectId={selectedProjectId}
          onImport={handleSpreadsheetImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showImportTemplate && (
        <ImportTemplateDialog
          open={showImportTemplate}
          onClose={() => setShowImportTemplate(false)}
          projectId={selectedProjectId}
          onCreateSection={async (projectId, sectionName, columns) => {
            const t = await createSection(projectId, sectionName, columns);
            return t?.id ?? null;
          }}
          onCreateTask={async (payload, trackerId) => {
            if (!selectedProjectId) return null;
            const res = await createItem(selectedProjectId, {
              title: String(payload.title ?? ''),
              description: payload.description as string | undefined,
              status: (payload.status as string) || 'not_started',
              priority: (payload.priority as string) || 'medium',
            }, undefined, trackerId ?? undefined);
            return res as { id?: string } | null;
          }}
          onSuccess={refresh}
        />
      )}

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        onSelectInitiative={handleSelectInitiativeFromSearch}
        initiatives={initiatives}
        projects={projects}
      />

      <KeyboardShortcutsDialog
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />

      <AddInitiativeDialog
        open={showAddInitiative}
        onOpenChange={(open) => {
          setShowAddInitiative(open);
          if (!open) { setAddInitiativeParentId(null); setAddInitiativeTrackerId(null); }
        }}
        projectId={selectedProjectId}
        parentId={addInitiativeParentId}
        trackerId={addInitiativeTrackerId}
        onCreate={async (projectId, payload, parentId, trackerId) => {
          await createItem(projectId, payload, parentId ?? undefined, trackerId ?? undefined);
        }}
      />

      <NewSectionDialog
        open={showNewSection}
        onOpenChange={setShowNewSection}
        projectId={selectedProjectId}
        onCreate={async (pid, name) => { await createSection(pid, name, Array.from(visibleColumns)); refreshActivity(); }}
      />

      <CompletionCelebration trigger={celebrateCount > 0} label="Item completed!" />

      <TeamMembersDialog
        open={showTeamMembers}
        onOpenChange={setShowTeamMembers}
        workspaceId={selectedProjectId ? (projects.find((p) => p.id === selectedProjectId)?.workspace_id ?? projects[0]?.workspace_id ?? null) : (projects[0]?.workspace_id ?? null)}
        onAdded={refresh}
      />

      <CustomFieldsDialog
        open={showCustomFields}
        onOpenChange={setShowCustomFields}
        workspaceId={null}
        projectId={selectedProjectId}
        onAdded={refresh}
      />

      <NewProjectDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
        onCreate={async (payload) => {
          const result = await createProject(payload);
          return result;
        }}
        onCreated={(newProjectId) => {
          setSelectedProjectId(newProjectId);
          setTemplatesProjectId(newProjectId);
          setShowTemplates(true);
        }}
      />

      <ShareProjectDialog
        open={showShareProject}
        onOpenChange={setShowShareProject}
        projectId={selectedProjectId}
        projectName={selectedProject?.name ?? ''}
        onShared={refresh}
      />

      <FilterSlidePanel
        open={showFilterSlide}
        onClose={() => setShowFilterSlide(false)}
        filterRows={filterRows}
        onFilterRowsChange={setFilterRows}
        filterAndOr={filterAndOr}
        onFilterAndOrChange={setFilterAndOr}
        onApply={(derived) => { setFilters(derived); setShowFilterSlide(false); }}
        onSaveAsView={() => { toast.info('Apply filters then use Saved Views to save.'); setShowFilterSlide(false); }}
        statusOptions={(statusOptions?.map((o) => o.label) ?? ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete']) as Status[]}
        priorityOptions={(priorityOptions?.map((o) => o.label) ?? ['P0', 'P1', 'P2']) as Priority[]}
        categoryOptions={['Engineering', 'Design', 'Sales', 'Product', 'Operations'] as Category[]}
        ownerOptions={crew.map((c) => c.name)}
        projectId={selectedProjectId}
      />

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={(user) => setInternalUser(user)}
      />

      <NewSprintDialog
        open={showNewSprint}
        onOpenChange={setShowNewSprint}
        projectId={selectedProjectId}
        projectName={selectedProject?.name ?? ''}
        onCreate={async (projectId, name, start_date, end_date) => {
          await createSprint(projectId, name, start_date, end_date);
        }}
      />

      {showTemplates && (
        <ProjectTemplatesDialog
          open={showTemplates}
          projectId={templatesProjectId || selectedProjectId}
          projectName={projects.find(p => p.id === (templatesProjectId || selectedProjectId))?.name || selectedProject?.name}
          onClose={() => { setShowTemplates(false); setTemplatesProjectId(null); }}
          onApplied={() => { refresh(); setShowTemplates(false); setTemplatesProjectId(null); }}
          onApplyWithData={async (trackers) => {
            const pid = templatesProjectId || selectedProjectId;
            if (!pid) return;
            const statusFromLabel: Record<string, string> = {
              'not started': 'not_started', 'in progress': 'in_progress', 'in review': 'in_review',
              'complete': 'complete', 'done': 'complete', 'blocked': 'blocked', 'on track': 'on_track',
            };
            const priFromLabel: Record<string, string> = { 'p0': 'critical', 'p1': 'high', 'p2': 'medium', 'p3': 'low' };
            for (const sec of trackers) {
              const section = await createSection(pid, sec.name);
              const trackerId = section?.id ?? null;
              for (const task of sec.tasks) {
                const status = task.status ? (statusFromLabel[task.status.toLowerCase()] ?? STATUS_TO_SLUG[task.status] ?? 'not_started') : 'not_started';
                const priority = task.priority ? (priFromLabel[task.priority.toLowerCase()] ?? PRIORITY_TO_SLUG[task.priority] ?? 'medium') : 'medium';
                await createItem(pid, { title: task.title, description: '', status, priority }, undefined, trackerId ?? undefined);
              }
            }
          }}
        />
      )}

      {/* Floating help button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-40"
              onClick={() => setShowKeyboardShortcuts(true)}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <p>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">{'?'}</kbd> for shortcuts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Focus timer button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-20 right-6 rounded-full w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg z-40"
              onClick={() => { setPomodoroTask(drawerInitiative?.name); setShowPomodoro(true); }}
            >
              🍅
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <p>Focus Timer (Pomodoro)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showPomodoro && (
        <PomodoroTimer
          taskName={pomodoroTask}
          onClose={() => setShowPomodoro(false)}
          onLogTime={async (minutes) => {
            if (drawerInitiative) {
              try {
                await post(`/api/items/${drawerInitiative.id}/time-logs`, { minutes, note: 'Logged via Focus Timer' });
                toast.success(`Logged ${minutes}m to "${drawerInitiative.name}"`);
              } catch {}
            }
          }}
        />
      )}
        </>
      </div>
    </div>
  );
}