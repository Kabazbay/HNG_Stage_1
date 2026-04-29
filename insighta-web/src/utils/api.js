// src/utils/api.js
// Axios instance configured for the web portal.
// Uses cookies (withCredentials) instead of Bearer tokens.
// Handles CSRF token for mutating requests.

import axios from 'axios';

// In production, we use Vercel Rewrites (see vercel.json) to proxy /api and /auth
// This keeps cookies on the same domain and avoids third-party cookie blocking.
const API_BASE = ''; 

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Send cookies with every request
  timeout: 30000,
});

// ── CSRF token management ──
let csrfToken = null;

export async function fetchCsrfToken() {
  try {
    const res = await api.get('/auth/csrf-token');
    csrfToken = res.data.data.csrf_token;
    return csrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    return null;
  }
}

// Add CSRF token to mutating requests
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Try to refresh
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return api(error.config);
      } catch (refreshErr) {
        // Refresh failed — redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
