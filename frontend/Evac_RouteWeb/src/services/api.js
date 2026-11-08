import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // Crucial for Sanctum cookies
});

// Keep the browser token scoped to the current tab. Mobile uses SecureStore.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401 globally — redirect to login when session expires
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do NOT redirect if the failing request is login, logout, or the initial /user probe —
      // that allows components to handle unauthenticated state cleanly without an infinite redirect loop
      const isAuthRequest =
        error.config?.url?.includes('/logout') ||
        error.config?.url?.includes('/login') ||
        error.config?.url?.includes('/user');
      if (!isAuthRequest) {
        sessionStorage.removeItem('auth_token');
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
