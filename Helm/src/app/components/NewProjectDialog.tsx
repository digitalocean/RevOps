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
import { Label } from './ui/label';

const PROJECT_COLORS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#059669', label: 'Green' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0891b2', label: 'Cyan' },
];

export interface NewProjectPayload {
  name: string;
  description?: string;
  color?: string;
  is_personal?: boolean;
}

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: NewProjectPayload) => Promise<unknown>;
  onCreated?: (projectId: string) => void;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0].value);
  const [isPersonal, setIsPersonal] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Project name is required');
      return;
    }
    setCreating(true);
    try {
      const result = await onCreate({
        name: n,
        description: description.trim() || undefined,
        color,
        is_personal: isPersonal,
      });
      toast.success(isPersonal ? 'Personal project created (only you can see it)' : 'Project created');
      if (onCreated && result && typeof result === 'object' && 'id' in (result as object)) {
        onCreated((result as { id: string }).id);
      }
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[0].value);
      setIsPersonal(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[0].value);
      setIsPersonal(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl shadow-xl border border-gray-200 bg-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">New project</DialogTitle>
              <DialogDescription className="text-[13px] text-gray-500 mt-0.5">
                Create a project to organize tasks and track progress.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label htmlFor="project-name" className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              Project name
            </Label>
            <Input
              id="project-name"
              placeholder="e.g. RevOps, Q1 Goals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="mt-1.5 h-10 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="project-desc" className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              Description (optional)
            </Label>
            <textarea
              id="project-desc"
              placeholder="Brief description of the project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none resize-none"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    color === c.value ? 'border-gray-900 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPersonal}
              onChange={(e) => setIsPersonal(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Personal project (only visible to you)</span>
          </label>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-lg text-gray-600 hover:bg-gray-100 border-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || creating}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
          >
            {creating ? 'Creating…' : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
