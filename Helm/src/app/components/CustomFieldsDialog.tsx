import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  GripVertical,
  Plus,
  Pencil,
  Type,
  Hash,
  Calendar,
  List,
  ToggleLeft,
  Link2,
  User,
  ListOrdered,
  X,
} from 'lucide-react';
import { get, post, patch, del } from '../api/meridian';

function apiPath(p: string) {
  return p.startsWith('/') ? p : `/${p}`;
}

export interface CustomFieldOption {
  label: string;
  color?: string;
}

export interface CustomField {
  id: string;
  workspace_id: string;
  target: string;
  name: string;
  field_type: string;
  field_key?: string;
  applies_to?: string;
  options?: string[] | CustomFieldOption[];
  options_json?: CustomFieldOption[];
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'select', label: 'Select', icon: List },
  { value: 'boolean', label: 'Toggle', icon: ToggleLeft },
  { value: 'url', label: 'URL', icon: Link2 },
  { value: 'user', label: 'Person', icon: User },
  { value: 'multi_select', label: 'Multi-select', icon: ListOrdered },
] as const;

const APPLIES_TO = [
  { value: 'task', label: 'Task' },
  { value: 'tracker', label: 'Tracker' },
  { value: 'project', label: 'Project' },
] as const;

function typeIcon(fieldType: string) {
  const t = FIELD_TYPES.find((f) => f.value === fieldType);
  return t ? t.icon : Type;
}

interface CustomFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  projectId?: string | null;
  onAdded?: () => void;
}

export function CustomFieldsDialog({
  open,
  onOpenChange,
  workspaceId: _workspaceId,
  projectId,
  onAdded,
}: CustomFieldsDialogProps) {
  const [list, setList] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomField | null>(null);
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [appliesTo, setAppliesTo] = useState<string>('task');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionRows, setOptionRows] = useState<CustomFieldOption[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!open || !projectId) return;
    setLoading(true);
    try {
      const res = await get<CustomField[]>(
        `${apiPath('api/custom-fields')}?project_id=${projectId}`
      ).catch(() => []);
      setList(Array.isArray(res) ? res : []);
      if (!selected) setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) load();
    else if (!projectId) setList([]);
  }, [open, projectId]);

  useEffect(() => {
    if (selected) {
      setName(selected.name);
      setFieldType(selected.field_type || 'text');
      setAppliesTo(selected.applies_to || (selected.target === 'item' ? 'task' : selected.target === 'sprint' ? 'tracker' : 'project'));
      setIsRequired(false);
      setDefaultValue('');
      const opts = selected.options_json ?? (Array.isArray(selected.options) && selected.options.length && typeof selected.options[0] === 'object'
        ? (selected.options as CustomFieldOption[])
        : (selected.options as string[] || []).map((l) => ({ label: String(l), color: '#6B7280' })));
      setOptionRows(Array.isArray(opts) ? opts : []);
    } else {
      setName('');
      setFieldType('text');
      setAppliesTo('task');
      setIsRequired(false);
      setDefaultValue('');
      setOptionRows([]);
    }
  }, [selected]);

  const targetFromApplies = (a: string) => (a === 'task' ? 'item' : a === 'tracker' ? 'sprint' : a);

  const handleSave = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Field name is required');
      return;
    }
    if (!projectId) {
      toast.error('Select a project first');
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await patch(apiPath(`api/custom-fields/${selected.id}`), {
          name: n,
          field_type: fieldType,
          target: targetFromApplies(appliesTo),
          applies_to: appliesTo,
          options_json: optionRows.length ? optionRows : undefined,
        });
        toast.success('Field updated');
      } else {
        await post(apiPath('api/custom-fields'), {
          project_id: projectId,
          target: targetFromApplies(appliesTo),
          name: n,
          field_type: fieldType,
          options: optionRows.map((o) => o.label),
          applies_to: appliesTo,
          options_json: optionRows.length ? optionRows : undefined,
        });
        toast.success('Custom field added');
      }
      load();
      onAdded?.();
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNew = () => {
    setSelected(null);
    setName('');
    setFieldType('text');
    setAppliesTo('task');
    setIsRequired(false);
    setDefaultValue('');
    setOptionRows([]);
  };

  const handleDelete = async (id: string) => {
    try {
      await del(apiPath(`api/custom-fields/${id}`));
      toast.success('Field removed');
      if (selected?.id === id) setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const addOption = () => setOptionRows((prev) => [...prev, { label: '', color: '#6366F1' }]);
  const updateOption = (idx: number, patch: Partial<CustomFieldOption>) => {
    setOptionRows((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const removeOption = (idx: number) => setOptionRows((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[680px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Custom Fields</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[420px]">
          {/* Left panel — 200px */}
          <div className="w-[200px] shrink-0 border-r border-[#E8E8EC] flex flex-col bg-[#F8F8FB]">
            <div className="px-3 py-3">
              <h2 className="text-[13px] font-medium text-[#0F0F13]">Custom Fields</h2>
            </div>
            <div className="flex-1 overflow-y-auto border-t border-[#E8E8EC]">
              {loading ? (
                <p className="p-3 text-xs text-[#6B7280]">Loading…</p>
              ) : list.length === 0 ? (
                <p className="p-3 text-xs text-[#6B7280]">No fields yet</p>
              ) : (
                <ul className="py-1">
                  {list.map((f) => {
                    const Icon = typeIcon(f.field_type);
                    const isActive = selected?.id === f.id;
                    return (
                      <li key={f.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(f)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelected(f)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer group ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[#0F0F13] hover:bg-white/60'}`}
                        >
                          <GripVertical className="w-4 h-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelected(f); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10"
                            aria-label="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="p-2 border-t border-[#E8E8EC]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-2 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                onClick={handleAddNew}
              >
                <Plus className="w-4 h-4" />
                Add Field
              </Button>
            </div>
          </div>

          {/* Right panel — editor */}
          <div className="flex-1 flex flex-col min-w-0 p-6">
            <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-1.5">
              Field name
            </Label>
            <Input
              placeholder="e.g. Story Points, Pillar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!projectId}
              className="mb-4 w-full px-3.5 py-2.5 border-[#E4E4EC] rounded-lg text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
            />

            <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">
              Field type
            </Label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFieldType(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${fieldType === value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[#E4E4EC] text-[#6B7280] hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">
              Applies to
            </Label>
            <div className="flex gap-1 p-1 rounded-lg bg-[#F0F0F4] mb-4">
              {APPLIES_TO.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAppliesTo(value)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium ${appliesTo === value ? 'bg-white text-[#0F0F13] shadow-sm' : 'text-[#6B7280] hover:text-[#0F0F13]'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Switch
                id="required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
              <Label htmlFor="required" className="text-sm text-[#0F0F13]">Required</Label>
            </div>

            {(fieldType === 'text' || fieldType === 'number' || fieldType === 'select') && (
              <>
                <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-1.5">
                  Default value
                </Label>
                <Input
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="Optional"
                  className="mb-4 w-full px-3.5 py-2.5 border-[#E4E4EC] rounded-lg text-sm"
                />
              </>
            )}

            {(fieldType === 'select' || fieldType === 'multi_select') && (
              <>
                <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">
                  Options
                </Label>
                <div className="space-y-2 mb-4">
                  {optionRows.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={opt.color || '#6366F1'}
                        onChange={(e) => updateOption(idx, { color: e.target.value })}
                        className="w-6 h-6 rounded border border-[#E4E4EC] cursor-pointer"
                      />
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(idx, { label: e.target.value })}
                        placeholder="Option label"
                        className="flex-1 px-3 py-2 text-sm rounded-lg border-[#E4E4EC]"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600"
                        aria-label="Remove option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm font-medium text-[var(--accent)] hover:text-[#5254CC] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add option
                </button>
              </>
            )}

            <div className="mt-auto pt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#6B7280]">
                Cancel
              </Button>
              {selected && (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => selected && handleDelete(selected.id)}
                >
                  Delete
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="bg-[var(--accent)] hover:bg-[#5254CC] text-white rounded-lg px-5 py-2"
              >
                {saving ? 'Saving…' : selected ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>

        {!projectId && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">
              Select a project first to manage custom fields.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
