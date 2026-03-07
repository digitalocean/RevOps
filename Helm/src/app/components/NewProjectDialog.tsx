import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, isPersonal?: boolean) => Promise<unknown>;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Project name is required');
      return;
    }
    setCreating(true);
    try {
      const isPersonal = n.toLowerCase() === 'personal project';
      await onCreate(n, isPersonal);
      toast.success(isPersonal ? 'Personal project created (only you can see it)' : 'Project created');
      setName('');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold text-gray-900">New project</DialogTitle>
          <p className="text-sm text-gray-500">Create a new project.</p>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Project name</label>
          <Input
            placeholder="e.g. Personal Project, My Team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim() || creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
