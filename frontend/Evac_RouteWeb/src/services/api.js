import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Crucial for Sanctum cookies
});

// Interceptor to attach the Sanctum token if it exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401/403 globally — redirect to login when session expires
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Do NOT redirect if the failing request is the logout call itself —
      // that would create an infinite redirect loop when tokens expire mid-session
      const isLogoutRequest = error.config?.url?.includes('/logout');
      if (!isLogoutRequest) {
        localStorage.removeItem('auth_token');
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
