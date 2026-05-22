/**
 * Local Base44-compatible SDK shim.
 *
 * Replaces `@base44/sdk` and talks to our FastAPI backend at REACT_APP_BACKEND_URL.
 * Exposes the same surface used throughout the nexus-realty codebase:
 *   - base44.entities.<Entity>.{list,filter,create,update,delete,get,bulkCreate}
 *   - base44.functions.invoke(name, payload)
 *   - base44.auth.{me,logout,redirectToLogin}
 *   - base44.appLogs.logUserInApp(pageName)
 *   - base44.integrations.Core.{InvokeLLM,SendEmail,UploadFile}
 *   - base44.users.inviteUser(payload)
 */
const API_BASE =
  (typeof window !== 'undefined' && (import.meta.env.VITE_API_BASE_URL || ''))
  || (typeof process !== 'undefined' && process?.env?.VITE_API_BASE_URL)
  || '';

const TOKEN_STORAGE_KEY = 'nexus_token';

const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_STORAGE_KEY)),
  set: (t) => { if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_STORAGE_KEY, t); },
  clear: () => { if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_STORAGE_KEY); },
};

async function request(method, path, body) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    let errBody = null;
    try { errBody = await res.json(); } catch (_) { /* ignore */ }
    const err = new Error(errBody?.detail || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = errBody;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return await res.text();
  return await res.json();
}

function buildEntity(name) {
  const base = `/api/entities/${encodeURIComponent(name)}`;
  return {
    list: async (sort, limit, skip) => {
      const params = new URLSearchParams();
      if (sort) params.set('_sort', sort);
      if (limit) params.set('_limit', String(limit));
      if (skip) params.set('_skip', String(skip));
      const q = params.toString();
      return request('GET', q ? `${base}?${q}` : base);
    },
    filter: async (criteria = {}, sort, limit, skip) =>
      request('POST', `${base}/filter`, { criteria, sort, limit, skip }),
    get: async (id) => request('GET', `${base}/${encodeURIComponent(id)}`),
    create: async (payload) => request('POST', base, payload),
    bulkCreate: async (records) => request('POST', `${base}/bulk`, records),
    update: async (id, payload) => request('PUT', `${base}/${encodeURIComponent(id)}`, payload),
    delete: async (id) => request('DELETE', `${base}/${encodeURIComponent(id)}`),
  };
}

// Lazy proxy: any base44.entities.<Anything> returns an entity client.
const entities = new Proxy({}, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    return buildEntity(prop);
  },
});

const functions = {
  invoke: async (name, payload) => request('POST', `/api/functions/${encodeURIComponent(name)}`, payload || {}),
};

const auth = {
  me: async () => request('GET', '/api/auth/me'),
  login: async (email, password) => {
    const res = await request('POST', '/api/auth/login', { email, password });
    if (res?.token) tokenStore.set(res.token);
    return res;
  },
  register: async (email, password, full_name) => {
    const res = await request('POST', '/api/auth/register', { email, password, full_name });
    if (res?.token) tokenStore.set(res.token);
    return res;
  },
  logout: async (_redirect) => {
    tokenStore.clear();
    try { await request('POST', '/api/auth/logout'); } catch (_) { /* ignore */ }
    return { success: true };
  },
  redirectToLogin: (_returnUrl) => {
    // single-page demo app: no external login; simply reload to root.
    if (typeof window !== 'undefined') window.location.href = '/';
  },
};

const appLogs = {
  logUserInApp: async (_pageName) => ({ success: true }),
};

const integrations = {
  Core: {
    InvokeLLM: async (payload) =>
      request('POST', '/api/functions/InvokeLLM', payload),
    SendEmail: async (payload) =>
      request('POST', '/api/functions/SendEmail', payload),
    UploadFile: async (_payload) => ({ url: '', note: 'Upload disabled in local build' }),
  },
};

const users = {
  inviteUser: async (payload) => request('POST', '/api/auth/register', payload),
};

export const base44 = {
  entities,
  functions,
  auth,
  appLogs,
  integrations,
  users,
};

export default base44;
