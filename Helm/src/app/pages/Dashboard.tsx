import { useState, useEffect } from 'react';
import { NavigationSidebar } from '../components/NavigationSidebar';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { KPIStatsBar } from '../components/KPIStatsBar';
import { TrackerSection } from '../components/TrackerSection';
import { GanttChart } from '../components/GanttChart';
import { ViewToggle } from '../components/ViewToggle';
import { ActivityPanel } from '../components/ActivityPanel';
import { FilterPanel } from '../components/FilterPanel';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { ExportMenu } from '../components/ExportMenu';
import { TeamCapacityView } from '../components/TeamCapacityView';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { GlobalSearch } from '../components/GlobalSearch';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { SavedViewsMenu } from '../components/SavedViewsMenu';
import { KeyboardShortcutsDialog } from '../components/KeyboardShortcutsDialog';
import { InitiativeDetailsDialog } from '../components/InitiativeDetailsDialog';
import { AddInitiativeDialog } from '../components/AddInitiativeDialog';
import { Button } from '../components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { BarChart3, HelpCircle } from 'lucide-react';
import { useMeridianData } from '../data/useMeridianData';
import type { Status, Priority, Category, Initiative } from '../data/mockData';

export function Dashboard() {
  const {
    initiatives,
    trackerSections,
    kpiData,
    loading,
    error,
    fromApi,
    refresh,
    workspaces,
    projects,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedProjectId,
    setSelectedProjectId,
    createWorkspace,
    createProject,
    createItem,
  } = useMeridianData();
  const [viewMode, setViewMode] = useState<'grid' | 'gantt' | 'analytics'>('grid');
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: [] as Status[],
    priority: [] as Priority[],
    category: [] as Category[],
    owner: [] as string[],
    bigRocksOnly: false
  });
  const [selectedInitiativeFromSearch, setSelectedInitiativeFromSearch] = useState<Initiative | null>(null);

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
      
      // Cmd/Ctrl + Shift + A for analytics
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setViewMode('analytics');
      }
      
      // Cmd/Ctrl + 1 for grid view
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setViewMode('grid');
      }
      
      // Cmd/Ctrl + 2 for gantt view
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setViewMode('gantt');
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

  const handleBulkStatusChange = (status: Status) => {
    // In a real app, this would update the backend
    setSelectedIds([]);
  };

  const handleBulkPriorityChange = (priority: Priority) => {
    // In a real app, this would update the backend
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    // In a real app, this would update the backend
    setSelectedIds([]);
  };

  const handleSelectInitiativeFromSearch = (initiative: Initiative) => {
    setSelectedInitiativeFromSearch(initiative);
  };

  const handleCreateProject = async (name: string) => {
    if (selectedWorkspaceId) await createProject(selectedWorkspaceId, name);
  };

  return (
    <div className="flex h-screen bg-white">
      <NavigationSidebar
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={(id) => {
          setSelectedWorkspaceId(id);
          setSelectedProjectId(null);
        }}
        onCreateWorkspace={createWorkspace}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
            <span>Meridian API: {error}. Using demo data.</span>
            <button type="button" onClick={refresh} className="text-amber-700 underline">Retry</button>
          </div>
        )}
        {fromApi && !error && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-800">
            Connected to Meridian — showing work items from your workspace.
          </div>
        )}
        <WorkspaceHeader
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => setSelectedProjectId(id)}
          onCreateProject={handleCreateProject}
          onToggleActivity={() => setShowActivityPanel(!showActivityPanel)}
        />
        <KPIStatsBar kpiData={kpiData} />
        
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-[1600px] mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Project Intelligence
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Track strategic initiatives, OKRs, and sprint progress across all teams
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <SavedViewsMenu currentFilters={filters} onApplyView={(newFilters) => setFilters(newFilters)} />
                <FilterPanel filters={filters} onFiltersChange={setFilters} />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setViewMode('analytics')}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
                <ViewToggle viewMode={viewMode === 'analytics' ? 'grid' : viewMode} onViewChange={setViewMode} />
                <ExportMenu />
                <QuickActionsMenu onAddInitiative={() => setShowAddInitiative(true)} />
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="space-y-4">
                {trackerSections.map((section) => (
                  <TrackerSection 
                    key={section.id} 
                    section={section} 
                    viewMode={viewMode} 
                    filters={filters}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                ))}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TeamCapacityView />
                  <MilestoneTimeline />
                </div>
              </div>
            ) : viewMode === 'gantt' ? (
              <GanttChart initiatives={initiatives} />
            ) : (
              <AnalyticsDashboard />
            )}
          </div>
        </div>
      </div>

      {showActivityPanel && (
        <ActivityPanel onClose={() => setShowActivityPanel(false)} />
      )}

      {selectedInitiativeFromSearch && (
        <InitiativeDetailsDialog 
          initiative={selectedInitiativeFromSearch}
          onClose={() => setSelectedInitiativeFromSearch(null)}
        />
      )}

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkPriorityChange={handleBulkPriorityChange}
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
        onOpenChange={setShowAddInitiative}
        projectId={selectedProjectId}
        onCreate={createItem}
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