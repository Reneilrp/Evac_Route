import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { MapPin, Check, X, Crosshair } from 'lucide-react-native';
import {
  MAPBOX_PUBLIC_TOKEN,
  clampToZamboanga,
  ZAMBOANGA_WMSU,
  getNearestBarangay,
} from '../../../utils/zamboangaGeo';
import * as Location from 'expo-location';

export default function IncidentMapPinModal({
  visible,
  onClose,
  initialCoords,
  onConfirmPin,
  colors = {},
  isDarkMode = true,
}) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  // Normalize initial coords to [lng, lat]
  const initialCenter = initialCoords
    ? clampToZamboanga([
        initialCoords.longitude ?? initialCoords.lng ?? initialCoords[0] ?? ZAMBOANGA_WMSU[0],
        initialCoords.latitude ?? initialCoords.lat ?? initialCoords[1] ?? ZAMBOANGA_WMSU[1],
      ], ZAMBOANGA_WMSU)
    : ZAMBOANGA_WMSU;

  const [pinnedCoords, setPinnedCoords] = useState(initialCenter); // [lng, lat]
  const [nearestBarangay, setNearestBarangay] = useState(() => getNearestBarangay(initialCenter[0], initialCenter[1]));

  useEffect(() => {
    if (MAPBOX_PUBLIC_TOKEN) {
      Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
    }
  }, []);

  useEffect(() => {
    if (visible && initialCoords) {
      const c = clampToZamboanga([
        initialCoords.longitude ?? initialCoords.lng ?? initialCoords[0] ?? ZAMBOANGA_WMSU[0],
        initialCoords.latitude ?? initialCoords.lat ?? initialCoords[1] ?? ZAMBOANGA_WMSU[1],
      ], ZAMBOANGA_WMSU);
      setPinnedCoords(c);
      setNearestBarangay(getNearestBarangay(c[0], c[1]));
    }
  }, [visible, initialCoords]);

  const updateLocationDetails = useCallback(async (lng, lat) => {
    const clamped = clampToZamboanga([lng, lat], ZAMBOANGA_WMSU);
    setPinnedCoords(clamped);
    const bg = getNearestBarangay(clamped[0], clamped[1]);
    setNearestBarangay(bg);
  }, []);

  const handleMapPress = useCallback((feature) => {
    const coords = feature?.geometry?.coordinates;
    if (coords && coords.length >= 2) {
      updateLocationDetails(coords[0], coords[1]);
    }
  }, [updateLocationDetails]);

  const handleCameraChanged = useCallback((state) => {
    const center = state?.properties?.center;
    if (center && center.length >= 2) {
      updateLocationDetails(center[0], center[1]);
    }
  }, [updateLocationDetails]);

  const handleRecenter = () => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: 15,
        animationDuration: 500,
      });
      updateLocationDetails(initialCenter[0], initialCenter[1]);
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirmPin === 'function') {
      onConfirmPin({
        latitude: pinnedCoords[1],
        longitude: pinnedCoords[0],
      }, nearestBarangay);
    }
    onClose?.();
  };

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        {/* Top Floating Control Bar */}
        <View
          style={{
            position: 'absolute',
            top: Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top,
            left: 16,
            right: 16,
            zIndex: 50,
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          }}
        >
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              📍 Pin Hazard Location
            </Text>
            <Text style={{ fontSize: 11, color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 2 }}>
              Drag or tap map to position pin.
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close Map Pin Picker"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Mapbox Map */}
        <Mapbox.MapView
          style={{ flex: 1 }}
          styleURL={Mapbox.StyleURL.Dark}
          onPress={handleMapPress}
          onCameraChanged={handleCameraChanged}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            centerCoordinate={pinnedCoords}
            zoomLevel={15}
            minZoomLevel={11}
            maxZoomLevel={19}
            animationMode="flyTo"
            animationDuration={600}
          />

          {/* Fixed Center Point Annotation Marker */}
          <Mapbox.PointAnnotation
            id="incident-selected-pin"
            coordinate={pinnedCoords}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#ef4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                  elevation: 10,
                }}
              >
                <MapPin size={24} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#ffffff',
                  marginTop: 2,
                }}
              />
            </View>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>

        {/* Center Crosshair Reference Guide */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: [{ translateX: -16 }, { translateY: -32 }],
            zIndex: 40,
          }}
        >
          <Crosshair size={32} color="rgba(248, 113, 113, 0.4)" />
        </View>

        {/* Floating Recenter Button */}
        <TouchableOpacity
          onPress={handleRecenter}
          style={{
            position: 'absolute',
            right: 16,
            bottom: insets.bottom + 140,
            zIndex: 50,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
          }}
          accessibilityLabel="Reset to starting position"
        >
          <Crosshair size={22} color="#38bdf8" />
        </TouchableOpacity>

        {/* Bottom Confirmation Bar */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 10,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#334155' : '#e2e8f0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                Selected Coordinates
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', fontFamily: 'monospace' }}>
                {pinnedCoords[1].toFixed(5)}, {pinnedCoords[0].toFixed(5)}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                Barangay
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#38bdf8' }}>
                {nearestBarangay}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#0284c7',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: '#0284c7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Check size={20} color="#ffffff" strokeWidth={2.5} />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
              Confirm Pin Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
