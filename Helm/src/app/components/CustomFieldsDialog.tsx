import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { get, post, del } from '../api/meridian';

function apiPath(p: string) {
  return p.startsWith('/') ? p : `/${p}`;
}

export interface CustomField {
  id: string;
  workspace_id: string;
  target: string;
  name: string;
  field_type: string;
}

const TARGETS = [
  { value: 'project', label: 'Project' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'item', label: 'Item / Task' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (dropdown)' },
];

interface CustomFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  onAdded?: () => void;
}

export function CustomFieldsDialog({
  open,
  onOpenChange,
  workspaceId,
  onAdded,
}: CustomFieldsDialogProps) {
  const [list, setList] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('item');
  const [fieldType, setFieldType] = useState('text');

  const load = async () => {
    if (!open || !workspaceId) return;
    setLoading(true);
    try {
      const res = await get<CustomField[]>(
        `${apiPath('api/custom-fields')}?workspace_id=${workspaceId}`
      ).catch(() => []);
      setList(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && workspaceId) load();
    else if (!workspaceId) setList([]);
  }, [open, workspaceId]);

  const handleAdd = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Field name is required');
      return;
    }
    if (!workspaceId) {
      toast.error('Select a workspace first');
      return;
    }
    setAdding(true);
    try {
      await post(apiPath('api/custom-fields'), {
        workspace_id: workspaceId,
        target,
        name: n,
        field_type: fieldType,
        options: [],
      });
      toast.success('Custom field added');
      setName('');
      load();
      onAdded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del(apiPath(`api/custom-fields/${id}`));
      toast.success('Field removed');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold text-gray-900">Custom fields</DialogTitle>
          <p className="text-sm text-gray-500">Define custom fields for projects, sprints, or tasks.</p>
        </DialogHeader>
        {!workspaceId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            Select a workspace in the sidebar first.
          </p>
        )}
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add custom fields to projects, sprints, or items. They will appear in the relevant tables and forms.
          </p>
          <div className="grid gap-2">
            <Label>Add field</Label>
            <Input
              placeholder="Field name (e.g. Story Points, Due Date)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!workspaceId}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Applies to</Label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  disabled={!workspaceId}
                >
                  {TARGETS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Type</Label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  disabled={!workspaceId}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!workspaceId || !name.trim() || adding}
            >
              {adding ? 'Adding…' : 'Add field'}
            </Button>
          </div>
          <div>
            <Label className="mb-2 block">Current fields</Label>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-gray-500">No custom fields yet. Add one above.</p>
            ) : (
              <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {list.map((f) => (
                  <li key={f.id} className="px-3 py-2 flex items-center justify-between text-sm group">
                    <span>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-gray-500 ml-2">({f.target} · {f.field_type})</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 text-red-600"
                      onClick={() => handleDelete(f.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
