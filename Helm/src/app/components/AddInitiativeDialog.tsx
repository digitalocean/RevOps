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
import { Label } from './ui/label';

interface AddInitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  parentId?: string | null;
  onCreate: (projectId: string, payload: { title: string; description?: string }, parentId?: string | null) => Promise<unknown>;
}

export function AddInitiativeDialog({
  open,
  onOpenChange,
  projectId,
  parentId = null,
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
      await onCreate(projectId, { title: t, description: description.trim() || undefined }, parentId || undefined);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parentId ? 'Add sub-item' : 'Summit Item'}</DialogTitle>
        </DialogHeader>
        {!projectId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            Select a project in the header tabs first, then add an initiative.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <Label htmlFor="initiative-title">Title</Label>
            <Input
              id="initiative-title"
              placeholder="Initiative title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!projectId}
            />
          </div>
          <div>
            <Label htmlFor="initiative-desc">Description (optional)</Label>
            <Input
              id="initiative-desc"
              placeholder="Brief description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!projectId}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!projectId || !title.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
