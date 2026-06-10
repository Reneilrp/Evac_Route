import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useResidentStore = create(
  persist(
    (set) => ({
      profile: null, // { name, barangay, headcount, contact_number, transportation_mode }
      qrHash: null,
      status: 'danger', // 'danger' | 'safe'
      allocation: null, // details about what they receive
      transportationMode: 'pedestrian', // Global specific state for routing overrides if needed later, but mainly fetched via profile.
      
      setProfileData: (profile, qrHash) => set({ profile, qrHash, transportationMode: profile.transportation_mode }),
      setTransportationMode: (mode) => set({ transportationMode: mode }),
      setSafeStatus: (allocation) => set({ status: 'safe', allocation }),
      clearProfile: () => set({ profile: null, qrHash: null, status: 'danger', allocation: null, transportationMode: 'pedestrian' })
    }),
    {
      name: 'evac-resident-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
