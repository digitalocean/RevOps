import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
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
import { Textarea } from './ui/textarea';

export interface AddInitiativePayload {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignee_id?: string;
  due_date?: string;
}

interface OptionRow { label: string; color?: string }

interface AddInitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  parentId?: string | null;
  trackerId?: string | null;
  onCreate: (projectId: string, payload: AddInitiativePayload, parentId?: string | null, trackerId?: string | null) => Promise<unknown>;
  /** Crew list for assignee select. */
  crew?: { id: string; name: string; initials?: string }[];
  /** Project-scoped category options (from standard_fields?project_id=…). */
  categoryOptions?: OptionRow[];
  /** Priority options (from standard_fields). Falls back to P0–P3. */
  priorityOptions?: OptionRow[];
  /** Status options. Falls back to standard statuses. */
  statusOptions?: OptionRow[];
}

const DEFAULT_PRIORITY: OptionRow[] = [
  { label: 'P0' }, { label: 'P1' }, { label: 'P2' }, { label: 'P3' },
];
const DEFAULT_STATUS: OptionRow[] = [
  { label: 'Not Started' },
  { label: 'On Track' },
  { label: 'In Review' },
  { label: 'At Risk' },
  { label: 'Blocked' },
  { label: 'Complete' },
];

export function AddInitiativeDialog({
  open,
  onOpenChange,
  projectId,
  parentId = null,
  trackerId = null,
  onCreate,
  crew = [],
  categoryOptions = [],
  priorityOptions,
  statusOptions,
}: AddInitiativeDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const [status, setStatus] = useState('Not Started');
  const [category, setCategory] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the dialog opens fresh so stale values don't leak across sessions.
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setPriority('P2');
      setStatus('Not Started');
      setCategory('');
      setAssigneeId('');
      setDueDate('');
      setError(null);
    }
  }, [open]);

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
      const payload: AddInitiativePayload = {
        title: t,
        description: description.trim() || undefined,
        priority,
        status,
        category: category.trim() || undefined,
        assignee_id: assigneeId || undefined,
        due_date: dueDate || undefined,
      };
      await onCreate(projectId, payload, parentId || undefined, trackerId || undefined);
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

  const prioList = priorityOptions?.length ? priorityOptions : DEFAULT_PRIORITY;
  const statusList = statusOptions?.length ? statusOptions : DEFAULT_STATUS;

  // Selectable styles for prio/status/category/assignee — uses native select
  // but with consistent rounded look matching the rest of the UI.
  const nativeSelectClass = "w-full h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-100 outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_4px_10px_rgba(79,70,229,0.3)] shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <DialogTitle>{parentId ? 'Add sub-task' : 'Add a new task'}</DialogTitle>
              <DialogDescription>Capture what needs to be done — fill what you know, edit the rest later.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {!projectId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60">
            Select a project in the header first, then add a task.
          </p>
        )}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="initiative-title" className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              id="initiative-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!projectId}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="initiative-desc" className="text-sm font-medium text-gray-700">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              id="initiative-desc"
              rows={3}
              placeholder="Add context, acceptance criteria, or links."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!projectId}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="initiative-priority" className="text-sm font-medium text-gray-700">Priority</Label>
              <select
                id="initiative-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={!projectId}
                className={nativeSelectClass}
              >
                {prioList.map((p) => (<option key={p.label} value={p.label}>{p.label}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initiative-status" className="text-sm font-medium text-gray-700">Status</Label>
              <select
                id="initiative-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={!projectId}
                className={nativeSelectClass}
              >
                {statusList.map((s) => (<option key={s.label} value={s.label}>{s.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="initiative-category" className="text-sm font-medium text-gray-700">Category</Label>
              <select
                id="initiative-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!projectId}
                className={nativeSelectClass}
              >
                <option value="">(None)</option>
                {categoryOptions.map((c) => (<option key={c.label} value={c.label}>{c.label}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="initiative-assignee" className="text-sm font-medium text-gray-700">Owner</Label>
              <select
                id="initiative-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!projectId}
                className={nativeSelectClass}
              >
                <option value="">Unassigned</option>
                {crew.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="initiative-due" className="text-sm font-medium text-gray-700">Due date</Label>
            <Input
              id="initiative-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!projectId}
              className="w-full"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!projectId || !title.trim() || submitting}>
            {submitting ? 'Creating…' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
