import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Plus, Clock, X, GripVertical, Trash2, Pencil } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { post } from '../api/meridian';
import { cn } from './ui/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { AssigneeLookup } from './AssigneeLookup';
import { SmartLinkChip, parseLinkableUrl } from './SmartLinkChip';
import { localDateInputToIso } from '../lib/dateFormat';
import type { Initiative, Priority, Status, Category, TrackerSection as TrackerSectionType } from '../data/mockData';

const DEFAULT_STATUS_OPTIONS: Status[] = ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete'];
const DEFAULT_PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2'];
const CATEGORIES: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];

export interface StandardFieldOption {
  label: string;
  color?: string;
}

interface CrewMember {
  id: string;
  name: string;
  initials?: string;
  role?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface CustomFieldDef {
  id: string;
  name: string;
  field_type: string;
  target?: string;
  applies_to?: string;
  options_json?: unknown[];
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
  onUpdateItem?: (
    id: string,
    payload: {
      title?: string;
      description?: string;
      status?: Status;
      priority?: Priority;
      assignee_id?: string | null;
      due_date?: string | null;
      category?: string | null;
      progress?: number;
      topic?: string | null;
      custom_vals?: Record<string, string | number | boolean | null>;
    }
  ) => Promise<unknown>;
  onDeleteItem?: (id: string) => Promise<void>;
  onDeleteSection?: (trackerId: string) => Promise<void>;
  onRenameSection?: (trackerId: string, newName: string) => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** When false, Edit/Delete are hidden (e.g. for primary/uncategorized or only section). */
  showSectionActions?: boolean;
  onItemCompleted?: () => void;
  focusedId?: string | null;
  onFocusChange?: (id: string | null) => void;
  /** From standard fields API — when set, dropdowns use these instead of defaults. */
  priorityOptions?: StandardFieldOption[];
  statusOptions?: StandardFieldOption[];
  categoryOptions?: StandardFieldOption[];
  /** Global standard fields from API — built-in keys get fixed columns; any other key (e.g. comments) renders here. */
  standardFields?: { id: string; field_key?: string; name: string; field_type?: string; options_json?: unknown[]; sort_order?: number }[];
  /** Override title for this section (e.g. custom name for uncategorized "Tasks"). */
  sectionTitleOverride?: string;
  /** When set for uncategorized section, allows renaming the display name (stored in UI only). */
  onUncategorizedNameChange?: (name: string) => void;
}

function getPriorityColor(priority: string, options?: StandardFieldOption[]): string {
  if (options?.length) {
    const opt = options.find((o) => o.label === priority);
    if (opt?.color) return 'border-gray-200'; // use inline style for custom color
  }
  switch (priority) {
    case 'P0': return 'bg-red-100 text-red-700 border-red-200';
    case 'P1': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'P2': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getStatusStyle(status: string, options?: StandardFieldOption[]): { bg: string; text: string; border: string; dot: string; customColor?: string } {
  if (options?.length) {
    const opt = options.find((o) => o.label === status);
    if (opt?.color) return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', customColor: opt.color };
  }
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
function getStatusColor(status: string, options?: StandardFieldOption[]): string {
  const s = getStatusStyle(status, options);
  return `${s.bg} ${s.text} ${s.border}`;
}

function getCategoryColor(category: Category): string {
  switch (category) {
    case 'Engineering': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Design': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'Sales': return 'bg-green-50 text-green-700 border-green-200';
    case 'Product': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Operations': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

const COL_KEYS = ['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate', 'topic'] as const;

/** Standard fields that already have dedicated table columns (field_key in standard_fields API). */
const BUILT_IN_STANDARD_FIELD_KEYS = new Set<string>([
  'name',
  'category',
  'priority',
  'owner',
  'status',
  'progress',
  'dueDate',
  'topic',
]);

/** Resize key for extra standard fields (e.g. Comments) stored in items.custom_vals. */
export const STD_COL_KEY = (fieldKey: string) => `std:${fieldKey}`;

const TRACKER_COL_DEFAULTS: Record<string, number> = {
  name: 220,
  category: 128,
  priority: 92,
  owner: 172,
  status: 140,
  progress: 124,
  dueDate: 120,
  topic: 180,
};

export const CF_COL_KEY = (fieldId: string) => `cf:${fieldId}`;

type TrackerColCtxValue = {
  widths: Record<string, number>;
  setColWidth: (key: string, width: number) => void;
  cellStyle: (key: string) => CSSProperties | undefined;
};

const TrackerColWidthsContext = createContext<TrackerColCtxValue | null>(null);

/** Classic 6-dot drag handle (2×3), muted like list reorder affordances. */
function ColumnResizeGrabber() {
  return (
    <span
      className="pointer-events-none grid grid-cols-2 gap-x-[3px] gap-y-[3px]"
      aria-hidden
    >
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="h-[3px] w-[3px] shrink-0 rounded-full bg-gray-300 group-hover:bg-gray-400 group-active:bg-indigo-400/90"
        />
      ))}
    </span>
  );
}

/** Full-height resize strip with dot grabber; light border so it stays subtle. */
function ResizableTh({
  colKey,
  label,
  ctx,
  className,
}: {
  colKey: string;
  label: React.ReactNode;
  ctx: TrackerColCtxValue;
  className?: string;
}) {
  const w =
    ctx.widths[colKey] ??
    TRACKER_COL_DEFAULTS[colKey] ??
    (colKey.startsWith('cf:') || colKey.startsWith('std:') ? 168 : 120);
  const dragStart = useRef({ x: 0, w: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = { x: e.clientX, w };
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(
        560,
        Math.max(64, dragStart.current.w + (ev.clientX - dragStart.current.x))
      );
      ctx.setColWidth(colKey, next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <th
      style={{ width: w, minWidth: w }}
      className={cn('py-2 pl-4 pr-0 text-left align-top select-none', className)}
    >
      <div className="flex min-w-0 items-stretch gap-0">
        <div className="min-w-0 flex-1 pr-2 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-normal break-words">
          {label}
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
          title="Drag to resize column"
          onMouseDown={onMouseDown}
          className={cn(
            'group flex w-5 shrink-0 cursor-col-resize items-center justify-center self-stretch border-l border-gray-200 bg-transparent',
            'hover:border-indigo-200 hover:bg-indigo-50/60',
            'active:border-indigo-300 active:bg-indigo-100/70'
          )}
        >
          <ColumnResizeGrabber />
        </div>
      </div>
    </th>
  );
}

function TopicCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const trimmed = String(value).trim();
  const linkParsed = parseLinkableUrl(trimmed, true);

  if (linkParsed && !editing) {
    return (
      <div className="flex items-center gap-1.5 min-h-8 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <SmartLinkChip parsed={linkParsed} title={trimmed || value} />
        <button
          type="button"
          className="text-[10px] text-gray-500 hover:text-gray-800 underline shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const v = local.trim();
        if (v !== value) onSave(v);
      }}
      onFocus={() => setEditing(true)}
      className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 w-full max-w-[200px]"
      placeholder="Topic or paste a link"
    />
  );
}

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
  onUpdate: (
    id: string,
    payload: {
      title?: string;
      status?: string;
      priority?: string;
      assignee_id?: string | null;
      due_date?: string | null;
      category?: Category;
      progress?: number;
      topic?: string | null;
      custom_vals?: Record<string, string | number | boolean | null>;
    }
  ) => Promise<unknown>;
  /** Extra standard fields (not name/category/…/topic) — values live in items.custom_vals[field_key]. */
  standardExtraFields?: { id: string; field_key: string; name: string; field_type?: string; options_json?: unknown[] }[];
  onDelete?: (id: string) => Promise<void>;
  onItemCompleted?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  priorityOptions?: StandardFieldOption[];
  statusOptions?: StandardFieldOption[];
  categoryOptions?: StandardFieldOption[];
  onFocusChange?: (id: string) => void;
}

function colVisible(visibleColumns: Set<string> | undefined, colId: string): boolean {
  if (visibleColumns === undefined) return true;
  return visibleColumns.has(colId);
}

function isTaskField(f: CustomFieldDef) {
  return (f.target === 'item' || f.applies_to === 'task' || !f.applies_to);
}

function normalizeFieldOptions(raw: unknown[] | undefined): { label: string; color?: string }[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((o) =>
    typeof o === 'string'
      ? { label: o.trim() }
      : { label: String((o as { label?: string }).label ?? '').trim(), color: (o as { color?: string }).color }
  ).filter((o) => o.label.length > 0);
  const seen = new Set<string>();
  return mapped.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  });
}

function CustomFieldCell({
  taskId,
  fieldId,
  fieldType,
  optionsJson,
  value,
  onSave,
  colKeyForWidth,
}: {
  taskId: string;
  fieldId: string;
  fieldType: string;
  optionsJson?: unknown[];
  value: string | number | boolean | null | undefined;
  onSave?: (taskId: string, fieldId: string, value: string | number | boolean | null) => Promise<unknown>;
  /** When set (e.g. std:comments), used for column width instead of cf:&lt;fieldId&gt; */
  colKeyForWidth?: string;
}) {
  const colCtx = useContext(TrackerColWidthsContext);
  const colW = colCtx?.cellStyle(colKeyForWidth ?? CF_COL_KEY(fieldId));
  const normalizedType = (fieldType || 'text').toLowerCase();
  const selectOpts = normalizeFieldOptions(optionsJson);
  const [editing, setEditing] = useState(false);
  const toLocal = (val: string | number | boolean | null | undefined) => {
    if (val == null) return '';
    if (normalizedType === 'date') {
      const s = String(val);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
        const [a, b, c] = s.split('/');
        const y = (c?.length === 2 ? `20${c}` : c) ?? '';
        return `${y}-${(a ?? '').padStart(2, '0')}-${(b ?? '').padStart(2, '0')}`;
      }
      return s.slice(0, 10);
    }
    return String(val);
  };
  const [local, setLocal] = useState(() => toLocal(value));
  useEffect(() => {
    if (!editing) setLocal(toLocal(value));
  }, [value, normalizedType, editing]);

  const strVal = value == null || value === undefined ? '' : String(value).trim();
  const linkParsed =
    normalizedType === 'url' || normalizedType === 'link'
      ? parseLinkableUrl(strVal, true)
      : normalizedType === 'text' || normalizedType === 'textarea'
        ? parseLinkableUrl(strVal, false)
        : null;

  const display =
    value === null || value === undefined
      ? '—'
      : normalizedType === 'date' && value
        ? (typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : String(value))
        : String(value);

  const handleBlur = () => {
    setEditing(false);
    if (!onSave) return;
    const v = local.trim();
    if (normalizedType === 'number') {
      const n = Number(v);
      onSave(taskId, fieldId, v === '' ? null : Number.isNaN(n) ? (value ?? null) : n);
    } else if (normalizedType === 'boolean') {
      onSave(taskId, fieldId, v === 'true' || v === '1' || v.toLowerCase() === 'yes');
    } else if (normalizedType === 'date') {
      onSave(taskId, fieldId, v === '' ? null : v);
    } else {
      onSave(taskId, fieldId, v === '' ? null : v);
    }
  };

  const inputType =
    normalizedType === 'number'
      ? 'number'
      : normalizedType === 'date'
        ? 'date'
        : normalizedType === 'url'
          ? 'url'
          : 'text';

  if ((normalizedType === 'select' || normalizedType === 'multi_select') && selectOpts.length > 0 && onSave) {
    const v = value == null || value === '' ? '__empty' : String(value);
    return (
      <td
        className="py-2 px-4 align-top min-w-[80px] border-gray-50"
        style={colW}
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value={v}
          onValueChange={(nv) => onSave(taskId, fieldId, nv === '__empty' ? null : nv)}
        >
          <SelectTrigger className="h-8 text-xs border-gray-200 bg-white">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="__empty" className="text-xs">—</SelectItem>
            {selectOpts.map((o) => (
              <SelectItem key={o.label} value={o.label} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
    );
  }

  const useMultiline =
    normalizedType === 'text' ||
    normalizedType === 'textarea' ||
    normalizedType === 'url' ||
    normalizedType === 'link';

  return (
    <td
      className="py-2 px-4 align-top min-w-[80px] border-gray-50"
      style={colW}
      onClick={() => onSave && setEditing(true)}
    >
      {editing && onSave ? (
        normalizedType === 'date' ? (
          <input
            type="date"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white w-full max-w-[140px]"
            autoFocus
          />
        ) : useMultiline ? (
          <Textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleBlur();
            }}
            rows={3}
            autoFocus
            className="min-h-[2.5rem] max-h-48 text-xs border-gray-200 rounded-md resize-y whitespace-pre-wrap break-words"
          />
        ) : (
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className="h-8 text-xs border-gray-200 rounded-md"
            autoFocus
            type={inputType}
          />
        )
      ) : linkParsed ? (
        <SmartLinkChip
          parsed={linkParsed}
          title={strVal || String(value ?? '')}
          className="max-w-full"
        />
      ) : (normalizedType === 'url' || normalizedType === 'link') && strVal ? (
        <span className="text-xs text-amber-700 break-words" title={strVal}>
          Add https://… or www.…
        </span>
      ) : (
        <span className="text-xs text-gray-700 whitespace-pre-wrap break-words">
          {display === '' ? '—' : display}
        </span>
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
  priorityOptions,
  statusOptions,
  categoryOptions,
  onFocusChange,
  standardExtraFields = [],
}: InitiativeRowEditableProps) {
  const colCtx = useContext(TrackerColWidthsContext);
  const [title, setTitle] = useState(initiative.name);
  const catList: StandardFieldOption[] = (categoryOptions?.length ? categoryOptions : CATEGORIES.map((c) => ({ label: c }))).slice();
  if (initiative.category && !catList.some((o) => o.label === initiative.category)) {
    catList.push({ label: initiative.category, color: '#6b7280' });
  }
  const priorityList: StandardFieldOption[] = (priorityOptions?.length ? priorityOptions : DEFAULT_PRIORITY_OPTIONS.map((p) => ({ label: p }))).slice();
  if (initiative.priority && !priorityList.some((o) => o.label === initiative.priority)) {
    priorityList.push({ label: initiative.priority, color: '#6b7280' });
  }
  const statusList: StandardFieldOption[] = (statusOptions?.length ? statusOptions : DEFAULT_STATUS_OPTIONS.map((s) => ({ label: s }))).slice();
  if (initiative.status && !statusList.some((o) => o.label === initiative.status)) {
    statusList.push({ label: initiative.status, color: '#6b7280' });
  }
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

  const handleStatusChange = async (status: string) => {
    const wasComplete = initiative.status === 'Complete';
    setSaving(true);
    try {
      await onUpdate(initiative.id, { status });
      if (!wasComplete && status === 'Complete') onItemCompleted?.();
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = (priority: string) => {
    setSaving(true);
    onUpdate(initiative.id, { priority }).finally(() => setSaving(false));
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value || null;
    setSaving(true);
    onUpdate(initiative.id, { due_date: v ? localDateInputToIso(v) : null }).finally(() => setSaving(false));
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    setSaving(true);
    onUpdate(initiative.id, { assignee_id: assigneeId }).finally(() => setSaving(false));
  };

  // Note: parent SortableInitiativeRow renders <tr>, drag column, and checkbox column. We render only data columns to match header order.
  return (
    <>
      {colVisible(visibleColumns, 'name') && (
      <td
        className="py-2 px-4 align-top border-gray-50"
        style={colCtx?.cellStyle('name')}
      >
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          rows={2}
          placeholder="Title"
          className="min-h-[2.5rem] max-h-40 text-sm font-medium border-gray-200 bg-white resize-y whitespace-pre-wrap break-words leading-snug"
        />
      </td>
      )}
      {colVisible(visibleColumns, 'category') && (
      <td
        className="py-2 px-4 align-top border-gray-50"
        style={colCtx?.cellStyle('category')}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Select value={initiative.category} onValueChange={(v) => { setSaving(true); onUpdate(initiative.id, { category: v as Category }).finally(() => setSaving(false)); }}>
          <SelectTrigger className={`h-8 text-xs border-gray-200 bg-white ${getCategoryColor(initiative.category)}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {catList.map((c) => (
              <SelectItem key={c.label} value={c.label} className="text-xs">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      )}
      {colVisible(visibleColumns, 'priority') && (
      <td
        className="py-2 px-4 align-top border-gray-50"
        style={colCtx?.cellStyle('priority')}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Select value={initiative.priority} onValueChange={(v) => handlePriorityChange(v)}>
          <SelectTrigger
            className={`h-8 text-xs border-gray-200 ${getPriorityColor(initiative.priority, priorityOptions)}`}
            style={priorityOptions?.find((o) => o.label === initiative.priority)?.color ? { backgroundColor: `${priorityOptions.find((o) => o.label === initiative.priority)?.color}20`, color: priorityOptions.find((o) => o.label === initiative.priority)?.color } : undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {priorityList.map((p) => (
              <SelectItem key={p.label} value={p.label} className="text-xs">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      )}
      {colVisible(visibleColumns, 'owner') && (
      <td
        className="py-2 px-4 align-top overflow-visible relative z-20 border-gray-50"
        style={colCtx?.cellStyle('owner')}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AssigneeLookup
          value={initiative.assignee_id ?? null}
          onChange={handleAssigneeChange}
          crew={crew}
          compact
          fallbackLabel={
            initiative.assignee_id
              ? (initiative.assignee_name ||
                  initiative.assignee_email ||
                  (initiative.owner && initiative.owner !== '—' ? initiative.owner : null))
              : null
          }
          fallbackEmail={initiative.assignee_email ?? null}
        />
      </td>
      )}
      {colVisible(visibleColumns, 'status') && (
      <td
        className="py-2 px-4 align-top border-gray-50"
        style={colCtx?.cellStyle('status')}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Select value={initiative.status} onValueChange={(v) => handleStatusChange(v)}>
          <SelectTrigger
            className={`h-8 text-xs border rounded-full px-3 ${getStatusColor(initiative.status, statusOptions)}`}
            style={statusOptions?.find((o) => o.label === initiative.status)?.color ? { backgroundColor: `${statusOptions.find((o) => o.label === initiative.status)?.color}20`, color: statusOptions.find((o) => o.label === initiative.status)?.color } : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!statusOptions?.find((o) => o.label === initiative.status)?.color ? getStatusStyle(initiative.status).dot : ''}`}
                style={statusOptions?.find((o) => o.label === initiative.status)?.color ? { backgroundColor: statusOptions.find((o) => o.label === initiative.status)?.color } : undefined}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {statusList.map((s) => {
              const style = getStatusStyle(s.label, statusOptions);
              const dotStyle = statusOptions?.find((o) => o.label === s.label)?.color ? { backgroundColor: statusOptions.find((o) => o.label === s.label)?.color } : undefined;
              return (
                <SelectItem key={s.label} value={s.label} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${!dotStyle ? style.dot : ''}`} style={dotStyle} />
                    {s.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </td>
      )}
      {colVisible(visibleColumns, 'progress') && (
      <td className="py-2 px-4 align-top border-gray-50" style={colCtx?.cellStyle('progress')}>
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
      <td className="py-2 px-4 align-top border-gray-50" style={colCtx?.cellStyle('dueDate')}>
        <input
          type="date"
          value={dueDateStr}
          onChange={handleDueDateChange}
          className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 w-full max-w-[140px]"
        />
      </td>
      )}
      {colVisible(visibleColumns, 'topic') && (
      <td className="py-2 px-4 align-top border-gray-50" style={colCtx?.cellStyle('topic')}>
        <TopicCell
          value={String(initiative.field_values?.topic ?? '')}
          onSave={(v) => onUpdate(initiative.id, { topic: v || null })}
        />
      </td>
      )}
      {standardExtraFields
        .filter((f) => colVisible(visibleColumns, f.field_key))
        .map((f) => (
          <CustomFieldCell
            key={f.id}
            taskId={initiative.id}
            fieldId={f.id}
            colKeyForWidth={STD_COL_KEY(f.field_key)}
            fieldType={f.field_type || 'text'}
            optionsJson={f.options_json as unknown[] | undefined}
            value={
              (initiative.field_values?.[f.field_key] as string | number | boolean | null | undefined) ?? null
            }
            onSave={async (taskId, _fieldId, value) => {
              await onUpdate(taskId, { custom_vals: { [f.field_key]: value } });
            }}
          />
        ))}
      {customFields.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).map((field) => (
        <CustomFieldCell
          key={field.id}
          taskId={initiative.id}
          fieldId={field.id}
          fieldType={field.field_type}
          optionsJson={field.options_json}
          value={initiative.field_values?.[field.id] ?? null}
          onSave={onUpdateFieldValue}
        />
      ))}
      <td className="py-2 px-4 align-top w-24 min-w-[96px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(initiative);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
              onClick={() => {
                if (window.confirm(`Delete "${initiative.name}"? This cannot be undone.`)) {
                  onDelete(initiative.id);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
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
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    const t = title.trim();
    if (!t || !projectId) return;
    setSaving(true);
    try {
      await onSave(projectId, { title: t }, sectionId === 'uncategorized' ? null : sectionId);
      setTitle('');
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const colSpan = (visibleColumnCount ?? 0) + 1;

  return (
    <tr className="bg-indigo-50/40 border-b border-indigo-100">
      <td className="py-2 px-2 w-8" />
      <td className="py-2 px-3 w-10" />
      <td colSpan={colSpan} className="py-2 px-4 align-middle">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="flex-1 min-w-0 h-8 px-3 text-sm border border-indigo-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder-gray-400"
            placeholder="Task title… (Enter to add, Esc to cancel)"
          />
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 shrink-0" onClick={onCancel} disabled={saving} title="Cancel">
            <X className="w-4 h-4" />
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
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest('button, a, input, textarea, select, [role="combobox"]')) return;
        props.onFocus?.(props.initiative.id);
      }}
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
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  showSectionActions = true,
  onItemCompleted,
  focusedId,
  onFocusChange,
  priorityOptions,
  statusOptions,
  categoryOptions,
  sectionTitleOverride,
  onUncategorizedNameChange,
  standardFields = [],
}: TrackerSectionProps) {
  const extraStandardFields = useMemo(() => {
    return standardFields
      .filter((f) => {
        const k = f.field_key;
        return typeof k === 'string' && k.length > 0 && !BUILT_IN_STANDARD_FIELD_KEYS.has(k);
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) as {
        id: string;
        field_key: string;
        name: string;
        field_type?: string;
        options_json?: unknown[];
        sort_order?: number;
      }[];
  }, [standardFields]);

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [showNewRow, setShowNewRow] = useState(false);
  const [editingSectionName, setEditingSectionName] = useState<string | null>(null);
  const displayTitle = sectionTitleOverride ?? section.title;

  const colWidthsStorageKey = `tracker-col-widths-${projectId ?? 'default'}`;
  const [colWidths, setColWidthsState] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(colWidthsStorageKey);
      if (raw) return { ...TRACKER_COL_DEFAULTS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return { ...TRACKER_COL_DEFAULTS };
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(colWidthsStorageKey);
      if (raw) setColWidthsState({ ...TRACKER_COL_DEFAULTS, ...JSON.parse(raw) });
      else setColWidthsState({ ...TRACKER_COL_DEFAULTS });
    } catch {
      setColWidthsState({ ...TRACKER_COL_DEFAULTS });
    }
  }, [colWidthsStorageKey]);

  const setColWidth = useCallback(
    (key: string, width: number) => {
      setColWidthsState((prev) => {
        const next = { ...prev, [key]: width };
        try {
          localStorage.setItem(colWidthsStorageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [colWidthsStorageKey]
  );

  const cellStyle = useCallback(
    (key: string): CSSProperties | undefined => {
      const w =
        colWidths[key] ??
        TRACKER_COL_DEFAULTS[key] ??
        (key.startsWith('cf:') || key.startsWith('std:') ? 168 : undefined);
      if (w == null) return undefined;
      return { width: w, minWidth: w, maxWidth: w };
    },
    [colWidths]
  );

  const colCtx = useMemo<TrackerColCtxValue>(
    () => ({ widths: colWidths, setColWidth, cellStyle }),
    [colWidths, setColWidth, cellStyle]
  );

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

  const handleUpdate = async (
    id: string,
    payload: {
      title?: string;
      status?: Status;
      priority?: Priority;
      assignee_id?: string | null | undefined;
      due_date?: string | null;
      category?: Category;
      progress?: number;
      topic?: string | null;
      custom_vals?: Record<string, string | number | boolean | null>;
    }
  ) => {
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {editingSectionName !== null ? (
              <input
                type="text"
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                onBlur={() => {
                  if (section.id === 'uncategorized' && onUncategorizedNameChange) {
                    if (editingSectionName.trim()) onUncategorizedNameChange(editingSectionName.trim());
                    setEditingSectionName(null);
                  } else if (onRenameSection && editingSectionName.trim() && editingSectionName.trim() !== section.title) {
                    onRenameSection(section.id, editingSectionName.trim());
                    setEditingSectionName(null);
                  } else {
                    setEditingSectionName(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (section.id === 'uncategorized' && onUncategorizedNameChange) {
                      if (editingSectionName.trim()) onUncategorizedNameChange(editingSectionName.trim());
                      setEditingSectionName(null);
                    } else if (onRenameSection && editingSectionName.trim() && editingSectionName.trim() !== section.title) {
                      onRenameSection(section.id, editingSectionName.trim());
                      setEditingSectionName(null);
                    } else {
                      setEditingSectionName(null);
                    }
                  } else if (e.key === 'Escape') {
                    setEditingSectionName(null);
                  }
                }}
                className="flex-1 min-w-0 text-sm font-semibold text-gray-900 border border-blue-300 rounded px-2 py-1 bg-white"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors text-left flex-1 min-w-0"
                title={onRenameSection || onUncategorizedNameChange ? 'Double-click to rename' : undefined}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (section.id === 'uncategorized' && onUncategorizedNameChange) {
                    setEditingSectionName(displayTitle);
                  } else if (section.id !== 'uncategorized' && onRenameSection) {
                    setEditingSectionName(section.title);
                  }
                }}
              >
                <span className="truncate">{displayTitle}</span>
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full flex-shrink-0">
                  {filteredInitiatives.length}
                </span>
              </button>
            )}
            {/* Edit: for uncategorized (display name only) or for real trackers (rename in backend) */}
            {editingSectionName === null && (section.id === 'uncategorized' ? onUncategorizedNameChange : onRenameSection) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (section.id === 'uncategorized' && onUncategorizedNameChange) {
                    setEditingSectionName(displayTitle);
                  } else if (section.id !== 'uncategorized' && onRenameSection) {
                    setEditingSectionName(section.title);
                  }
                }}
                title={section.id === 'uncategorized' ? 'Rename display name (e.g. Backlog, Inbox)' : 'Rename section'}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {showSectionActions && section.id !== 'uncategorized' && (onMoveUp != null || onMoveDown != null || onDeleteSection || onRenameSection) && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {onMoveUp != null && (
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 disabled:opacity-30" onClick={onMoveUp} disabled={!canMoveUp} title="Move section up">
                  <ChevronUp className="w-4 h-4" />
                </Button>
              )}
              {onMoveDown != null && (
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 disabled:opacity-30" onClick={onMoveDown} disabled={!canMoveDown} title="Move section down">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              )}
              {onDeleteSection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                  onClick={() => {
                    if (window.confirm(`Delete section "${section.title}"? Tasks in it will become uncategorized.`)) {
                      onDeleteSection(section.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="overflow-x-auto">
            <TrackerColWidthsContext.Provider value={colCtx}>
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="py-2 px-2 w-8 max-w-8" />
                  <th className="py-2 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-10 max-w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  {colVisible(visibleColumns, 'name') && <ResizableTh colKey="name" label="Initiative" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'category') && <ResizableTh colKey="category" label="Category" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'priority') && <ResizableTh colKey="priority" label="Priority" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'owner') && <ResizableTh colKey="owner" label="Owner" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'status') && <ResizableTh colKey="status" label="Status" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'progress') && <ResizableTh colKey="progress" label="Progress" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'dueDate') && <ResizableTh colKey="dueDate" label="Due Date" ctx={colCtx} />}
                  {colVisible(visibleColumns, 'topic') && <ResizableTh colKey="topic" label="Topic" ctx={colCtx} />}
                  {extraStandardFields
                    .filter((f) => colVisible(visibleColumns, f.field_key))
                    .map((f) => (
                      <ResizableTh key={f.id} colKey={STD_COL_KEY(f.field_key)} label={f.name} ctx={colCtx} />
                    ))}
                  {customFields?.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).map((f) => (
                    <ResizableTh key={f.id} colKey={CF_COL_KEY(f.id)} label={f.name} ctx={colCtx} />
                  ))}
                  <th className="py-2 px-4 w-24 min-w-[96px] max-w-[96px] text-left text-xs font-semibold text-gray-600 uppercase align-top">Actions</th>
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
                    priorityOptions={priorityOptions}
                    statusOptions={statusOptions}
                    categoryOptions={categoryOptions}
                    onFocusChange={onFocusChange}
                    standardExtraFields={extraStandardFields}
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
                    visibleColumnCount={
                      COL_KEYS.filter((id) => colVisible(visibleColumns, id)).length +
                      extraStandardFields.filter((f) => colVisible(visibleColumns, f.field_key)).length +
                      customFields.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).length
                    }
                  />
                )}
                {sortedInitiatives.length === 0 && !showNewRow && (
                  <tr>
                    <td
                      colSpan={
                        3 +
                        COL_KEYS.filter((id) => colVisible(visibleColumns, id)).length +
                        extraStandardFields.filter((f) => colVisible(visibleColumns, f.field_key)).length +
                        (customFields?.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).length ?? 0)
                      }
                      className="py-8 px-4 text-center text-sm text-gray-500 italic"
                    >
                      No items yet — click <strong>Add task</strong> below to start.
                    </td>
                  </tr>
                )}
              </tbody>
              </SortableContext>
              </DndContext>
            </table>
            </TrackerColWidthsContext.Provider>
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
          key={selectedInitiative.id}
          initiative={selectedInitiative}
          crew={crew}
          currentUser={currentUser}
          onClose={() => setSelectedInitiative(null)}
          onSave={onUpdateItem ? async (id, payload) => { await onUpdateItem(id, payload); } : undefined}
          onDelete={onDeleteItem ? async (id) => { await onDeleteItem(id); setSelectedInitiative(null); } : undefined}
          priorityOptions={priorityOptions}
          statusOptions={statusOptions}
          categoryOptions={categoryOptions}
        />
      )}
    </>
  );
}
