function getBase() {
  const v = import.meta.env.VITE_API_URL;
  if (v && String(v).trim()) return String(v).replace(/\/$/, '');
  // Dev: use relative path so Vite proxy forwards /api to backend
  if (import.meta.env.DEV) return '';
  // Production: use relative path so /api goes to same host (works with DO ingress)
  return '';
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
    const text = await res.text();
    let msg = res.statusText;
    try {
      const j = text ? JSON.parse(text) : {};
      if (j.error && typeof j.error === 'string') msg = j.error;
    } catch (_) {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export const get    = (path) => api(path);
export const post   = (path, body) => api(path, { method: 'POST', body });
export const patch  = (path, body) => api(path, { method: 'PATCH', body });
export const del    = (path) => api(path, { method: 'DELETE' });

/** POST multipart form (e.g. audio file) — do not set Content-Type */
export async function postForm(path, formData) {
  const base = getBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    try { const j = text ? JSON.parse(text) : {}; if (j.error) msg = j.error; } catch (_) {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}
