const STORAGE_KEY = 'meridian_api_base';

function getBase() {
  if (typeof window === 'undefined') return '';
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get('api_url') || urlParams.get('api_base');
  if (fromQuery && fromQuery.startsWith('http')) {
    const base = fromQuery.replace(/\/$/, '');
    try { localStorage.setItem(STORAGE_KEY, base); } catch (_) {}
    return base;
  }
  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage && fromStorage.startsWith('http')) return fromStorage.replace(/\/$/, '');
  } catch (_) {}
  const v = import.meta.env.VITE_API_URL;
  if (v && String(v).trim()) return String(v).replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return window.location?.origin || '';
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
