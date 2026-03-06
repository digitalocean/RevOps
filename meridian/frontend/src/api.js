const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API Error');
  }
  return res.json();
}

export const get    = (path) => api(path);
export const post   = (path, body) => api(path, { method: 'POST', body });
export const patch  = (path, body) => api(path, { method: 'PATCH', body });
export const del    = (path) => api(path, { method: 'DELETE' });
