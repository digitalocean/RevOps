import { useState } from 'react';
import { Plus, User, Bell, Search, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import type { Project } from '../data/useMeridianData';

interface WorkspaceHeaderProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => Promise<unknown>;
  onToggleActivity?: () => void;
}

export function WorkspaceHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onToggleActivity,
}: WorkspaceHeaderProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreateProject(name);
      setNewProjectName('');
      setShowNewProject(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedProjectId === proj.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {proj.name}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setShowNewProject(true)}
            title="New project"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Search className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 relative"
            onClick={onToggleActivity}
          >
            <Activity className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Badge>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cursor-pointer">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newProjectName.trim() || creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
