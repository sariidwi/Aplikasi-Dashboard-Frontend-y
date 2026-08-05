/**
 * api.js — thin wrapper around the Go REST API.
 * Requests go through nginx's /api/ proxy (see nginx.conf), so this
 * is same-origin as the frontend and never hits CORS. Do NOT point
 * this at the backend's absolute :8080 URL — that bypasses the proxy
 * and triggers CORS errors, since the backend sends no CORS headers.
 */
const API_BASE = window.API_BASE_URL || '';
const TOKEN_KEY = 'sitewatch_token';
const USER_KEY = 'sitewatch_user';

const Auth = {
  getToken() { return localStorage.getItem(TOKEN_KEY); },
  setToken(token) { localStorage.setItem(TOKEN_KEY, token); },
  clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  isLoggedIn() { return !!this.getToken(); },
  setUser(u) { localStorage.setItem(USER_KEY, u); },
  getUser() { return localStorage.getItem(USER_KEY) || 'user'; }
};

/** Custom error carrying HTTP status so callers can branch on 401/429/etc. */
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiRequest(path, { method = 'GET', body, auth = true, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new ApiError('Tidak dapat menghubungi server API. Periksa koneksi atau status backend.', 0);
  }

  if (res.status === 429) {
    throw new ApiError('Terlalu banyak permintaan (rate limit tercapai). Coba lagi sesaat lagi.', 429);
  }
  if (res.status === 401) {
    throw new ApiError('Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.', 401);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = text; }
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Permintaan gagal (HTTP ${res.status}).`;
    throw new ApiError(msg, res.status);
  }
  return data;
}

const Api = {
  health() {
    return apiRequest('/', { auth: false });
  },
  login(username, password) {
    return apiRequest('/api/login', { method: 'POST', auth: false, body: { username, password } });
  },
  getRecords(limit) {
    return apiRequest('/api/records', { params: limit ? { limit } : undefined });
  },
  getRecord(id) {
    return apiRequest(`/api/records/${id}`);
  },
  createRecord(payload) {
    return apiRequest('/api/records', { method: 'POST', body: payload || {} });
  },
  deleteRecord(id) {
    return apiRequest(`/api/records/${id}`, { method: 'DELETE' });
  },
  seed(count = 5) {
    return apiRequest('/api/seed', { method: 'POST', params: { count } });
  },
  getStats() {
    return apiRequest('/api/stats');
  }
};