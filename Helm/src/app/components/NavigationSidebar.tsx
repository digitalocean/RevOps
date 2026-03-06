import { useState } from 'react';
import { Anchor, Briefcase, Settings, BookOpen, ChevronRight, LayoutDashboard, TrendingUp, Plus } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import type { Workspace } from '../data/useMeridianData';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, isActive, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <div className={isActive ? 'text-blue-600' : 'text-gray-500'}>
        {icon}
      </div>
      <span className="text-sm font-medium flex-1 text-left truncate">{label}</span>
    </button>
  );
}

interface NavigationSidebarProps {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string) => Promise<unknown>;
}

export function NavigationSidebar({
  workspaces,
  selectedWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}: NavigationSidebarProps) {
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreateWorkspace(name);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Workspaces
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowNewWorkspace(true)}
              title="New workspace"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {workspaces.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-2">No workspaces. Create one above.</p>
            )}
            {workspaces.map((ws) => (
              <SidebarItem
                key={ws.id}
                icon={<Briefcase className="w-4 h-4" />}
                label={ws.name}
                isActive={selectedWorkspaceId === ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
            Views
          </div>
          <div className="space-y-1">
            <SidebarItem
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
            />
            <SidebarItem
              icon={<TrendingUp className="w-4 h-4" />}
              label="Analytics"
            />
            <SidebarItem
              icon={<BookOpen className="w-4 h-4" />}
              label="Reports"
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <SidebarItem
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
        />
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
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewWorkspace(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newWorkspaceName.trim() || creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
