import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 60000, 
});

let isRefreshing = false;
let failedQueue = [];
let onTokenRefresh = null;

export const setTokenRefreshListener = (callback) => {
  onTokenRefresh = callback;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry && !original.url.includes('/refresh-token') && !original.url.includes('/login')) {
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(api.defaults.baseURL + '/auth/refresh-token', {}, { withCredentials: true });
        const newToken = res.data.data.token;
        
        // Update global header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        if (onTokenRefresh) onTokenRefresh(newToken);
        
        processQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
