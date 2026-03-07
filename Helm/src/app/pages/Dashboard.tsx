import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { NavigationSidebar, type NavView } from '../components/NavigationSidebar';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { KPIStatsBar } from '../components/KPIStatsBar';
import { TrackerSection } from '../components/TrackerSection';
import { GanttChart } from '../components/GanttChart';
import { ActivityPanel } from '../components/ActivityPanel';
import { ExportMenu } from '../components/ExportMenu';
import { CategoryPriorityStatusMetrics } from '../components/CategoryPriorityStatusMetrics';
import { DueDateMetrics } from '../components/DueDateMetrics';
import { GlobalSearch } from '../components/GlobalSearch';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { SavedViewsMenu } from '../components/SavedViewsMenu';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog';
import { InitiativeDetailsDialog } from '../components/InitiativeDetailsDialog';
import { AddInitiativeDialog } from '../components/AddInitiativeDialog';
import { TeamMembersDialog } from '../components/TeamMembersDialog';
import { CustomFieldsDialog } from '../components/CustomFieldsDialog';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { NewSprintDialog } from '../components/NewSprintDialog';
import { ObservatoryView } from '../components/ObservatoryView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SummitBoardKanban } from '../components/SummitBoardKanban';
import { FilterSlidePanel, type FilterRow } from '../components/FilterSlidePanel';
import { FieldNotesView } from '../components/FieldNotesView';
import { ColumnsPopover } from '../components/ColumnsPopover';
import { NewSectionDialog } from '../components/NewSectionDialog';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { AuthDialog } from '../components/AuthDialog';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { HelpCircle, ChevronUp, Filter } from 'lucide-react';
import { useMeridianData } from '../data/useMeridianData';
import type { Status, Priority, Category, Initiative } from '../data/mockData';
import { get, post, patch } from '../api/meridian';

const VIEW_TABS: { id: NavView; label: string }[] = [
  { id: 'manifest', label: 'Trackers' },
  { id: 'expedition_map', label: 'Gantt' },
  { id: 'field_notes', label: 'Field Notes' },
  { id: 'observatory', label: 'Analytics' },
  { id: 'base_camp', label: 'Base Camp' },
  { id: 'summit_board', label: 'Board' },
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
    createSprint,
    createItem,
    createSection,
    updateItem,
    deleteItem,
    crew,
    customFields,
  } = useMeridianData();
  const [currentView, setCurrentView] = useState<NavView>('summit_board');
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [addInitiativeParentId, setAddInitiativeParentId] = useState<string | null>(null);
  const [addInitiativeTrackerId, setAddInitiativeTrackerId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate']));
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

  const currentUser = propsCurrentUser !== undefined ? propsCurrentUser : internalUser;

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

  const handleBulkStatusChange = async (status: Status) => {
    const count = selectedIds.length;
    try {
      await Promise.all(selectedIds.map((id) => updateItem(id, { status })));
      setSelectedIds([]);
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
      toast.success(`Assigned ${count} item(s) to ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign owner');
    }
  };

  const handleSelectInitiativeFromSearch = (initiative: Initiative) => {
    setSelectedInitiativeFromSearch(initiative);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedSprint = sprints[0];
  const sprintLabel = selectedSprint ? selectedSprint.name : 'Sprint';
  const progressPercent = kpiData.overallProgress ?? 0;

  useEffect(() => {
    if (celebrateCount > 0) {
      const t = setTimeout(() => setCelebrateCount(0), 3000);
      return () => clearTimeout(t);
    }
  }, [celebrateCount]);

  return (
    <div className="flex h-screen bg-[var(--bg-app)]">
      <NavigationSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onOpenNewProject={() => setShowNewProject(true)}
        initiatives={initiatives}
        trackerSections={trackerSections}
        crew={crew}
        onOpenAddCrew={() => setShowTeamMembers(true)}
        onOpenCustomFields={() => setShowCustomFields(true)}
        currentView={currentView}
        onNavigateView={(v) => setCurrentView(v)}
        fieldNotesCount={initiatives.length}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
            <span>To-DO API: {error}. Using demo data.</span>
            <button type="button" onClick={refresh} className="text-amber-700 underline">Retry</button>
          </div>
        )}
        {fromApi && !error && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-800">
            Connected to To-DO — showing tasks from your workspace.
          </div>
        )}
        <WorkspaceHeader
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => setSelectedProjectId(id)}
          onOpenNewProject={() => setShowNewProject(true)}
          onToggleActivity={() => setShowActivityPanel(!showActivityPanel)}
          selectedProjectName={selectedProject?.name}
          sprintLabel={selectedSprint ? `${selectedSprint.start_date || ''} – ${selectedSprint.end_date || ''}` : undefined}
          progressPercent={progressPercent}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        <KPIStatsBar kpiData={kpiData} />
        
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-[1600px] mx-auto p-6">
            {selectedProject && (
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">{selectedProject.name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  {selectedSprint && (
                    <span>
                      {selectedSprint.start_date || '—'} – {selectedSprint.end_date || '—'}
                    </span>
                  )}
                  <span>{progressPercent}% complete</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 border-b border-gray-200">
                {VIEW_TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'base_camp') setShowCustomFields(true);
                      else setCurrentView(tab.id);
                    }}
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
                    <SavedViewsMenu projectId={selectedProjectId} currentFilters={filters} onApplyView={(newFilters) => setFilters(newFilters)} />
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilterSlide(true)}>
                      <Filter className="w-4 h-4" />
                      Filter
                      {filterRows.length > 0 && (
                        <span className="rounded-full bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 text-xs font-medium">
                          {filterRows.length}
                        </span>
                      )}
                    </Button>
                    <ExportMenu />
                    <ColumnsPopover
                      projectId={selectedProjectId}
                      userId={currentUser?.id}
                      visibleColumns={visibleColumns}
                      onVisibleColumnsChange={setVisibleColumns}
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
            ) : currentView === 'expedition_map' ? (
              <GanttChart initiatives={initiatives} />
            ) : currentView === 'field_notes' ? (
              <FieldNotesView projectId={selectedProjectId} onRefresh={refresh} />
            ) : currentView === 'base_camp' ? (
              <div className="py-8 text-center text-gray-500">
                Use <strong>Base Camp</strong> in the sidebar or the tab to manage custom fields and settings.
              </div>
            ) : currentView === 'summit_board' ? (
              <SummitBoardKanban
                initiatives={initiatives}
                crew={crew}
                onUpdateStatus={async (id, status) => updateItem(id, { status })}
                onUpdateItem={updateItem}
                onDeleteItem={deleteItem}
                onAddItem={() => setShowAddInitiative(true)}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Trackers</h3>
                </div>
                {trackerSections.map((section) => (
                  <TrackerSection
                    key={section.id}
                    section={section}
                    crew={crew}
                    customFields={customFields}
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
                    onAddItem={() => {
                      setAddInitiativeParentId(null);
                      setAddInitiativeTrackerId(section.id === 'uncategorized' ? null : section.id);
                      setShowAddInitiative(true);
                    }}
                    onCreateItem={async (projectId, payload, trackerId) => {
                      await createItem(projectId, payload, undefined, trackerId ?? undefined);
                    }}
                    onUpdateItem={updateItem}
                    onDeleteItem={deleteItem}
                    onCreateSubItem={(parentId) => { setAddInitiativeParentId(parentId); setAddInitiativeTrackerId(null); setShowAddInitiative(true); }}
                    onItemCompleted={() => setCelebrateCount((c) => c + 1)}
                  />
                ))}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <CategoryPriorityStatusMetrics initiatives={initiatives} />
                  <DueDateMetrics initiatives={initiatives} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showActivityPanel && (
        <ActivityPanel projectId={selectedProjectId} onClose={() => setShowActivityPanel(false)} />
      )}

      {selectedInitiativeFromSearch && (
        <InitiativeDetailsDialog 
          initiative={selectedInitiativeFromSearch}
          crew={crew}
          onClose={() => setSelectedInitiativeFromSearch(null)}
          onSave={async (id, payload) => {
            await updateItem(id, payload);
            setSelectedInitiativeFromSearch(null);
          }}
          onDelete={async (id) => {
            await deleteItem(id);
            setSelectedInitiativeFromSearch(null);
          }}
        />
      )}

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          crew={crew}
          onClearSelection={() => setSelectedIds([])}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkPriorityChange={handleBulkPriorityChange}
          onBulkAssignOwner={handleBulkAssignOwner}
          onBulkDelete={handleBulkDelete}
        />
      )}

      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        onSelectInitiative={handleSelectInitiativeFromSearch}
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
        onCreate={createSection}
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
        workspaceId={selectedProjectId ? (projects.find((p) => p.id === selectedProjectId)?.workspace_id ?? projects[0]?.workspace_id ?? null) : (projects[0]?.workspace_id ?? null)}
      />

      <NewProjectDialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
        onCreate={async (name, isPersonal) => {
          await createProject(name, isPersonal);
        }}
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
        statusOptions={['On Track', 'At Risk', 'Complete', 'Blocked', 'Not Started', 'In Review'] as Status[]}
        priorityOptions={['P0', 'P1', 'P2', 'P3'] as Priority[]}
        categoryOptions={['Engineering', 'Design', 'Sales', 'Product', 'Operations'] as Category[]}
        ownerOptions={crew.map((c) => c.name)}
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
            <p>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> for shortcuts</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}