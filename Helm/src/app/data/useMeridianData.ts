import { useState, useEffect, useCallback } from 'react';
import { get, getApiBaseUrl } from '../api/meridian';
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
  summit: 'On Track',
  ascent: 'At Risk',
  basecamp: 'On Track',
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

export interface MeridianDataResult {
  initiatives: Initiative[];
  trackerSections: TrackerSection[];
  kpiData: { solvedYTD: number; inProgress: number; atRiskBlocked: number; bigRocksCount: number; overallProgress: number };
  loading: boolean;
  error: string | null;
  apiBase: string;
  fromApi: boolean;
  refresh: () => void;
}

export function useMeridianData(): MeridianDataResult {
  const [initiatives, setInitiatives] = useState<Initiative[]>(mockInitiatives);
  const [sections, setSections] = useState<TrackerSection[]>(mockTrackerSections);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);

  const load = useCallback(async () => {
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
      const [workspacesRes, itemsRes] = await Promise.all([
        get<{ id: string; name: string }[]>('/api/workspaces').catch(() => []),
        get<unknown[]>('/api/items').catch(() => []),
      ]);
      const workspaces = Array.isArray(workspacesRes) ? workspacesRes : [];
      const items = Array.isArray(itemsRes) ? itemsRes : [];
      const itemList = Array.isArray(items) ? items : [];
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
      if (mapped.length > 0) {
        setInitiatives(mapped);
        setSections([
          { id: 'from-api', title: 'Work items', initiatives: mapped },
        ]);
        setFromApi(true);
      } else {
        setInitiatives(mockInitiatives);
        setSections(mockTrackerSections);
        setFromApi(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setInitiatives(mockInitiatives);
      setSections(mockTrackerSections);
      setFromApi(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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
      ? { solvedYTD: done, inProgress, atRiskBlocked: atRisk, bigRocksCount: bigRocks, overallProgress }
      : mockKpiData,
    loading,
    error,
    apiBase: getApiBaseUrl(),
    fromApi,
    refresh: load,
  };
}
