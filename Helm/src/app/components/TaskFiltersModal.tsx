import { useEffect, useState } from 'react';
import { Filter, ListFilter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { Status, Priority, Category } from '../data/mockData';
import type { TaskListFilters } from '../lib/taskFilterUtils';
import { emptyTaskListFilters, activeFilterCount } from '../lib/taskFilterUtils';

interface TaskFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current applied filters — copied into the modal when it opens */
  value: TaskListFilters;
  onApply: (next: TaskListFilters) => void;
  statusOptions: Status[];
  priorityOptions: Priority[];
  categoryOptions: Category[];
  ownerOptions: string[];
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      {label}
    </button>
  );
}

const DUE_OPTIONS: { id: TaskListFilters['duePreset']; label: string; hint: string }[] = [
  { id: 'any', label: 'Any due date', hint: 'No due filter' },
  { id: 'overdue', label: 'Overdue', hint: 'Past due, not complete' },
  { id: 'this_week', label: 'Due in 7 days', hint: 'Today through the next week' },
  { id: 'no_due', label: 'No due date', hint: 'Missing due date' },
];

export function TaskFiltersModal({
  open,
  onOpenChange,
  value,
  onApply,
  statusOptions,
  priorityOptions,
  categoryOptions,
  ownerOptions,
}: TaskFiltersModalProps) {
  const [draft, setDraft] = useState<TaskListFilters>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const toggle = <T extends string>(key: 'status' | 'priority' | 'category' | 'owner', v: T) => {
    setDraft((d) => {
      const arr = d[key] as T[];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      return { ...d, [key]: next };
    });
  };

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared = emptyTaskListFilters();
    setDraft(cleared);
    onApply(cleared);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ListFilter className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Filter tasks</DialogTitle>
              <DialogDescription className="mt-1">
                Choose one or more values in each section. Tasks must match every section that has a selection (e.g. status
                + priority together narrow the list).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <Chip key={s} active={draft.status.includes(s)} label={s} onClick={() => toggle('status', s)} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Priority</h3>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((p) => (
                <Chip key={p} active={draft.priority.includes(p)} label={p} onClick={() => toggle('priority', p)} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Category</h3>
            {categoryOptions.length === 0 ? (
              <p className="text-sm text-gray-400">No categories configured for this project.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((c) => (
                  <Chip key={c} active={draft.category.includes(c)} label={c} onClick={() => toggle('category', c)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Owner</h3>
            {ownerOptions.length === 0 ? (
              <p className="text-sm text-gray-400">No team members on this project yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ownerOptions.map((name) => (
                  <Chip
                    key={name}
                    active={draft.owner.includes(name)}
                    label={name}
                    onClick={() => toggle('owner', name)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Due date</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DUE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, duePreset: opt.id }))}
                  className={cn(
                    'text-left rounded-xl border px-3 py-2.5 transition-colors',
                    draft.duePreset === opt.id
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{opt.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <div>
              <span className="text-sm font-medium text-gray-900">Big rocks only</span>
              <p className="text-xs text-gray-500 mt-0.5">Show tasks marked as high-impact (5+ points)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.bigRocksOnly}
              onClick={() => setDraft((d) => ({ ...d, bigRocksOnly: !d.bigRocksOnly }))}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors',
                draft.bigRocksOnly ? 'bg-indigo-600' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  draft.bigRocksOnly ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </section>
        </div>

        <DialogFooter className="!mx-0 !mb-0 mt-0 rounded-b-2xl border-t border-gray-100 bg-gray-50/90 px-6 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 shrink-0" />
              {activeFilterCount(draft) === 0 ? 'No filters — all tasks visible' : `${activeFilterCount(draft)} active`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" className="rounded-xl" onClick={handleClear}>
                Clear all
              </Button>
              <Button type="button" className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={handleApply}>
                Apply filters
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
