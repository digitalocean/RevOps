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

interface NewSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  onCreate: (projectId: string, name: string, start_date?: string, end_date?: string) => Promise<unknown>;
}

export function NewSprintDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onCreate,
}: NewSprintDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Sprint name is required');
      return;
    }
    if (!projectId) {
      toast.error('Select a project first');
      return;
    }
    setCreating(true);
    try {
      await onCreate(projectId, n, startDate || undefined, endDate || undefined);
      toast.success('Sprint created');
      setName('');
      setStartDate('');
      setEndDate('');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create sprint');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New sprint</DialogTitle>
        </DialogHeader>
        {!projectId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            Select a project first.
          </p>
        )}
        <p className="text-sm text-gray-600">Project: <strong>{projectName || '—'}</strong></p>
        <div className="space-y-4">
          <div>
            <Label>Sprint name</Label>
            <Input
              placeholder="e.g. Sprint 14"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!projectId}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!projectId}
              />
            </div>
            <div>
              <Label className="text-xs">End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!projectId}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!projectId || !name.trim() || creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
