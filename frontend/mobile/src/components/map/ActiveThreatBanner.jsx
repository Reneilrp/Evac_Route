import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Phone, AlertTriangle, ShieldAlert, CheckCircle2, X, Navigation } from 'lucide-react-native';

export default function ActiveThreatBanner({
  insets,
  isRouteBlocked,
  styles,
  colors,
  callEmergencyHotline,
  showAlertBanner,
  activeSiegeThreat,
  isShelterNearbyForSiege,
  distanceKm,
  distanceMeters,
  nearestShelter,
  handleOneClickEvacuate,
  activeTargetShelter,
  setDismissedAlertKey,
  activeAlertKey,
  activeDisasterNearUser,
  geofencePrompt,
  setGeofencePrompt,
  dismissedSheltersRef,
  isGeofenceCheckingIn,
  handleConfirmGeofenceCheckIn,
}) {
  return (
    <>
      {/* ─── Critical Overlay ─── */}
      {isRouteBlocked && (
        <View style={styles.criticalOverlay}>
          <Text style={styles.criticalTitle}>
            CRITICAL ACTION REQUIRED: No safe overland evacuation routes available for your current transportation mode. Move to the highest accessible level immediately and broadcast an emergency rescue signal.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={callEmergencyHotline}>
            <Phone color={colors.white} size={20} />
            <Text style={styles.emergencyButtonText}>Call Emergency Hotline</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Siege / War / Armed Threat Smart Safety Protocol Banner ─── */}
      {showAlertBanner && activeSiegeThreat && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: isShelterNearbyForSiege ? '#064e3b' : '#7f1d1d',
          borderRadius: 16,
          padding: 14,
          borderWidth: 2,
          borderColor: isShelterNearbyForSiege ? '#10b981' : '#ef4444',
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <AlertTriangle color="#ffffff" size={18} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13, flex: 1 }}>
                  {isShelterNearbyForSiege 
                    ? `🛡️ NEARBY SECURE SHELTER AVAILABLE (${distanceKm} km)` 
                    : `🔒 ARMED THREAT / SIEGE: SHELTER IN PLACE`}
                </Text>
              </View>

              {isShelterNearbyForSiege ? (
                <Text style={{ color: '#d1fae5', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                  A secured evacuation center (<Text style={{ fontWeight: '900', color: '#ffffff' }}>{nearestShelter?.name}</Text>) is nearby ({distanceKm} km). Proceed immediately using the safest path.
                </Text>
              ) : (
                <Text style={{ color: '#fef2f2', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                  ⚠️ Nearest shelter is <Text style={{ fontWeight: '900', color: '#ffffff' }}>TOO FAR ({distanceKm} km)</Text>. <Text style={{ fontWeight: '900', color: '#fbbf24' }}>Lock all doors & windows</Text>, turn off lights, stay away from exterior glass, and remain low indoors until security forces arrive.
                </Text>
              )}

              {/* One-Click Navigation Action Button */}
              <TouchableOpacity
                onPress={() => handleOneClickEvacuate(nearestShelter)}
                style={{
                  backgroundColor: isShelterNearbyForSiege ? '#059669' : '#b91c1c',
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: isShelterNearbyForSiege ? 'rgba(52, 211, 153, 0.5)' : 'rgba(248, 113, 113, 0.5)',
                  shadowColor: isShelterNearbyForSiege ? '#059669' : '#b91c1c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <ShieldAlert color="#ffffff" size={16} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>
                  {isShelterNearbyForSiege
                    ? `⚡ ONE-CLICK SAFE NAVIGATE (${distanceKm} km)`
                    : `🔒 VIEW STAY INSIDE SAFETY ADVICE (${distanceKm} km)`}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setDismissedAlertKey(activeAlertKey)} style={{ padding: 4, marginLeft: 8 }}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Disaster Proximity Recommendation Banner ─── */}
      {showAlertBanner && !activeSiegeThreat && activeDisasterNearUser && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: '#c2410c',
          borderRadius: 16,
          padding: 14,
          borderWidth: 2,
          borderColor: '#fb923c',
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <AlertTriangle color="#ffffff" size={18} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13, flex: 1 }}>
                  🚨 DISASTER NEAR YOU: {activeDisasterNearUser.name?.toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: '#fff7ed', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                Hazard inside location radius ({distanceKm} km to {activeTargetShelter?.name || 'Nearest Shelter'}).
              </Text>
              <TouchableOpacity
                onPress={() => handleOneClickEvacuate(activeTargetShelter)}
                style={{
                  backgroundColor: '#ea580c',
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Navigation color="#ffffff" size={15} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>
                  ⚡ ONE-CLICK NAVIGATE TO SHELTER ({distanceKm} km)
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setDismissedAlertKey(activeAlertKey)} style={{ padding: 4, marginLeft: 8 }}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Automated Geofence Arrival Proximity Banner ─── */}
      {geofencePrompt && (
        <View style={{
          position: 'absolute',
          top: Math.max(insets.top + 60, 105),
          left: 16,
          right: 16,
          zIndex: 999,
          backgroundColor: '#0f172a',
          borderRadius: 16,
          padding: 14,
          borderWidth: 2,
          borderColor: '#22c55e',
          elevation: 12,
          shadowColor: '#22c55e',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={{ backgroundColor: '#15803d', padding: 7, borderRadius: 10 }}>
              <CheckCircle2 color="#ffffff" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#86efac', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>
                GEOFENCE PROXIMITY DETECTED ({geofencePrompt.distanceMeters}M)
              </Text>
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>
                {geofencePrompt.shelter.name}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 12, lineHeight: 16 }}>
            You have arrived at this shelter perimeter. Would you like to automatically register your family headcount to secure accommodations and CSWDO relief supplies?
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#22c55e',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
              onPress={() => handleConfirmGeofenceCheckIn(geofencePrompt.shelter)}
              disabled={isGeofenceCheckingIn}
            >
              {isGeofenceCheckingIn ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CheckCircle2 color="#ffffff" size={16} />
                  <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13 }}>CONFIRM CHECK-IN</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: '#334155',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                dismissedSheltersRef.current.add(geofencePrompt.shelter.id);
                setGeofencePrompt(null);
              }}
              disabled={isGeofenceCheckingIn}
            >
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Passing By</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </>
  );
}
