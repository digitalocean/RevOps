import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Settings2, Users, UserPlus, Trash2, ChevronUp, ChevronDown, History, Tags, Pencil, HeartHandshake, Plus, X } from 'lucide-react';
import { get, api } from '../api/meridian';
import { CategoryOptionsEditor } from './CategoryOptionsEditor';
import type { ProjectCollaborator } from '../data/useMeridianData';

/** Standard fields that users can rename per-project (display label only). */
const PROJECT_RENAMABLE_FIELD_KEYS = new Set(['topic', 'category']);

interface AuditEntry {
  id: string;
  crew_name: string | null;
  crew_initials: string | null;
  entity_type: string;
  entity_name: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

const DEFAULT_STANDARD_FIELDS = [
  { id: 'name', label: 'Initiative' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'topic', label: 'Topic' },
  { id: 'requester', label: 'Requester' },
] as const;

export interface StandardFieldDef {
  id: string;
  field_key?: string;
  name: string;
  field_type?: string;
}

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
  id: string | null;
  crew_id: string | null;
  role: string;
  name: string;
  email?: string;
  initials?: string;
  first_name?: string | null;
  last_name?: string | null;
  is_creator?: boolean;
}

interface BaseCampViewProps {
  projectId: string | null;
  customFields: CustomFieldDef[];
  /** Standard fields from API (global). If empty, default list is used. */
  standardFields?: StandardFieldDef[];
  visibleColumns: Set<string>;
  /** Ordered list of column ids (for display and table). Empty = use default order. */
  columnOrder?: string[];
  /** Toggle a column on or off (enable on tracker). */
  onToggleColumn: (columnId: string) => void;
  /** Reorder columns (new ordered list of all column ids). */
  onReorderColumns?: (orderedIds: string[]) => void;
  onOpenCustomFields: () => void;
  /** Opens share / manage access dialog (same as Share). */
  onOpenShare?: () => void;
  onDeleteProject?: (projectId: string) => void | Promise<void>;
  /** Called after a Category override change so the parent can refetch standard fields. */
  onCategoryOptionsChanged?: () => void;
  /** Current list of project collaborators (free-form people tagged on the project). */
  collaborators?: ProjectCollaborator[];
  /** Replace the full list of collaborators. */
  onUpdateCollaborators?: (next: ProjectCollaborator[]) => Promise<void> | void;
  /** Whether the current user can edit collaborators (owner/admin only). */
  canEditCollaborators?: boolean;
}

export function BaseCampView({
  projectId,
  customFields,
  standardFields: standardFieldsProp,
  visibleColumns,
  columnOrder = [],
  onToggleColumn,
  onReorderColumns,
  onOpenCustomFields,
  onOpenShare,
  onDeleteProject,
  onCategoryOptionsChanged,
  collaborators = [],
  onUpdateCollaborators,
  canEditCollaborators = true,
}: BaseCampViewProps) {
  const taskFields = customFields.filter(isTaskField);
  const standardFieldsList = (standardFieldsProp && standardFieldsProp.length > 0)
    ? standardFieldsProp.map((f) => ({ id: f.field_key || f.id, label: f.name }))
    : DEFAULT_STANDARD_FIELDS;
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [editCategoriesOpen, setEditCategoriesOpen] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'custom_field' | 'standard_field'>('all');
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const defaultOrder = [...standardFieldsList.map((c) => c.id), ...taskFields.map((f) => f.id)];
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

  useEffect(() => {
    if (!projectId || !showAudit) return;
    setAuditLoading(true);
    get<AuditEntry[]>(`/api/projects/${projectId}/audit?limit=200`)
      .then((data) => setAuditEntries(Array.isArray(data) ? data : []))
      .catch(() => setAuditEntries([]))
      .finally(() => setAuditLoading(false));
  }, [projectId, showAudit]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar: Shared with */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Shared with
          </h3>
          {onOpenShare && (
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={onOpenShare}
                title="Manage people and access"
              >
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onOpenShare} title="Share project">
                <UserPlus className="w-3.5 h-3.5" />
                Share
              </Button>
            </div>
          )}
        </div>
        {members.length === 0 ? (
          <p className="text-xs text-gray-500">No other members yet.</p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto">
            {members.map((m, idx) => (
              <li key={m.id ?? `creator-${m.email ?? idx}`} className="flex items-center gap-2 text-sm">
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
                {m.is_creator ? (
                  <span className="text-[10px] text-indigo-600 flex-shrink-0">Admin</span>
                ) : (
                  <span className="text-[10px] text-gray-500 flex-shrink-0 capitalize">{(m.role === 'owner' || m.role === 'admin') ? 'Admin' : m.role === 'moderator' ? 'Moderator' : m.role === 'editor' ? 'Editor' : 'View'}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <CollaboratorsPanel
          collaborators={collaborators}
          onUpdate={onUpdateCollaborators}
          canEdit={canEditCollaborators}
        />

        <div className="border-t border-gray-200 pt-3 mt-3">
          <button
            type="button"
            onClick={() => setShowAudit(!showAudit)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm font-medium transition-colors ${showAudit ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <History className="w-4 h-4 shrink-0" />
            Field Audit history
          </button>
        </div>
      </aside>

      {/* Main: Columns or Audit */}
      <div className="flex-1 overflow-y-auto py-8 px-6 max-w-4xl">
      {showAudit ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Field Audit history</h2>
          <p className="text-sm text-gray-500 mb-4">Field metadata only: new custom/standard fields, picklist option changes, etc.</p>
          <div className="flex gap-2 mb-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide self-center">Filter:</span>
            {(['all', 'custom_field', 'standard_field'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAuditFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${auditFilter === f ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'All' : f === 'custom_field' ? 'Custom fields' : 'Standard fields'}
              </button>
            ))}
          </div>
          {auditLoading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : auditEntries.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No field changes yet. Creating or editing custom/standard fields (e.g. picklist values) will appear here.</div>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Entity</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Field</th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditEntries
                    .filter((e) => auditFilter === 'all' || e.entity_type === auditFilter)
                    .map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/80">
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${e.entity_type === 'standard_field' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {e.entity_type === 'standard_field' ? 'Standard' : 'Custom'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{e.crew_name || '—'}</td>
                      <td className="py-2 px-3 text-gray-500">{new Date(e.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td className="py-2 px-3 text-gray-700">{e.entity_name || e.entity_type || '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{e.field_name}</td>
                      <td className="py-2 px-3">
                        {e.old_value != null || e.new_value != null ? (
                          <span className="text-gray-700">{e.old_value ?? '—'} → {e.new_value ?? '—'}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Base Camp — Columns for Trackers</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {projectId && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditCategoriesOpen(true)} className="gap-2">
              <Tags className="w-4 h-4" />
              Edit Categories for this project
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onOpenCustomFields} className="gap-2">
            <Settings2 className="w-4 h-4" />
            Manage custom fields
          </Button>
        </div>
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
              const col = standardFieldsList.find((c) => c.id === colId) ?? taskFields.find((f) => f.id === colId);
              if (!col) return null;
              const label = 'label' in col ? col.label : col.name;
              const isProjectRenamableStandard = PROJECT_RENAMABLE_FIELD_KEYS.has(colId);
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
                  {isProjectRenamableStandard && projectId && (
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 shrink-0"
                      title={`Rename "${label}" for this project`}
                      onClick={async () => {
                        const next = window.prompt(
                          `Rename "${label}" for this project only. Leave blank to reset to default.`,
                          label
                        );
                        if (next === null) return;
                        const trimmed = next.trim();
                        try {
                          await api(`/api/standard-fields/project-options/${projectId}/${colId}`, {
                            method: 'PUT',
                            body: { label: trimmed || null } as unknown as BodyInit,
                          });
                          toast.success(trimmed ? 'Renamed for this project' : 'Reverted to default name');
                          onCategoryOptionsChanged?.();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Rename failed');
                        }
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
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
      </>
      )}
      </div>
      {projectId && (
        <CategoryOptionsEditor
          open={editCategoriesOpen}
          onOpenChange={setEditCategoriesOpen}
          projectId={projectId}
          onSaved={() => { onCategoryOptionsChanged?.(); }}
        />
      )}
    </div>
  );
}

interface CollaboratorsPanelProps {
  collaborators: ProjectCollaborator[];
  onUpdate?: (next: ProjectCollaborator[]) => Promise<void> | void;
  canEdit?: boolean;
}

function CollaboratorsPanel({ collaborators, onUpdate, canEdit }: CollaboratorsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAdding(false);
    setName('');
    setEmail('');
    setRole('');
  };

  const add = async () => {
    if (!onUpdate) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName && !cleanEmail) return;
    const next: ProjectCollaborator[] = [
      ...collaborators,
      { name: cleanName || cleanEmail, email: cleanEmail || null, role: role.trim() || null },
    ];
    setSaving(true);
    try {
      await onUpdate(next);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add collaborator');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (idx: number) => {
    if (!onUpdate) return;
    const next = collaborators.filter((_, i) => i !== idx);
    try {
      await onUpdate(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove collaborator');
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between gap-1 flex-wrap mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5" />
          Collaborators
        </h3>
        {canEdit && !adding && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setAdding(true)}
            title="Tag a collaborator"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        )}
      </div>
      {collaborators.length === 0 && !adding ? (
        <p className="text-xs text-gray-500">No collaborators tagged yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {collaborators.map((c, idx) => (
            <li key={`${c.email ?? ''}-${idx}`} className="flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                {(c.name || c.email || '?').slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-gray-800" title={c.email || c.name}>
                <span className="font-medium">{c.name || c.email || 'Unknown'}</span>
                {c.role && <span className="text-[10px] text-gray-500 ml-1">· {c.role}</span>}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  title="Remove collaborator"
                  className="text-gray-400 hover:text-red-600 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && adding && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-dashed border-gray-300 bg-white p-2">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Role (optional, e.g. Reviewer)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="flex items-center gap-1.5 justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>Cancel</Button>
            <Button type="button" size="sm" className="h-7 text-xs" disabled={saving || (!name.trim() && !email.trim())} onClick={add}>
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
