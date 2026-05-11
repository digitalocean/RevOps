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
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { get, api } from '../api/meridian';

export interface CategoryOption {
  label: string;
  color?: string;
}

interface CategoryOptionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Optional callback fired after a successful save/reset so parent can refetch standard fields. */
  onSaved?: () => void;
}

const DEFAULT_SWATCHES = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#14b8a6', '#ec4899', '#6b7280', '#0ea5e9', '#eab308',
];

/** Normalises a list of options into `{ label, color }` rows. */
function normaliseOptions(raw: unknown): CategoryOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === 'string') return { label: o, color: DEFAULT_SWATCHES[0] };
      if (o && typeof o === 'object') {
        const label = String((o as { label?: unknown }).label ?? '').trim();
        const color = (o as { color?: unknown }).color;
        if (!label) return null;
        return { label, color: typeof color === 'string' ? color : DEFAULT_SWATCHES[0] };
      }
      return null;
    })
    .filter((v): v is CategoryOption => v != null);
}

export function CategoryOptionsEditor({ open, onOpenChange, projectId, onSaved }: CategoryOptionsEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOverride, setIsOverride] = useState(false);
  const [options, setOptions] = useState<CategoryOption[]>([]);
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    get<{ id: string; field_key: string; name: string; options_json?: unknown; is_project_override?: boolean }[]>(
      `/api/standard-fields?project_id=${encodeURIComponent(projectId)}`
    )
      .then((fields) => {
        const cat = (fields || []).find((f) => f.field_key === 'category');
        setOptions(normaliseOptions(cat?.options_json));
        setIsOverride(!!cat?.is_project_override);
      })
      .catch(() => toast.error('Failed to load Category options'))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const addOption = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That category already exists');
      return;
    }
    const nextColor = DEFAULT_SWATCHES[options.length % DEFAULT_SWATCHES.length];
    setOptions([...options, { label: trimmed, color: nextColor }]);
    setNewLabel('');
  };

  const updateLabel = (idx: number, label: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], label };
    setOptions(next);
  };

  const updateColor = (idx: number, color: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], color };
    setOptions(next);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const cleaned = options
      .map((o) => ({ label: o.label.trim(), color: o.color || DEFAULT_SWATCHES[0] }))
      .filter((o) => o.label.length > 0);
    if (cleaned.length === 0) {
      toast.error('Add at least one category');
      return;
    }
    setSaving(true);
    try {
      // The `api` helper JSON.stringifies the body itself — pass the raw object.
      await api(`/api/standard-fields/project-options/${encodeURIComponent(projectId)}/category`, {
        method: 'PUT',
        body: { options_json: cleaned } as unknown as BodyInit,
      });
      toast.success('Saved project-specific categories');
      setIsOverride(true);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Remove project-specific categories and fall back to the workspace-wide list?')) return;
    setSaving(true);
    try {
      await api(`/api/standard-fields/project-options/${encodeURIComponent(projectId)}/category`, {
        method: 'DELETE',
      });
      toast.success('Reverted to workspace-wide categories');
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Categories for this project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Categories set here apply only to this project. When no project-specific list is set, the workspace default is used.
            {isOverride && (
              <span className="ml-1 text-amber-700">A project-specific override is currently active.</span>
            )}
          </p>

          {loading ? (
            <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
          ) : (
            <>
              <ul className="space-y-2 max-h-72 overflow-auto">
                {options.map((opt, idx) => (
                  <li key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <input
                      type="color"
                      value={opt.color || DEFAULT_SWATCHES[0]}
                      onChange={(e) => updateColor(idx, e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                      aria-label={`Colour for ${opt.label}`}
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => updateLabel(idx, e.target.value)}
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-red-100 text-red-500"
                      onClick={() => removeOption(idx)}
                      aria-label={`Remove ${opt.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                {options.length === 0 && (
                  <li className="text-xs text-gray-400 text-center py-4">No categories yet — add one below.</li>
                )}
              </ul>

              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add a category label (e.g. Revenue Ops)"
                  className="h-9 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addOption} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={saving || !isOverride}
              className="text-gray-600 hover:text-red-600 gap-1.5"
              title={isOverride ? 'Delete project-specific list' : 'No override to reset'}
            >
              <RotateCcw className="w-4 h-4" />
              Reset to workspace default
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
