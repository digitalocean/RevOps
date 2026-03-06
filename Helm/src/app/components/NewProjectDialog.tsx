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
  selectedWorkspaceId: string | null;
  onCreate: (workspaceId: string, name: string) => Promise<unknown>;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  selectedWorkspaceId,
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
    if (!selectedWorkspaceId) {
      toast.error('Select a workspace first');
      return;
    }
    setCreating(true);
    try {
      await onCreate(selectedWorkspaceId, n);
      toast.success('Project created');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        {!selectedWorkspaceId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            Select a workspace first (create one from the bottom of the sidebar).
          </p>
        )}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Project name</label>
          <Input
            placeholder="e.g. Salesforce Integrations"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!selectedWorkspaceId}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!selectedWorkspaceId || !name.trim() || creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
