import { Button } from './ui/button';
import { Check, Plus, Settings2 } from 'lucide-react';

const BUILTIN_COLUMNS = [
  { id: 'name', label: 'Initiative' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due Date' },
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

interface BaseCampViewProps {
  projectId: string | null;
  customFields: CustomFieldDef[];
  visibleColumns: Set<string>;
  onApplyToTracker: (columnId: string) => void;
  onOpenCustomFields: () => void;
}

export function BaseCampView({
  projectId,
  customFields,
  visibleColumns,
  onApplyToTracker,
  onOpenCustomFields,
}: BaseCampViewProps) {
  const taskFields = customFields.filter(isTaskField);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Base Camp — Apply columns to Trackers</h2>
        <Button type="button" variant="outline" size="sm" onClick={onOpenCustomFields} className="gap-2">
          <Settings2 className="w-4 h-4" />
          Manage custom fields
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        By default a new project has no columns on tasks. Select which columns should appear in the Trackers view. You can also use the <strong>Columns</strong> button in the Trackers toolbar to toggle visibility.
      </p>

      <div className="space-y-4">
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Built-in columns</h3>
          <ul className="space-y-1.5">
            {BUILTIN_COLUMNS.map((col) => {
              const applied = visibleColumns.has(col.id);
              return (
                <li key={col.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-sm font-medium text-gray-800">{col.label}</span>
                  {applied ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </span>
                  ) : (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => onApplyToTracker(col.id)}>
                      Apply to tracker
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {taskFields.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Custom fields (this project)</h3>
            <ul className="space-y-1.5">
              {taskFields.map((f) => {
                const applied = visibleColumns.has(f.id);
                return (
                  <li key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-sm font-medium text-gray-800">{f.name}</span>
                    {applied ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Applied
                      </span>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => onApplyToTracker(f.id)}>
                        Apply to tracker
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {taskFields.length === 0 && (
          <p className="text-sm text-gray-500 py-4">
            No custom fields yet. Click <strong>Manage custom fields</strong> to create fields; they will appear here and you can apply them to the tracker view.
          </p>
        )}
      </div>
    </div>
  );
}
