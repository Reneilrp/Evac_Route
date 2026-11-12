import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Layers, Navigation } from 'lucide-react-native';

export default function EvacMapControlButtons({
  styles,
  sheetHeightRef,
  isStyleMenuOpen,
  setIsStyleMenuOpen,
  setIsDisasterFilterExpanded,
  setIsFilterExpanded,
  setShowSituationBrief,
  triggerCasualHaptic,
  isHighContrast,
  setIsHighContrast,
  isDarkMode,
  colors,
  mapStyleMode,
  setMapStyleMode,
  currentZoomRef,
  cameraRef,
  activeUserLocation,
  deviceHeading,
  targetShelterCoords,
  getBearing,
}) {
  return (
    <>
      {/* ─── Google Maps Style Layers FAB (floating, bottom-left) ─── */}
      <Animated.View style={{ position: 'absolute', bottom: Animated.add(sheetHeightRef.current, 20), left: 16, zIndex: isStyleMenuOpen ? 50 : 35 }}>
        <TouchableOpacity
          onPress={() => {
            setIsStyleMenuOpen(prev => !prev);
            setIsDisasterFilterExpanded(false);
            setIsFilterExpanded(false);
            setShowSituationBrief(false);
            triggerCasualHaptic(30);
          }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)'),
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isStyleMenuOpen ? colors.primary : (isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)')),
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDarkMode ? 0.3 : 0.15,
            shadowRadius: 4,
          }}
        >
          <Layers size={20} color={isStyleMenuOpen ? colors.primary : colors.textPrimary} />
        </TouchableOpacity>

        {/* Expandable Layer Options Menu */}
        {isStyleMenuOpen && (
          <View style={{
            position: 'absolute',
            bottom: 48,
            left: 0,
            width: 140,
            backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)'),
            borderRadius: 16,
            padding: 6,
            borderWidth: 1,
            borderColor: isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDarkMode ? 0.4 : 0.15,
            shadowRadius: 8,
            gap: 4,
          }}>
            {[
              { key: 'dark',      icon: '🌑', label: 'Dark Mode' },
              { key: 'satellite', icon: '🛰️', label: 'Satellite' },
              { key: 'streets',   icon: '🗺️', label: 'Standard Map' },
            ].map(s => (
              <TouchableOpacity
                key={s.key}
                onPress={() => {
                  setMapStyleMode(s.key);
                  setIsStyleMenuOpen(false);
                  triggerCasualHaptic(30);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: mapStyleMode === s.key ? (isHighContrast ? '#FFFF00' : colors.primary) : 'transparent',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13 }}>{s.icon}</Text>
                <Text style={{
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: mapStyleMode === s.key ? (isHighContrast ? '#000000' : '#ffffff') : colors.textSecondary
                }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      {/* ─── Floating Action Controls (floating, bottom-right) ─── */}
      <Animated.View style={{ position: 'absolute', bottom: Animated.add(sheetHeightRef.current, 20), right: 16, zIndex: 30, gap: 8, alignItems: 'center' }}>
        {/* Zoom In */}
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current) {
              const nextZoom = Math.min(currentZoomRef.current + 1, 20);
              currentZoomRef.current = nextZoom;
              cameraRef.current.setCamera({
                zoomLevel: nextZoom,
                animationDuration: 250,
              });
              triggerCasualHaptic(30);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>

        {/* Zoom Out */}
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current) {
              const nextZoom = Math.max(currentZoomRef.current - 1, 3);
              currentZoomRef.current = nextZoom;
              cameraRef.current.setCamera({
                zoomLevel: nextZoom,
                animationDuration: 250,
              });
              triggerCasualHaptic(30);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>−</Text>
        </TouchableOpacity>

        {/* Recenter & Focus Location Button */}
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current && activeUserLocation) {
              cameraRef.current.setCamera({
                centerCoordinate: activeUserLocation,
                zoomLevel: 15,
                animationDuration: 1000,
              });
              triggerCasualHaptic(50);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Navigation size={18} color={colors.textPrimary} />
        </TouchableOpacity>


        {/* High Contrast Mode Toggle */}
        <TouchableOpacity
          onPress={() => {
            setIsHighContrast(o => !o);
            triggerCasualHaptic(80);
          }}
          style={[
            styles.mapStyleBtn,
            isHighContrast && { backgroundColor: '#FFFF00', borderColor: '#000000', borderWidth: 2 }
          ]}
        >
          <Text style={[
            styles.mapStyleBtnText,
            { color: isHighContrast ? '#000000' : colors.textPrimary },
            isHighContrast && { fontWeight: '900' }
          ]}>
            {isHighContrast ? '👁' : '🕶'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── Compass Heading Widget (floating, top-right) ─── */}
      {activeUserLocation && targetShelterCoords && (
        <View style={{ position: 'absolute', top: 110, right: 16, zIndex: 30, alignItems: 'center' }}>
          <View style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.95)'),
            borderWidth: 2,
            borderColor: isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'),
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDarkMode ? 0.3 : 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Animated.View style={{
              transform: [{
                rotate: `${(getBearing(activeUserLocation[1], activeUserLocation[0], targetShelterCoords[1], targetShelterCoords[0]) - deviceHeading + 360) % 360}deg`
              }]
            }}>
              <Text style={{ fontSize: 22, color: isHighContrast ? '#FFFF00' : colors.primary }}>▲</Text>
            </Animated.View>
          </View>
          <Text style={{
            fontSize: 8,
            fontWeight: '900',
            color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#ffffff' : colors.textPrimary),
            marginTop: 4,
            backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.95)'),
            borderWidth: isHighContrast ? 1 : (isDarkMode ? 0 : 1),
            borderColor: isHighContrast ? '#FFFF00' : (isDarkMode ? 'transparent' : 'rgba(0, 0, 0, 0.1)'),
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            overflow: 'hidden',
            elevation: isDarkMode ? 0 : 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0 : 0.1,
            shadowRadius: 2,
          }}>
            TO SHELTER
          </Text>
        </View>
      )}

    </>
  );
}
