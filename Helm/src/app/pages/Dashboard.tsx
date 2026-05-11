import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { CustomFieldsDialog } from '../components/CustomFieldsDialog';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { NewSprintDialog } from '../components/NewSprintDialog';
import { AnalyticsView } from '../components/AnalyticsView';
import { SummitBoardKanban } from '../components/SummitBoardKanban';
import { TaskFiltersModal } from '../components/TaskFiltersModal';
import { FieldNotesView } from '../components/FieldNotesView';
import { PersonalTasksView } from '../components/PersonalTasksView';
import { ColumnsPopover, saveVisibleColumns, loadVisibleColumns, loadColumnOrder, saveColumnOrder } from '../components/ColumnsPopover';
import { BaseCampView } from '../components/BaseCampView';
import { NewSectionDialog } from '../components/NewSectionDialog';
import { ShareProjectDialog } from '../components/ShareProjectDialog';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { AuthDialog } from '../components/AuthDialog';
import { MyTasksView } from '../components/MyTasksView';
import { ReportsView } from '../components/ReportsView';
import { ProjectTemplatesDialog } from '../components/ProjectTemplatesDialog';
import { EmptyProjectState } from '../components/EmptyProjectState';
import { DueBanner } from '../components/DueBanner';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { HelpCircle, ChevronUp, Filter, ListFilter, Share2, Sparkles, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useMeridianData } from '../data/useMeridianData';
import { useWebSocket } from '../hooks/useWebSocket';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import type { Status, Priority, Category, Initiative } from '../data/mockData';
import {
  emptyTaskListFilters,
  loadTaskFiltersFromStorage,
  saveTaskFiltersToStorage,
  activeFilterCount,
  describeActiveFilters,
  filterInitiativesByTaskFilters,
  type TaskListFilters,
} from '../lib/taskFilterUtils';
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
    duplicateProject,
    updateSection,
    reorderSections,
    crew,
    customFields,
    standardFields,
    myTasksInitiatives,
    myTasksLoading,
    loadMyTasksAcrossProjects,
  } = useMeridianData();
  const [projectIsAdmin, setProjectIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<NavView>('summit_board');
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [timelinePanelExpanded, setTimelinePanelExpanded] = useState(true);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
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
  const [filters, setFilters] = useState<TaskListFilters>(() => emptyTaskListFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filtersHydratedRef = useRef(false);
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
  const [uncategorizedDisplayNames, setUncategorizedDisplayNames] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState<string | undefined>(undefined);
  const [templatesProjectId, setTemplatesProjectId] = useState<string | null>(null);

  const currentUser = propsCurrentUser !== undefined ? propsCurrentUser : internalUser;

  const canDeleteOwnAdminTask = useCallback(
    (init: Initiative) => {
      if (!fromApi) return true;
      if (!currentUser?.id) return false;
      const admin = init.is_project_admin ?? projectIsAdmin;
      if (!admin) return false;
      if (!init.created_by_id || String(init.created_by_id) !== String(currentUser.id)) return false;
      return true;
    },
    [fromApi, currentUser?.id, projectIsAdmin]
  );

  useEffect(() => {
    if (!fromApi || !selectedProjectId) {
      setProjectIsAdmin(false);
      return;
    }
    let cancelled = false;
    get<{ is_project_admin?: boolean }>(`/api/projects/${selectedProjectId}/access`)
      .then((d) => {
        if (!cancelled) setProjectIsAdmin(!!d?.is_project_admin);
      })
      .catch(() => {
        if (!cancelled) setProjectIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromApi, selectedProjectId]);

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
  const categoryOptions = useMemo(() => {
    const f = standardFields?.find((s: { field_key?: string }) => s.field_key === 'category');
    const opts = f?.options_json;
    if (!Array.isArray(opts) || opts.length === 0) return undefined;
    const mapped = opts
      .map((o: { label?: string; color?: string }) => ({
        label: String(o?.label ?? '').trim(),
        color: o?.color,
      }))
      .filter((o) => o.label.length > 0);
    const seen = new Set<string>();
    return mapped.filter((o) => {
      if (seen.has(o.label)) return false;
      seen.add(o.label);
      return true;
    });
  }, [standardFields]);

  const filterCategoryLabels = useMemo((): Category[] => {
    const fromStd = categoryOptions?.map((o) => o.label) ?? [];
    if (fromStd.length > 0) return fromStd as Category[];
    return ['Engineering', 'Design', 'Sales', 'Product', 'Operations'] as Category[];
  }, [categoryOptions]);

  const filteredInitiativesForBoard = useMemo(
    () => filterInitiativesByTaskFilters(initiatives, filters),
    [initiatives, filters]
  );

  const BUILT_IN_STANDARD_FIELD_KEYS = useMemo(
    () => new Set(['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate', 'topic']),
    []
  );
  const standardExtraFieldsForDrawer = useMemo(() => {
    return (standardFields || [])
      .filter((f: { field_key?: string }) => {
        const k = f.field_key;
        return typeof k === 'string' && k.length > 0 && !BUILT_IN_STANDARD_FIELD_KEYS.has(k);
      })
      .sort((a: { sort_order?: number }, b: { sort_order?: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [standardFields, BUILT_IN_STANDARD_FIELD_KEYS]);

  const handleTaskFieldValueUpdate = useCallback(
    async (taskId: string, fieldId: string, value: string | number | boolean | null) => {
      const payload: {
        fieldId: string;
        valueText?: string;
        valueNumber?: number;
        valueDate?: string;
        valueBoolean?: boolean;
      } = { fieldId };
      if (typeof value === 'string') payload.valueText = value;
      else if (typeof value === 'number') payload.valueNumber = value;
      else if (typeof value === 'boolean') payload.valueBoolean = value;
      await patch(`/api/tasks/${taskId}/field-values`, { values: [payload] });
      refresh();
    },
    [refresh]
  );

  const taskAssignedToCurrentUser = (i: Initiative, u: { id: string; email?: string }) => {
    if (i.assignee_user_id && i.assignee_user_id === u.id) return true;
    const ue = (u.email || '').toLowerCase().trim();
    if (ue && i.assignee_email && String(i.assignee_email).toLowerCase().trim() === ue) return true;
    return false;
  };
  const myTasksCount = useMemo(() => {
    if (!currentUser) return 0;
    return myTasksInitiatives.filter((i) => taskAssignedToCurrentUser(i, currentUser) && i.status !== 'Complete').length;
  }, [myTasksInitiatives, currentUser]);

  useEffect(() => {
    if (!fromApi || projects.length === 0) return;
    loadMyTasksAcrossProjects();
  }, [fromApi, projects.length, loadMyTasksAcrossProjects]);

  const prevViewForMyTasksRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentView === 'my_tasks' && fromApi && projects.length > 0) {
      const entered = prevViewForMyTasksRef.current !== 'my_tasks';
      if (entered) loadMyTasksAcrossProjects();
    }
    prevViewForMyTasksRef.current = currentView;
  }, [currentView, fromApi, projects.length, loadMyTasksAcrossProjects]);

  // Real-time WebSocket — refresh data on item/comment events
  useWebSocket({
    onMessage: useCallback((msg: { type: string }) => {
      if (['item_updated', 'item_created', 'item_deleted', 'comment_added'].includes(msg.type)) {
        refresh();
        loadMyTasksAcrossProjects();
      }
    }, [refresh, loadMyTasksAcrossProjects]),
  });

  // Keyboard navigation across all visible tasks
  const allVisibleItems = initiatives.map(i => ({ id: i.id }));
  const keyboardOnDeleteItem = useCallback(
    async (id: string) => {
      const init = initiatives.find((i) => i.id === id);
      if (!init || !canDeleteOwnAdminTask(init)) return;
      if (confirm(`Delete "${init.name}"?`)) {
        await deleteItem(id);
        refreshActivity();
        setFocusedId(null);
      }
    },
    [initiatives, canDeleteOwnAdminTask, deleteItem, refreshActivity]
  );
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
    onDeleteItem: keyboardOnDeleteItem,
    enabled: !showGlobalSearch && !showAddInitiative && !showImport,
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

  // Restore task filters when project changes (v2 storage + legacy migration)
  useEffect(() => {
    if (!selectedProjectId) {
      filtersHydratedRef.current = false;
      return;
    }
    const loaded = loadTaskFiltersFromStorage(selectedProjectId);
    setFilters(loaded ?? emptyTaskListFilters());
    filtersHydratedRef.current = true;
  }, [selectedProjectId]);

  // Persist filters when they change (after initial hydrate for this project)
  useEffect(() => {
    if (!selectedProjectId || !filtersHydratedRef.current) return;
    saveTaskFiltersToStorage(selectedProjectId, filters);
  }, [selectedProjectId, filters]);

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

  // Load uncategorized section display name from localStorage (per project)
  useEffect(() => {
    if (!selectedProjectId) return;
    try {
      const stored = localStorage.getItem(`todo_uncategorized_name_${selectedProjectId}`);
      if (stored && stored.trim()) {
        setUncategorizedDisplayNames((prev) => ({ ...prev, [selectedProjectId]: stored.trim() }));
      }
    } catch (_) {}
  }, [selectedProjectId]);

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
    const deletable = selectedIds.filter((id) => {
      const init = initiatives.find((i) => i.id === id);
      return init && canDeleteOwnAdminTask(init);
    });
    if (deletable.length === 0) {
      toast.error('No selected tasks can be deleted. Admins may only delete tasks they created.');
      return;
    }
    if (deletable.length < selectedIds.length) {
      toast.info('Some selected tasks cannot be deleted (admin + creator only). Only deletable tasks will be removed.');
    }
    if (!confirm(`Delete ${deletable.length} item(s)?`)) return;
    try {
      await Promise.all(deletable.map((id) => deleteItem(id)));
      setSelectedIds([]);
      refreshActivity();
      toast.success(`Deleted ${deletable.length} item(s)`);
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
    document.title = proj ? `${proj} · ${view}` : 'Home';
  }, [selectedProject, currentView]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)]">
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
                onOpenCustomFields={() => setShowCustomFields(true)}
                currentView={currentView}
                onNavigateView={(v) => { setCurrentView(v); setSidebarOpen(false); }}
                fieldNotesCount={0}
                myTasksCount={myTasksCount}
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
            onOpenCustomFields={() => setShowCustomFields(true)}
            currentView={currentView}
            onNavigateView={(v) => setCurrentView(v)}
            fieldNotesCount={0}
            myTasksCount={myTasksCount}
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
          onDuplicateProject={async (id, name) => {
            try {
              const created = await duplicateProject(id, name ? { name } : undefined);
              if (created) toast.success(`Duplicated to "${created.name}"`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Duplicate failed');
            }
          }}
          onToggleActivity={() => setShowActivityPanel(!showActivityPanel)}
          selectedProjectName={selectedProject?.name}
          sprintLabel={selectedSprint ? `${selectedSprint.start_date || ''} – ${selectedSprint.end_date || ''}` : undefined}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
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
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto min-w-0">
          <div className="max-w-[1600px] mx-auto p-6">
            {projects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-5 shadow-[0_10px_25px_rgba(79,70,229,0.35)]">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Welcome to AgileOps</h2>
                <p className="text-gray-500 mb-7 max-w-md">Create your first project to start tracking tasks, manage your team, and ship faster.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowNewProject(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)]">
                    Create a project
                  </button>
                  <button onClick={() => setShowTemplates(true)}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Start from template
                  </button>
                </div>
              </div>
            )}
            {selectedProject && (() => {
              const projColor = (selectedProject.color && /^#[0-9A-Fa-f]{6}$/.test(selectedProject.color))
                ? selectedProject.color
                : '#4F46E5';
              return (
                <div className="mb-5 relative overflow-hidden rounded-2xl bg-white border border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                  {/* Color band tied to the project */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ background: `linear-gradient(to bottom, ${projColor}, ${projColor}cc)` }}
                  />
                  <div className="pl-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full ring-4 ring-white"
                          style={{ backgroundColor: projColor, boxShadow: `0 0 0 2px ${projColor}33` }}
                        />
                        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 truncate">{selectedProject.name}</h2>
                      </div>
                      {selectedProject.description ? (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2 max-w-2xl">{selectedProject.description}</p>
                      ) : null}
                      {selectedSprint && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--secondary)] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active sprint
                          </span>
                          <span className="tabular-nums">
                            {selectedSprint.start_date || '—'} – {selectedSprint.end_date || '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={() => setShowShareProject(true)}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {VIEW_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setCurrentView(tab.id)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      currentView === tab.id
                        ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {(currentView === 'summit_board' || currentView === 'manifest') && (
                  <>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilterModal(true)}>
                      <Filter className="w-4 h-4" />
                      Filter
                      {activeFilterCount(filters) > 0 && (
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                          {activeFilterCount(filters)}
                        </span>
                      )}
                    </Button>
                    {/* Import template button — temporarily hidden (dev request).
                        Restore by uncommenting when the feature is ready for users.
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
                    */}
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

            {(currentView === 'summit_board' || currentView === 'manifest') && activeFilterCount(filters) > 0 && selectedProjectId && (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/95 to-white px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                      <ListFilter className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Filters are applied</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        List and board show matching tasks only.{' '}
                        <span className="font-medium text-indigo-800 tabular-nums">
                          {filteredInitiativesForBoard.length} of {initiatives.length} tasks
                        </span>{' '}
                        match.
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {describeActiveFilters(filters).map((line) => (
                          <li
                            key={line}
                            className="inline-flex items-center rounded-full bg-white border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-950 shadow-sm"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 sm:pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                      onClick={() => setShowFilterModal(true)}
                    >
                      Edit filters
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-indigo-800 hover:bg-indigo-100/80"
                      onClick={() => {
                        setFilters(emptyTaskListFilters());
                        toast.success('Filters cleared');
                      }}
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentView === 'observatory' ? (
              <AnalyticsView projectId={selectedProjectId} />
            ) : currentView === 'my_tasks' ? (
              <MyTasksView
                initiatives={myTasksInitiatives}
                crew={crew}
                currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User', email: currentUser.email } : null}
                projects={projects}
                loading={myTasksLoading}
                onUpdateItem={async (id, payload) => {
                  await updateItem(id, payload);
                  await loadMyTasksAcrossProjects();
                  refreshActivity();
                }}
                canDeleteTask={canDeleteOwnAdminTask}
                onDeleteItem={async (id) => {
                  await deleteItem(id);
                  await loadMyTasksAcrossProjects();
                  refreshActivity();
                }}
                onRefresh={loadMyTasksAcrossProjects}
              />
            ) : currentView === 'reports' ? (
              <ReportsView
                projects={projects}
                onOpenItem={(id, pid) => {
                  if (pid && pid !== selectedProjectId) setSelectedProjectId(pid);
                  const found = myTasksInitiatives.find((i) => i.id === id) || initiatives.find((i) => i.id === id) || null;
                  if (found) setDrawerInitiative(found);
                }}
              />
            ) : currentView === 'personal_tasks' ? (
              <PersonalTasksView
                projectId={selectedProjectId}
                projectName={selectedProject?.name ?? 'Personal tasks'}
                tasks={initiatives}
                onCreateTask={async (payload) => selectedProjectId && createItem(selectedProjectId, payload)}
                onUpdateTask={updateItem}
                onDeleteTask={deleteItem}
                canDeleteTask={canDeleteOwnAdminTask}
                onOpenTask={(task) => setDrawerInitiative(task)}
              />
            ) : currentView === 'expedition_map' ? (
              <GanttChart
                initiatives={initiatives}
                trackerSections={trackerSections.map((s) => ({ id: s.id, title: s.title }))}
                customFields={customFields as { id: string; name: string; field_type: string; target?: string; applies_to?: string }[]}
              />
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
                onCategoryOptionsChanged={() => { refresh(); }}
                collaborators={selectedProject?.collaborators ?? []}
                onUpdateCollaborators={async (next) => {
                  if (!selectedProjectId) return;
                  await updateProject(selectedProjectId, { collaborators: next });
                }}
              />
            ) : currentView === 'summit_board' ? (
              <SummitBoardKanban
                initiatives={filteredInitiativesForBoard}
                crew={crew}
                currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User' } : null}
                onUpdateStatus={async (id, status) => updateItem(id, { status })}
                onUpdateItem={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
                canDeleteTask={canDeleteOwnAdminTask}
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
                    standardFields={standardFields}
                    // Always use project column prefs so new standard/custom fields from Base Camp appear on every tracker.
                    visibleColumns={visibleColumns}
                    columnOrder={columnOrder}
                    onDeleteSection={deleteSection}
                    onRenameSection={async (trackerId, newName) => { await updateSection(trackerId, { name: newName }); refreshActivity(); }}
                    sectionTitleOverride={section.id === 'uncategorized' ? uncategorizedDisplayNames[selectedProjectId ?? ''] : undefined}
                    onUncategorizedNameChange={section.id === 'uncategorized' && selectedProjectId ? (name: string) => {
                      try {
                        localStorage.setItem(`todo_uncategorized_name_${selectedProjectId}`, name);
                        setUncategorizedDisplayNames((prev) => ({ ...prev, [selectedProjectId]: name }));
                      } catch (_) {}
                    } : undefined}
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
                    canDeleteTask={canDeleteOwnAdminTask}
                    onDeleteItem={async (id) => { await deleteItem(id); refreshActivity(); }}
                    onCreateSubItem={(parentId) => { setAddInitiativeParentId(parentId); setAddInitiativeTrackerId(null); setShowAddInitiative(true); }}
                    onItemCompleted={() => setCelebrateCount((c) => c + 1)}
                    priorityOptions={priorityOptions}
                    statusOptions={statusOptions}
                    categoryOptions={categoryOptions}
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
          key={(drawerInitiative || selectedInitiativeFromSearch)!.id}
          initiative={(drawerInitiative || selectedInitiativeFromSearch)!}
          crew={crew}
          currentUser={currentUser ? { id: currentUser.id, name: currentUser.name || currentUser.email || 'User' } : null}
          onClose={() => { setDrawerInitiative(null); setSelectedInitiativeFromSearch(null); }}
          onSave={async (id, payload) => { await updateItem(id, payload); refreshActivity(); }}
          onDelete={
            (drawerInitiative || selectedInitiativeFromSearch) &&
            canDeleteOwnAdminTask((drawerInitiative || selectedInitiativeFromSearch)!)
              ? async (id) => {
                  await deleteItem(id);
                  refreshActivity();
                  setDrawerInitiative(null);
                  setSelectedInitiativeFromSearch(null);
                }
              : undefined
          }
          priorityOptions={priorityOptions}
          statusOptions={statusOptions}
          categoryOptions={categoryOptions}
          customFields={customFields}
          standardExtraFields={standardExtraFieldsForDrawer}
          onUpdateFieldValue={handleTaskFieldValueUpdate}
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
        crew={crew.map(c => ({ id: c.id, name: c.name || 'Unnamed', initials: c.initials }))}
        categoryOptions={categoryOptions}
        priorityOptions={priorityOptions}
        statusOptions={statusOptions}
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

      <TaskFiltersModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        value={filters}
        onApply={(next) => {
          setFilters(next);
          toast.success(activeFilterCount(next) === 0 ? 'Filters cleared' : 'Filters applied');
        }}
        statusOptions={(statusOptions?.map((o) => o.label) ?? ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete']) as Status[]}
        priorityOptions={(priorityOptions?.map((o) => o.label) ?? ['P0', 'P1', 'P2']) as Priority[]}
        categoryOptions={filterCategoryLabels}
        ownerOptions={crew.map((c) => c.name).filter(Boolean)}
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