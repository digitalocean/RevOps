import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Clock, Star, Loader2, Check, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { InitiativeDetailsDialog } from './InitiativeDetailsDialog';
import type { Initiative, Priority, Status, Category, TrackerSection as TrackerSectionType } from '../data/mockData';

const STATUS_OPTIONS: Status[] = ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete'];
const PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2'];
const CATEGORIES: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];

interface CrewMember {
  id: string;
  name: string;
  initials?: string;
  role?: string;
}

interface TrackerSectionProps {
  section: TrackerSectionType;
  viewMode: 'grid' | 'gantt';
  filters: {
    status: Status[];
    priority: Priority[];
    category: Category[];
    owner: string[];
    bigRocksOnly: boolean;
  };
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  projectId: string | null;
  crew?: CrewMember[];
  onAddItem?: () => void;
  onCreateItem?: (projectId: string, payload: { title: string; description?: string }, trackerId?: string | null) => Promise<unknown>;
  onCreateSubItem?: (parentId: string) => void;
  onUpdateItem?: (id: string, payload: { title?: string; description?: string; status?: Status; priority?: Priority; assignee_id?: string | null; due_date?: string | null; category?: string | null }) => Promise<unknown>;
  onDeleteItem?: (id: string) => Promise<void>;
  onItemCompleted?: () => void;
}

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'P0': return 'bg-red-100 text-red-700 border-red-200';
    case 'P1': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'P2': return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'On Track': return 'bg-green-500 text-white hover:bg-green-600';
    case 'At Risk': return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'In Review': return 'bg-purple-500 text-white hover:bg-purple-600';
    case 'Complete': return 'bg-emerald-500 text-white hover:bg-emerald-600';
    case 'Blocked': return 'bg-red-500 text-white hover:bg-red-600';
    case 'Not Started': return 'bg-gray-300 text-gray-700 hover:bg-gray-400';
  }
}

function getCategoryColor(category: Category): string {
  switch (category) {
    case 'Engineering': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Design': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'Sales': return 'bg-green-50 text-green-700 border-green-200';
    case 'Product': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Operations': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
}

interface InitiativeRowEditableProps {
  initiative: Initiative;
  onOpenDetails: (initiative: Initiative) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  crew?: { id: string; name: string; initials?: string }[];
  onAddSubItem?: (parentId: string) => void;
  onUpdate: (id: string, payload: { title?: string; status?: Status; priority?: Priority; assignee_id?: string | null; due_date?: string | null; category?: Category }) => Promise<unknown>;
  onDelete?: (id: string) => Promise<void>;
  onItemCompleted?: () => void;
}

function InitiativeRowEditable({
  initiative,
  onOpenDetails,
  isSelected,
  onToggleSelect,
  crew = [],
  onAddSubItem,
  onUpdate,
  onDelete,
  onItemCompleted,
}: InitiativeRowEditableProps) {
  const [title, setTitle] = useState(initiative.name);
  const [saving, setSaving] = useState(false);
  const dueDateStr = initiative.endDate && !isNaN(initiative.endDate.getTime())
    ? initiative.endDate.toISOString().slice(0, 10)
    : '';

  const handleTitleBlur = () => {
    const t = title.trim();
    if (t !== initiative.name && t) {
      setSaving(true);
      onUpdate(initiative.id, { title: t }).finally(() => setSaving(false));
    }
  };

  const handleStatusChange = async (status: Status) => {
    const wasComplete = initiative.status === 'Complete';
    setSaving(true);
    try {
      await onUpdate(initiative.id, { status });
      if (!wasComplete && status === 'Complete') onItemCompleted?.();
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = (priority: Priority) => {
    setSaving(true);
    onUpdate(initiative.id, { priority }).finally(() => setSaving(false));
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value || null;
    setSaving(true);
    onUpdate(initiative.id, { due_date: v ? `${v}T00:00:00.000Z` : null }).finally(() => setSaving(false));
  };

  const handleAssigneeChange = (assigneeId: string) => {
    setSaving(true);
    onUpdate(initiative.id, { assignee_id: assigneeId || null }).finally(() => setSaving(false));
  };

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="py-2 px-4 w-12 align-middle">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(initiative.id)} />
      </td>
      <td className="py-2 px-4 w-12 align-middle">
        {initiative.isBigRock ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <div className="w-4 h-4" />}
      </td>
      <td className="py-2 px-4 align-middle min-w-[180px]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="h-8 text-sm font-medium border-gray-200 bg-white"
          placeholder="Title"
        />
      </td>
      <td className="py-2 px-4 align-middle min-w-[120px]">
        <Select value={initiative.category} onValueChange={(v) => { setSaving(true); onUpdate(initiative.id, { category: v as Category }).finally(() => setSaving(false)); }}>
          <SelectTrigger className={`h-8 text-xs border-gray-200 bg-white ${getCategoryColor(initiative.category)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-4 align-middle w-24">
        <Select value={initiative.priority} onValueChange={(v) => handlePriorityChange(v as Priority)}>
          <SelectTrigger className="h-8 text-xs border-gray-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-4 align-middle min-w-[120px]">
        <Select
          value={initiative.assignee_id ?? 'unassigned'}
          onValueChange={(v) => handleAssigneeChange(v === 'unassigned' ? '' : v)}
        >
          <SelectTrigger className="h-8 text-xs border-gray-200 bg-white">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="unassigned" className="text-xs">— Unassigned</SelectItem>
            {crew.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-4 align-middle w-36">
        <Select value={initiative.status} onValueChange={(v) => handleStatusChange(v as Status)}>
          <SelectTrigger className={`h-8 text-xs border-0 ${getStatusColor(initiative.status)} text-white`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-4 align-middle">
        <div className="flex items-center gap-2">
          <Progress value={initiative.progress} className="w-20 h-1.5" />
          <span className="text-xs text-gray-600 w-8">{initiative.progress}%</span>
        </div>
      </td>
      <td className="py-2 px-4 align-middle">
        <input
          type="date"
          value={dueDateStr}
          onChange={handleDueDateChange}
          className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 w-full max-w-[140px]"
        />
      </td>
      <td className="py-2 px-4 align-middle w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100]" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => onOpenDetails(initiative)}>View details</DropdownMenuItem>
            {onAddSubItem && (
              <DropdownMenuItem onSelect={() => onAddSubItem(initiative.id)}>Add sub-item</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onDelete && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700"
                onSelect={() => {
                  if (confirm('Delete this item?')) onDelete(initiative.id);
                }}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

interface NewRowFormProps {
  projectId: string | null;
  sectionId: string;
  trackerId: string | null;
  onSave: (projectId: string, payload: { title: string; description?: string }, trackerId?: string | null) => Promise<unknown>;
  onCancel: () => void;
}

function NewRowForm({ projectId, sectionId, trackerId, onSave, onCancel }: NewRowFormProps) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const t = title.trim();
    if (!t || !projectId) return;
    setSaving(true);
    try {
      await onSave(projectId, { title: t }, sectionId === 'uncategorized' ? null : sectionId);
      setTitle('');
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-blue-50/50 border-b border-blue-100">
      <td className="py-2 px-4 w-12" />
      <td className="py-2 px-4 w-12" />
      <td className="py-2 px-4 align-middle min-w-[180px]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="h-8 text-sm border-blue-200 bg-white"
          placeholder="Enter title..."
          autoFocus
        />
      </td>
      <td colSpan={5} className="py-2 px-4 align-middle">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="h-8 gap-1" onClick={handleSave} disabled={!title.trim() || !projectId || saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1" onClick={onCancel} disabled={saving}>
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
      </td>
      <td className="py-2 px-4" />
    </tr>
  );
}

export function TrackerSection({
  section,
  viewMode,
  filters,
  selectedIds,
  onSelectionChange,
  projectId,
  crew = [],
  onAddItem,
  onCreateItem,
  onCreateSubItem,
  onUpdateItem,
  onDeleteItem,
  onItemCompleted,
}: TrackerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);

  if (viewMode === 'gantt') return null;

  const filteredInitiatives = section.initiatives.filter((initiative) => {
    if (filters.status.length > 0 && !filters.status.includes(initiative.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(initiative.priority)) return false;
    if (filters.category.length > 0 && !filters.category.includes(initiative.category)) return false;
    if (filters.owner.length > 0 && !filters.owner.includes(initiative.owner)) return false;
    if (filters.bigRocksOnly && !initiative.isBigRock) return false;
    return true;
  });

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((s) => s !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  const handleSelectAll = () => {
    const allIds = filteredInitiatives.map((i) => i.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    if (allSelected) onSelectionChange(selectedIds.filter((id) => !allIds.includes(id)));
    else onSelectionChange([...new Set([...selectedIds, ...allIds])]);
  };

  const allSelected = filteredInitiatives.length > 0 && filteredInitiatives.every((i) => selectedIds.includes(i.id));
  const someSelected = filteredInitiatives.some((i) => selectedIds.includes(i.id)) && !allSelected;

  const handleUpdate = async (id: string, payload: { title?: string; status?: Status; priority?: Priority; assignee_id?: string | null; due_date?: string | null; category?: Category }) => {
    if (onUpdateItem) await onUpdateItem(id, payload);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            {section.title}
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full">
              {filteredInitiatives.length}
            </span>
          </button>
        </div>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-12">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase w-12" />
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Initiative</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                  <th className="py-2 px-4 w-12" />
                </tr>
              </thead>
              <tbody>
                {filteredInitiatives.map((initiative) => (
                  <InitiativeRowEditable
                    key={initiative.id}
                    initiative={initiative}
                    onOpenDetails={setSelectedInitiative}
                    isSelected={selectedIds.includes(initiative.id)}
                    onToggleSelect={handleToggleSelect}
                    crew={crew}
                    onAddSubItem={onCreateSubItem}
                    onUpdate={handleUpdate}
                    onDelete={onDeleteItem}
                    onItemCompleted={onItemCompleted}
                  />
                ))}
                {showNewRow && (
                  <NewRowForm
                    projectId={projectId}
                    sectionId={section.id}
                    trackerId={section.id === 'uncategorized' ? null : section.id}
                    onSave={onCreateItem!}
                    onCancel={() => setShowNewRow(false)}
                  />
                )}
                {filteredInitiatives.length === 0 && !showNewRow && (
                  <tr>
                    <td colSpan={10} className="py-8 px-4 text-center text-sm text-gray-500">
                      No items yet. Add one below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {isExpanded && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <button
              type="button"
              onClick={() => (projectId ? setShowNewRow(true) : onAddItem?.())}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          </div>
        )}
      </div>

      {selectedInitiative && (
        <InitiativeDetailsDialog
          initiative={selectedInitiative}
          crew={crew}
          onClose={() => setSelectedInitiative(null)}
          onSave={onUpdateItem ? async (id, payload) => { await onUpdateItem(id, payload); setSelectedInitiative(null); } : undefined}
          onDelete={onDeleteItem ? async (id) => { await onDeleteItem(id); setSelectedInitiative(null); } : undefined}
        />
      )}
    </>
  );
}
