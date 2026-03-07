import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface AddInitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  parentId?: string | null;
  /** When adding from a section, pass its tracker id so the item is created in that section */
  trackerId?: string | null;
  onCreate: (projectId: string, payload: { title: string; description?: string }, parentId?: string | null, trackerId?: string | null) => Promise<unknown>;
}

export function AddInitiativeDialog({
  open,
  onOpenChange,
  projectId,
  parentId = null,
  trackerId = null,
  onCreate,
}: AddInitiativeDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    if (!projectId) {
      setError('Select a project first (use the project tabs above).');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(projectId, { title: t, description: description.trim() || undefined }, parentId || undefined, trackerId || undefined);
      setTitle('');
      setDescription('');
      onOpenChange(false);
      toast.success('Initiative created');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? 'Add sub-task' : 'Add task'}</DialogTitle>
          <DialogDescription>Add a new task to the tracker.</DialogDescription>
        </DialogHeader>
        {!projectId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60">
            Select a project in the header first, then add a task.
          </p>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initiative-title" className="text-sm font-medium text-slate-700">Title</Label>
            <Input
              id="initiative-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!projectId}
              className="rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initiative-desc" className="text-sm font-medium text-slate-700">Description (optional)</Label>
            <Input
              id="initiative-desc"
              placeholder="Brief description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!projectId}
              className="rounded-xl border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!projectId || !title.trim() || submitting} className="rounded-xl bg-blue-600 hover:bg-blue-700">
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
