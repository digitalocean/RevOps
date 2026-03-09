import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Settings2, Users, UserPlus } from 'lucide-react';
import { get } from '../api/meridian';

const STANDARD_FIELDS = [
  { id: 'name', label: 'Initiative' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
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
  /** Toggle a column on or off for this project (show/hide in Trackers view). */
  onToggleColumn: (columnId: string) => void;
  onOpenCustomFields: () => void;
  /** Open the share project dialog to add more people */
  onOpenShare?: () => void;
}

export function BaseCampView({
  projectId,
  customFields,
  visibleColumns,
  onToggleColumn,
  onOpenCustomFields,
  onOpenShare,
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
        Use the checkboxes below to choose which columns appear in the Trackers view for this project. Custom fields from this workspace are listed under &quot;Custom fields&quot;. You can also use the <strong>Columns</strong> button in the Trackers toolbar.
      </p>

      <div className="space-y-4">
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Standard fields</h3>
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

        {taskFields.length > 0 ? (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Custom fields</h3>
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
          </section>
        ) : (
          <p className="text-sm text-gray-500 py-4">
            No custom fields yet. Click <strong>Manage custom fields</strong> to create fields; they will appear here and you can enable them for the Trackers view.
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
