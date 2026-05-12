import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Paperclip,
  Trash2,
  ExternalLink,
  Flag,
  ChevronDown,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AssigneeLookup } from './AssigneeLookup';
import { formatLocalDate, formatLocalDateTime, localDateInputToIso } from '../lib/dateFormat';
import { Progress } from './ui/progress';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { get, post, del, patch } from '../api/meridian';
import type { Initiative, Status, Priority, Category } from '../data/mockData';

const DEFAULT_STATUS_OPTIONS: Status[] = ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete'];
const DEFAULT_PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2'];
const CATEGORIES: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];

export interface StandardFieldOption { label: string; color?: string; }

export type TaskDrawerCustomFieldDef = {
  id: string;
  name: string;
  field_type: string;
  options_json?: unknown[];
  target?: string;
  applies_to?: string;
};

export type TaskDrawerStandardExtraDef = {
  id: string;
  field_key: string;
  name: string;
  field_type?: string;
  options_json?: unknown[];
};

function isTaskLevelCustomField(f: TaskDrawerCustomFieldDef) {
  return f.target === 'item' || f.applies_to === 'task' || !f.applies_to;
}

function normalizeDrawerFieldOptions(raw: unknown[] | undefined): { label: string; color?: string }[] {
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

function valueToDateInput(value: string | number | boolean | null | undefined): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

function TaskFieldValueEditor({
  fieldType,
  optionsJson,
  value,
  onCommit,
  disabled,
}: {
  fieldType: string;
  optionsJson?: unknown[];
  value: string | number | boolean | null | undefined;
  onCommit: (v: string | number | boolean | null) => void;
  disabled?: boolean;
}) {
  const t = (fieldType || 'text').toLowerCase();
  const opts = normalizeDrawerFieldOptions(optionsJson);

  if ((t === 'select' || t === 'multi_select') && opts.length > 0) {
    const v = value == null || value === '' ? '__empty' : String(value);
    return (
      <Select value={v} onValueChange={(nv) => onCommit(nv === '__empty' ? null : nv)} disabled={disabled}>
        <SelectTrigger className="h-9 text-sm border-gray-200 bg-white w-full rounded-lg shadow-none">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="__empty" className="text-sm">—</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o.label} value={o.label} className="text-sm">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (t === 'number') {
    return <TaskFieldNumberBlurInput value={value} onCommit={onCommit} disabled={disabled} />;
  }

  if (t === 'boolean') {
    const cur =
      value === null || value === undefined
        ? '__empty'
        : value === true || value === 'true' || value === 1
          ? 'true'
          : 'false';
    return (
      <Select
        value={cur}
        onValueChange={(nv) => {
          if (nv === '__empty') onCommit(null);
          else onCommit(nv === 'true');
        }}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 text-sm border-gray-200 bg-white w-full rounded-lg shadow-none">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="__empty" className="text-sm">—</SelectItem>
          <SelectItem value="true" className="text-sm">Yes</SelectItem>
          <SelectItem value="false" className="text-sm">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (t === 'date') {
    return (
      <Input
        type="date"
        className="h-9 text-sm rounded-lg border-gray-200"
        value={valueToDateInput(value)}
        onChange={(e) => onCommit(e.target.value ? e.target.value : null)}
        disabled={disabled}
      />
    );
  }

  if (t === 'textarea') {
    return <TaskFieldTextBlurArea value={value} onCommit={onCommit} disabled={disabled} />;
  }

  return (
    <TaskFieldTextBlurInput
      type={t === 'url' || t === 'link' ? 'url' : 'text'}
      value={value}
      onCommit={onCommit}
      disabled={disabled}
      placeholder={t === 'url' || t === 'link' ? 'https://…' : undefined}
    />
  );
}

function TaskFieldNumberBlurInput({
  value,
  onCommit,
  disabled,
}: {
  value: string | number | boolean | null | undefined;
  onCommit: (v: string | number | boolean | null) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(() => (value == null || value === '' ? '' : String(value)));
  useEffect(() => {
    setLocal(value == null || value === '' ? '' : String(value));
  }, [value]);
  return (
    <Input
      type="number"
      className="h-9 text-sm rounded-lg border-gray-200"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local === '') onCommit(null);
        else {
          const n = Number(local);
          onCommit(Number.isNaN(n) ? null : n);
        }
      }}
      disabled={disabled}
    />
  );
}

function TaskFieldTextBlurInput({
  type,
  value,
  onCommit,
  disabled,
  placeholder,
}: {
  type: 'text' | 'url';
  value: string | number | boolean | null | undefined;
  onCommit: (v: string | number | boolean | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(() => (value == null ? '' : String(value)));
  useEffect(() => {
    setLocal(value == null ? '' : String(value));
  }, [value]);
  return (
    <Input
      type={type}
      className="h-9 text-sm rounded-lg border-gray-200"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local.trim() || null)}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}

function TaskFieldTextBlurArea({
  value,
  onCommit,
  disabled,
}: {
  value: string | number | boolean | null | undefined;
  onCommit: (v: string | number | boolean | null) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(() => (value == null ? '' : String(value)));
  useEffect(() => {
    setLocal(value == null ? '' : String(value));
  }, [value]);
  return (
    <textarea
      className="w-full min-h-[88px] text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-y"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local.trim() || null)}
      disabled={disabled}
    />
  );
}

/** Compact row for extra task fields (dense, scannable). */
function DrawerFieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:py-2">
      <span className="shrink-0 text-xs font-medium text-gray-500 sm:w-36">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function apiPath(p: string) { return p.startsWith('/') ? p : `/${p}`; }

function formatDate(d: Date | null | undefined) {
  if (!d || isNaN(d.getTime())) return null;
  return formatLocalDate(d);
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function avatarColor(name: string) {
  const colors = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function statusStyles(status: string): { bg: string; text: string; dot: string; border: string } {
  const map: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'On Track':    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'At Risk':     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-200' },
    'In Review':   { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500',  border: 'border-violet-200' },
    'Complete':    { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-200' },
    'Blocked':     { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-200' },
    'Not Started': { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-300',    border: 'border-gray-200' },
  };
  return map[status] ?? map['Not Started'] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300', border: 'border-gray-200' };
}

interface Comment {
  id: string;
  body: string;
  author_name: string;
  author_email: string;
  created_at: string;
  author_id: string;
  /** API: project admin + comment author */
  can_delete?: boolean;
}

interface HistoryEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_initials: string | null;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploader_name: string;
}

interface CrewMember {
  id: string;
  name: string;
  initials?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export type TaskDetailSavePayload = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee_id?: string | null;
  category?: Category;
  due_date?: string | null;
  progress?: number;
  topic?: string | null;
  custom_vals?: Record<string, string | number | boolean | null>;
  repeat_interval?: string | null;
  is_milestone?: boolean;
};

interface TaskDetailDrawerProps {
  initiative: Initiative;
  crew?: CrewMember[];
  currentUser?: { id: string; name: string } | null;
  onClose: () => void;
  onSave?: (id: string, payload: TaskDetailSavePayload) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  priorityOptions?: StandardFieldOption[];
  statusOptions?: StandardFieldOption[];
  categoryOptions?: StandardFieldOption[];
  /** Custom fields shown on task rows (same as tracker). */
  customFields?: TaskDrawerCustomFieldDef[];
  /** Standard fields stored in custom_vals (e.g. comments). */
  standardExtraFields?: TaskDrawerStandardExtraDef[];
  /** PATCH /api/tasks/:id/field-values for custom field columns. */
  onUpdateFieldValue?: (taskId: string, fieldId: string, value: string | number | boolean | null) => Promise<unknown>;
}

export function TaskDetailDrawer({
  initiative,
  crew = [],
  currentUser,
  onClose,
  onSave,
  onDelete,
  priorityOptions,
  statusOptions,
  categoryOptions,
  customFields = [],
  standardExtraFields = [],
  onUpdateFieldValue,
}: TaskDetailDrawerProps) {
  // Editable fields
  const [title, setTitle] = useState(initiative.name);
  const [description, setDescription] = useState(initiative.description || '');
  const [status, setStatus] = useState<string>(initiative.status);
  const [priority, setPriority] = useState<string>(initiative.priority);
  const statusList = (statusOptions?.length ? statusOptions : DEFAULT_STATUS_OPTIONS.map((s) => ({ label: s }))).slice();
  if (status && !statusList.some((o) => o.label === status)) statusList.push({ label: status });
  const priorityList = (priorityOptions?.length ? priorityOptions : DEFAULT_PRIORITY_OPTIONS.map((p) => ({ label: p }))).slice();
  if (priority && !priorityList.some((o) => o.label === priority)) priorityList.push({ label: priority });
  const [assigneeId, setAssigneeId] = useState<string | null>(initiative.assignee_id ?? null);
  const [category, setCategory] = useState<Category>(initiative.category);
  const categoryList = (categoryOptions?.length ? categoryOptions : CATEGORIES.map((c) => ({ label: c }))).slice();
  if (category && !categoryList.some((o) => o.label === category)) {
    categoryList.push({ label: category, color: '#6b7280' });
  }
  const [progress, setProgress] = useState(initiative.progress ?? 0);
  const dueDateStr = initiative.endDate && !isNaN(initiative.endDate.getTime())
    ? initiative.endDate.toISOString().slice(0, 10) : '';
  const [dueDate, setDueDate] = useState(dueDateStr);
  const [topicDraft, setTopicDraft] = useState(() => String(initiative.field_values?.topic ?? ''));

  const taskCustomFields = customFields.filter(isTaskLevelCustomField);

  // Edit states
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'attachments' | 'time' | 'deps' | 'history'>('overview');

  // Activity / History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Time tracking
  const [timeLogs, setTimeLogs] = useState<{ id: string; minutes: number; note: string | null; logged_at: string; user_name: string | null }[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [logMinutes, setLogMinutes] = useState('');
  const [logNote, setLogNote] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);
  // Dependencies
  const [deps, setDeps] = useState<{ id: string; depends_on_id: string; depends_on_title: string; depends_on_status: string }[]>([]);
  // Recurring
  const [repeatInterval, setRepeatInterval] = useState<string>('none');
  // Milestone
  const [isMilestone, setIsMilestone] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention suggestions
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const [dialogOpen, setDialogOpen] = useState(true);
  const closingRef = useRef(false);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setDialogOpen(false);
    setTimeout(() => onClose(), 200);
  };

  function normalizeCommentsPayload(raw: unknown): Comment[] {
    if (Array.isArray(raw)) return raw as Comment[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { comments?: unknown }).comments)) {
      return (raw as { comments: Comment[] }).comments;
    }
    return [];
  }

  const loadComments = useCallback(async () => {
    try {
      const raw = await get<unknown>(apiPath(`api/items/${initiative.id}/comments`));
      setComments(normalizeCommentsPayload(raw));
    } catch (e) {
      console.error('load comments', e);
      toast.error(e instanceof Error ? e.message : 'Failed to load comments');
      setComments([]);
    }
  }, [initiative.id]);

  // Load attachments, time logs, deps; comments loaded below + when opening Comments tab
  useEffect(() => {
    loadComments();
    get<Attachment[]>(apiPath(`api/items/${initiative.id}/attachments`))
      .then((rows) => setAttachments(Array.isArray(rows) ? rows : []))
      .catch(() => setAttachments([]));
    get<{ logs: typeof timeLogs; totalMinutes: number }>(apiPath(`api/items/${initiative.id}/time-logs`))
      .then((d) => {
        setTimeLogs(d.logs || []);
        setTotalMinutes(d.totalMinutes || 0);
      })
      .catch(() => {});
    get<typeof deps>(apiPath(`api/items/${initiative.id}/dependencies`)).then(setDeps).catch(() => {});
  }, [initiative.id, loadComments]);

  useEffect(() => {
    if (activeTab === 'comments') void loadComments();
  }, [activeTab, loadComments]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await get<HistoryEntry[]>(apiPath(`api/activity/item/${initiative.id}`));
      setHistory(Array.isArray(rows) ? rows : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [initiative.id]);

  useEffect(() => {
    if (activeTab === 'history') void loadHistory();
  }, [activeTab, loadHistory]);

  useEffect(() => {
    setTopicDraft(String(initiative.field_values?.topic ?? ''));
  }, [initiative.id, initiative.field_values?.topic]);

  /** After PATCH + reload, parent passes updated initiative — keep picklists in sync (was stuck on first open). */
  useEffect(() => {
    if (!editingTitle) setTitle(initiative.name);
    if (!editingDesc) setDescription(initiative.description || '');
    setStatus(initiative.status);
    setPriority(String(initiative.priority));
    setAssigneeId(initiative.assignee_id ?? null);
    setCategory(initiative.category);
    setProgress(initiative.progress ?? 0);
    const d = initiative.endDate && !isNaN(initiative.endDate.getTime())
      ? initiative.endDate.toISOString().slice(0, 10)
      : '';
    setDueDate(d);
  }, [
    initiative.id,
    initiative.name,
    initiative.description,
    initiative.status,
    initiative.priority,
    initiative.category,
    initiative.assignee_id,
    initiative.progress,
    initiative.endDate,
    editingTitle,
    editingDesc,
  ]);

  const save = useCallback(async (patch: TaskDetailSavePayload) => {
    if (!onSave) return;
    setSaving(true);
    try { await onSave(initiative.id, patch); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }, [initiative.id, onSave]);

  const handleTitleSave = () => {
    setEditingTitle(false);
    const t = title.trim();
    if (t && t !== initiative.name) save({ title: t });
  };

  const handleDescSave = () => {
    setEditingDesc(false);
    save({ description: description.trim() || undefined });
  };

  const handlePostComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    const mentions = (body.match(/@(\w+)/g) || []).map(m => m.slice(1));
    setPostingComment(true);
    try {
      const c = await post<Comment>(apiPath(`api/items/${initiative.id}/comments`), { body, mentions });
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch (e) { toast.error('Failed to post comment'); }
    finally { setPostingComment(false); }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await del(apiPath(`api/comments/${id}`));
      setComments(prev => prev.filter(c => c.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      try {
        const att = await post<Attachment>(apiPath(`api/items/${initiative.id}/attachments`), {
          name: file.name, url, size_bytes: file.size, mime_type: file.type,
        });
        setAttachments(prev => [...prev, att]);
        toast.success(`Attached ${file.name}`);
      } catch { toast.error('Upload failed'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Remove this attachment?')) return;
    try {
      await del(apiPath(`api/attachments/${id}`));
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch { toast.error('Failed to remove'); }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handlePostComment(); }
    if (e.key === '@') {
      setShowMentions(true);
      setMentionQuery('');
    }
    if (showMentions && e.key === 'Escape') setShowMentions(false);
  };

  const handleCommentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0 && !val.slice(atIdx + 1).includes(' ')) {
      setMentionQuery(val.slice(atIdx + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const atIdx = commentText.lastIndexOf('@');
    setCommentText(commentText.slice(0, atIdx) + `@${name} `);
    setShowMentions(false);
    commentRef.current?.focus();
  };

  const filteredCrew = showMentions
    ? crew.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const isImage = (mime: string) => mime.startsWith('image/');
  const isLink = (url: string) => url.startsWith('http');

  const stStyles = statusStyles(status);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        className={cn(
          '!flex !flex-col w-[min(100vw-1rem,40rem)] max-w-[40rem] max-h-[90vh] p-0 gap-0 overflow-hidden',
          'border border-[var(--border-soft)] z-[200] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.30)] rounded-2xl sm:rounded-2xl',
          '[&>button]:hidden'
        )}
      >
      <div className="flex flex-col min-h-0 max-h-[90vh] w-full overflow-hidden rounded-2xl bg-white">
        {/* Header — compact, with refined gradient */}
        <div className="flex-shrink-0 border-b border-[var(--border-soft)] bg-gradient-to-b from-white to-[#FAFBFC] px-5 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                  className="w-full text-base font-semibold text-gray-900 border-b border-indigo-500 outline-none bg-transparent pb-0.5"
                />
              ) : (
                <h2
                  onClick={() => onSave && setEditingTitle(true)}
                  className={`text-base font-semibold text-gray-900 leading-snug ${onSave ? 'cursor-text hover:text-indigo-600' : ''}`}
                  title="Click to edit title"
                >
                  {title}
                </h2>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {/* Status pill */}
                <Select value={status} onValueChange={v => { setStatus(v); save({ status: v }); }}>
                  <SelectTrigger className={`h-7 text-xs border rounded-full px-2.5 gap-1.5 ${stStyles.bg} ${stStyles.text} ${stStyles.border} w-auto`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stStyles.dot}`} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {statusList.map(s => {
                      const ss = statusStyles(s.label);
                      return (
                        <SelectItem key={s.label} value={s.label} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                            {s.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Priority pill */}
                <Select value={priority} onValueChange={v => { setPriority(v); save({ priority: v }); }}>
                  <SelectTrigger className={`h-7 text-xs border rounded-full px-2.5 w-auto ${priority === 'P0' ? 'bg-red-50 text-red-700 border-red-200' : priority === 'P1' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    <Flag className="w-3 h-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {priorityList.map(p => (
                      <SelectItem key={p.label} value={p.label} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {initiative.isBigRock && (
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">⭐ Big Rock</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => { if (confirm('Delete this task permanently?')) { setDeleting(true); onDelete(initiative.id).then(handleClose).finally(() => setDeleting(false)); } }}
                  disabled={deleting}
                  className="rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  title="Delete task"
                >
                  Delete
                </button>
              )}
              <button type="button" onClick={handleClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs — underline, space-efficient */}
        <div className="flex-shrink-0 border-b border-[var(--border-soft)] bg-white px-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0.5 min-w-max">
            {(['overview', 'comments', 'attachments', 'time', 'deps', 'history'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-md',
                  activeTab === tab
                    ? 'text-indigo-700 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-indigo-500 after:to-blue-500'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-[var(--secondary)]'
                )}
              >
                {tab === 'comments' ? `Comments${comments.length ? ` (${comments.length})` : ''}` :
                 tab === 'attachments' ? `Files${attachments.length ? ` (${attachments.length})` : ''}` :
                 tab === 'time' ? `Time${totalMinutes > 0 ? ` (${Math.round(totalMinutes/60)}h)` : ''}` :
                 tab === 'deps' ? `Depends${deps.length ? ` (${deps.length})` : ''}` :
                 tab === 'history' ? `History${history.length ? ` (${history.length})` : ''}` :
                 'Overview'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="min-h-full p-4 space-y-5">
              {/* Key fields — single dense block */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500">Owner</span>
                    <AssigneeLookup
                      value={assigneeId}
                      crew={crew}
                      fallbackLabel={
                        assigneeId
                          ? (initiative.assignee_name ||
                              initiative.assignee_email ||
                              (initiative.owner && initiative.owner !== '—' ? initiative.owner : null))
                          : null
                      }
                      fallbackEmail={initiative.assignee_email ?? null}
                      onChange={(id) => {
                        setAssigneeId(id);
                        save({ assignee_id: id });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500">Category</span>
                    <Select value={category} onValueChange={(v) => { setCategory(v as Category); save({ category: v as Category }); }}>
                      <SelectTrigger className="h-8 w-full text-xs border-gray-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[220]">
                        {categoryList.map((c) => (
                          <SelectItem key={c.label} value={c.label} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500">Due date</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        save({ due_date: e.target.value ? localDateInputToIso(e.target.value) : null });
                      }}
                      className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-500">Progress</span>
                      <span className="text-xs font-semibold tabular-nums text-gray-800">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 rounded-full" />
                    {onSave && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        onMouseUp={() => save({ progress })}
                        onTouchEnd={() => save({ progress })}
                        className="mt-1 w-full accent-indigo-600"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  ID <span className="font-mono">{initiative.id.slice(0, 8)}…</span>
                  {dueDate ? ` · Due ${formatDate(new Date(dueDate))}` : ''}
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Description</span>
                  {onSave && !editingDesc && (
                    <button type="button" onClick={() => setEditingDesc(true)} className="text-[11px] text-indigo-600 hover:underline">
                      Edit
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      autoFocus
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full min-h-[100px] resize-y rounded-md border border-gray-200 p-2.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      placeholder="Add details…"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleDescSave} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingDesc(false); setDescription(initiative.description || ''); }}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => onSave && setEditingDesc(true)}
                    className={cn(
                      'text-sm leading-relaxed text-gray-700 whitespace-pre-wrap break-words',
                      onSave && 'cursor-text rounded-md p-2 -mx-2 hover:bg-gray-50',
                      !description && 'text-gray-400 italic'
                    )}
                  >
                    {description || 'No description — click to add.'}
                  </p>
                )}
              </div>

              {/* Discussion preview (thread comments) */}
              {comments.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Discussion
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('comments')}
                      className="text-[11px] font-medium text-indigo-600 hover:underline"
                    >
                      View all ({comments.length})
                    </button>
                  </div>
                  <p className="line-clamp-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comments[comments.length - 1]?.body ?? ''}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Latest from {comments[comments.length - 1]?.author_name || 'User'}
                  </p>
                </div>
              )}

              {/* Topic + tracker columns */}
              {(onSave || onUpdateFieldValue) &&
                (onSave || standardExtraFields.length > 0 || taskCustomFields.length > 0) && (
                  <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                    <div className="bg-gray-50/50 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-700">More fields</p>
                      <p className="text-[11px] text-gray-500">Same columns as your task table (topic, custom &amp; extra fields)</p>
                    </div>
                    <div className="px-3 py-1">
                      {onSave && (
                        <DrawerFieldRow label="Topic">
                          <Input
                            value={topicDraft}
                            onChange={(e) => setTopicDraft(e.target.value)}
                            onBlur={() => {
                              const next = topicDraft.trim();
                              const prev = String(initiative.field_values?.topic ?? '').trim();
                              if (next !== prev) save({ topic: next || null });
                            }}
                            placeholder="Topic or link"
                            className="h-8 text-sm"
                          />
                        </DrawerFieldRow>
                      )}
                      {standardExtraFields.map((f) => (
                        <DrawerFieldRow key={f.field_key} label={f.name}>
                          {onSave ? (
                            <TaskFieldValueEditor
                              fieldType={f.field_type || 'text'}
                              optionsJson={f.options_json as unknown[] | undefined}
                              value={initiative.field_values?.[f.field_key] as string | number | boolean | null | undefined}
                              disabled={saving}
                              onCommit={(v) => save({ custom_vals: { [f.field_key]: v } })}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </DrawerFieldRow>
                      ))}
                      {taskCustomFields.map((f) => (
                        <DrawerFieldRow key={f.id} label={f.name}>
                          {onUpdateFieldValue ? (
                            <TaskFieldValueEditor
                              fieldType={f.field_type}
                              optionsJson={f.options_json}
                              value={initiative.field_values?.[f.id] as string | number | boolean | null | undefined}
                              disabled={saving}
                              onCommit={(v) => onUpdateFieldValue(initiative.id, f.id, v)}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </DrawerFieldRow>
                      ))}
                    </div>
                  </div>
                )}

              <div>
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Links &amp; files</span>
                <LinkPasteArea itemId={initiative.id} attachments={attachments} setAttachments={setAttachments} />
              </div>
            </div>
          )}

          {/* ── COMMENTS TAB ── */}
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
                  </div>
                )}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3 group">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(c.author_name || 'User')} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {(c.author_name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{c.author_name || 'User'}</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                        {c.can_delete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-xl rounded-tl-sm p-3 leading-relaxed whitespace-pre-wrap break-words">
                        {c.body.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith('@') ? (
                            <span key={i} className="text-indigo-600 font-medium bg-indigo-50 rounded px-1">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div className="flex-shrink-0 border-t border-gray-200 p-3">
                <div className="relative">
                  {showMentions && filteredCrew.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      {filteredCrew.map(c => (
                        <button
                          key={c.id}
                          onClick={() => insertMention(c.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                        >
                          <div className={`w-6 h-6 rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                            {(c.initials || c.name.slice(0,2)).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-700">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                    <textarea
                      ref={commentRef}
                      value={commentText}
                      onChange={handleCommentInput}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Write a comment… use @name to mention"
                      rows={2}
                      className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none min-h-[40px]"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || postingComment}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Send (⌘Enter)"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 px-1">⌘Enter to send · @ to mention</p>
                </div>
              </div>
            </div>
          )}

          {/* ── ATTACHMENTS TAB ── */}
          {activeTab === 'attachments' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Files & Links</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" /> Attach File
                </button>
              </div>

              {/* Google Sheets / URL paste */}
              <LinkPasteArea itemId={initiative.id} attachments={attachments} setAttachments={setAttachments} />

              {attachments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl mt-4">
                  <Paperclip className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No files attached yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Drag & drop or click Attach File</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {attachments.map(att => (
                    <AttachmentRow key={att.id} attachment={att} onDelete={() => handleDeleteAttachment(att.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TIME TRACKING TAB ── */}
          {activeTab === 'time' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Time Tracking</h3>
                <div className="text-sm font-bold text-indigo-600">
                  {totalMinutes >= 60
                    ? `${Math.floor(totalMinutes/60)}h ${totalMinutes % 60}m total`
                    : `${totalMinutes}m total`}
                </div>
              </div>

              {/* Log time form */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Log Time</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="Minutes (e.g. 90)"
                      value={logMinutes}
                      onChange={e => setLogMinutes(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={logNote}
                      onChange={e => setLogNote(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const mins = parseInt(logMinutes);
                      if (!mins || mins < 1) return;
                      setLoggingTime(true);
                      try {
                        const newLog = await post<typeof timeLogs[0]>(apiPath(`api/items/${initiative.id}/time-logs`), { minutes: mins, note: logNote || null });
                        setTimeLogs(prev => [newLog, ...prev]);
                        setTotalMinutes(t => t + mins);
                        setLogMinutes('');
                        setLogNote('');
                        toast.success(`Logged ${mins} minutes`);
                      } catch { toast.error('Failed to log time'); }
                      finally { setLoggingTime(false); }
                    }}
                    disabled={!logMinutes || loggingTime}
                    className="h-9 px-4 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
                  >
                    {loggingTime ? '...' : 'Log'}
                  </button>
                </div>
              </div>

              {/* Log list */}
              {timeLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No time logged yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {timeLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                      <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {log.minutes >= 60 ? `${Math.floor(log.minutes/60)}h ${log.minutes % 60}m` : `${log.minutes}m`}
                          </span>
                          {log.note && <span className="text-xs text-gray-500 truncate">— {log.note}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{log.user_name || 'You'} · {log.logged_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DEPENDENCIES TAB ── */}
          {activeTab === 'deps' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Dependencies</h3>
                <span className="text-xs text-gray-400">Tasks this item is blocked by</span>
              </div>

              {/* Recurring field */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Repeat</p>
                <select
                  value={repeatInterval}
                  onChange={async e => {
                    const v = e.target.value;
                    setRepeatInterval(v);
                    await save({ repeat_interval: v === 'none' ? null : v } as Parameters<typeof save>[0]);
                    toast.success('Repeat interval saved');
                  }}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-400">When marked Complete, a new task will be created automatically.</p>
              </div>

              {/* Milestone toggle */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Milestone</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mark as a key deliverable on the Gantt timeline</p>
                </div>
                <button
                  onClick={async () => {
                    const next = !isMilestone;
                    setIsMilestone(next);
                    await save({ is_milestone: next } as Parameters<typeof save>[0]);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${isMilestone ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isMilestone ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Dependencies list */}
              {deps.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No dependencies set</p>
                  <p className="text-xs mt-1">Dependencies can be added via the API or future UI</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deps.map(dep => (
                    <div key={dep.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        dep.depends_on_status === 'done' || dep.depends_on_status === 'complete' ? 'bg-emerald-500' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{dep.depends_on_title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dep.depends_on_status}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await del(apiPath(`api/items/${initiative.id}/dependencies/${dep.depends_on_id}`));
                          setDeps(prev => prev.filter(d => d.id !== dep.id));
                        }}
                        className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Activity history</h3>
                <span className="text-xs text-gray-400">Who changed what, when</span>
              </div>
              {historyLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm">No history yet. Every change will appear here.</p>
                </div>
              ) : (
                <ol className="relative ml-4 border-l border-gray-200 space-y-4">
                  {history.map((h) => (
                    <li key={h.id} className="pl-4">
                      <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-white" />
                      <div className="flex items-baseline gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{h.actor_name || 'Someone'}</span>
                        <span>{describeHistoryAction(h)}</span>
                        <span className="ml-auto shrink-0">{formatLocalDateTime(h.created_at)}</span>
                      </div>
                      {h.details && typeof h.details === 'object' && (
                        <HistoryDiff details={h.details as Record<string, unknown>} action={h.action} />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      </DialogContent>
    </Dialog>
  );
}

/** Human-readable sentence for an activity entry (e.g. "changed status"). */
function describeHistoryAction(h: HistoryEntry): string {
  switch (h.action) {
    case 'item_created': return 'created this item';
    case 'status_changed': return 'changed status';
    case 'priority_changed': return 'changed priority';
    case 'assignee_changed': return 'changed assignee';
    case 'title_changed': return 'renamed item';
    case 'due_date_changed': return 'updated due date';
    case 'category_changed': return 'changed category';
    case 'item_updated': return 'updated item';
    default: return h.action.replace(/_/g, ' ');
  }
}

/** Compact "from → to" display when the activity log includes `from`/`to` fields. */
function HistoryDiff({ details, action }: { details: Record<string, unknown>; action: string }) {
  const from = details.from;
  const to = details.to ?? details.assignee ?? details.title;
  if (from == null && to == null) return null;
  if (action === 'title_changed' && 'title' in details && to != null) {
    return (
      <p className="mt-1 text-xs text-gray-600 truncate">
        <span className="text-gray-400">from</span> <span className="italic">{String(details.title)}</span>{' '}
        <span className="text-gray-400">to</span> <span className="italic">{String(to)}</span>
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-gray-600">
      {from != null && (<><span className="text-gray-400">from </span><span>{String(from)}</span>{' '}</>)}
      {to != null && (<><span className="text-gray-400">to </span><span>{String(to)}</span></>)}
    </p>
  );
}

// ── Attachment row ─────────────────────────────────────────────
function AttachmentRow({ attachment, onDelete }: { attachment: Attachment; onDelete: () => void }) {
  const isImg = attachment.mime_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(attachment.name);
  const isGoogleSheet = attachment.url?.includes('docs.google.com/spreadsheets') || attachment.url?.includes('sheets.google');
  const isGoogleDoc = attachment.url?.includes('docs.google.com/document');
  const isExternal = attachment.url?.startsWith('http') && !attachment.url?.startsWith('data:');

  const icon = isGoogleSheet ? '📊' : isGoogleDoc ? '📄' : isImg ? '🖼️' : '📎';

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 group transition-all">
      <div className="text-xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{attachment.name}</p>
        <p className="text-xs text-gray-400">
          {attachment.uploader_name && `by ${attachment.uploader_name} · `}
          {attachment.size_bytes > 0 ? `${(attachment.size_bytes / 1024).toFixed(1)} KB` : 'Link'}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isExternal && (
          <a href={attachment.url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Google Sheets / URL paste area ────────────────────────────
function LinkPasteArea({ itemId, attachments, setAttachments }: {
  itemId: string;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}) {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  // Find existing Google Sheets links
  const sheetLinks = attachments.filter(a =>
    a.url?.includes('docs.google.com/spreadsheets') || a.url?.includes('sheets.google')
  );

  const getGoogleSheetsEmbedUrl = (rawUrl: string) => {
    const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return `https://docs.google.com/spreadsheets/d/${match[1]}/preview`;
    return null;
  };

  const getDisplayName = (rawUrl: string) => {
    if (rawUrl.includes('docs.google.com/spreadsheets')) return 'Google Sheet';
    if (rawUrl.includes('docs.google.com/document')) return 'Google Doc';
    if (rawUrl.includes('docs.google.com/presentation')) return 'Google Slides';
    if (rawUrl.includes('github.com')) return 'GitHub';
    if (rawUrl.includes('notion.so')) return 'Notion Page';
    if (rawUrl.includes('figma.com')) return 'Figma';
    if (rawUrl.includes('linear.app')) return 'Linear';
    try { return new URL(rawUrl).hostname.replace('www.', ''); } catch { return rawUrl.slice(0, 40); }
  };

  const handlePaste = async (e?: React.ClipboardEvent | React.FormEvent) => {
    const val = url.trim();
    if (!val || !val.startsWith('http')) return;

    const name = getDisplayName(val);
    const embed = getGoogleSheetsEmbedUrl(val);

    setSaving(true);
    try {
      const att = await post<Attachment>(apiPath(`api/items/${itemId}/attachments`), {
        name, url: val, size_bytes: 0, mime_type: 'text/uri-list',
      });
      setAttachments(prev => [...prev, att]);
      setUrl('');
      if (embed) { setEmbedUrl(embed); setShowEmbed(true); }
      toast.success(`${name} linked`);
    } catch { toast.error('Failed to save link'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePaste()}
          placeholder="Paste a link — Google Sheets, Notion, Figma…"
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-50 placeholder-gray-400"
        />
        <button
          onClick={handlePaste}
          disabled={!url.trim() || saving}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {saving ? '…' : 'Link'}
        </button>
      </div>

      {/* Existing sheet links — show as embedded preview option */}
      {sheetLinks.map(link => (
        <div key={link.id} className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-base">📊</span>
            <span className="flex-1 text-sm font-medium text-emerald-800">{link.name}</span>
            <button
              onClick={() => {
                const e = getGoogleSheetsEmbedUrl(link.url);
                if (e) { setEmbedUrl(e); setShowEmbed(prev => !prev); }
                else window.open(link.url, '_blank');
              }}
              className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              {showEmbed && embedUrl ? 'Hide' : 'Preview'} <ChevronDown className={`w-3 h-3 transition-transform ${showEmbed ? 'rotate-180' : ''}`} />
            </button>
            <a href={link.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {showEmbed && embedUrl && (
            <iframe
              src={embedUrl}
              className="w-full h-80 border-t border-emerald-200"
              title="Google Sheet Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      ))}
    </div>
  );
}
