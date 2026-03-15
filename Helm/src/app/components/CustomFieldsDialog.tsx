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
  ChevronUp,
  ChevronDown,
  AlertTriangle,
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
  workspace_id?: string;
  project_id?: string;
  target: string;
  name: string;
  field_type: string;
  field_key?: string;
  applies_to?: string;
  options?: string[] | CustomFieldOption[];
  options_json?: CustomFieldOption[];
}

export interface StandardField {
  id: string;
  field_key: string;
  name: string;
  field_type: string;
  options_json?: CustomFieldOption[] | { label: string; color?: string }[];
  sort_order?: number;
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

// Only task-level fields are supported; custom/standard fields apply to tasks only.
const APPLIES_TO_TASK_ONLY = [{ value: 'task', label: 'Task' }] as const;

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

type TabKind = 'standard' | 'custom';

export function CustomFieldsDialog({
  open,
  onOpenChange,
  workspaceId: _workspaceId,
  projectId,
  onAdded,
}: CustomFieldsDialogProps) {
  const [tab, setTab] = useState<TabKind>('standard');
  const [standardList, setStandardList] = useState<StandardField[]>([]);
  const [customList, setCustomList] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<StandardField | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<CustomField | null>(null);
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [appliesTo, setAppliesTo] = useState<string>('task');
  const [isRequired, setIsRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionRows, setOptionRows] = useState<CustomFieldOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [addStandardOpen, setAddStandardOpen] = useState(false);
  const [newStandardName, setNewStandardName] = useState('');
  const [newStandardKey, setNewStandardKey] = useState('');
  const [newStandardType, setNewStandardType] = useState<string>('text');

  const selected = tab === 'custom' ? selectedCustom : null;
  const list = tab === 'custom' ? customList : [];

  const loadStandard = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await get<StandardField[]>(apiPath('api/standard-fields')).catch(() => []);
      setStandardList(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load standard fields');
    } finally {
      setLoading(false);
    }
  };

  const loadCustom = async () => {
    if (!open || !projectId) return;
    setLoading(true);
    try {
      const res = await get<CustomField[]>(`${apiPath('api/custom-fields')}?project_id=${projectId}`).catch(() => []);
      setCustomList(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadStandard();
      if (projectId) loadCustom();
      else setCustomList([]);
    }
  }, [open, projectId]);

  useEffect(() => {
    if (tab === 'standard' && selectedStandard) {
      const opts = selectedStandard.options_json ?? [];
      setOptionRows(Array.isArray(opts) ? opts.map((o) => (typeof o === 'string' ? { label: o } : { label: (o as { label?: string }).label ?? '', color: (o as { color?: string }).color })) : []);
    } else if (tab === 'custom' && selectedCustom) {
      setName(selectedCustom.name);
      setFieldType(selectedCustom.field_type || 'text');
      setAppliesTo(selectedCustom.applies_to || (selectedCustom.target === 'item' ? 'task' : 'tracker'));
      setIsRequired(false);
      setDefaultValue('');
      const opts = selectedCustom.options_json ?? (Array.isArray(selectedCustom.options) && selectedCustom.options.length && typeof selectedCustom.options[0] === 'object'
        ? (selectedCustom.options as CustomFieldOption[])
        : (selectedCustom.options as string[] || []).map((l) => ({ label: String(l), color: '#6B7280' })));
      setOptionRows(Array.isArray(opts) ? opts : []);
    } else if (tab === 'custom' && !selectedCustom) {
      setName('');
      setFieldType('text');
      setAppliesTo('task');
      setIsRequired(false);
      setDefaultValue('');
      setOptionRows([]);
    }
  }, [tab, selectedStandard, selectedCustom]);

  const targetFromApplies = (a: string) => (a === 'task' ? 'item' : a === 'tracker' ? 'sprint' : a);

  const handleSaveStandardOptions = async () => {
    if (!selectedStandard) return;
    setSaving(true);
    try {
      await patch(apiPath(`api/standard-fields/${selectedStandard.id}`), { options_json: optionRows });
      toast.success('Options updated');
      loadStandard();
      setSelectedStandard(null);
      onAdded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStandardField = async () => {
    const n = newStandardName.trim();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    const key = (newStandardKey || n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field').slice(0, 80);
    setSaving(true);
    try {
      await post(apiPath('api/standard-fields'), {
        name: n,
        field_key: key,
        field_type: newStandardType,
        options_json: newStandardType === 'select' || newStandardType === 'multi_select' ? optionRows : [],
      });
      toast.success('Standard field added. It is now available in all projects.');
      setAddStandardOpen(false);
      setNewStandardName('');
      setNewStandardKey('');
      setNewStandardType('text');
      setOptionRows([]);
      loadStandard();
      onAdded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add standard field');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
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
      if (selectedCustom) {
        await patch(apiPath(`api/custom-fields/${selectedCustom.id}`), {
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
      loadCustom();
      onAdded?.();
      setSelectedCustom(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewCustom = () => {
    setSelectedCustom(null);
    setName('');
    setFieldType('text');
    setAppliesTo('task');
    setIsRequired(false);
    setDefaultValue('');
    setOptionRows([]);
  };

  const handleDeleteCustom = async (id: string) => {
    try {
      await del(apiPath(`api/custom-fields/${id}`));
      toast.success('Field removed');
      if (selectedCustom?.id === id) setSelectedCustom(null);
      loadCustom();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const addOption = () => setOptionRows((prev) => [...prev, { label: '', color: '#6366F1' }]);
  const updateOption = (idx: number, patch: Partial<CustomFieldOption>) => {
    setOptionRows((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const removeOption = (idx: number) => setOptionRows((prev) => prev.filter((_, i) => i !== idx));
  const moveOption = (idx: number, dir: 'up' | 'down') => {
    const next = idx + (dir === 'up' ? -1 : 1);
    if (next < 0 || next >= optionRows.length) return;
    setOptionRows((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const isSelectType = (t: string) => t === 'select' || t === 'multi_select';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Fields — Standard & Custom</DialogTitle>
        </DialogHeader>

        {/* Tabs: Standard | Custom */}
        <div className="flex border-b border-[#E8E8EC] px-4 pt-2">
          <button
            type="button"
            onClick={() => { setTab('standard'); setSelectedStandard(null); setSelectedCustom(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'standard' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[#6B7280] hover:text-[#0F0F13]'}`}
          >
            Standard fields
          </button>
          <button
            type="button"
            onClick={() => { setTab('custom'); setSelectedStandard(null); setSelectedCustom(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'custom' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[#6B7280] hover:text-[#0F0F13]'}`}
          >
            Custom fields
          </button>
        </div>

        <div className="flex min-h-[420px]">
          {/* Left panel */}
          <div className="w-[220px] shrink-0 border-r border-[#E8E8EC] flex flex-col bg-[#F8F8FB]">
            <div className="px-3 py-3 border-b border-[#E8E8EC]">
              <p className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium">
                {tab === 'standard' ? 'Available in all projects' : 'This project only'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-3 text-xs text-[#6B7280]">Loading…</p>
              ) : tab === 'standard' ? (
                <>
                  {standardList.length === 0 ? (
                    <p className="p-3 text-xs text-[#6B7280]">No standard fields yet</p>
                  ) : (
                    <ul className="py-1">
                      {standardList.map((f) => {
                        const Icon = typeIcon(f.field_type);
                        const isActive = selectedStandard?.id === f.id;
                        return (
                          <li key={f.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => { setSelectedStandard(f); setSelectedCustom(null); }}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedStandard(f)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer group ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[#0F0F13] hover:bg-white/60'}`}
                            >
                              <GripVertical className="w-4 h-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedStandard(f); }}
                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10"
                                aria-label="Edit options"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="p-2 border-t border-[#E8E8EC]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center gap-2 text-amber-600 hover:bg-amber-50"
                      onClick={() => setAddStandardOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add standard field
                    </Button>
                    <p className="text-[10px] text-amber-700 mt-1 px-1">Applies to all projects. Cannot be deleted.</p>
                  </div>
                </>
              ) : (
                <>
                  {!projectId ? (
                    <p className="p-3 text-xs text-[#6B7280]">Select a project to manage custom fields.</p>
                  ) : customList.length === 0 ? (
                    <p className="p-3 text-xs text-[#6B7280]">No custom fields yet</p>
                  ) : (
                    <ul className="py-1">
                      {customList.map((f) => {
                        const Icon = typeIcon(f.field_type);
                        const isActive = selectedCustom?.id === f.id;
                        return (
                          <li key={f.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => { setSelectedCustom(f); setSelectedStandard(null); }}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedCustom(f)}
                              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer group ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[#0F0F13] hover:bg-white/60'}`}
                            >
                              <GripVertical className="w-4 h-4 shrink-0 text-[#9CA3AF]" aria-hidden />
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCustom(f); }}
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
                  {projectId && (
                    <div className="p-2 border-t border-[#E8E8EC]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center gap-2 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                        onClick={handleAddNewCustom}
                      >
                        <Plus className="w-4 h-4" />
                        Add custom field
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right panel — editor */}
          <div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
            {tab === 'standard' && selectedStandard ? (
              <>
                <div className="mb-4">
                  <p className="text-sm font-medium text-[#0F0F13]">{selectedStandard.name}</p>
                  <p className="text-xs text-[#6B7280]">Edit dropdown values. Standard fields cannot be deleted.</p>
                </div>
                {isSelectType(selectedStandard.field_type) ? (
                  <>
                    <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">Options</Label>
                    <div className="space-y-2 mb-4">
                      {optionRows.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex flex-col shrink-0">
                            <button type="button" onClick={() => moveOption(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 text-[#6B7280] disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => moveOption(idx, 'down')} disabled={idx === optionRows.length - 1} className="p-1 rounded hover:bg-gray-100 text-[#6B7280] disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                          <input type="color" value={opt.color || '#6366F1'} onChange={(e) => updateOption(idx, { color: e.target.value })} className="w-6 h-6 rounded border border-[#E4E4EC] cursor-pointer shrink-0" />
                          <Input value={opt.label} onChange={(e) => updateOption(idx, { label: e.target.value })} placeholder="Option label" className="flex-1 px-3 py-2 text-sm rounded-lg border-[#E4E4EC]" />
                          <button type="button" onClick={() => removeOption(idx)} className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 shrink-0" aria-label="Remove option"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addOption} className="text-sm font-medium text-[var(--accent)] hover:text-[#5254CC] flex items-center gap-2 mb-4">
                      <Plus className="w-4 h-4" /> Add option
                    </button>
                    <div className="mt-auto pt-6 flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setSelectedStandard(null)} className="text-[#6B7280]">Cancel</Button>
                      <Button onClick={handleSaveStandardOptions} disabled={saving} className="bg-[var(--accent)] hover:bg-[#5254CC] text-white rounded-lg px-5 py-2">
                        {saving ? 'Saving…' : 'Save options'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#6B7280]">This field type has no options to edit.</p>
                )}
              </>
            ) : tab === 'custom' && (selectedCustom || (projectId && !selectedCustom)) ? (
              <>
                <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-1.5">Field name</Label>
                <Input placeholder="e.g. Story Points, Pillar" value={name} onChange={(e) => setName(e.target.value)} disabled={!projectId} className="mb-4 w-full px-3.5 py-2.5 border-[#E4E4EC] rounded-lg text-sm" />

                <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">Field type</Label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setFieldType(value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${fieldType === value ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[#E4E4EC] text-[#6B7280] hover:bg-gray-50'}`}>
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-[#6B7280] mb-4">Applies to <strong>Task</strong> level only. Fields will appear in trackers and task details.</p>

                <div className="flex items-center gap-2 mb-4">
                  <Switch id="required" checked={isRequired} onCheckedChange={setIsRequired} />
                  <Label htmlFor="required" className="text-sm text-[#0F0F13]">Required</Label>
                </div>

                {(fieldType === 'text' || fieldType === 'number' || fieldType === 'select') && (
                  <>
                    <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-1.5">Default value</Label>
                    <Input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="Optional" className="mb-4 w-full px-3.5 py-2.5 border-[#E4E4EC] rounded-lg text-sm" />
                  </>
                )}

                {(fieldType === 'select' || fieldType === 'multi_select') && (
                  <>
                    <Label className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-medium mb-2">Options</Label>
                    <div className="space-y-2 mb-4">
                      {optionRows.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex flex-col shrink-0">
                            <button type="button" onClick={() => moveOption(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 text-[#6B7280] disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => moveOption(idx, 'down')} disabled={idx === optionRows.length - 1} className="p-1 rounded hover:bg-gray-100 text-[#6B7280] disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                          <input type="color" value={opt.color || '#6366F1'} onChange={(e) => updateOption(idx, { color: e.target.value })} className="w-6 h-6 rounded border border-[#E4E4EC] cursor-pointer shrink-0" />
                          <Input value={opt.label} onChange={(e) => updateOption(idx, { label: e.target.value })} placeholder="Option label" className="flex-1 px-3 py-2 text-sm rounded-lg border-[#E4E4EC]" />
                          <button type="button" onClick={() => removeOption(idx)} className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addOption} className="text-sm font-medium text-[var(--accent)] hover:text-[#5254CC] flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add option
                    </button>
                  </>
                )}

                <div className="mt-auto pt-6 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#6B7280]">Cancel</Button>
                  {selectedCustom && (
                    <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => selectedCustom && handleDeleteCustom(selectedCustom.id)}>Delete</Button>
                  )}
                  <Button onClick={handleSaveCustom} disabled={!name.trim() || saving} className="bg-[var(--accent)] hover:bg-[#5254CC] text-white rounded-lg px-5 py-2">
                    {saving ? 'Saving…' : selectedCustom ? 'Update' : 'Create'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[#6B7280]">
                {tab === 'standard' ? 'Select a standard field to edit its dropdown options.' : !projectId ? 'Select a project to add custom fields.' : 'Select a custom field or click "Add custom field".'}
              </div>
            )}
          </div>
        </div>

        {/* Add Standard Field sub-dialog */}
        {addStandardOpen && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 rounded-lg z-10">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4 max-w-md">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Standard fields apply to all projects.</strong> They will appear in every project. You cannot delete them later. Use this only for organization-wide fields (e.g. Priority, Status).
              </div>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <Label>Name</Label>
              <Input value={newStandardName} onChange={(e) => setNewStandardName(e.target.value)} placeholder="e.g. Priority, Phase" className="w-full" />
              <Label>Field key (optional)</Label>
              <Input value={newStandardKey} onChange={(e) => setNewStandardKey(e.target.value)} placeholder="e.g. priority" className="w-full" />
              <Label>Type</Label>
              <select value={newStandardType} onChange={(e) => setNewStandardType(e.target.value)} className="w-full px-3 py-2 border border-[#E4E4EC] rounded-lg text-sm">
                {FIELD_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              {(newStandardType === 'select' || newStandardType === 'multi_select') && (
                <>
                  <Label>Options</Label>
                  <div className="space-y-2">
                    {optionRows.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="color" value={opt.color || '#6366F1'} onChange={(e) => updateOption(idx, { color: e.target.value })} className="w-6 h-6 rounded border shrink-0" />
                        <Input value={opt.label} onChange={(e) => updateOption(idx, { label: e.target.value })} placeholder="Label" className="flex-1" />
                        <button type="button" onClick={() => removeOption(idx)} className="p-1 text-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addOption} className="text-sm text-[var(--accent)] flex items-center gap-1"><Plus className="w-4 h-4" /> Add option</button>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setAddStandardOpen(false); setNewStandardName(''); setNewStandardKey(''); setOptionRows([]); }}>Cancel</Button>
              <Button onClick={handleAddStandardField} disabled={!newStandardName.trim() || saving} className="bg-amber-600 hover:bg-amber-700 text-white">Add standard field</Button>
            </div>
          </div>
        )}

        {tab === 'custom' && !projectId && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">Select a project first to manage custom fields.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
