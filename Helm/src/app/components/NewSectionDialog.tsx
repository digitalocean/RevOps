import { useState } from 'react';
import { toast } from 'sonner';
import { ListPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
      toast.success('Tracker created');
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
      <DialogContent aria-describedby={undefined} className="sm:max-w-[420px] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-gray-200/90 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 px-6 pt-6 pb-4">
          <DialogHeader className="flex flex-row items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ListPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">+ Tracker</DialogTitle>
              <p className="text-[13px] text-gray-500 mt-0.5">Add a section to group tasks (e.g. Sprint 1, Backlog).</p>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5 border-t border-gray-100">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2 block">Section name</label>
          <Input
            id="section-name"
            placeholder="e.g. Sprint 1, Backlog"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={!projectId}
            className="w-full rounded-xl h-11 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm"
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-gray-600 hover:bg-gray-100">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!projectId || !name.trim() || submitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            {submitting ? 'Creating…' : 'Create tracker'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
