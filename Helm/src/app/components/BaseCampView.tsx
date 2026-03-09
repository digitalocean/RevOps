import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Settings2, Users, UserPlus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { get } from '../api/meridian';

const STANDARD_FIELDS = [
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
  applies_to?: string;
}

function isTaskField(f: CustomFieldDef) {
  const t = f.target ?? f.applies_to;
  if (t === 'item' || t === 'task') return true;
  if (t === 'tracker' || t === 'project') return false;
  return true;
}

interface ProjectMember {
  id: string;
  crew_id: string;
  role: string;
  name: string;
  email?: string;
  initials?: string;
  is_creator?: boolean;
}

interface BaseCampViewProps {
  projectId: string | null;
  customFields: CustomFieldDef[];
  visibleColumns: Set<string>;
  /** Ordered list of column ids (for display and table). Empty = use default order. */
  columnOrder?: string[];
  /** Toggle a column on or off (enable on tracker). */
  onToggleColumn: (columnId: string) => void;
  /** Reorder columns (new ordered list of all column ids). */
  onReorderColumns?: (orderedIds: string[]) => void;
  onOpenCustomFields: () => void;
  onOpenShare?: () => void;
  onDeleteProject?: (projectId: string) => void | Promise<void>;
}

export function BaseCampView({
  projectId,
  customFields,
  visibleColumns,
  columnOrder = [],
  onToggleColumn,
  onReorderColumns,
  onOpenCustomFields,
  onOpenShare,
  onDeleteProject,
}: BaseCampViewProps) {
  const taskFields = customFields.filter(isTaskField);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const defaultOrder = [...STANDARD_FIELDS.map((c) => c.id), ...taskFields.map((f) => f.id)];
  const orderedIds = columnOrder.length > 0
    ? [...columnOrder.filter((id) => defaultOrder.includes(id)), ...defaultOrder.filter((id) => !columnOrder.includes(id))]
    : defaultOrder;
  const moveField = (index: number, delta: number) => {
    if (!onReorderColumns) return;
    const next = index + delta;
    if (next < 0 || next >= orderedIds.length) return;
    const newOrder = [...orderedIds];
    [newOrder[index], newOrder[next]] = [newOrder[next], newOrder[index]];
    onReorderColumns(newOrder);
  };

  useEffect(() => {
    if (!projectId) {
      setMembers([]);
      return;
    }
    get<ProjectMember[]>(`/api/projects/${projectId}/members`)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [projectId]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar: Shared with */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Shared with
          </h3>
          {onOpenShare && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onOpenShare} title="Share project">
              <UserPlus className="w-3.5 h-3.5" />
              Share
            </Button>
          )}
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-gray-500">No other members yet.</p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                {m.initials ? (
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {m.initials}
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 flex-shrink-0">
                    ?
                  </span>
                )}
                <span className="truncate text-gray-800 font-medium" title={m.email ?? m.name}>
                  {m.name || m.email || 'Unknown'}
                </span>
                {m.is_creator && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">owner</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main: Columns */}
      <div className="flex-1 overflow-y-auto py-8 px-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Base Camp — Columns for Trackers</h2>
        <Button type="button" variant="outline" size="sm" onClick={onOpenCustomFields} className="gap-2">
          <Settings2 className="w-4 h-4" />
          Manage custom fields
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Enable fields for trackers: only checked fields will appear when you create a new section. Use the <strong>Columns</strong> button in Trackers to show/hide columns per view.
      </p>

      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Standard &amp; custom fields</h3>
          <p className="text-xs text-gray-500 mb-2">Enable columns for trackers and use up/down to rearrange order.</p>
          <ul className="space-y-1.5">
            {orderedIds.map((colId, index) => {
              const col = STANDARD_FIELDS.find((c) => c.id === colId) ?? taskFields.find((f) => f.id === colId);
              if (!col) return null;
              const label = 'label' in col ? col.label : col.name;
              return (
                <li key={colId} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-1 shrink-0">
                    {onReorderColumns && (
                      <>
                        <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30" title="Move up" aria-label="Move up">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveField(index, 1)} disabled={index === orderedIds.length - 1} className="p-1 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30" title="Move down" aria-label="Move down">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <Checkbox
                      checked={visibleColumns.has(colId)}
                      onCheckedChange={() => onToggleColumn(colId)}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {taskFields.length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              Add custom fields via <strong>Manage custom fields</strong>; they appear above for enable and reorder.
            </p>
          )}
        </section>

        {projectId && onDeleteProject && (
          <section className="pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-2">Danger zone</h3>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
              <p className="text-sm text-gray-700 mb-2">Permanently delete this project and all its sections and tasks. This cannot be undone.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-100 hover:text-red-700"
                onClick={() => {
                  if (window.confirm('Delete this project permanently? This cannot be undone.')) {
                    onDeleteProject(projectId);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete project
              </Button>
            </div>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
