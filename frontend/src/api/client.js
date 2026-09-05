import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lgu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('lgu_token');
      localStorage.removeItem('lgu_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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