function getBase() {
  const v = import.meta.env.VITE_API_URL;
  if (v) return v.replace(/\/$/, '');
  if (import.meta.env.DEV) return ''; // Vite proxy to backend
  return window.location.origin;
}

export async function api(path, opts = {}) {
  const base = getBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API Error');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export const get    = (path) => api(path);
export const post   = (path, body) => api(path, { method: 'POST', body });
export const patch  = (path, body) => api(path, { method: 'PATCH', body });
export const del    = (path) => api(path, { method: 'DELETE' });
