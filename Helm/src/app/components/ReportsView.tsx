import { useEffect, useMemo, useState } from 'react';
import { LineChart as LineChartIcon, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { get } from '../api/meridian';
import { formatLocalDate } from '../lib/dateFormat';
import type { Project } from '../data/useMeridianData';

interface RawItem {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  project_id?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  assignee_name?: string | null;
}

interface ReportsViewProps {
  projects: Project[];
  onOpenItem?: (itemId: string, projectId: string | null) => void;
}

type WindowKey = '7d' | '14d' | '30d';

const WINDOW_DAYS: Record<WindowKey, number> = { '7d': 7, '14d': 14, '30d': 30 };

function startOfWindow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

export function ReportsView({ projects, onOpenItem }: ReportsViewProps) {
  const [windowKey, setWindowKey] = useState<WindowKey>('7d');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [items, setItems] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const ids = projectFilter === 'all' ? projects.map((p) => p.id) : [projectFilter];
        const chunks = await Promise.all(
          ids.map((pid) =>
            get<RawItem[]>(`/api/items?project_id=${encodeURIComponent(pid)}`).catch(() => []),
          ),
        );
        if (cancelled) return;
        const flat = chunks.flat().filter((i) => !!i?.created_at);
        const cutoff = startOfWindow(WINDOW_DAYS[windowKey]).getTime();
        const inWindow = flat.filter((i) => new Date(i.created_at!).getTime() >= cutoff);
        setItems(inWindow);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projects, projectFilter, windowKey]);

  const days = WINDOW_DAYS[windowKey];
  const byDay = useMemo(() => {
    const out: Record<string, RawItem[]> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      out[d.toISOString().slice(0, 10)] = [];
    }
    for (const it of items) {
      const k = dayKey(it.created_at);
      if (k in out) out[k].push(it);
    }
    return out;
  }, [items, days]);

  const orderedDays = Object.keys(byDay).sort((a, b) => (a > b ? -1 : 1));
  const maxCount = orderedDays.reduce((m, k) => Math.max(m, byDay[k].length), 0);

  const byProject = useMemo(() => {
    const out = new Map<string, number>();
    for (const it of items) {
      const pid = it.project_id || 'unknown';
      out.set(pid, (out.get(pid) ?? 0) + 1);
    }
    return Array.from(out.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [items]);

  const projectName = (pid: string) => projects.find((p) => p.id === pid)?.name ?? '—';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_4px_10px_rgba(79,70,229,0.30)]">
              <LineChartIcon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">New issues report</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Issues filed in the last <span className="font-semibold text-gray-700">{days} days</span> across projects you can access.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarIcon className="w-3.5 h-3.5" />
              <Select value={windowKey} onValueChange={(v) => setWindowKey(v as WindowKey)}>
                <SelectTrigger className="h-8 text-xs border-gray-200 bg-white w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="14d">Last 14 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Filter className="w-3.5 h-3.5" />
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 text-xs border-gray-200 bg-white w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Kpi title="New issues" value={items.length} sub={`in the last ${days} days`} />
          <Kpi title="Projects touched" value={byProject.length} />
          <Kpi
            title="Busiest day"
            value={maxCount}
            sub={orderedDays.find((d) => byDay[d].length === maxCount) || '—'}
          />
          <Kpi
            title="High priority (P0/P1)"
            value={items.filter((i) => i.priority === 'critical' || i.priority === 'high' || i.priority === 'P0' || i.priority === 'P1').length}
          />
        </div>

        <section className="bg-white border border-[var(--border-soft)] rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight">Issues per day</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="flex items-end gap-1.5 h-40">
              {orderedDays
                .slice()
                .reverse()
                .map((d) => {
                  const count = byDay[d].length;
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1.5 min-w-[12px]">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-indigo-500 to-blue-400 hover:from-indigo-600 hover:to-blue-500 transition-all hover:scale-y-[1.04] origin-bottom"
                        style={{ height: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                        title={`${d}: ${count} issue${count === 1 ? '' : 's'}`}
                      />
                      <span className="text-[9px] text-gray-400 tabular-nums">{d.slice(5)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="bg-white border border-[var(--border-soft)] rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight">By project</h2>
          {byProject.length === 0 ? (
            <p className="text-sm text-gray-400">No new issues yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {byProject.map(([pid, count]) => (
                <li key={pid} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium text-gray-700">{projectName(pid)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (count / Math.max(1, byProject[0][1])) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-[var(--border-soft)] rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 tracking-tight">Recent issues</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">No issues created in this window.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {items
                .slice()
                .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
                .slice(0, 25)
                .map((i) => (
                  <li key={i.id} className="py-2.5 flex items-center gap-3 text-sm group">
                    <button
                      type="button"
                      onClick={() => onOpenItem?.(i.id, i.project_id ?? null)}
                      className="flex-1 min-w-0 text-left truncate text-gray-800 hover:text-indigo-700 font-medium transition-colors"
                      title={i.title}
                    >
                      {i.title}
                    </button>
                    <span className="text-xs text-gray-400 w-40 truncate">{projectName(i.project_id || '')}</span>
                    <span className="text-xs text-gray-500 w-28 shrink-0 text-right tabular-nums">{formatLocalDate(i.created_at)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ title, value, sub }: { title: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-[var(--border-soft)] rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-gray-500">{title}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}
