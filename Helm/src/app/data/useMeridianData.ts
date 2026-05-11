import { useState, useEffect, useCallback } from 'react';
import { get, post, patch, del, getApiBaseUrl } from '../api/meridian';
import {
  mockInitiatives,
  trackerSections as mockTrackerSections,
  kpiData as mockKpiData,
  type Initiative,
  type TrackerSection,
  type Status,
  type Priority,
  type Category,
} from './mockData';

const CATEGORIES: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];
const STATUS_MAP: Record<string, Status> = {
  backlog: 'Not Started',
  not_started: 'Not Started',
  summit: 'On Track',
  in_progress: 'On Track',
  ascent: 'At Risk',
  basecamp: 'On Track',
  in_review: 'In Review',
  peak: 'Complete',
  done: 'Complete',
  blocked: 'Blocked',
};
const PRIORITY_MAP: Record<string, Priority> = {
  high: 'P0',
  critical: 'P0',
  medium: 'P1',
  low: 'P2',
};

export type CrewMemberRow = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  /** Present when the crew member is linked to a real signed-in user account. */
  user_id?: string | null;
};

/** Crew rows from API may omit names; merge assignees referenced on items so Owner lookup always works. */
function mergeCrewWithItemAssignees(
  crewRows: {
    id: string;
    name?: string;
    initials?: string;
    role?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }[],
  items: Initiative[]
): CrewMemberRow[] {
  const normalize = (r: {
    id: string;
    name?: string;
    initials?: string;
    role?: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    user_id?: string | null;
  }): CrewMemberRow => ({
    id: String(r.id),
    name: String(r.name ?? 'Unknown'),
    initials: String(r.initials ?? (r.name?.slice(0, 2) ?? '??')).slice(0, 8),
    role: String(r.role ?? 'Member'),
    email: r.email ?? null,
    first_name: r.first_name ?? null,
    last_name: r.last_name ?? null,
    user_id: r.user_id ?? null,
  });
  const byId = new Map<string, CrewMemberRow>();
  for (const r of crewRows) {
    if (r?.id) byId.set(String(r.id), normalize(r));
  }
  for (const i of items) {
    if (i.assignee_id && !byId.has(i.assignee_id)) {
      const name = i.assignee_name || i.assignee_email || i.owner || 'Assignee';
      const initials = (i.assignee_initials || name.slice(0, 2)).toUpperCase();
      byId.set(i.assignee_id, {
        id: i.assignee_id,
        name,
        initials,
        role: 'Member',
        email: i.assignee_email ?? null,
        first_name: null,
        last_name: null,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

function mapItemToInitiative(item: {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  points?: number | null;
  progress?: number | null;
  assignee_id?: string | null;
  assignee_user_id?: string | null;
  assignee_email?: string | null;
  assignee_initials?: string | null;
  assignee_name?: string | null;
  project_id?: string | null;
  tracker_id?: string | null;
  due_date?: string | null;
  category?: string | null;
  field_values?: Record<string, string | number | boolean | null>;
  /** Merged into field_values (standard extras like `comments` live here from API). */
  custom_vals?: unknown;
  created_by_id?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
  requester_id?: string | null;
  requester_effective_id?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  /** Set when loading My Tasks (admin varies by project). */
  is_project_admin?: boolean;
}): Initiative {
  const status = (item.status && STATUS_MAP[item.status]) || 'Not Started';
  const priority = (item.priority && PRIORITY_MAP[item.priority]) || 'P1';
  const endDate = item.due_date ? new Date(item.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rawCat = typeof item.category === 'string' ? item.category.trim() : '';
  const category: Category =
    rawCat.length > 0
      ? rawCat
      : CATEGORIES[Math.abs((item.title || '').length) % CATEGORIES.length];
  return {
    id: item.id,
    name: item.title,
    category,
    priority,
    isBigRock: (item.points ?? 0) >= 5,
    owner: item.assignee_name || item.assignee_initials || '—',
    assignee_name: item.assignee_name ?? null,
    assignee_initials: item.assignee_initials ?? null,
    status,
    questions: '',
    description: item.description || '',
    startDate: new Date(),
    endDate,
    progress: typeof item.progress === 'number' ? item.progress : (status === 'Complete' ? 100 : status === 'Not Started' ? 0 : 50),
    tracker_id: item.tracker_id ?? null,
    assignee_id: item.assignee_id ?? null,
    assignee_user_id: item.assignee_user_id ?? null,
    assignee_email: item.assignee_email ?? null,
    field_values: (() => {
      const fromFv =
        item.field_values && typeof item.field_values === 'object'
          ? { ...item.field_values }
          : ({} as Record<string, string | number | boolean | null>);
      const fromCv =
        item.custom_vals && typeof item.custom_vals === 'object' && !Array.isArray(item.custom_vals)
          ? (item.custom_vals as Record<string, string | number | boolean | null>)
          : {};
      // custom_vals must win over field_values (same as API Object.assign(field_values, custom_vals))
      const merged = { ...fromFv, ...fromCv };
      return Object.keys(merged).length > 0 ? merged : undefined;
    })(),
    project_id: item.project_id ?? null,
    created_by_id: item.created_by_id ?? null,
    created_by_email: item.created_by_email ?? null,
    created_by_name: item.created_by_name ?? null,
    requester_id: item.requester_id ?? item.requester_effective_id ?? item.created_by_id ?? null,
    requester_name: item.requester_name ?? item.created_by_name ?? null,
    requester_email: item.requester_email ?? item.created_by_email ?? null,
    is_project_admin: item.is_project_admin,
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  icon?: string;
}
export interface ProjectCollaborator {
  name: string;
  email?: string | null;
  crew_id?: string | null;
  user_id?: string | null;
  role?: string | null;
}

export interface Project {
  id: string;
  name: string;
  workspace_id?: string;
  description?: string;
  color?: string;
  is_personal?: boolean;
  collaborators?: ProjectCollaborator[];
}

export interface Sprint {
  id: string;
  name: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface MeridianDataResult {
  initiatives: Initiative[];
  trackerSections: TrackerSection[];
  kpiData: { solvedYTD: number; inProgress: number; atRiskBlocked: number; bigRocksCount: number; overallProgress: number; totalItems: number };
  loading: boolean;
  error: string | null;
  apiBase: string;
  fromApi: boolean;
  refresh: () => void;
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  createProject: (payload: { name: string; description?: string; color?: string; is_personal?: boolean }) => Promise<Project | null>;
  updateProject: (projectId: string, payload: { name?: string; description?: string; color?: string; collaborators?: ProjectCollaborator[] }) => Promise<unknown>;
  createSprint: (projectId: string, name: string, start_date?: string, end_date?: string) => Promise<Sprint | null>;
  createItem: (projectId: string, payload: { title: string; description?: string; priority?: string; status?: string; category?: string; due_date?: string; type?: string }, parentId?: string | null, trackerId?: string | null) => Promise<unknown>;
  createSection: (projectId: string, name: string, columns?: string[]) => Promise<{ id: string; name: string } | null>;
  updateSection: (trackerId: string, payload: { name?: string; sort_order?: number }) => Promise<unknown>;
  reorderSections: (projectId: string, orderedTrackerIds: string[]) => Promise<void>;
  updateItem: (itemId: string, payload: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: string | null;
    due_date?: string | null;
    points?: number;
    progress?: number;
    category?: string | null;
    topic?: string | null;
    requester_id?: string | null;
    custom_vals?: Record<string, string | number | boolean | null>;
  }) => Promise<unknown>;
  deleteItem: (itemId: string) => Promise<void>;
  deleteSection: (trackerId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  duplicateProject: (projectId: string, opts?: { name?: string; include_members?: boolean; include_items?: boolean }) => Promise<Project | null>;
  sprints: Sprint[];
  crew: CrewMemberRow[];
  customFields: { id: string; name: string; field_type: string; target: string; applies_to?: string; options_json?: unknown[] }[];
  standardFields: { id: string; field_key: string; name: string; field_type: string; options_json?: unknown[] }[];
  myTasksInitiatives: Initiative[];
  myTasksLoading: boolean;
  loadMyTasksAcrossProjects: () => Promise<void>;
}

function apiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function useMeridianData(): MeridianDataResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>(mockInitiatives);
  const [sections, setSections] = useState<TrackerSection[]>(mockTrackerSections);
  const [crew, setCrew] = useState<CrewMemberRow[]>([]);
  const [customFields, setCustomFields] = useState<{ id: string; name: string; field_type: string; target: string; applies_to?: string; options_json?: unknown[] }[]>([]);
  const [myTasksInitiatives, setMyTasksInitiatives] = useState<Initiative[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [standardFields, setStandardFields] = useState<{ id: string; field_key: string; name: string; field_type: string; options_json?: unknown[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const load = useCallback(async (overrideProjectId?: string | null) => {
    const base = getApiBaseUrl();
    if (!base) {
      setInitiatives(mockInitiatives);
      setSections(mockTrackerSections);
      setLoading(false);
      setFromApi(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const projRes = await get<Project[]>(apiPath('api/projects')).catch(() => []);
      const projList = Array.isArray(projRes) ? projRes : [];
      setProjects(projList);
      const pid = overrideProjectId ?? selectedProjectId ?? (projList[0]?.id ?? null);
      if (projList.length && !selectedProjectId && overrideProjectId === undefined) setSelectedProjectId(projList[0].id);

      // Standard fields are fetched project-scoped so Category (and other
      // project-scopable dropdowns) return the project-specific override.
      const stdPath = pid
        ? `${apiPath('api/standard-fields')}?project_id=${encodeURIComponent(String(pid))}`
        : apiPath('api/standard-fields');
      const stdRes = await get<{ id: string; field_key: string; name: string; field_type: string; options_json?: unknown[] }[]>(stdPath).catch(() => []);
      setStandardFields(Array.isArray(stdRes) ? stdRes : []);

      if (!pid) {
        setSprints([]);
        setInitiatives([]);
        setSections([]);
        setCustomFields([]);
        setLoading(false);
        setFromApi(true);
        return;
      }
      const projectForCrew = projList.find((p) => p.id === pid);
      const wid = projectForCrew?.workspace_id;
      const crewQs = new URLSearchParams();
      crewQs.set('project_id', String(pid));
      if (wid != null && String(wid).length > 0) {
        crewQs.set('workspace_id', String(wid));
      }
      const crewPath = `${apiPath('api/crew')}?${crewQs.toString()}`;

      const [sprintsRes, itemsRes, trackersRes, cfRes, crewRes] = await Promise.all([
        get<Sprint[]>(`${apiPath('api/sprints')}?project_id=${pid}`).catch(() => []),
        get<unknown[]>(`${apiPath('api/items')}?project_id=${pid}`).catch(() => []),
        get<{ id: string; name: string; sort_order?: number }[]>(`${apiPath('api/trackers')}?project_id=${pid}`).catch(() => []),
        get<{ id: string; name: string; field_type: string; target: string }[]>(apiPath(`api/custom-fields?project_id=${pid}`)).catch(() => []),
        get<{ id: string; name?: string; initials?: string; role?: string; email?: string | null; first_name?: string | null; last_name?: string | null; user_id?: string | null }[]>(crewPath).catch(() => []),
      ]);
      setSprints(Array.isArray(sprintsRes) ? sprintsRes : []);
      setCustomFields(Array.isArray(cfRes) ? cfRes : []);
      const itemList = Array.isArray(itemsRes) ? itemsRes : [];
      const mapped = (itemList as Record<string, unknown>[]).map((i: Record<string, unknown>) =>
        mapItemToInitiative({
          id: String(i.id),
          title: String(i.title ?? ''),
          description: i.description as string | null,
          status: i.status as string | null,
          priority: i.priority as string | null,
          points: i.points as number | null,
          assignee_id: i.assignee_id as string | null,
          assignee_user_id: i.assignee_user_id as string | null,
          assignee_email: i.assignee_email as string | null,
          assignee_initials: i.assignee_initials as string | null,
          assignee_name: i.assignee_name as string | null,
          project_id: i.project_id as string | null,
          tracker_id: i.tracker_id as string | null,
          due_date: i.due_date as string | null,
          category: i.category as string | null,
          field_values: i.field_values as Record<string, string | number | boolean | null> | undefined,
          custom_vals: i.custom_vals,
          created_by_id: i.created_by_id as string | null | undefined,
          created_by_email: i.created_by_email as string | null | undefined,
          created_by_name: i.created_by_name as string | null | undefined,
          requester_id: i.requester_id as string | null | undefined,
          requester_effective_id: i.requester_effective_id as string | null | undefined,
          requester_name: i.requester_name as string | null | undefined,
          requester_email: i.requester_email as string | null | undefined,
        })
      );
      setInitiatives(mapped);
      const crewList = Array.isArray(crewRes) ? crewRes : [];
      setCrew(mergeCrewWithItemAssignees(crewList, mapped));
      const trackers = Array.isArray(trackersRes) ? trackersRes : [];
      const uncategorized = mapped.filter((init) => !init.tracker_id);
      const parseTrackerColumns = (c: unknown): string[] | undefined => {
        if (Array.isArray(c) && c.length > 0) return c as string[];
        if (typeof c === 'string') {
          try {
            const parsed = JSON.parse(c) as unknown;
            return Array.isArray(parsed) && parsed.length > 0 ? (parsed as string[]) : undefined;
          } catch { return undefined; }
        }
        return undefined;
      };
      const sectionList: TrackerSection[] = [
        ...(uncategorized.length > 0 ? [{ id: 'uncategorized' as const, title: 'Tasks', initiatives: uncategorized }] : []),
        ...trackers.map((t: Record<string, unknown>) => {
          const cols = parseTrackerColumns(t.columns);
          return {
            id: t.id,
            title: t.name,
            initiatives: mapped.filter((init) => init.tracker_id === t.id),
            columns: cols,
          };
        }),
      ];
      setSections(sectionList);
      setFromApi(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
      const isAuthError = /sign in|401|unauthorized/i.test(msg);
      if (isAuthError) {
        setProjects([]);
        setSprints([]);
        setInitiatives([]);
        setSections([]);
        setSelectedProjectId(null);
      } else {
        setInitiatives(mockInitiatives);
        setSections(mockTrackerSections);
      }
      setFromApi(false);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const loadMyTasksAcrossProjects = useCallback(async () => {
    const base = getApiBaseUrl();
    if (!base) {
      setMyTasksInitiatives([]);
      return;
    }
    setMyTasksLoading(true);
    try {
      const projRes = await get<Project[]>(apiPath('api/projects')).catch(() => []);
      const plist = Array.isArray(projRes) ? projRes : [];
      if (plist.length === 0) {
        setMyTasksInitiatives([]);
        return;
      }
      const chunks = await Promise.all(
        plist.map(async (p) => {
          const [items, access] = await Promise.all([
            get<Record<string, unknown>[]>(`${apiPath('api/items')}?project_id=${p.id}`).catch(() => []),
            get<{ is_project_admin?: boolean }>(`${apiPath(`api/projects/${p.id}/access`)}`).catch(() => ({ is_project_admin: false })),
          ]);
          const arr = Array.isArray(items) ? items : [];
          const isAdmin = !!(access && access.is_project_admin);
          return arr.map((i) => ({ item: i, is_project_admin: isAdmin }));
        })
      );
      const flat = chunks.flat();
      const mapped = flat.map(({ item: i, is_project_admin }) =>
        mapItemToInitiative({
          id: String(i.id),
          title: String(i.title ?? ''),
          description: i.description as string | null,
          status: i.status as string | null,
          priority: i.priority as string | null,
          points: i.points as number | null,
          progress: i.progress as number | null,
          assignee_id: i.assignee_id as string | null,
          assignee_user_id: i.assignee_user_id as string | null,
          assignee_email: i.assignee_email as string | null,
          assignee_initials: i.assignee_initials as string | null,
          assignee_name: i.assignee_name as string | null,
          project_id: i.project_id as string | null,
          tracker_id: i.tracker_id as string | null,
          due_date: i.due_date as string | null,
          category: i.category as string | null,
          field_values: i.field_values as Record<string, string | number | boolean | null> | undefined,
          custom_vals: i.custom_vals,
          created_by_id: i.created_by_id as string | null | undefined,
          created_by_email: i.created_by_email as string | null | undefined,
          created_by_name: i.created_by_name as string | null | undefined,
          requester_id: i.requester_id as string | null | undefined,
          requester_effective_id: i.requester_effective_id as string | null | undefined,
          requester_name: i.requester_name as string | null | undefined,
          requester_email: i.requester_email as string | null | undefined,
          is_project_admin,
        })
      );
      setMyTasksInitiatives(mapped);
    } finally {
      setMyTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createProject = useCallback(async (payload: { name: string; description?: string; color?: string; is_personal?: boolean }): Promise<Project | null> => {
    const body: { name: string; description?: string; color?: string; is_personal?: boolean } = { name: payload.name.trim() };
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.color !== undefined) body.color = payload.color;
    if (payload.is_personal !== undefined) body.is_personal = payload.is_personal;
    const p = await post<Project>(apiPath('api/projects'), body);
    await load();
    if (p?.id) setSelectedProjectId(p.id);
    return p ?? null;
  }, [load]);

  const updateProject = useCallback(async (
    projectId: string,
    payload: { name?: string; description?: string; color?: string; collaborators?: ProjectCollaborator[] }
  ): Promise<unknown> => {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.color !== undefined) body.color = payload.color;
    if (payload.collaborators !== undefined) body.collaborators = payload.collaborators;
    if (Object.keys(body).length === 0) return null;
    const res = await patch(apiPath(`api/projects/${projectId}`), body as Record<string, string>);
    await load();
    return res;
  }, [load]);

  const createSprint = useCallback(async (
    projectId: string,
    name: string,
    start_date?: string,
    end_date?: string
  ): Promise<Sprint | null> => {
    const s = await post<Sprint>(apiPath('api/sprints'), {
      project_id: projectId,
      name: name.trim(),
      start_date: start_date || null,
      end_date: end_date || null,
    });
    await load();
    return s ?? null;
  }, [load]);

  const createItem = useCallback(async (
    projectId: string,
    payload: { title: string; description?: string; priority?: string; status?: string; category?: string; due_date?: string; type?: string; assignee_id?: string },
    parentId?: string | null,
    trackerId?: string | null
  ): Promise<unknown> => {
    const body: Record<string, unknown> = {
      project_id: projectId,
      title: payload.title.trim(),
      description: payload.description || '',
      priority: payload.priority || 'medium',
      type: payload.type || 'task',
      status: payload.status || 'not_started',
    };
    if (payload.category) body.category = payload.category;
    if (payload.due_date) body.due_date = payload.due_date.includes('T') ? payload.due_date : `${payload.due_date}T00:00:00.000Z`;
    if (payload.assignee_id) body.assignee_id = payload.assignee_id;
    if (parentId) body.parent_id = parentId;
    if (trackerId) body.tracker_id = trackerId;
    const res = await post(apiPath('api/items'), body);
    await load();
    return res;
  }, [load]);

  const createSection = useCallback(async (
    projectId: string,
    name: string,
    columns?: string[]
  ): Promise<{ id: string; name: string } | null> => {
    const body: { project_id: string; name: string; columns?: string[] } = {
      project_id: projectId,
      name: name.trim(),
    };
    if (Array.isArray(columns) && columns.length > 0) body.columns = columns;
    const t = await post<{ id: string; name: string }>(apiPath('api/trackers'), body);
    await load();
    return t ?? null;
  }, [load]);

  const updateSection = useCallback(async (trackerId: string, payload: { name?: string; sort_order?: number }): Promise<unknown> => {
    const body: { name?: string; sort_order?: number } = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (typeof payload.sort_order === 'number') body.sort_order = payload.sort_order;
    if (Object.keys(body).length === 0) return null;
    const res = await patch(apiPath(`api/trackers/${trackerId}`), body);
    await load();
    return res;
  }, [load]);

  const reorderSections = useCallback(async (projectId: string, orderedTrackerIds: string[]) => {
    await Promise.all(orderedTrackerIds.map((id, idx) => patch(apiPath(`api/trackers/${id}`), { sort_order: idx })));
    await load();
  }, [load]);

  const statusToSlug: Record<string, string> = {
    'Not Started': 'not_started',
    'On Track': 'in_progress',
    'At Risk': 'at_risk',
    'In Review': 'in_review',
    'Blocked': 'blocked',
    'Complete': 'done',
  };
  const priorityToSlug: Record<string, string> = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' };

  const updateItem = useCallback(async (
    itemId: string,
    payload: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee_id?: string | null;
      due_date?: string | null;
      points?: number;
      progress?: number;
      category?: string | null;
      repeat_interval?: string | null;
      is_milestone?: boolean;
      start_date?: string | null;
      topic?: string | null;
      requester_id?: string | null;
      custom_vals?: Record<string, string | number | boolean | null>;
    }
  ): Promise<unknown> => {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.status !== undefined) body.status = statusToSlug[payload.status] || payload.status;
    if (payload.priority !== undefined) body.priority = priorityToSlug[payload.priority] || payload.priority;
    if (payload.assignee_id !== undefined) body.assignee_id = payload.assignee_id;
    if (payload.due_date !== undefined) body.due_date = payload.due_date;
    if (payload.points !== undefined) body.points = payload.points;
    if (payload.progress !== undefined) body.progress = payload.progress;
    if (payload.category !== undefined) body.category = payload.category;
    if (payload.repeat_interval !== undefined) body.repeat_interval = payload.repeat_interval;
    if (payload.is_milestone !== undefined) body.is_milestone = payload.is_milestone;
    if (payload.start_date !== undefined) body.start_date = payload.start_date;
    if (payload.topic !== undefined) body.topic = payload.topic;
    if (payload.requester_id !== undefined) body.requester_id = payload.requester_id;
    if (payload.custom_vals !== undefined) body.custom_vals = payload.custom_vals;
    const res = await patch(apiPath(`api/items/${itemId}`), body as Record<string, string>);
    await load();
    return res;
  }, [load]);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    await del(apiPath(`api/items/${itemId}`));
    await load();
  }, [load]);

  const deleteSection = useCallback(async (trackerId: string): Promise<void> => {
    await del(apiPath(`api/trackers/${trackerId}`));
    await load();
  }, [load]);

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    await del(apiPath(`api/projects/${projectId}`));
    if (selectedProjectId === projectId) setSelectedProjectId(null);
    await load();
  }, [load, selectedProjectId]);

  const duplicateProject = useCallback(async (projectId: string, opts: { name?: string; include_members?: boolean; include_items?: boolean } = {}): Promise<Project | null> => {
    const created = await post<Project>(apiPath(`api/projects/${projectId}/duplicate`), opts);
    if (created?.id) {
      await load(created.id);
      setSelectedProjectId(created.id);
      return created;
    }
    return null;
  }, [load]);

  const done = initiatives.filter((i) => i.status === 'Complete').length;
  const inProgress = initiatives.filter((i) => i.status === 'On Track' || i.status === 'At Risk').length;
  const atRisk = initiatives.filter((i) => i.status === 'At Risk' || i.status === 'Blocked').length;
  const bigRocks = initiatives.filter((i) => i.isBigRock).length;
  const total = initiatives.length;
  const overallProgress = total ? Math.round((initiatives.reduce((a, i) => a + i.progress, 0) / total)) : 0;

  return {
    initiatives,
    trackerSections: sections,
    crew,
    createSection,
    updateSection,
    kpiData: fromApi
      ? { solvedYTD: done, inProgress, atRiskBlocked: atRisk, bigRocksCount: bigRocks, overallProgress, totalItems: total }
      : { ...mockKpiData, totalItems: mockKpiData.totalItems ?? 0 },
    loading,
    error,
    apiBase: getApiBaseUrl(),
    fromApi,
    refresh: load,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    createProject,
    updateProject,
    duplicateProject,
    createSprint,
    createItem,
    updateItem,
    deleteItem,
    deleteSection,
    deleteProject,
    reorderSections,
    sprints,
    customFields,
    standardFields,
    myTasksInitiatives,
    myTasksLoading,
    loadMyTasksAcrossProjects,
  };
}
