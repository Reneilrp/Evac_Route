import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { getEcho } from '../services/echo';
import { useAuth } from './AuthContext';

const ActiveSosContext = createContext(null);

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // meters
}

export function ActiveSosProvider({ children }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const isResident = user && user.role === 'resident';

  const {
    data: responseData,
    refetch: refetchActiveSos,
    isLoading,
  } = useQuery({
    queryKey: ['active-sos'],
    queryFn: async () => {
      try {
        const res = await api.get('/user/active-sos');
        return res.data;
      } catch (err) {
        return { status: 'idle', data: null };
      }
    },
    enabled: !!token && isResident,
    refetchInterval: (query) => {
      // If there is an active SOS or mission, poll every 6s as a fallback to WebSockets
      const state = query.state.data?.data?.tracking_state;
      return state && state !== 'idle' ? 6000 : 30000;
    },
  });

  const activeSos = responseData?.data || null;
  const isTracking = !!activeSos && activeSos.tracking_state !== 'idle';
  const trackingState = activeSos?.tracking_state || 'idle';

  // Real-time WebSocket sync via Echo
  useEffect(() => {
    if (!token || !isResident) return;

    const echo = getEcho();
    if (!echo || !echo.channel) return;

    const channel = echo.channel('map-updates');

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['active-sos'] });
    };

    channel.listen('.rescue.mission.dispatched', handleUpdate);
    channel.listen('.rescue.mission.status_updated', handleUpdate);

    return () => {
      channel.stopListening('.rescue.mission.dispatched');
      channel.stopListening('.rescue.mission.status_updated');
    };
  }, [token, isResident, queryClient]);

  // Compute distance and ETA
  const { distanceMeters, etaMinutes } = useMemo(() => {
    if (!activeSos || !activeSos.rescue_unit) {
      return { distanceMeters: null, etaMinutes: null };
    }

    const victimLat = activeSos.victim_latitude;
    const victimLng = activeSos.victim_longitude;
    const unitLat = activeSos.rescue_unit.current_latitude;
    const unitLng = activeSos.rescue_unit.current_longitude;

    const meters = calculateHaversineDistance(victimLat, victimLng, unitLat, unitLng);
    if (meters === null) return { distanceMeters: null, etaMinutes: null };

    // Average rescue transit speed in flood city: ~25 km/h (~7 m/s)
    const transitSpeedMs = 7.0;
    const seconds = meters / transitSpeedMs;
    const mins = Math.max(1, Math.round(seconds / 60));

    return { distanceMeters: meters, etaMinutes: mins };
  }, [activeSos]);

  // Cancel SOS Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/user/active-sos/cancel');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sos'] });
    },
  });

  const value = {
    activeSos,
    isTracking,
    trackingState,
    distanceMeters,
    etaMinutes,
    isLoading,
    refetchActiveSos,
    cancelSos: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };

  return <ActiveSosContext.Provider value={value}>{children}</ActiveSosContext.Provider>;
}

export function useActiveSos() {
  const context = useContext(ActiveSosContext);
  if (!context) {
    return {
      activeSos: null,
      isTracking: false,
      trackingState: 'idle',
      distanceMeters: null,
      etaMinutes: null,
      isLoading: false,
      refetchActiveSos: () => {},
      cancelSos: async () => {},
      isCancelling: false,
    };
  }
  return context;
}
