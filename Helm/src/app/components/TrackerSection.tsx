import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Clock, Star, Loader2, Check, X, GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { post } from '../api/meridian';
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
import { TaskDetailDrawer } from './TaskDetailDrawer';
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

interface CustomFieldDef {
  id: string;
  name: string;
  field_type: string;
  target?: string;
  applies_to?: string;
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
  currentUser?: { id: string; name: string } | null;
  customFields?: CustomFieldDef[];
  visibleColumns?: Set<string>;
  onUpdateFieldValue?: (taskId: string, fieldId: string, value: string | number | boolean | null) => Promise<unknown>;
  onAddItem?: () => void;
  onCreateItem?: (projectId: string, payload: { title: string; description?: string }, trackerId?: string | null) => Promise<unknown>;
  onCreateSubItem?: (parentId: string) => void;
  onUpdateItem?: (id: string, payload: { title?: string; description?: string; status?: Status; priority?: Priority; assignee_id?: string | null; due_date?: string | null; category?: string | null; progress?: number }) => Promise<unknown>;
  onDeleteItem?: (id: string) => Promise<void>;
  onDeleteSection?: (trackerId: string) => Promise<void>;
  onRenameSection?: (trackerId: string, newName: string) => Promise<void>;
  onItemCompleted?: () => void;
  focusedId?: string | null;
  onFocusChange?: (id: string | null) => void;
}

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'P0': return 'bg-red-100 text-red-700 border-red-200';
    case 'P1': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'P2': return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

function getStatusStyle(status: Status): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'On Track':   return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'At Risk':    return { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' };
    case 'In Review':  return { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' };
    case 'Complete':   return { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' };
    case 'Blocked':    return { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' };
    case 'Not Started':return { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-300' };
    default:           return { bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    dot: 'bg-gray-300' };
  }
}
// Keep for backwards compat
function getStatusColor(status: Status): string {
  const s = getStatusStyle(status);
  return `${s.bg} ${s.text} ${s.border}`;
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

const COL_KEYS = ['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate'] as const;

interface InitiativeRowEditableProps {
  initiative: Initiative;
  onOpenDetails: (initiative: Initiative) => void;
  isSelected: boolean;
  isFocused?: boolean;
  onToggleSelect: (id: string) => void;
  onFocus?: (id: string) => void;
  crew?: { id: string; name: string; initials?: string }[];
  customFields?: CustomFieldDef[];
  visibleColumns?: Set<string>;
  onUpdateFieldValue?: (taskId: string, fieldId: string, value: string | number | boolean | null) => Promise<unknown>;
  onAddSubItem?: (parentId: string) => void;
  onUpdate: (id: string, payload: { title?: string; status?: Status; priority?: Priority; assignee_id?: string | null; due_date?: string | null; category?: Category; progress?: number }) => Promise<unknown>;
  onDelete?: (id: string) => Promise<void>;
  onItemCompleted?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

function colVisible(visibleColumns: Set<string> | undefined, colId: string): boolean {
  return !visibleColumns || visibleColumns.has(colId);
}

function isTaskField(f: CustomFieldDef) {
  return (f.target === 'item' || f.applies_to === 'task' || !f.applies_to);
}

function CustomFieldCell({
  taskId,
  fieldId,
  fieldType,
  value,
  onSave,
}: {
  taskId: string;
  fieldId: string;
  fieldType: string;
  value: string | number | boolean | null | undefined;
  onSave?: (taskId: string, fieldId: string, value: string | number | boolean | null) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value ?? ''));

  const display = value === null || value === undefined ? '—' : String(value);

  const handleBlur = () => {
    setEditing(false);
    if (!onSave) return;
    const v = local.trim();
    if (fieldType === 'number') {
      const n = Number(v);
      onSave(taskId, fieldId, v === '' ? null : Number.isNaN(n) ? (value ?? null) : n);
    } else if (fieldType === 'boolean') {
      onSave(taskId, fieldId, v === 'true' || v === '1' || v.toLowerCase() === 'yes');
    } else {
      onSave(taskId, fieldId, v === '' ? null : v);
    }
  };

  return (
    <td className="py-2 px-4 align-middle min-w-[100px]" onClick={() => onSave && setEditing(true)}>
      {editing && onSave ? (
        <Input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          className="h-8 text-xs border-gray-200 rounded-md"
          autoFocus
          type={fieldType === 'number' ? 'number' : 'text'}
        />
      ) : (
        <span className="text-xs text-gray-700">{display}</span>
      )}
    </td>
  );
}

function InitiativeRowEditable({
  initiative,
  onOpenDetails,
  isSelected,
  isFocused = false,
  onToggleSelect,
  onFocus,
  crew = [],
  customFields = [],
  visibleColumns,
  onUpdateFieldValue,
  onAddSubItem,
  onUpdate,
  onDelete,
  onItemCompleted,
  dragHandleProps = {},
  isDragging = false,
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

  // Note: this renders td cells only - the SortableInitiativeRow renders the <tr>
  return (
    <>
      <td className="py-2 px-2 w-8 align-middle">
        {/* drag handle rendered by parent */}
      </td>
      <td className="py-2 px-3 w-10 align-middle">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(initiative.id)} onClick={e => e.stopPropagation()} />
      </td>
      <td className="py-2 px-4 w-12 align-middle">
        {initiative.isBigRock ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <div className="w-4 h-4" />}
      </td>
      {colVisible(visibleColumns, 'name') && (
      <td className="py-2 px-4 align-middle min-w-[180px]">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="h-8 text-sm font-medium border-gray-200 bg-white"
          placeholder="Title"
        />
      </td>
      )}
      {colVisible(visibleColumns, 'category') && (
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
      )}
      {colVisible(visibleColumns, 'priority') && (
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
      )}
      {colVisible(visibleColumns, 'owner') && (
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
      )}
      {colVisible(visibleColumns, 'status') && (
      <td className="py-2 px-4 align-middle w-40">
        <Select value={initiative.status} onValueChange={(v) => handleStatusChange(v as Status)}>
          <SelectTrigger className={`h-8 text-xs border rounded-full px-3 ${getStatusColor(initiative.status)}`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusStyle(initiative.status).dot}`} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {STATUS_OPTIONS.map((s) => {
              const style = getStatusStyle(s);
              return (
                <SelectItem key={s} value={s} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {s}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </td>
      )}
      {colVisible(visibleColumns, 'progress') && (
      <td className="py-2 px-4 align-middle">
        <div className="flex items-center gap-2 group">
          <Progress value={initiative.progress} className="w-16 h-1.5 cursor-pointer" />
          <input
            type="number"
            min={0}
            max={100}
            value={initiative.progress}
            onChange={(e) => {
              const v = Math.max(0, Math.min(100, Number(e.target.value)));
              setSaving(true);
              onUpdate(initiative.id, { progress: v } as Parameters<typeof onUpdate>[1]).finally(() => setSaving(false));
            }}
            className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-700 focus:border-blue-400 focus:outline-none"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
      </td>
      )}
      {colVisible(visibleColumns, 'dueDate') && (
      <td className="py-2 px-4 align-middle">
        <input
          type="date"
          value={dueDateStr}
          onChange={handleDueDateChange}
          className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 w-full max-w-[140px]"
        />
      </td>
      )}
      {customFields.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).map((field) => (
        <CustomFieldCell
          key={field.id}
          taskId={initiative.id}
          fieldId={field.id}
          fieldType={field.field_type}
          value={initiative.field_values?.[field.id] ?? null}
          onSave={onUpdateFieldValue}
        />
      ))}
      <td className="py-2 px-4 align-middle w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100] w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={() => onFocusChange?.(initiative.id)}
            >
              Edit
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700 gap-2 cursor-pointer"
                onSelect={() => {
                  if (window.confirm(`Delete "${initiative.name}"? This cannot be undone.`)) {
                    onDelete(initiative.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </>
  );
}

interface NewRowFormProps {
  projectId: string | null;
  sectionId: string;
  trackerId: string | null;
  onSave: (projectId: string, payload: { title: string; description?: string }, trackerId?: string | null) => Promise<unknown>;
  onCancel: () => void;
  customFieldCount?: number;
  visibleColumnCount?: number;
}

function NewRowForm({ projectId, sectionId, trackerId, onSave, onCancel, crew = [], customFieldCount = 0, visibleColumnCount }: NewRowFormProps & { crew?: { id: string; name: string; initials?: string }[] }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('Not Started');
  const [priority, setPriority] = useState<Priority>('P1');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    const t = title.trim();
    if (!t || !projectId) return;
    setSaving(true);
    try {
      const payload: { title: string; status?: string; priority?: string; assignee_id?: string; due_date?: string } = { title: t };
      const statusSlug: Record<string, string> = {
        'Not Started': 'not_started', 'On Track': 'in_progress', 'At Risk': 'at_risk',
        'In Review': 'in_review', 'Blocked': 'blocked', 'Complete': 'done',
      };
      const prioritySlug: Record<string, string> = { P0: 'critical', P1: 'high', P2: 'medium' };
      payload.status = statusSlug[status] || 'not_started';
      payload.priority = prioritySlug[priority] || 'medium';
      if (assigneeId) payload.assignee_id = assigneeId;
      if (dueDate) payload.due_date = `${dueDate}T00:00:00.000Z`;
      await onSave(projectId, payload, sectionId === 'uncategorized' ? null : sectionId);
      setTitle('');
      setStatus('Not Started');
      setPriority('P1');
      setAssigneeId('');
      setDueDate('');
      // Keep row open for rapid entry — user presses Escape or Cancel to close
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const STATUS_STYLES: Record<Status, string> = {
    'Not Started': 'bg-gray-100 text-gray-600',
    'On Track': 'bg-emerald-100 text-emerald-700',
    'At Risk': 'bg-amber-100 text-amber-700',
    'In Review': 'bg-violet-100 text-violet-700',
    'Blocked': 'bg-red-100 text-red-700',
    'Complete': 'bg-blue-100 text-blue-700',
  };

  return (
    <tr className="bg-indigo-50/40 border-b border-indigo-100">
      <td className="py-2 px-2 w-8" />
      <td className="py-2 px-3 w-10" />
      {/* Title */}
      <td className="py-2 px-4 align-middle min-w-[220px]">
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full h-8 px-3 text-sm border border-indigo-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder-gray-400"
          placeholder="Task title… (Enter to save, Esc to cancel)"
        />
      </td>
      {/* Status */}
      <td className="py-2 px-3 align-middle">
        <select
          value={status}
          onChange={e => setStatus(e.target.value as Status)}
          className={`h-8 text-xs rounded-lg px-2 border-0 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 ${STATUS_STYLES[status]}`}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      {/* Priority */}
      <td className="py-2 px-3 align-middle">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          className={`h-8 text-xs rounded-lg px-2 border-0 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
            priority === 'P0' ? 'bg-red-100 text-red-700' :
            priority === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}
        >
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      {/* Assignee */}
      <td className="py-2 px-3 align-middle">
        <select
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
          className="h-8 text-xs rounded-lg px-2 border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Unassigned</option>
          {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      {/* Due date */}
      <td className="py-2 px-3 align-middle">
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="h-8 text-xs px-2 border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </td>
      {/* Actions */}
      <td className="py-2 px-4 align-middle">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="h-7 px-3 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={!title.trim() || !projectId || saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-gray-500" onClick={onCancel} disabled={saving}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function SortableInitiativeRow(props: Omit<InitiativeRowEditableProps, 'dragHandleProps' | 'isDragging'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.initiative.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-item-id={props.initiative.id}
      className={`border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors ${props.isSelected ? 'bg-blue-50' : ''} ${props.isFocused ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/30' : ''} ${isDragging ? 'opacity-40 bg-indigo-50' : ''}`}
      onClick={() => props.onFocus?.(props.initiative.id)}
      onDoubleClick={() => props.onOpenDetails(props.initiative)}
    >
      <td className="py-2 px-2 w-8 align-middle">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 touch-none" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
        </button>
      </td>
      <td className="py-2 px-3 w-10 align-middle">
        <Checkbox checked={props.isSelected} onCheckedChange={() => props.onToggleSelect(props.initiative.id)} onClick={e => e.stopPropagation()} />
      </td>
      <InitiativeRowEditable {...props} />
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
  currentUser,
  customFields = [],
  visibleColumns,
  onUpdateFieldValue,
  onAddItem,
  onCreateItem,
  onCreateSubItem,
  onUpdateItem,
  onDeleteItem,
  onDeleteSection,
  onRenameSection,
  onItemCompleted,
  focusedId,
  onFocusChange,
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

  const [orderedItems, setOrderedItems] = useState(() => filteredInitiatives.map(i => i.id));
  // Keep order in sync when section items change
  const currentIds = filteredInitiatives.map(i => i.id).join(',');
  const [lastIds, setLastIds] = useState(currentIds);
  if (currentIds !== lastIds) { setLastIds(currentIds); setOrderedItems(filteredInitiatives.map(i => i.id)); }

  const sortedInitiatives = orderedItems
    .map(id => filteredInitiatives.find(i => i.id === id))
    .filter(Boolean) as Initiative[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.indexOf(String(active.id));
    const newIndex = orderedItems.indexOf(String(over.id));
    const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(newOrder);
    try {
      await post('/api/items/reorder', {
        order: newOrder.map((id, idx) => ({ id, sort_order: idx }))
      });
    } catch { /* non-critical */ }
  }, [orderedItems]);

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
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
          {section.id !== 'uncategorized' && (onDeleteSection || onRenameSection) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100] w-48">
                {onRenameSection && (
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onSelect={() => {
                      const newName = window.prompt('Section name', section.title);
                      if (newName != null && newName.trim()) onRenameSection(section.id, newName.trim());
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                )}
                {onDeleteSection && (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-700 gap-2 cursor-pointer"
                    onSelect={() => {
                      if (window.confirm(`Delete section "${section.title}"? Tasks in it will become uncategorized.`)) {
                        onDeleteSection(section.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="py-2 px-2 w-8" />
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  {colVisible(visibleColumns, 'name') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Initiative</th>}
                  {colVisible(visibleColumns, 'category') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>}
                  {colVisible(visibleColumns, 'priority') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>}
                  {colVisible(visibleColumns, 'owner') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>}
                  {colVisible(visibleColumns, 'status') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>}
                  {colVisible(visibleColumns, 'progress') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>}
                  {colVisible(visibleColumns, 'dueDate') && <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>}
                  {customFields?.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).map((f) => (
                    <th key={f.id} className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase">{f.name}</th>
                  ))}
                  <th className="py-2 px-4 w-12" />
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedItems} strategy={verticalListSortingStrategy}>
              <tbody>
                {sortedInitiatives.map((initiative) => (
                  <SortableInitiativeRow
                    key={initiative.id}
                    initiative={initiative}
                    onOpenDetails={setSelectedInitiative}
                    isSelected={selectedIds.includes(initiative.id)}
                    isFocused={focusedId === initiative.id}
                    onToggleSelect={handleToggleSelect}
                    onFocus={(id) => { onFocusChange?.(id); }}
                    crew={crew}
                    customFields={customFields}
                    visibleColumns={visibleColumns}
                    onUpdateFieldValue={onUpdateFieldValue}
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
                    crew={crew}
                    customFieldCount={customFields.filter(isTaskField).length}
                    visibleColumnCount={COL_KEYS.filter((id) => colVisible(visibleColumns, id)).length + customFields.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).length}
                  />
                )}
                {sortedInitiatives.length === 0 && !showNewRow && (
                  <tr>
                    <td colSpan={10 + customFields.filter(isTaskField).length} className="py-8 px-4 text-center text-sm text-gray-500 italic">
                      No items yet — click <strong>Add task</strong> below to start.
                    </td>
                  </tr>
                )}
              </tbody>
              </SortableContext>
              </DndContext>
            </table>
          </div>
        )}

        {isExpanded && (
          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                if (onCreateItem && projectId) {
                  setShowNewRow(true);
                } else {
                  onAddItem?.();
                }
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors group"
            >
              <Plus className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
              <span className="group-hover:text-indigo-600 transition-colors">Add task</span>
            </button>
          </div>
        )}
      </div>

      {selectedInitiative && (
        <TaskDetailDrawer
          initiative={selectedInitiative}
          crew={crew}
          currentUser={currentUser}
          onClose={() => setSelectedInitiative(null)}
          onSave={onUpdateItem ? async (id, payload) => { await onUpdateItem(id, payload); } : undefined}
          onDelete={onDeleteItem ? async (id) => { await onDeleteItem(id); setSelectedInitiative(null); } : undefined}
        />
      )}
    </>
  );
}
