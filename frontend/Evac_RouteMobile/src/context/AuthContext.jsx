import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from './useResidentStore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * On app start, check if a real Sanctum token exists and fetch the user.
   */
  const checkToken = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        // Fetch real user from backend using the stored token
        const response = await api.get('/user');
        const user = response.data;
        setUser(user);

        // Sync profile data to Zustand if they are a resident
        if (user && user.role === 'resident') {
          const familyProfile = user.family_profile || user.family || {};
          useResidentStore.getState().setProfileData(
            {
              id: user.id,
              name: user.name,
              barangay: familyProfile.barangay || 'Tetuan',
              headcount: familyProfile.headcount || 1,
              contact_number: familyProfile.contact_number || '',
              transportation_mode: familyProfile.transportation_mode || 'pedestrian'
            },
            familyProfile.qr_code_hash || `hash_${user.id}`
          );
        }
      }
    } catch (e) {
      // Token invalid or network error — clear it to force re-registration
      console.warn('Token check failed, clearing:', e.message);
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkToken();
  }, [checkToken]);

  /**
   * Called after a successful /register/family or /login API call.
   * Expects the real Sanctum token to already be stored in SecureStore
   * by the calling screen (ProfileSetupScreen / LoginScreen).
   * This method fetches the user from the API and sets them in state.
   */
  const login = async (userData = null) => {
    try {
      let user = userData;
      if (!user) {
        const response = await api.get('/user');
        user = response.data;
      }
      setUser(user);

      // Sync profile data to Zustand if they are a resident
      if (user && user.role === 'resident') {
        const familyProfile = user?.family_profile || user?.family || {};
        useResidentStore.getState().setProfileData(
          {
            id: user.id,
            name: user.name,
            barangay: familyProfile.barangay || 'Tetuan',
            headcount: familyProfile.headcount || 1,
            contact_number: familyProfile.contact_number || '',
            transportation_mode: familyProfile.transportation_mode || 'pedestrian'
          },
          familyProfile.qr_code_hash || `hash_${user.id}`
        );
      }
      return true;
    } catch (e) {
      console.error('Login state sync failed:', e.message);
      return false;
    }
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const { access_token, user } = response.data;
      await SecureStore.setItemAsync('auth_token', access_token);
      setUser(user);

      // Sync profile data to Zustand if they are a resident
      if (user && user.role === 'resident') {
        const familyProfile = user.family_profile || user.family || {};
        useResidentStore.getState().setProfileData(
          {
            id: user.id,
            name: user.name,
            barangay: familyProfile.barangay || 'Tetuan',
            headcount: familyProfile.headcount || 1,
            contact_number: familyProfile.contact_number || '',
            transportation_mode: familyProfile.transportation_mode || 'pedestrian'
          },
          familyProfile.qr_code_hash || `hash_${user.id}`
        );
      }
      return { success: true, user };
    } catch (e) {
      console.error('Credential login failed:', e.message);
      return {
        success: false,
        message: e.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const logout = async () => {
    try {
      // Revoke the Sanctum token on the backend
      await api.post('/logout');
    } catch (e) {
      // Proceed with local logout even if API call fails
      console.warn('Backend logout failed:', e.message);
    } finally {
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithCredentials, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
