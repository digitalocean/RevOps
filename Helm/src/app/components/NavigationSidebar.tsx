import { useState } from 'react';
import { toast } from 'sonner';
import { Anchor, LayoutDashboard, List, Map, FileText, BarChart3, Tent, Plus, Users } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import type { Workspace, Project, Sprint } from '../data/useMeridianData';

export type NavView = 'summit_board' | 'manifest' | 'expedition_map' | 'field_notes' | 'observatory' | 'base_camp';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, badge, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className={`flex-shrink-0 w-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {icon || <span className="w-4 block" />}
      </div>
      <span className="text-sm font-medium flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="text-xs text-gray-500 tabular-nums">{badge}</span>
      )}
    </button>
  );
}

interface NavigationSidebarProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string) => Promise<unknown>;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenNewProject: () => void;
  sprints: Sprint[];
  onOpenNewSprint: () => void;
  onOpenAddCrew: () => void;
  onOpenCustomFields: () => void;
  currentView: NavView;
  onNavigateView: (view: NavView) => void;
  fieldNotesCount?: number;
}

const NAV_ITEMS: { id: NavView; label: string; icon: React.ReactNode }[] = [
  { id: 'summit_board', label: 'Summit Board', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'manifest', label: 'Manifest', icon: <List className="w-4 h-4" /> },
  { id: 'expedition_map', label: 'Expedition Map', icon: <Map className="w-4 h-4" /> },
  { id: 'field_notes', label: 'Field Notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'observatory', label: 'Observatory', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'base_camp', label: 'Base Camp', icon: <Tent className="w-4 h-4" /> },
];

export function NavigationSidebar({
  workspaces,
  selectedWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenNewProject,
  sprints,
  onOpenNewSprint,
  onOpenAddCrew,
  onOpenCustomFields,
  currentView,
  onNavigateView,
  fieldNotesCount = 0,
}: NavigationSidebarProps) {
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
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

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-lg">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">Meridian</h1>
            <p className="text-xs text-gray-500">Project Intelligence</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
            Navigate
          </div>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                badge={item.id === 'field_notes' ? (fieldNotesCount ? String(fieldNotesCount) : undefined) : undefined}
                isActive={currentView === item.id}
                onClick={() => {
                  onNavigateView(item.id);
                  if (item.id === 'base_camp') onOpenCustomFields();
                }}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Projects
            </span>
            <button
              type="button"
              onClick={onOpenNewProject}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + New project
            </button>
          </div>
          <div className="space-y-1">
            {projects.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-1">No projects yet.</p>
            )}
            {projects.map((p) => (
              <SidebarItem
                key={p.id}
                icon={null}
                label={p.name}
                isActive={selectedProjectId === p.id}
                onClick={() => onSelectProject(p.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Sprints
            </span>
            <button
              type="button"
              onClick={onOpenNewSprint}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + New sprint
            </button>
          </div>
          <div className="space-y-1">
            {sprints.length === 0 ? (
              <p className="text-xs text-gray-500 px-3 py-1">No sprints yet</p>
            ) : (
              sprints.map((s) => (
                <SidebarItem
                  key={s.id}
                  icon={null}
                  label={s.name}
                  onClick={() => {}}
                />
              ))
            )}
          </div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={onOpenAddCrew}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">+ Add Crew</span>
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setShowNewWorkspace(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          + New workspace
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
