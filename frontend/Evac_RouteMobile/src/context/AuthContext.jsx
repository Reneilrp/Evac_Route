import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from './useResidentStore';

const AuthContext = createContext();
const AUTH_TOKEN_KEY = 'auth_token';
const CACHED_USER_KEY = 'cached_auth_user';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const cacheUser = useCallback(async (nextUser) => {
    if (nextUser) {
      await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(nextUser));
    }
  }, []);

  const syncResidentProfile = useCallback((nextUser) => {
    if (nextUser?.role !== 'resident') return;
    const familyProfile = nextUser.family_profile || nextUser.familyProfile || nextUser.family || {};
    useResidentStore.getState().setProfileData(
      {
        id: familyProfile.id || nextUser.id,
        user_id: nextUser.id,
        family_profile_id: familyProfile.id || null,
        name: nextUser.name,
        barangay: familyProfile.barangay || 'Tetuan',
        headcount: familyProfile.headcount || 1,
        contact_number: familyProfile.contact_number || '',
        transportation_mode: familyProfile.transportation_mode || 'pedestrian',
      },
      familyProfile.qr_code_hash || `hash_${nextUser.id}`
    );
  }, []);

  const checkToken = useCallback(async () => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/user');
      setUser(response.data);
      syncResidentProfile(response.data);
      await cacheUser(response.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(CACHED_USER_KEY);
        setUser(null);
      } else {
        const cachedUser = await SecureStore.getItemAsync(CACHED_USER_KEY);
        if (cachedUser) {
          const cached = JSON.parse(cachedUser);
          setUser(cached);
          syncResidentProfile(cached);
          console.warn('Using cached user profile while offline.');
        } else {
          console.warn('User check unavailable and no cached profile exists:', error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [cacheUser, syncResidentProfile]);

  useEffect(() => {
    // Auth bootstrap restores external session state once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkToken();
  }, [checkToken]);

  const login = async (userData = null) => {
    try {
      let nextUser = userData;
      if (!nextUser) {
        const response = await api.get('/user');
        nextUser = response.data;
      }
      setUser(nextUser);
      syncResidentProfile(nextUser);
      await cacheUser(nextUser);
      return true;
    } catch (error) {
      console.error('Login state sync failed:', error.message);
      return false;
    }
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const { access_token } = response.data;
      let nextUser = response.data.user;
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, access_token);
      if (nextUser?.role === 'resident' && !nextUser?.family_profile && !nextUser?.familyProfile) {
        try {
          const userRes = await api.get('/user');
          if (userRes?.data) {
            nextUser = userRes.data;
          }
        } catch (_err) {
          // Fallback to login user payload if /user fetch fails
        }
      }
      setUser(nextUser);
      syncResidentProfile(nextUser);
      await cacheUser(nextUser);
      return { success: true, user: nextUser };
    } catch (error) {
      console.error('Credential login failed:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.',
      };
    }
  };

  const enterOfflineGuestMode = () => {
    setUser({
      id: 'offline-guest',
      name: 'Offline Emergency Guest',
      role: 'resident',
      offlineGuest: true,
    });
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.warn('Backend logout failed:', error.message);
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(CACHED_USER_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, loginWithCredentials, enterOfflineGuestMode, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
