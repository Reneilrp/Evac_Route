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
        if (user && user.role === 'resident' && user.family_profile) {
          useResidentStore.getState().setProfileData(
            {
              name: user.name,
              barangay: user.family_profile.barangay,
              headcount: user.family_profile.headcount,
              contact_number: user.family_profile.contact_number,
              transportation_mode: user.family_profile.transportation_mode
            },
            user.family_profile.qr_code_hash
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
  const login = async () => {
    try {
      const response = await api.get('/user');
      const user = response.data;
      setUser(user);

      // Sync profile data to Zustand if they are a resident
      if (user && user.role === 'resident' && user.family_profile) {
        useResidentStore.getState().setProfileData(
          {
            name: user.name,
            barangay: user.family_profile.barangay,
            headcount: user.family_profile.headcount,
            contact_number: user.family_profile.contact_number,
            transportation_mode: user.family_profile.transportation_mode
          },
          user.family_profile.qr_code_hash
        );
      }
      return true;
    } catch (e) {
      console.error('Login state sync failed:', e.message);
      return false;
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
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
