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
  in_review: 'On Track',
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

function mapItemToInitiative(item: {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  points?: number | null;
  assignee_initials?: string | null;
  project_id?: string | null;
}): Initiative {
  const status = (item.status && STATUS_MAP[item.status]) || 'Not Started';
  const priority = (item.priority && PRIORITY_MAP[item.priority]) || 'P1';
  return {
    id: item.id,
    name: item.title,
    category: CATEGORIES[Math.abs(item.title.length) % CATEGORIES.length],
    priority,
    isBigRock: (item.points ?? 0) >= 5,
    owner: item.assignee_initials || '—',
    status,
    questions: '',
    description: item.description || '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    progress: status === 'Complete' ? 100 : status === 'Not Started' ? 0 : 50,
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
  createItem: (projectId: string, payload: { title: string; description?: string; priority?: string; type?: string }) => Promise<unknown>;
  updateItem: (itemId: string, payload: { title?: string; description?: string; status?: string; priority?: string }) => Promise<unknown>;
  deleteItem: (itemId: string) => Promise<void>;
  sprints: Sprint[];
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
        setLoading(false);
        setFromApi(true);
        return;
      }
      const projRes = await get<Project[]>(`${apiPath('api/projects')}?workspace_id=${wid}`).catch(() => []);
      const projList = Array.isArray(projRes) ? projRes : [];
      setProjects(projList);
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
      const [sprintsRes, itemsRes] = await Promise.all([
        get<Sprint[]>(`${apiPath('api/sprints')}?project_id=${pid}`).catch(() => []),
        get<unknown[]>(`${apiPath('api/items')}?project_id=${pid}`).catch(() => []),
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
          assignee_initials: i.assignee_initials as string | null,
          project_id: i.project_id as string | null,
        })
      );
      setInitiatives(mapped);
      setSections([{ id: 'from-api', title: 'Work items', initiatives: mapped }]);
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

  const createProject = useCallback(async (workspaceId: string, name: string): Promise<Project | null> => {
    const p = await post<Project>(apiPath('api/projects'), { workspace_id: workspaceId, name: name.trim() });
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
    payload: { title: string; description?: string; priority?: string; type?: string }
  ): Promise<unknown> => {
    const res = await post(apiPath('api/items'), {
      project_id: projectId,
      title: payload.title.trim(),
      description: payload.description || '',
      priority: payload.priority || 'medium',
      type: payload.type || 'task',
      status: 'not_started',
    });
    await load();
    return res;
  }, [load]);

  const statusToSlug: Record<string, string> = {
    'Not Started': 'not_started',
    'On Track': 'in_progress',
    'At Risk': 'in_progress',
    'Blocked': 'blocked',
    'Complete': 'done',
  };
  const priorityToSlug: Record<string, string> = { P0: 'high', P1: 'medium', P2: 'low' };

  const updateItem = useCallback(async (
    itemId: string,
    payload: { title?: string; description?: string; status?: string; priority?: string }
  ): Promise<unknown> => {
    const body: Record<string, string> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.status !== undefined) body.status = statusToSlug[payload.status] || 'not_started';
    if (payload.priority !== undefined) body.priority = priorityToSlug[payload.priority] || 'medium';
    const res = await patch(apiPath(`api/items/${itemId}`), body);
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
  };
}
