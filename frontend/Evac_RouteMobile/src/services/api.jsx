import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Read API base URL from app.json extra config so it works across all dev environments.
// Set extra.apiBaseUrl in app.json for your local dev IP, e.g. "http://192.168.1.X:8000/api"
const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Attach Sanctum token to every request from SecureStore
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 globally — clear token without a hard redirect
// (React Navigation will re-render to the Login screen when user becomes null in AuthContext)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Skip the interceptor for the logout call itself to avoid loops
      const isLogoutRequest = error.config?.url?.includes('/logout');
      if (!isLogoutRequest) {
        // Clear the invalid token — AuthContext will detect user is gone on next check
        await SecureStore.deleteItemAsync('auth_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
