import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// On Android Emulator, 10.0.2.2 routes directly to host PC port 8000
const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api'
  : (Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000/api');

console.log('[API] Target API Base URL:', BASE_URL);

const api = create({
  baseURL: BASE_URL,
  timeout: 12000,
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
