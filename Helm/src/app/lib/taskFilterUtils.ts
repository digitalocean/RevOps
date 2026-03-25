import type { Initiative, Status, Priority, Category } from '../data/mockData';

/** Task list / tracker filtering — persisted per project */
export interface TaskListFilters {
  status: Status[];
  priority: Priority[];
  category: Category[];
  /** Owner display names (match assignee name or owner column) */
  owner: string[];
  bigRocksOnly: boolean;
  /** Due date quick filter */
  duePreset: 'any' | 'overdue' | 'this_week' | 'no_due';
}

export function emptyTaskListFilters(): TaskListFilters {
  return {
    status: [],
    priority: [],
    category: [],
    owner: [],
    bigRocksOnly: false,
    duePreset: 'any',
  };
}

export function activeFilterCount(f: TaskListFilters): number {
  let n = f.status.length + f.priority.length + f.category.length + f.owner.length;
  if (f.bigRocksOnly) n++;
  if (f.duePreset !== 'any') n++;
  return n;
}

/** Human-readable lines for the “filtered view” bar */
export function describeActiveFilters(f: TaskListFilters): string[] {
  const lines: string[] = [];
  if (f.status.length) lines.push(`Status: ${f.status.join(', ')}`);
  if (f.priority.length) lines.push(`Priority: ${f.priority.join(', ')}`);
  if (f.category.length) lines.push(`Category: ${f.category.join(', ')}`);
  if (f.owner.length) lines.push(`Owner: ${f.owner.join(', ')}`);
  if (f.bigRocksOnly) lines.push('Big rocks only');
  if (f.duePreset === 'overdue') lines.push('Due: overdue');
  else if (f.duePreset === 'this_week') lines.push('Due: in the next 7 days');
  else if (f.duePreset === 'no_due') lines.push('Due: no date');
  return lines;
}

function matchesDuePreset(initiative: Initiative, preset: TaskListFilters['duePreset']): boolean {
  if (preset === 'any') return true;
  const end = initiative.endDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = end && !isNaN(end.getTime()) ? new Date(end) : null;
  if (endDay) endDay.setHours(0, 0, 0, 0);

  if (preset === 'no_due') return !endDay;

  if (preset === 'overdue') {
    return !!(endDay && endDay < today && initiative.status !== 'Complete');
  }

  if (preset === 'this_week') {
    if (!endDay) return false;
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);
    return endDay >= today && endDay <= horizon;
  }

  return true;
}

function ownerMatches(initiative: Initiative, owners: string[]): boolean {
  if (owners.length === 0) return true;
  const candidates = [initiative.owner, initiative.assignee_name].filter(
    (x): x is string => typeof x === 'string' && x.length > 0 && x !== '—'
  );
  return owners.some((o) => candidates.includes(o));
}

/** Single place for tracker + Kanban filtering */
export function filterInitiativesByTaskFilters(
  initiatives: Initiative[],
  filters: TaskListFilters
): Initiative[] {
  return initiatives.filter((initiative) => {
    if (filters.status.length > 0 && !filters.status.includes(initiative.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(initiative.priority)) return false;
    if (filters.category.length > 0 && !filters.category.includes(initiative.category)) return false;
    if (filters.owner.length > 0 && !ownerMatches(initiative, filters.owner)) return false;
    if (filters.bigRocksOnly && !initiative.isBigRock) return false;
    if (!matchesDuePreset(initiative, filters.duePreset)) return false;
    return true;
  });
}

const STORAGE_V2_PREFIX = 'task_filters_v2_';

export function loadTaskFiltersFromStorage(projectId: string): TaskListFilters | null {
  try {
    const v2 = localStorage.getItem(`${STORAGE_V2_PREFIX}${projectId}`);
    if (v2) {
      const parsed = JSON.parse(v2) as Partial<TaskListFilters>;
      return normalizeTaskFilters(parsed);
    }
    const legacy = localStorage.getItem(`filters_${projectId}`);
    if (legacy) {
      const migrated = migrateLegacyFilterRows(JSON.parse(legacy));
      if (migrated) {
        saveTaskFiltersToStorage(projectId, migrated);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveTaskFiltersToStorage(projectId: string, filters: TaskListFilters): void {
  try {
    localStorage.setItem(`${STORAGE_V2_PREFIX}${projectId}`, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

function normalizeTaskFilters(parsed: Partial<TaskListFilters>): TaskListFilters {
  const e = emptyTaskListFilters();
  return {
    status: Array.isArray(parsed.status) ? (parsed.status as Status[]) : e.status,
    priority: Array.isArray(parsed.priority) ? (parsed.priority as Priority[]) : e.priority,
    category: Array.isArray(parsed.category) ? (parsed.category as Category[]) : e.category,
    owner: Array.isArray(parsed.owner) ? parsed.owner : e.owner,
    bigRocksOnly: Boolean(parsed.bigRocksOnly),
    duePreset:
      parsed.duePreset === 'overdue' ||
      parsed.duePreset === 'this_week' ||
      parsed.duePreset === 'no_due' ||
      parsed.duePreset === 'any'
        ? parsed.duePreset
        : 'any',
  };
}

interface LegacyRow {
  field: string;
  operator: string;
  value: string;
}

/** Old slide panel format `{ rows, andOr }` */
export function migrateLegacyFilterRows(raw: unknown): TaskListFilters | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as { rows?: LegacyRow[] };
  if (!Array.isArray(o.rows)) return null;
  const f = emptyTaskListFilters();
  for (const r of o.rows) {
    if (r.operator !== 'is' || !r.value) continue;
    if (r.field === 'Status' && !f.status.includes(r.value as Status)) f.status.push(r.value as Status);
    if (r.field === 'Priority' && !f.priority.includes(r.value as Priority)) f.priority.push(r.value as Priority);
    if (r.field === 'Category' && !f.category.includes(r.value as Category)) f.category.push(r.value as Category);
    if (r.field === 'Owner' && !f.owner.includes(r.value)) f.owner.push(r.value);
  }
  return f;
}
