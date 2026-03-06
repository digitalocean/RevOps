import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
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
] as const;

const STORAGE_KEY_PREFIX = 'todo_visible_columns_';

function storageKey(projectId: string | null, userId?: string | null): string {
  if (!projectId) return '';
  return userId ? `${STORAGE_KEY_PREFIX}${userId}_${projectId}` : `${STORAGE_KEY_PREFIX}${projectId}`;
}

function loadVisibleColumns(projectId: string | null, userId?: string | null): Set<string> {
  if (typeof window === 'undefined' || !projectId) return new Set(COLUMN_IDS.map((c) => c.id));
  try {
    const key = storageKey(projectId, userId);
    const fallbackKey = userId ? storageKey(projectId, null) : '';
    const raw = key ? localStorage.getItem(key) : null;
    const rawFallback = fallbackKey ? localStorage.getItem(fallbackKey) : null;
    const rawToUse = raw || rawFallback;
    if (rawToUse) {
      const arr = JSON.parse(rawToUse) as string[];
      return new Set(Array.isArray(arr) ? arr : COLUMN_IDS.map((c) => c.id));
    }
  } catch (_) {}
  return new Set(COLUMN_IDS.map((c) => c.id));
}

function saveVisibleColumns(projectId: string | null, visible: Set<string>, userId?: string | null) {
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
}

export function ColumnsPopover({
  projectId,
  userId = null,
  visibleColumns,
  onVisibleColumnsChange,
}: ColumnsPopoverProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      const saved = loadVisibleColumns(projectId, userId);
      onVisibleColumnsChange(saved);
    }
  }, [projectId, userId]);

  const toggle = (id: string) => {
    const next = new Set(visibleColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onVisibleColumnsChange(next);
    if (projectId) saveVisibleColumns(projectId, next, userId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-xs font-medium text-gray-500 mb-2">Visible columns</p>
        <div className="space-y-2">
          {COLUMN_IDS.map((col) => (
            <label key={col.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={visibleColumns.has(col.id)}
                onCheckedChange={() => toggle(col.id)}
              />
              <span className="text-sm">{col.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Saved per project. Persists after login and refresh.</p>
      </PopoverContent>
    </Popover>
  );
}
