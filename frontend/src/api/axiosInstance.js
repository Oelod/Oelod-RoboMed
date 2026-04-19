import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 60000, 
});

// Response interceptor — silent token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Don't intercept auth endpoints to prevent infinite redirect loops!
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/refresh-token') && !original.url.includes('/login')) {
      original._retry = true;
      try {
        const res = await api.post('/auth/refresh-token', {});
        const newToken = res.data.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        // Refresh failed → redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
