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
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Clock,
  X,
  GripVertical,
  Trash2,
  Pencil,
  ChevronsLeftRight,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Bold,
  Italic,
} from 'lucide-react';
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
import type { TaskListFilters } from '../lib/taskFilterUtils';
import { filterInitiativesByTaskFilters } from '../lib/taskFilterUtils';

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
  /** Optional link to a real user account — populated when the crew member has signed in. */
  user_id?: string | null;
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
  filters: TaskListFilters;
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
      requester_id?: string | null;
      custom_vals?: Record<string, string | number | boolean | null>;
    }
  ) => Promise<unknown>;
  onDeleteItem?: (id: string) => Promise<void>;
  /** If omitted, delete is allowed whenever `onDeleteItem` is set (e.g. mock data). */
  canDeleteTask?: (initiative: Initiative) => boolean;
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
  /** Ordered list of column ids — used to sort the custom/extra-standard columns after the fixed-position core columns. */
  columnOrder?: string[];
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

const COL_KEYS = ['name', 'category', 'priority', 'owner', 'status', 'progress', 'dueDate', 'topic', 'requester'] as const;

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
  'requester',
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
  requester: 160,
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

/** Very small subset of Markdown → plain HTML for title previews.
 *  Supports: **bold**, *italic*, _italic_, `code`, and autolinks http(s) URLs.
 *  The result is injected via dangerouslySetInnerHTML, so we escape first. */
function renderSimpleMarkdown(src: string): string {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/`([^`]+)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-[11px] font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*\s][^*]*[^*\s]|[^*\s])\*(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/(^|\s)_([^_\s][^_]*[^_\s]|[^_\s])_(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline">$1</a>')
    .replace(/\n/g, '<br/>');
}

/** Expandable title cell: click-to-edit, Shift+Enter for newline, Cmd/Ctrl+B / I
 *  insert Markdown bold/italic around the selection. A small "expand" button
 *  switches between clamped (2 lines) and full display.
 */
function TitleCell({ value, onSave, placeholder = 'Title' }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    if (editing) {
      taRef.current?.focus();
      const el = taRef.current;
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [editing]);

  const wrapSelection = (left: string, right = left) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = local.slice(0, start);
    const sel = local.slice(start, end) || 'text';
    const after = local.slice(end);
    const next = `${before}${left}${sel}${right}${after}`;
    setLocal(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = before.length + left.length;
      el.selectionEnd = before.length + left.length + sel.length;
    });
  };

  const commit = () => {
    const trimmed = local.replace(/\s+$/g, '');
    if (trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (!editing) {
    const rendered = renderSimpleMarkdown(local || '');
    return (
      <div className="flex items-start gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Click to edit"
          aria-label="Edit title"
          className={cn(
            'flex-1 min-w-0 text-left text-sm font-medium text-gray-900 whitespace-pre-wrap break-words leading-snug rounded-md px-2 py-1 hover:bg-gray-50',
            !expanded && 'line-clamp-2'
          )}
          dangerouslySetInnerHTML={{ __html: rendered || `<span class="text-gray-400">${placeholder}</span>` }}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
          title={expanded ? 'Collapse' : 'Expand'}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="shrink-0 mt-1 text-gray-400 hover:text-gray-700"
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 min-w-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); wrapSelection('**'); }}
          title="Bold (⌘B)"
          className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); wrapSelection('*'); }}
          title="Italic (⌘I)"
          className="h-6 w-6 flex items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-gray-400 ml-1">Markdown • Shift+Enter for newline</span>
      </div>
      <Textarea
        ref={taRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
          else if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); wrapSelection('**'); }
          else if ((e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); wrapSelection('*'); }
        }}
        rows={expanded ? 8 : 3}
        placeholder={placeholder}
        className={cn('text-sm font-medium border-gray-200 bg-white resize-y whitespace-pre-wrap break-words leading-snug', expanded ? 'min-h-40' : 'min-h-[3rem]')}
      />
    </div>
  );
}

/** Compact cell for the "Requester" column: shows the person who filed the item and lets you reassign from the crew list (users with a real account). */
function RequesterCell({
  requesterId,
  fallbackName,
  fallbackEmail,
  crew,
  onChange,
}: {
  requesterId: string | null | undefined;
  fallbackName?: string | null;
  fallbackEmail?: string | null;
  crew: CrewMember[];
  onChange: (userId: string | null) => void;
}) {
  const candidates = useMemo(() => {
    // Dedupe by user_id; only include crew members linked to a real user account.
    const seen = new Set<string>();
    const out: { userId: string; name: string; initials?: string; email?: string | null }[] = [];
    for (const m of crew) {
      const uid = (m as CrewMember & { user_id?: string | null }).user_id;
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      out.push({ userId: uid, name: m.name || m.email || uid, initials: m.initials, email: m.email ?? null });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [crew]);

  const matched = candidates.find((c) => c.userId === (requesterId || ''));
  const displayName = matched?.name || fallbackName || fallbackEmail || '—';
  const title = fallbackEmail ? `${displayName}${fallbackEmail ? ` <${fallbackEmail}>` : ''}` : displayName;

  const selectValue = requesterId || '__unset__';
  return (
    <div onClick={(e) => e.stopPropagation()} title={title}>
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === '__unset__' ? null : v)}
      >
        <SelectTrigger className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-700 w-full max-w-[160px] truncate">
          <SelectValue placeholder="Set requester">
            <span className="truncate">{displayName}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="__unset__">— Unset —</SelectItem>
          {candidates.map((c) => (
            <SelectItem key={c.userId} value={c.userId}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  crew?: CrewMember[];
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
      requester_id?: string | null;
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
        <TitleCell
          value={initiative.name}
          onSave={(v) => {
            setSaving(true);
            onUpdate(initiative.id, { title: v }).finally(() => setSaving(false));
          }}
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
      {colVisible(visibleColumns, 'requester') && (
      <td className="py-2 px-4 align-top border-gray-50" style={colCtx?.cellStyle('requester')}>
        <RequesterCell
          requesterId={initiative.requester_id ?? initiative.created_by_id ?? null}
          fallbackName={initiative.requester_name ?? initiative.created_by_name ?? null}
          fallbackEmail={initiative.requester_email ?? initiative.created_by_email ?? null}
          crew={crew}
          onChange={(uid) => onUpdate(initiative.id, { requester_id: uid })}
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
      <td
        className={cn(
          'sticky right-0 z-20 py-2 px-1.5 align-middle w-[76px] min-w-[76px] max-w-[76px] border-l border-gray-200',
          'bg-white shadow-[-8px_0_20px_-6px_rgba(15,23,42,0.1)]',
          'group-hover/row:bg-gray-50/95',
          isSelected && 'bg-blue-50 group-hover/row:bg-blue-50',
          isFocused && !isSelected && 'bg-indigo-50/60 group-hover/row:bg-indigo-50/70'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
            title="Edit task"
            aria-label="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(initiative);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
              title="Delete task"
              aria-label="Delete task"
              onClick={() => {
                if (window.confirm(`Delete "${initiative.name}"? This cannot be undone.`)) {
                  onDelete(initiative.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
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
      className={`group/row border-b border-[var(--border-soft)] hover:bg-[var(--secondary)]/60 cursor-pointer transition-colors ${props.isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : ''} ${props.isFocused ? 'ring-2 ring-inset ring-indigo-400 bg-indigo-50/40' : ''} ${isDragging ? 'opacity-40 bg-indigo-50 shadow-[0_4px_12px_rgba(79,70,229,0.18)]' : ''}`}
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
  canDeleteTask,
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
  columnOrder = [],
}: TrackerSectionProps) {
  /**
   * Rank of a column id in the user-chosen order (lower = earlier). Columns
   * missing from `columnOrder` fall back to sort_order, then name.
   */
  const orderRank = useMemo(() => {
    const map = new Map<string, number>();
    columnOrder.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [columnOrder]);

  const extraStandardFields = useMemo(() => {
    return standardFields
      .filter((f) => {
        const k = f.field_key;
        return typeof k === 'string' && k.length > 0 && !BUILT_IN_STANDARD_FIELD_KEYS.has(k);
      })
      .sort((a, b) => {
        const ka = String(a.field_key ?? a.id);
        const kb = String(b.field_key ?? b.id);
        const ra = orderRank.has(ka) ? orderRank.get(ka)! : Number.MAX_SAFE_INTEGER;
        const rb = orderRank.has(kb) ? orderRank.get(kb)! : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }) as {
        id: string;
        field_key: string;
        name: string;
        field_type?: string;
        options_json?: unknown[];
        sort_order?: number;
      }[];
  }, [standardFields, orderRank]);

  /** Custom fields respect columnOrder too — they come after extraStandardFields in the fixed render site, but appear in user-chosen order within their own group. */
  const customFieldsOrdered = useMemo(() => {
    const arr = (customFields ?? []).slice();
    arr.sort((a, b) => {
      const ra = orderRank.has(a.id) ? orderRank.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const rb = orderRank.has(b.id) ? orderRank.get(b.id)! : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    });
    return arr;
  }, [customFields, orderRank]);

  /** Display name for a standard column (picks up project-specific renames). */
  const standardLabelByKey = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of standardFields) {
      if (f.field_key) m[f.field_key] = f.name;
    }
    return m;
  }, [standardFields]);
  const labelFor = (key: string, fallback: string) => standardLabelByKey[key] || fallback;

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

  /** Sum of column widths so the table can grow wider than the viewport (enables horizontal scroll). */
  const tableMinWidthPx = useMemo(() => {
    const gw = (key: string) =>
      colWidths[key] ??
      TRACKER_COL_DEFAULTS[key as keyof typeof TRACKER_COL_DEFAULTS] ??
      (key.startsWith('cf:') || key.startsWith('std:') ? 168 : 120);
    let sum = 32 + 40; // drag handle + checkbox (w-8 + w-10)
    for (const id of COL_KEYS) {
      if (!colVisible(visibleColumns, id)) continue;
      sum += gw(id);
    }
    for (const f of extraStandardFields) {
      if (!colVisible(visibleColumns, f.field_key)) continue;
      sum += gw(STD_COL_KEY(f.field_key));
    }
    for (const f of customFields.filter(isTaskField)) {
      if (!colVisible(visibleColumns, f.id)) continue;
      sum += gw(CF_COL_KEY(f.id));
    }
    sum += 76; // Actions column
    return sum;
  }, [visibleColumns, extraStandardFields, customFields, colWidths]);

  const trackerScrollRef = useRef<HTMLDivElement>(null);
  const [tableHScroll, setTableHScroll] = useState({ overflow: false, left: false, right: false });

  const updateTableScrollHint = useCallback(() => {
    const el = trackerScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 6) {
      setTableHScroll({ overflow: false, left: false, right: false });
      return;
    }
    setTableHScroll({
      overflow: true,
      left: scrollLeft > 6,
      right: scrollLeft < maxScroll - 6,
    });
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const el = trackerScrollRef.current;
    if (!el) return;
    updateTableScrollHint();
    el.addEventListener('scroll', updateTableScrollHint, { passive: true });
    const ro = new ResizeObserver(() => updateTableScrollHint());
    ro.observe(el);
    const table = el.querySelector('table');
    if (table) ro.observe(table);
    return () => {
      el.removeEventListener('scroll', updateTableScrollHint);
      ro.disconnect();
    };
  }, [isExpanded, updateTableScrollHint, tableMinWidthPx]);

  if (viewMode === 'gantt') return null;

  const filteredInitiatives = filterInitiativesByTaskFilters(section.initiatives, filters);

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
      requester_id?: string | null;
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

  /** User-selectable sort for this section. 'manual' uses drag-and-drop order. */
  type SortKey = 'manual' | 'priority' | 'dueDate' | 'status' | 'title' | 'assignee' | 'progress' | 'createdAsc' | 'createdDesc';
  const sortStorageKey = `tracker_sort::${section.id}`;
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(sortStorageKey) : null;
      return (v as SortKey) || 'manual';
    } catch { return 'manual'; }
  });
  const setSortKeyAndPersist = (k: SortKey) => {
    setSortKey(k);
    try { window.localStorage.setItem(sortStorageKey, k); } catch { /* ignore */ }
  };

  const PRIORITY_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const STATUS_RANK: Record<string, number> = { 'Not Started': 0, 'On Track': 1, 'In Review': 2, 'At Risk': 3, 'Blocked': 4, 'Complete': 5 };

  const manualOrdered = orderedItems
    .map((id) => filteredInitiatives.find((i) => i.id === id))
    .filter(Boolean) as Initiative[];

  const sortedInitiatives: Initiative[] = (() => {
    if (sortKey === 'manual') return manualOrdered;
    const arr = [...manualOrdered];
    const cmp = (a: Initiative, b: Initiative): number => {
      switch (sortKey) {
        case 'priority':
          return (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
        case 'dueDate': {
          const at = a.endDate ? a.endDate.getTime() : Number.POSITIVE_INFINITY;
          const bt = b.endDate ? b.endDate.getTime() : Number.POSITIVE_INFINITY;
          return at - bt;
        }
        case 'status':
          return (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
        case 'title':
          return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        case 'assignee':
          return String(a.assignee_name || '').localeCompare(String(b.assignee_name || ''), undefined, { sensitivity: 'base' });
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        case 'createdAsc':
          return String(a.id).localeCompare(String(b.id));
        case 'createdDesc':
          return String(b.id).localeCompare(String(a.id));
        default:
          return 0;
      }
    };
    arr.sort(cmp);
    return arr;
  })();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    // Drag-reorder only persists in Manual mode. Other sort modes are derived
    // views, so we silently ignore drag events in them (the rows snap back on
    // next render).
    if (sortKey !== 'manual') return;
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
  }, [orderedItems, sortKey]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[var(--border-soft)] px-4 py-3 bg-gradient-to-r from-white to-[var(--secondary)] flex items-center justify-between gap-2">
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
                <span className="truncate tracking-tight">{displayTitle}</span>
                <span className="ml-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums bg-white border border-[var(--border-soft)] text-gray-600 rounded-full flex-shrink-0 shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
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
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 mr-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortKey}
                onChange={(e) => setSortKeyAndPersist(e.target.value as SortKey)}
                className="h-7 text-xs border border-gray-200 rounded-md bg-white px-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Sort tasks in this section"
                title="Sort tasks"
              >
                <option value="manual">Manual (drag)</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due date</option>
                <option value="status">Status</option>
                <option value="title">Title (A–Z)</option>
                <option value="assignee">Assignee</option>
                <option value="progress">Progress</option>
                <option value="createdDesc">Newest first</option>
                <option value="createdAsc">Oldest first</option>
              </select>
            </label>
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
          <div className="relative bg-white">
            {tableHScroll.overflow && tableHScroll.left && (
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-[35] w-9 bg-gradient-to-r from-white via-white/90 to-transparent"
                aria-hidden
              />
            )}
            {tableHScroll.overflow && tableHScroll.right && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-[35] w-12 bg-gradient-to-l from-white via-white/90 to-transparent"
                style={{ right: 76 }}
                aria-hidden
              />
            )}
            <div
              ref={trackerScrollRef}
              role="region"
              aria-label="Task table. Scroll horizontally when there are many columns."
              className={cn(
                'overflow-x-auto overflow-y-visible',
                '[scrollbar-width:thin]',
                '[&::-webkit-scrollbar]:h-2.5',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-thumb]:bg-gray-300',
                '[&::-webkit-scrollbar-track]:bg-gray-100/80'
              )}
            >
            <TrackerColWidthsContext.Provider value={colCtx}>
            <table
              className="table-fixed border-collapse"
              style={{ width: `max(100%, ${tableMinWidthPx}px)` }}
            >
              <thead className="bg-[#FAFBFC] border-b border-[var(--border-soft)] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2 w-8 max-w-8" />
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] w-10 max-w-10">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  {colVisible(visibleColumns, 'name') && <ResizableTh colKey="name" label={labelFor('name', 'Initiative')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'category') && <ResizableTh colKey="category" label={labelFor('category', 'Category')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'priority') && <ResizableTh colKey="priority" label={labelFor('priority', 'Priority')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'owner') && <ResizableTh colKey="owner" label={labelFor('owner', 'Owner')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'status') && <ResizableTh colKey="status" label={labelFor('status', 'Status')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'progress') && <ResizableTh colKey="progress" label={labelFor('progress', 'Progress')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'dueDate') && <ResizableTh colKey="dueDate" label={labelFor('dueDate', 'Due Date')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'topic') && <ResizableTh colKey="topic" label={labelFor('topic', 'Topic / Link')} ctx={colCtx} />}
                  {colVisible(visibleColumns, 'requester') && <ResizableTh colKey="requester" label={labelFor('requester', 'Requester')} ctx={colCtx} />}
                  {extraStandardFields
                    .filter((f) => colVisible(visibleColumns, f.field_key))
                    .map((f) => (
                      <ResizableTh key={f.id} colKey={STD_COL_KEY(f.field_key)} label={f.name} ctx={colCtx} />
                    ))}
                  {customFieldsOrdered.filter(isTaskField).filter((f) => colVisible(visibleColumns, f.id)).map((f) => (
                    <ResizableTh key={f.id} colKey={CF_COL_KEY(f.id)} label={f.name} ctx={colCtx} />
                  ))}
                  <th
                    className={cn(
                      'sticky right-0 z-30 py-2.5 px-2 w-[76px] min-w-[76px] max-w-[76px] text-center text-[10px] font-semibold text-gray-500 uppercase tracking-[0.06em] align-middle',
                      'border-l border-[var(--border-soft)] bg-[#FAFBFC] shadow-[-8px_0_20px_-6px_rgba(15,23,42,0.10)]'
                    )}
                    title="Edit and delete — stays visible when you scroll sideways"
                  >
                    Actions
                  </th>
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
                    customFields={customFieldsOrdered}
                    visibleColumns={visibleColumns}
                    onUpdateFieldValue={onUpdateFieldValue}
                    onAddSubItem={onCreateSubItem}
                    onUpdate={handleUpdate}
                    onDelete={
                      onDeleteItem && (!canDeleteTask || canDeleteTask(initiative))
                        ? onDeleteItem
                        : undefined
                    }
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
                      className="py-12 px-4"
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center mb-3 ring-1 ring-indigo-100">
                          <Plus className="w-5 h-5 text-indigo-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">No tasks yet</p>
                        <p className="text-xs text-gray-500 mt-0.5">Click <span className="font-semibold text-gray-700">Add task</span> below to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              </SortableContext>
              </DndContext>
            </table>
            </TrackerColWidthsContext.Provider>
            </div>
            {tableHScroll.overflow && (
              <div className="flex items-center justify-center gap-2 border-t border-indigo-100 bg-indigo-50/90 px-2 py-1.5 text-[11px] font-medium text-indigo-800">
                <ChevronsLeftRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                <span>More columns off-screen — scroll sideways (or swipe on trackpad) to see them.</span>
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <div className="border-t border-[var(--border-soft)] bg-[#FAFBFC]">
            <button
              type="button"
              onClick={() => {
                if (onCreateItem && projectId) {
                  setShowNewRow(true);
                } else {
                  onAddItem?.();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-500 hover:text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-blue-50/50 transition-all group rounded-b-2xl"
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border border-[var(--border-soft)] group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors">
                <Plus className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </span>
              <span>Add task</span>
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
          onDelete={
            onDeleteItem && selectedInitiative && (!canDeleteTask || canDeleteTask(selectedInitiative))
              ? async (id) => {
                  await onDeleteItem(id);
                  setSelectedInitiative(null);
                }
              : undefined
          }
          priorityOptions={priorityOptions}
          statusOptions={statusOptions}
          categoryOptions={categoryOptions}
          customFields={customFields}
          standardExtraFields={extraStandardFields}
          onUpdateFieldValue={onUpdateFieldValue}
        />
      )}
    </>
  );
}
