import axios from 'axios';
import useAuthStore from '../stores/authStore';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
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

export function openReport(path, download) {
  api.get(path, { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(res.data);
    const disposition = res.headers['content-disposition'];
    let filename = 'report';
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/['";]/g, '').trim();
    }
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