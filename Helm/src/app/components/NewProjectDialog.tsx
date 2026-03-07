import { useState } from 'react';
import { toast } from 'sonner';
import { FolderPlus } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[420px] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-gray-200/90 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500/10 via-white to-purple-500/5 px-6 pt-6 pb-4">
          <DialogHeader className="flex flex-row items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">New project</DialogTitle>
              <DialogDescription className="text-[13px] text-gray-500 mt-0.5">
                Create a project to organize tasks and track progress.
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>
        <div className="px-6 py-5 border-t border-gray-100">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-2 block">Project name</label>
          <Input
            placeholder="e.g. Personal Project, Q1 Goals"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-xl h-11 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm"
          />
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl text-gray-600 hover:bg-gray-100">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || creating}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
          >
            {creating ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
