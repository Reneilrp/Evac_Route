import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/user');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user", error);
      sessionStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in on mount
    const legacyToken = localStorage.getItem('auth_token');
    if (legacyToken) {
      localStorage.removeItem('auth_token');
    }
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email, password) => {
    try {
      // Initialize CSRF protection for Sanctum stateful session cookies
      const baseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
      await api.get(`${baseUrl}/sanctum/csrf-cookie`).catch(() => {});

      const response = await api.post('/login', { email, password });
      const { access_token, user: loggedInUser } = response.data;
      
      sessionStorage.setItem('auth_token', access_token);
      setUser(loggedInUser);
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Revoke the Sanctum token on the backend to prevent token pile-up
      await api.post('/logout');
    } catch (error) {
      // Proceed with local logout even if the API call fails
      console.warn('Backend logout failed:', error);
    } finally {
      sessionStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
