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

const CATEGORY_OPTIONS = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'] as const;

function mapItemToInitiative(item: {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  points?: number | null;
  assignee_id?: string | null;
  assignee_initials?: string | null;
  assignee_name?: string | null;
  project_id?: string | null;
  tracker_id?: string | null;
  due_date?: string | null;
  category?: string | null;
  field_values?: Record<string, string | number | boolean | null>;
}): Initiative {
  const status = (item.status && STATUS_MAP[item.status]) || 'Not Started';
  const priority = (item.priority && PRIORITY_MAP[item.priority]) || 'P1';
  const endDate = item.due_date ? new Date(item.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const category = item.category && CATEGORY_OPTIONS.includes(item.category as typeof CATEGORY_OPTIONS[number])
    ? (item.category as Category)
    : (CATEGORIES[Math.abs(item.title.length) % CATEGORIES.length]);
  return {
    id: item.id,
    name: item.title,
    category,
    priority,
    isBigRock: (item.points ?? 0) >= 5,
    owner: item.assignee_name || item.assignee_initials || '—',
    status,
    questions: '',
    description: item.description || '',
    startDate: new Date(),
    endDate,
    progress: status === 'Complete' ? 100 : status === 'Not Started' ? 0 : 50,
    tracker_id: item.tracker_id ?? null,
    assignee_id: item.assignee_id ?? null,
    field_values: item.field_values ?? undefined,
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  icon?: string;
}
export interface Project {
  id: string;
  name: string;
  workspace_id?: string;
  description?: string;
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
  workspaces: Workspace[];
  projects: Project[];
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  createProject: (workspaceId: string, name: string) => Promise<Project | null>;
  createSprint: (projectId: string, name: string, start_date?: string, end_date?: string) => Promise<Sprint | null>;
  createItem: (projectId: string, payload: { title: string; description?: string; priority?: string; type?: string }, parentId?: string | null, trackerId?: string | null) => Promise<unknown>;
  createSection: (projectId: string, name: string) => Promise<{ id: string; name: string } | null>;
  updateItem: (itemId: string, payload: { title?: string; description?: string; status?: string; priority?: string; assignee_id?: string | null; due_date?: string | null; points?: number; category?: string | null }) => Promise<unknown>;
  deleteItem: (itemId: string) => Promise<void>;
  sprints: Sprint[];
  crew: { id: string; name: string; initials: string; role: string }[];
  customFields: { id: string; name: string; field_type: string; target: string }[];
}

function apiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function useMeridianData(): MeridianDataResult {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<Initiative[]>(mockInitiatives);
  const [sections, setSections] = useState<TrackerSection[]>(mockTrackerSections);
  const [crew, setCrew] = useState<{ id: string; name: string; initials: string; role: string }[]>([]);
  const [customFields, setCustomFields] = useState<{ id: string; name: string; field_type: string; target: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const load = useCallback(async (overrideWorkspaceId?: string | null, overrideProjectId?: string | null) => {
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
      const wsRes = await get<Workspace[]>(apiPath('api/workspaces')).catch(() => []);
      const wsList = Array.isArray(wsRes) ? wsRes : [];
      setWorkspaces(wsList);
      const wid = overrideWorkspaceId ?? selectedWorkspaceId ?? (wsList[0]?.id ?? null);
      if (wsList.length && !selectedWorkspaceId && overrideWorkspaceId === undefined) setSelectedWorkspaceId(wsList[0].id);
      if (!wid) {
        setProjects([]);
        setInitiatives([]);
        setSections([]);
        setCrew([]);
        setCustomFields([]);
        setLoading(false);
        setFromApi(true);
        return;
      }
      const [projRes, crewRes, cfRes] = await Promise.all([
        get<Project[]>(`${apiPath('api/projects')}?workspace_id=${wid}`).catch(() => []),
        get<{ id: string; name: string; initials: string; role: string }[]>(`${apiPath('api/crew')}?workspace_id=${wid}`).catch(() => []),
        get<{ id: string; name: string; field_type: string; target: string }[]>(`${apiPath('api/custom-fields')}?workspace_id=${wid}`).catch(() => []),
      ]);
      const projList = Array.isArray(projRes) ? projRes : [];
      setProjects(projList);
      setCrew(Array.isArray(crewRes) ? crewRes : []);
      setCustomFields(Array.isArray(cfRes) ? cfRes : []);
      const pid = overrideProjectId ?? selectedProjectId ?? (projList[0]?.id ?? null);
      if (projList.length && !selectedProjectId && overrideProjectId === undefined) setSelectedProjectId(projList[0].id);
      if (!pid) {
        setSprints([]);
        setInitiatives([]);
        setSections([]);
        setLoading(false);
        setFromApi(true);
        return;
      }
      const [sprintsRes, itemsRes, trackersRes] = await Promise.all([
        get<Sprint[]>(`${apiPath('api/sprints')}?project_id=${pid}`).catch(() => []),
        get<unknown[]>(`${apiPath('api/items')}?project_id=${pid}`).catch(() => []),
        get<{ id: string; name: string; sort_order?: number }[]>(`${apiPath('api/trackers')}?project_id=${pid}`).catch(() => []),
      ]);
      setSprints(Array.isArray(sprintsRes) ? sprintsRes : []);
      const itemList = Array.isArray(itemsRes) ? itemsRes : [];
      const mapped = itemList.map((i: Record<string, unknown>) =>
        mapItemToInitiative({
          id: String(i.id),
          title: String(i.title ?? ''),
          description: i.description as string | null,
          status: i.status as string | null,
          priority: i.priority as string | null,
          points: i.points as number | null,
          assignee_id: i.assignee_id as string | null,
          assignee_initials: i.assignee_initials as string | null,
          assignee_name: i.assignee_name as string | null,
          project_id: i.project_id as string | null,
          tracker_id: i.tracker_id as string | null,
          due_date: i.due_date as string | null,
          category: i.category as string | null,
          field_values: i.field_values as Record<string, string | number | boolean | null> | undefined,
        })
      );
      setInitiatives(mapped);
      const trackers = Array.isArray(trackersRes) ? trackersRes : [];
      const uncategorized = mapped.filter((init) => !init.tracker_id);
      const sectionList: TrackerSection[] = [
        { id: 'uncategorized', title: 'Tasks', initiatives: uncategorized },
        ...trackers.map((t) => ({
          id: t.id,
          title: t.name,
          initiatives: mapped.filter((init) => init.tracker_id === t.id),
        })),
      ];
      setSections(sectionList);
      setFromApi(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setInitiatives(mockInitiatives);
      setSections(mockTrackerSections);
      setFromApi(false);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, selectedProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
    const w = await post<Workspace>(apiPath('api/workspaces'), { name: name.trim() });
    await load();
    if (w?.id) setSelectedWorkspaceId(w.id);
    return w ?? null;
  }, [load]);

  const createProject = useCallback(async (workspaceId: string, name: string, isPersonal?: boolean): Promise<Project | null> => {
    const body: { workspace_id: string; name: string; is_personal?: boolean } = { workspace_id: workspaceId, name: name.trim() };
    if (isPersonal !== undefined) body.is_personal = isPersonal;
    const p = await post<Project>(apiPath('api/projects'), body);
    await load();
    if (p?.id) setSelectedProjectId(p.id);
    return p ?? null;
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
    payload: { title: string; description?: string; priority?: string; type?: string },
    parentId?: string | null,
    trackerId?: string | null
  ): Promise<unknown> => {
    const body: Record<string, unknown> = {
      project_id: projectId,
      title: payload.title.trim(),
      description: payload.description || '',
      priority: payload.priority || 'medium',
      type: payload.type || 'task',
      status: 'not_started',
    };
    if (parentId) body.parent_id = parentId;
    if (trackerId) body.tracker_id = trackerId;
    const res = await post(apiPath('api/items'), body);
    await load();
    return res;
  }, [load]);

  const createSection = useCallback(async (
    projectId: string,
    name: string
  ): Promise<{ id: string; name: string } | null> => {
    const t = await post<{ id: string; name: string }>(apiPath('api/trackers'), {
      project_id: projectId,
      name: name.trim(),
    });
    await load();
    return t ?? null;
  }, [load]);

  const statusToSlug: Record<string, string> = {
    'Not Started': 'not_started',
    'On Track': 'in_progress',
    'At Risk': 'in_progress',
    'In Review': 'in_review',
    'Blocked': 'blocked',
    'Complete': 'done',
  };
  const priorityToSlug: Record<string, string> = { P0: 'high', P1: 'medium', P2: 'low' };

  const updateItem = useCallback(async (
    itemId: string,
    payload: { title?: string; description?: string; status?: string; priority?: string; assignee_id?: string | null; due_date?: string | null; points?: number; category?: string | null }
  ): Promise<unknown> => {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.status !== undefined) body.status = statusToSlug[payload.status] || 'not_started';
    if (payload.priority !== undefined) body.priority = priorityToSlug[payload.priority] || 'medium';
    if (payload.assignee_id !== undefined) body.assignee_id = payload.assignee_id;
    if (payload.due_date !== undefined) body.due_date = payload.due_date;
    if (payload.points !== undefined) body.points = payload.points;
    if (payload.category !== undefined) body.category = payload.category;
    const res = await patch(apiPath(`api/items/${itemId}`), body as Record<string, string>);
    await load();
    return res;
  }, [load]);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    await del(apiPath(`api/items/${itemId}`));
    await load();
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
    kpiData: fromApi
      ? { solvedYTD: done, inProgress, atRiskBlocked: atRisk, bigRocksCount: bigRocks, overallProgress, totalItems: total }
      : { ...mockKpiData, totalItems: mockKpiData.totalItems ?? 0 },
    loading,
    error,
    apiBase: getApiBaseUrl(),
    fromApi,
    refresh: load,
    workspaces,
    projects,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedProjectId,
    setSelectedProjectId,
    createWorkspace,
    createProject,
    createSprint,
    createItem,
    updateItem,
    deleteItem,
    sprints,
    customFields,
  };
}
