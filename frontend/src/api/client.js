import axios from 'axios';
import useAuthStore from '../stores/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let isRefreshing = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lgu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original.url.includes('/auth/login') && !original.url.includes('/auth/refresh-token')) {
      if (isRefreshing) return Promise.reject(err);
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('lgu_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post('/api/v1/auth/refresh-token', { refreshToken });
        const { token, refreshToken: newRefreshToken } = res.data;
        localStorage.setItem('lgu_token', token);
        localStorage.setItem('lgu_refresh_token', newRefreshToken);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem('lgu_token');
        localStorage.removeItem('lgu_refresh_token');
        localStorage.removeItem('lgu_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

function parseFilename(disposition, fallback) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename=([^;]+)/i);
  if (match) {
    const name = decodeURIComponent(match[1]).replace(/['";]/g, '').trim();
    if (name) return name;
  }
  return fallback;
}

function filenameFromPath(path) {
  const segments = path.split('/');
  const last = segments[segments.length - 1];
  const qIdx = last.indexOf('?');
  return qIdx >= 0 ? last.slice(0, qIdx) : last;
}

export function openReport(path, download) {
  api.get(path, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(res.data);
    const disposition = res.headers['content-disposition'];
    const fallback = filenameFromPath(path) || 'report';
    const filename = parseFilename(disposition, fallback);
    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } else {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }).catch((err) => {
    if (err.response?.status === 401) return;
    console.error('Failed to open report:', err);
  });
}

export default api;