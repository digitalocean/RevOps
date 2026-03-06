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

interface NewSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onCreate: (projectId: string, name: string) => Promise<{ id: string; name: string } | null>;
}

export function NewSectionDialog({
  open,
  onOpenChange,
  projectId,
  onCreate,
}: NewSectionDialogProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError('Section name is required');
      return;
    }
    if (!projectId) {
      setError('Select a project first.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(projectId, n);
      setName('');
      onOpenChange(false);
      toast.success('Section created');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create section';
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
          <DialogTitle>New section</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">Add a tracker to group tasks.</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section-name">Section name</Label>
            <Input
              id="section-name"
              placeholder="e.g. Sprint 1, Backlog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!projectId}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!projectId || !name.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
