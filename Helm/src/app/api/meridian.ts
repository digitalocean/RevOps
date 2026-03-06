/**
 * Meridian API client — workspaces, projects, items (initiatives).
 * Set VITE_API_URL at build time or use ?api_url= in the URL for the app base.
 */
const STORAGE_KEY = 'meridian_api_base';

function getBase(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api_url') || params.get('api_base');
  if (fromQuery && fromQuery.startsWith('http')) {
    const base = fromQuery.replace(/\/$/, '');
    try {
      localStorage.setItem(STORAGE_KEY, base);
    } catch (_) {}
    return base;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.startsWith('http')) return stored.replace(/\/$/, '');
  } catch (_) {}
  const v = import.meta.env.VITE_API_URL;
  if (v && String(v).trim()) return String(v).replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return window.location?.origin ?? '';
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = getBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers } as HeadersInit,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  } as RequestInit);
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(text?.slice(0, 80) || res.statusText || `Request failed (${res.status})`);
    throw new Error('API returned non-JSON');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = text ? JSON.parse(text) : {};
      if (j.error && typeof j.error === 'string') msg = j.error;
    } catch (_) {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export const get = <T = unknown>(path: string) => api<T>(path);
export const post = <T = unknown>(path: string, body: object) =>
  api<T>(path, { method: 'POST', body: body as BodyInit });

export function getApiBaseUrl(): string {
  return getBase();
}
