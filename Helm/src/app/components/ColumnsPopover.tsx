import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';

const COLUMN_IDS = [
  { id: 'name', label: 'Initiative' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'topic', label: 'Topic' },
] as const;

interface CustomFieldDef {
  id: string;
  name: string;
  field_type?: string;
  target?: string;
}

const STORAGE_KEY_PREFIX = 'todo_visible_columns_';

function storageKey(projectId: string | null, userId?: string | null): string {
  if (!projectId) return '';
  return userId ? `${STORAGE_KEY_PREFIX}${userId}_${projectId}` : `${STORAGE_KEY_PREFIX}${projectId}`;
}

/** Default built-in columns to show when user has not saved a preference (keeps table usable). */
const DEFAULT_VISIBLE_COLUMN_IDS = COLUMN_IDS.map((c) => c.id);

function loadVisibleColumns(projectId: string | null, userId?: string | null): Set<string> {
  if (typeof window === 'undefined' || !projectId) return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
  try {
    const key = storageKey(projectId, userId);
    const fallbackKey = userId ? storageKey(projectId, null) : '';
    const raw = key ? localStorage.getItem(key) : null;
    const rawFallback = fallbackKey ? localStorage.getItem(fallbackKey) : null;
    const rawToUse = raw || rawFallback;
    if (rawToUse) {
      const arr = JSON.parse(rawToUse) as string[];
      return new Set(Array.isArray(arr) && arr.length > 0 ? arr : DEFAULT_VISIBLE_COLUMN_IDS);
    }
  } catch (_) {}
  return new Set(DEFAULT_VISIBLE_COLUMN_IDS);
}

export function saveVisibleColumns(projectId: string | null, visible: Set<string>, userId?: string | null) {
  if (typeof window === 'undefined' || !projectId) return;
  try {
    const key = storageKey(projectId, userId);
    if (key) localStorage.setItem(key, JSON.stringify([...visible]));
  } catch (_) {}
}

interface ColumnsPopoverProps {
  projectId: string | null;
  userId?: string | null;
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (visible: Set<string>) => void;
  customFields?: CustomFieldDef[];
}

function isTaskFieldForColumns(f: CustomFieldDef) {
  const target = (f as { target?: string }).target;
  const appliesTo = (f as { applies_to?: string }).applies_to;
  if (target === 'item' || target === 'task') return true;
  if (appliesTo === 'task' || appliesTo === 'item') return true;
  if (!target && !appliesTo) return true;
  if (appliesTo === 'tracker' || appliesTo === 'project') return false;
  return true;
}

export function ColumnsPopover({
  projectId,
  userId = null,
  visibleColumns,
  onVisibleColumnsChange,
  customFields = [],
}: ColumnsPopoverProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const taskFields = customFields.filter(isTaskFieldForColumns);
  const allColumns = [
    ...COLUMN_IDS,
    ...taskFields.map((f) => ({ id: f.id, label: f.name })),
  ];

  useEffect(() => {
    if (projectId) {
      const saved = loadVisibleColumns(projectId, userId);
      const merged = new Set(saved);
      taskFields.forEach((f) => merged.add(f.id));
      onVisibleColumnsChange(merged);
    }
  }, [projectId, userId, customFields.length]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(visibleColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onVisibleColumnsChange(next);
    if (projectId) saveVisibleColumns(projectId, next, userId);
  };

  return (
    <div className="relative inline-block" ref={panelRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Columns
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-[100] mt-1 w-56 rounded-md border border-gray-200 bg-white p-3 shadow-lg max-h-[70vh] overflow-y-auto"
          role="dialog"
          aria-label="Choose visible columns"
        >
          <p className="text-xs font-medium text-gray-500 mb-2">Visible columns</p>
          <div className="space-y-2">
            {allColumns.map((col) => (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1">
                <Checkbox
                  checked={visibleColumns.has(col.id)}
                  onCheckedChange={() => toggle(col.id)}
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Saved per project. Persists after login and refresh.</p>
        </div>
      )}
    </div>
  );
}
