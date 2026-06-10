import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useResidentStore = create(
  persist(
    (set, get) => ({
      profile: null, // { name, barangay, headcount, contact_number, transportation_mode }
      qrHash: null,
      status: 'danger', // 'danger' | 'safe'
      allocation: null, // details about what they receive
      transportationMode: 'pedestrian', // Global specific state for routing overrides if needed later, but mainly fetched via profile.
      
      // Global offline state (shared across screens)
      isOffline: false,

      // Alert history log
      alertHistory: [],

      // Onboarding flag
      hasOnboarded: false,

      // ─── Actions ───
      setProfileData: (profile, qrHash) => set({ profile, qrHash, transportationMode: profile.transportation_mode }),
      setTransportationMode: (mode) => set({ transportationMode: mode }),
      setSafeStatus: (allocation) => {
        const state = get();
        // Add alert when status changes to safe
        if (state.status !== 'safe') {
          const newAlert = {
            id: `alert_${Date.now()}`,
            type: 'status_change',
            title: 'Marked as Safe',
            message: allocation?.shelter_name
              ? `You have been checked in at ${allocation.shelter_name}.`
              : 'Your safety status has been confirmed.',
            timestamp: new Date().toISOString(),
          };
          set({
            status: 'safe',
            allocation,
            alertHistory: [newAlert, ...state.alertHistory].slice(0, 50), // Keep max 50 alerts
          });
        } else {
          set({ status: 'safe', allocation });
        }
      },
      setIsOffline: (isOffline) => set({ isOffline }),
      setHasOnboarded: (value) => set({ hasOnboarded: value }),

      addAlert: (alert) => {
        const state = get();
        const newAlert = {
          id: `alert_${Date.now()}`,
          timestamp: new Date().toISOString(),
          ...alert,
        };
        set({
          alertHistory: [newAlert, ...state.alertHistory].slice(0, 50),
        });
      },

      clearProfile: () => set({
        profile: null,
        qrHash: null,
        status: 'danger',
        allocation: null,
        transportationMode: 'pedestrian',
        isOffline: false,
      }),
    }),
    {
      name: 'evac-resident-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
