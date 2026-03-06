export const STORAGE_KEY = 'meridian_api_base';

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

/** Return the base URL we use for API calls (for display/diagnostics). */
export function getApiBaseUrl() {
  return getBase();
}

export async function api(path, opts = {}) {
  const base = getBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')) {
    const isHtml = /^\s*<!DOCTYPE|^\s*<html/i.test(text || '');
    if (isHtml) throw new Error('Server returned a web page instead of API data. Open the app from your main app URL (DigitalOcean dashboard) or paste that URL in the red banner and click Save & retry.');
    if (!res.ok) throw new Error(text?.slice(0, 80) || res.statusText || `Request failed (${res.status})`);
    throw new Error('API returned non-JSON. Use your main app URL in the banner below.');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = text ? JSON.parse(text) : {};
      if (j.error && typeof j.error === 'string') msg = j.error;
    } catch (_) {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return text ? JSON.parse(text) : {};
}

export const get    = (path) => api(path);
export const post   = (path, body) => api(path, { method: 'POST', body });
export const patch  = (path, body) => api(path, { method: 'PATCH', body });
export const del    = (path) => api(path, { method: 'DELETE' });

/** Test API at a specific base URL (e.g. pasted in banner). Saves to localStorage on success. */
export async function checkApiAtUrl(baseUrl) {
  const base = (baseUrl || '').trim().replace(/\/$/, '');
  if (!base || !base.startsWith('http')) throw new Error('Enter a valid URL (e.g. https://revops-ntkll.ondigitalocean.app)');
  const healthUrl = `${base}/api/health`;
  const res = await fetch(healthUrl, { headers: { 'Content-Type': 'application/json' } });
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')) {
    const isHtml = /^\s*<!DOCTYPE|^\s*<html/i.test(text || '');
    if (isHtml) throw new Error('That URL returned a web page, not the API. Make sure you use the app URL where /api is routed to the API (see docs).');
    throw new Error(`Request failed: ${res.status}. ${text?.slice(0, 60) || res.statusText}`);
  }
  const data = text ? JSON.parse(text) : {};
  if (data.status !== 'ok') throw new Error(data.message || 'API not healthy');
  try { localStorage.setItem(STORAGE_KEY, base); } catch (_) {}
  const workspacesRes = await fetch(`${base}/api/workspaces`, { headers: { 'Content-Type': 'application/json' } });
  const workspacesText = await workspacesRes.text();
  const workspaces = workspacesRes.ok && workspacesText ? JSON.parse(workspacesText) : [];
  return Array.isArray(workspaces) ? workspaces : [];
}

/** POST multipart form (e.g. audio file) — do not set Content-Type */
export async function postForm(path, formData) {
  const base = getBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, { method: 'POST', body: formData });
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const isHtml = /^\s*<!DOCTYPE|^\s*<html/i.test(text || '');
    if (isHtml) throw new Error('Server returned a web page instead of API data. Use your main app URL in the banner.');
    if (!res.ok) throw new Error(text?.slice(0, 80) || res.statusText || `Request failed (${res.status})`);
    throw new Error('API returned non-JSON.');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = text ? JSON.parse(text) : {}; if (j.error) msg = j.error; } catch (_) {}
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return text ? JSON.parse(text) : {};
}
