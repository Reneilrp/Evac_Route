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

// Interceptor to handle 401 globally — redirect to login when session expires
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do NOT redirect if the failing request is the login or logout call itself —
      // that allows the login page to handle credential errors cleanly without redirecting to landing
      const isAuthRequest = error.config?.url?.includes('/logout') || error.config?.url?.includes('/login');
      if (!isAuthRequest) {
        localStorage.removeItem('auth_token');
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
