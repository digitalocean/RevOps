import { useState } from 'react';
import { toast } from 'sonner';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
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
  const [names, setNames] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateName = (index: number, value: string) => {
    setNames(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addAnother = () => setNames(prev => [...prev, '']);
  const remove = (index: number) => {
    if (names.length <= 1) return;
    setNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const trimmed = names.map(n => n.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      setError('At least one section name is required');
      return;
    }
    if (!projectId) {
      setError('Select a project first.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      for (const n of trimmed) {
        await onCreate(projectId, n);
      }
      setNames(['']);
      onOpenChange(false);
      toast.success(trimmed.length === 1 ? 'Section created' : `${trimmed.length} sections created`);
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
      <DialogContent aria-describedby={undefined} className="sm:max-w-[440px] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-gray-200/90 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/5 px-6 pt-6 pb-4">
          <DialogHeader className="flex flex-row items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ListPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">Create sections</DialogTitle>
              <p className="text-[13px] text-gray-500 mt-0.5">Add one or more sections. Use &quot;Add another&quot; to create several at once.</p>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5 border-t border-gray-100 overflow-y-auto flex-1">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2 block">Section names</label>
          <div className="space-y-2">
            {names.map((name, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="e.g. Sprint 1, Backlog"
                  value={name}
                  onChange={(e) => updateName(index, e.target.value)}
                  disabled={!projectId}
                  className="flex-1 rounded-xl h-11 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-gray-400 hover:text-red-600"
                  onClick={() => remove(index)}
                  disabled={names.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={addAnother}
          >
            <Plus className="w-4 h-4 mr-1.5 inline" />
            Add another
          </Button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-gray-600 hover:bg-gray-100">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!projectId || !names.some(n => n.trim()) || submitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            {submitting ? 'Creating…' : names.filter(n => n.trim()).length ? `Create ${names.filter(n => n.trim()).length} section(s)` : 'Create section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
