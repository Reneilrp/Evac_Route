import { create } from 'zustand';
import {
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
} from '../utils/zamboangaGeo';

export const DEFAULT_SIMULATION_MISSION = {
  id: 'sim-mission-mendoza',
  control_no: 'OP-SIM-01',
  victim_name: 'Mendoza Family (Distress)',
  victim_phone: '09171234567',
  headcount: 4,
  barangay: 'Baliwasan Coastal',
  special_needs: 'Elderly with wheelchair, Infant (6 mos)',
  situation_description: 'Rising floodwater reached 1.2m on ground floor. Trapped on rooftop with low battery.',
  victim_latitude: ZAMBOANGA_VICTIM_DEFAULT[1],
  victim_longitude: ZAMBOANGA_VICTIM_DEFAULT[0],
  status: 'dispatched',
  triage_level: 'critical',
  target_shelter_id: 1,
  target_shelter: {
    id: 1,
    name: 'Baliwasan Gym Evacuation Center',
    latitude: ZAMBOANGA_SHELTER_DEFAULT[1],
    longitude: ZAMBOANGA_SHELTER_DEFAULT[0],
    type: 'primary',
  },
  incident: {
    hazard_type: 'flood',
  },
};

export const useRescueSimulationStore = create((set, get) => ({
  isSimulationActive: false,
  simMission: DEFAULT_SIMULATION_MISSION,
  simPhase: 'dispatched', // 'dispatched' | 'en_route' | 'on_scene' | 'transporting' | 'completed'
  simSpeed: 1, // 1 = 10m/s (1x), 3 = 30m/s (3x), 5 = 50m/s (5x)
  simCoords: null, // [lng, lat]
  simHeading: 0,
  isNavigating: false,
  isPaused: false,
  shouldFastForwardGeofence: false,

  // ─── Actions ───
  startSimulation: (customMission = null) => {
    set({
      isSimulationActive: true,
      simMission: customMission || DEFAULT_SIMULATION_MISSION,
      simPhase: 'dispatched',
      simCoords: null,
      simHeading: 0,
      isNavigating: false,
      isPaused: false,
      shouldFastForwardGeofence: false,
    });
  },

  stopSimulation: () => {
    set({
      isSimulationActive: false,
      simPhase: 'dispatched',
      simCoords: null,
      simHeading: 0,
      isNavigating: false,
      isPaused: false,
      shouldFastForwardGeofence: false,
    });
  },

  acceptDispatch: () => {
    set((state) => ({
      simPhase: 'en_route',
      simMission: {
        ...state.simMission,
        status: 'en_route',
      },
      isNavigating: true,
      isPaused: false,
      shouldFastForwardGeofence: false,
    }));
  },

  setSimPhase: (phase) => {
    set((state) => ({
      simPhase: phase,
      simMission: {
        ...state.simMission,
        status: phase === 'transporting' ? 'transporting' : phase === 'on_scene' ? 'on_scene' : phase === 'completed' ? 'completed' : state.simMission.status,
      },
    }));
  },

  setSimSpeed: (speed) => set({ simSpeed: speed }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setSimCoords: (coords, heading = 0) => set({ simCoords: coords, simHeading: heading }),

  skipToGeofence: () => set({ shouldFastForwardGeofence: true }),
  consumeFastForward: () => set({ shouldFastForwardGeofence: false }),

  confirmVictimSecured: (targetShelter = null) => {
    set((state) => ({
      simPhase: 'transporting',
      simMission: {
        ...state.simMission,
        status: 'transporting',
        target_shelter: targetShelter || state.simMission.target_shelter,
      },
      isNavigating: true,
      isPaused: false,
      shouldFastForwardGeofence: false,
    }));
  },

  confirmHandoverAndStandby: () => {
    set((state) => ({
      simPhase: 'completed',
      simMission: {
        ...state.simMission,
        status: 'completed',
      },
      isNavigating: false,
      isPaused: false,
      simCoords: ZAMBOANGA_RESCUER_BASE,
      shouldFastForwardGeofence: false,
    }));
  },

  resetToStandby: () => {
    set({
      simPhase: 'dispatched',
      simCoords: null,
      simHeading: 0,
      isNavigating: false,
      isPaused: false,
      shouldFastForwardGeofence: false,
    });
  },
}));
