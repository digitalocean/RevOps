import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Settings2, Users, UserPlus, Trash2 } from 'lucide-react';
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
  /** Toggle a column on or off (enable on tracker). */
  onToggleColumn: (columnId: string) => void;
  onOpenCustomFields: () => void;
  onOpenShare?: () => void;
  /** Called when project is deleted (e.g. redirect). */
  onDeleteProject?: (projectId: string) => void | Promise<void>;
}

export function BaseCampView({
  projectId,
  customFields,
  visibleColumns,
  onToggleColumn,
  onOpenCustomFields,
  onOpenShare,
  onDeleteProject,
}: BaseCampViewProps) {
  const taskFields = customFields.filter(isTaskField);
  const [members, setMembers] = useState<ProjectMember[]>([]);

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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Standard fields</h3>
          <p className="text-xs text-gray-500 mb-2">Built-in columns. By default all are enabled on new sections.</p>
          <ul className="space-y-1.5">
            {STANDARD_FIELDS.map((col) => (
              <li key={col.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <Checkbox
                    checked={visibleColumns.has(col.id)}
                    onCheckedChange={() => onToggleColumn(col.id)}
                  />
                  <span className="text-sm font-medium text-gray-800">{col.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">Custom fields</h3>
          <p className="text-xs text-gray-500 mb-2">Project-specific fields. Check to show on new sections.</p>
          {taskFields.length > 0 ? (
            <ul className="space-y-1.5">
              {taskFields.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <Checkbox
                      checked={visibleColumns.has(f.id)}
                      onCheckedChange={() => onToggleColumn(f.id)}
                    />
                    <span className="text-sm font-medium text-gray-800">{f.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-4">
              No custom fields yet. Click <strong>Manage custom fields</strong> to create them; they will appear here for you to enable on trackers.
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
