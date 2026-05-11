import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { LinkIcon, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '../api/meridian';
import { formatLocalDate } from '../lib/dateFormat';

interface PublicItem {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  due_date: string | null;
  tracker_id: string | null;
  sort_order: number;
  progress: number | null;
  created_at: string;
  assignee_name: string | null;
  assignee_initials: string | null;
}

interface PublicTracker {
  id: string;
  name: string;
  sort_order: number;
}

interface PublicPayload {
  project: { id: string; name: string; description: string | null; color: string | null; created_at: string };
  trackers: PublicTracker[];
  items: PublicItem[];
}

export function PublicProjectView() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const base = getApiBaseUrl().replace(/\/$/, '');
        const url = `${base}/api/public/projects/${encodeURIComponent(String(token))}`;
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) throw new Error(res.status === 404 ? 'This link is invalid or has been disabled.' : `Error ${res.status}`);
        const json = (await res.json()) as PublicPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => { cancelled = true; };
  }, [token]);

  const itemsByTracker = useMemo(() => {
    const out = new Map<string, PublicItem[]>();
    if (!data) return out;
    for (const i of data.items) {
      const k = i.tracker_id || '__none__';
      if (!out.has(k)) out.set(k, []);
      out.get(k)!.push(i);
    }
    for (const list of out.values()) list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return out;
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <LinkIcon className="w-5 h-5 text-indigo-600" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Read-only public view</p>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {loading ? 'Loading…' : data?.project.name ?? 'Project'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {err && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            {err}
          </div>
        )}
        {!err && data && (
          <div className="space-y-6">
            {data.project.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.project.description}</p>
            )}
            {[
              ...data.trackers.map((t) => ({ id: t.id, name: t.name })),
              ...(itemsByTracker.has('__none__') ? [{ id: '__none__', name: 'Uncategorized' }] : []),
            ].map((section) => {
              const list = itemsByTracker.get(section.id) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={section.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">{section.name}</h2>
                    <span className="text-xs text-gray-400">{list.length} item{list.length === 1 ? '' : 's'}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-[11px] uppercase text-gray-500 tracking-wide">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Title</th>
                        <th className="px-4 py-2 font-semibold w-28">Priority</th>
                        <th className="px-4 py-2 font-semibold w-32">Status</th>
                        <th className="px-4 py-2 font-semibold w-32">Owner</th>
                        <th className="px-4 py-2 font-semibold w-28">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((i) => (
                        <tr key={i.id} className="border-t border-gray-100">
                          <td className="px-4 py-2 text-gray-800">
                            <div className="font-medium truncate">{i.title}</div>
                            {i.category && <div className="text-[11px] text-gray-500 mt-0.5">{i.category}</div>}
                          </td>
                          <td className="px-4 py-2 text-gray-700">{i.priority ?? '—'}</td>
                          <td className="px-4 py-2 text-gray-700 capitalize">{String(i.status || '—').replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-gray-700 truncate">{i.assignee_name ?? '—'}</td>
                          <td className="px-4 py-2 text-gray-500">{i.due_date ? formatLocalDate(i.due_date) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
            {data.items.length === 0 && (
              <p className="text-sm text-gray-500">This project has no items yet.</p>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-4 text-[11px] text-gray-400">
        Read-only snapshot · Link can be disabled by the project owner.
      </footer>
    </div>
  );
}
