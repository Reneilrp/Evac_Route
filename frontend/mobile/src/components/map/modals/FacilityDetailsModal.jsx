import React from 'react';
import { View, Text, TouchableOpacity, Animated, Vibration } from 'react-native';
import { X, Navigation, CheckCircle2 } from 'lucide-react-native';

export default function FacilityDetailsModal({
  selectedFacilityDetails,
  setSelectedFacilityDetails,
  sheetHeightRef,
  triggerCasualHaptic,
  isDarkMode,
  colors,
  handleOneClickEvacuate,
  shelters,
  setGeofencePrompt,
  showSituationBrief,
  setShowSituationBrief,
  hazards,
}) {
  return (
    <>
      {/* ─── REV-03: Facility Details Card Modal Overlay ─── */}
      {selectedFacilityDetails && (
        <Animated.View style={{
          position: 'absolute',
          bottom: Animated.add(sheetHeightRef.current, 16),
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          zIndex: 48,
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>
                {selectedFacilityDetails.facility_type === 'safe_zone' ? '🛡️' :
                 selectedFacilityDetails.facility_type === 'assembly_point' ? '🚩' :
                 selectedFacilityDetails.facility_type === 'police_station' || selectedFacilityDetails.facility_type === 'military_base' ? '👮' :
                 selectedFacilityDetails.facility_type === 'hospital' ? '🏥' : '🏠'}
              </Text>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15, flex: 1 }} numberOfLines={1}>
                {selectedFacilityDetails.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFacilityDetails(null)} style={{ padding: 4 }}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <Text style={{ backgroundColor: '#1e293b', color: '#38bdf8', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
              {(selectedFacilityDetails.facility_type || 'Evacuation Center').replace('_', ' ').toUpperCase()}
            </Text>
            {selectedFacilityDetails.elevation_meters && (
              <Text style={{ backgroundColor: '#14532d', color: '#4ade80', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
                ⛰️ {selectedFacilityDetails.elevation_meters}m Elevation
              </Text>
            )}
            <Text style={{ backgroundColor: selectedFacilityDetails.current_occupancy > selectedFacilityDetails.max_capacity ? '#b91c1c' : selectedFacilityDetails.status === 'open' ? '#14532d' : '#7f1d1d', color: '#ffffff', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
              {selectedFacilityDetails.current_occupancy > selectedFacilityDetails.max_capacity 
                ? `⚠️ OVERFLOW (${selectedFacilityDetails.current_occupancy}/${selectedFacilityDetails.max_capacity})` 
                : selectedFacilityDetails.status?.toUpperCase() || 'OPEN'}
            </Text>
          </View>

          {selectedFacilityDetails.transport_schedule && (
            <View style={{ backgroundColor: '#1e1b4b', padding: 8, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: 'bold' }}>
                🚍 Transport Pickup: {selectedFacilityDetails.transport_schedule}
              </Text>
            </View>
          )}

          {selectedFacilityDetails.amenities && (
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 12 }}>
              📦 Amenities: {selectedFacilityDetails.amenities}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                const target = selectedFacilityDetails;
                setSelectedFacilityDetails(null);
                if (target) {
                  handleOneClickEvacuate(target);
                }
              }}
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Navigation color="#ffffff" size={16} />
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                Route to Shelter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const target = selectedFacilityDetails;
                if (!target) return;
                triggerCasualHaptic(40);
                setGeofencePrompt({
                  shelter: target,
                  distanceMeters: 45,
                });
                Vibration.vibrate([0, 80, 50, 80]);
                setSelectedFacilityDetails(null);
              }}
              style={{
                backgroundColor: '#16a34a',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
              accessibilityLabel="Simulate arrival within 80 meters geofence"
            >
              <CheckCircle2 color="#ffffff" size={16} />
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                ⚡ Simulate Arrival
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ─── Emergency Situation Briefing Modal ─── */}
      {showSituationBrief && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1.5,
          borderColor: isDarkMode ? '#38bdf8' : colors.primary,
          zIndex: 60,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.5 : 0.15,
          shadowRadius: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: isDarkMode ? '#38bdf8' : colors.primary, fontSize: 14, fontWeight: '900' }}>📍 ZAMBOANGA EMERGENCY BRIEFING</Text>
            <TouchableOpacity onPress={() => setShowSituationBrief(false)}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', padding: 10, borderRadius: 10, borderWidth: isDarkMode ? 0 : 1, borderColor: 'rgba(0,0,0,0.06)' }}>
              <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                ⭐ {shelters.filter(s => s.type === 'primary').length} Primary Clusters & 🏠 {shelters.filter(s => s.type === 'secondary').length} Secondary Courts
              </Text>
              <Text style={{ color: isDarkMode ? '#cbd5e1' : colors.textSecondary, fontSize: 11 }}>
                Primary clusters are fully-equipped disaster hubs. Secondary courts open during overflow.
              </Text>
            </View>

            <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', padding: 10, borderRadius: 10, borderWidth: isDarkMode ? 0 : 1, borderColor: 'rgba(0,0,0,0.06)' }}>
              <Text style={{ color: hazards.length > 0 ? (isDarkMode ? '#f87171' : '#dc2626') : (isDarkMode ? '#38bdf8' : colors.primary), fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                ⚠️ Active Hazard Zones: {hazards.length} Detected
              </Text>
              {hazards.length > 0 ? (
                hazards.map((h, idx) => (
                  <Text key={idx} style={{ color: isDarkMode ? '#fca5a5' : '#b91c1c', fontSize: 11, marginVertical: 1 }}>
                    • {h.name || 'Hazard Zone'} ({h.hazard_type} - {h.severity_level || 'moderate'})
                  </Text>
                ))
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>No critical active hazards reported nearby.</Text>
              )}
            </View>
          </View>
        </View>
      )}

    </>
  );
}
