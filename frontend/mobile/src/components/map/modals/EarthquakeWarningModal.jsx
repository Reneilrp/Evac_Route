import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Activity, AlertCircle, Waves, ShieldCheck } from 'lucide-react-native';
import { triggerCasualHaptic } from '../../../utils/haptics';

const COASTAL_BARANGAYS = [
  'campo islam', 'baliwasan', 'mariki', 'rio hondo', 'zone i', 'zone ii', 'zone iii', 'zone iv',
  'san jose gusu', 'san jose cawa-cawa', 'cawa-cawa', 'sinunuc', 'ayala', 'recodo', 'cawit',
  'maasin', 'labuan', 'limpapa', 'talon-talon', 'mampang', 'arena blanco', 'mercedes',
  'bolong', 'sangali', 'curuan', 'manicahan', 'vitali'
];

/**
 * Earthquake Warning Broadcast & Epicenter Modal
 * Supports:
 * - 'tsunami': Offshore event with Tsunami threat (Adaptive: Coastal Evac vs Inland Safe)
 * - 'emergency': Nearby strong event -> Immediate Duck, Cover & Hold
 * - 'advisory': Distant event -> Expect light tremors/swaying
 * - 'informational': Logged only
 */
export default function EarthquakeWarningModal({
  visible,
  onDismiss,
  activeEarthquakeHazard,
  activeUserLocation,
  userLocation,
  userBarangay,
  onRouteToHighGround,
}) {
  const distKm = parseFloat(activeEarthquakeHazard?.distance_km ?? 0);
  const isTsunami = Boolean(activeEarthquakeHazard?.tsunami_threat || activeEarthquakeHazard?.tsunami === 1);
  const isAdvisory = !isTsunami && (
    activeEarthquakeHazard?.guidance_tier === 'advisory'
    || (!activeEarthquakeHazard?.guidance_tier && distKm > 40.0)
  );

  // Determine if current user is within coastal vulnerability zone
  const isUserInCoastalZone = useMemo(() => {
    if (userBarangay) {
      const normalized = String(userBarangay).toLowerCase().trim();
      if (COASTAL_BARANGAYS.some(b => normalized.includes(b))) return true;
    }
    // Handle both [lng, lat] coordinate array and { latitude, longitude } object
    const lat = Array.isArray(activeUserLocation)
      ? activeUserLocation[1]
      : (activeUserLocation?.latitude ?? userLocation?.latitude);

    if (lat != null && !isNaN(lat)) {
      return lat < 6.915;
    }
    // Default safe fallback if location unavailable
    return false;
  }, [userBarangay, activeUserLocation, userLocation]);

  const themeColor = isTsunami
    ? (isUserInCoastalZone ? '#ef4444' : '#0284c7')
    : (isAdvisory ? '#f59e0b' : '#ef4444');

  const themeBgSubtle = isTsunami
    ? (isUserInCoastalZone ? 'rgba(239, 68, 68, 0.18)' : 'rgba(2, 132, 199, 0.18)')
    : (isAdvisory ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.18)');

  const themeBorderSubtle = isTsunami
    ? (isUserInCoastalZone ? 'rgba(239, 68, 68, 0.45)' : 'rgba(2, 132, 199, 0.45)')
    : (isAdvisory ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.45)');

  const themeText = isTsunami
    ? (isUserInCoastalZone ? '#fca5a5' : '#7dd3fc')
    : (isAdvisory ? '#fde047' : '#fca5a5');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.90)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#0f172a',
          borderRadius: 24,
          borderWidth: 2,
          borderColor: themeColor,
          padding: 22,
          shadowColor: themeColor,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 15,
        }}>
          {/* Header Icon + Title */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: themeBgSubtle,
              borderWidth: 2,
              borderColor: themeColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}>
              {isTsunami ? (
                isUserInCoastalZone ? <Waves size={36} color={themeColor} /> : <ShieldCheck size={36} color={themeColor} />
              ) : isAdvisory ? (
                <AlertCircle size={36} color={themeColor} />
              ) : (
                <Activity size={36} color={themeColor} />
              )}
            </View>
            <Text style={{ color: themeColor, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
              {isTsunami
                ? (isUserInCoastalZone ? '🚨 CRITICAL COASTAL TSUNAMI EVACUATION' : 'ℹ️ REGIONAL TSUNAMI ADVISORY')
                : (isAdvisory ? 'SEISMIC ADVISORY BROADCAST' : 'EMERGENCY LIFE-SAFETY ALERT')}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
              {isTsunami
                ? (isUserInCoastalZone ? '🌊 EVACUATE INLAND: TSUNAMI THREAT' : '🛡️ YOU ARE IN AN INLAND SAFE ZONE')
                : (isAdvisory ? '🟡 DISTANT QUAKE: EXPECT TREMORS' : '🚨 CRITICAL: EARTHQUAKE DETECTED')}
            </Text>
            {activeEarthquakeHazard?.magnitude != null && (
              <View style={{
                backgroundColor: themeBgSubtle,
                borderColor: themeColor,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 3,
                borderRadius: 999,
                marginTop: 6,
              }}>
                <Text style={{
                  color: themeText,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                }}>
                  MAGNITUDE {Number(activeEarthquakeHazard.magnitude).toFixed(1)} • {isTsunami ? 'OFFSHORE SEISMIC EVENT' : (isAdvisory ? 'EXPECT TREMORS' : (activeEarthquakeHazard.severity?.toUpperCase() || 'STRONG SHAKING'))}
                </Text>
              </View>
            )}
            {activeEarthquakeHazard?.peis_label && (
              <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                {activeEarthquakeHazard.peis_label}
              </Text>
            )}
          </View>

          {/* Epicenter Coordinates Card */}
          <View style={{
            backgroundColor: themeBgSubtle,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: themeBorderSubtle,
            marginBottom: 14,
          }}>
            <Text style={{ color: themeText, fontSize: 12, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 }}>
              📍 EPICENTER LOCATION & TELEMETRY
            </Text>
            {(() => {
              const latNum = parseFloat(activeEarthquakeHazard?.latitude ?? activeEarthquakeHazard?.lat);
              const lngNum = parseFloat(activeEarthquakeHazard?.longitude ?? activeEarthquakeHazard?.lng ?? activeEarthquakeHazard?.lon);
              const hasValidLat = !isNaN(latNum) && latNum !== 0;
              const hasValidLng = !isNaN(lngNum) && lngNum !== 0;

              return (
                <>
                  <Text style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 'bold' }}>
                    Coordinates: {hasValidLat ? `${Math.abs(latNum).toFixed(4)}° ${latNum >= 0 ? 'N' : 'S'}` : 'Detecting...'}, {hasValidLng ? `${Math.abs(lngNum).toFixed(4)}° ${lngNum >= 0 ? 'E' : 'W'}` : ''}
                  </Text>
                </>
              );
            })()}
            {activeEarthquakeHazard?.depth_km != null && (
              <Text style={{ color: '#e2e8f0', fontSize: 12.5, fontWeight: '600', marginTop: 3 }}>
                Depth: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{activeEarthquakeHazard.depth_km} km</Text>
              </Text>
            )}
            {activeEarthquakeHazard?.distance_km != null && (
              <Text style={{ color: isAdvisory ? '#fef08a' : '#38bdf8', fontSize: 13, fontWeight: '800', marginTop: 3 }}>
                Distance: {activeEarthquakeHazard.distance_km} km from Zamboanga City
              </Text>
            )}
            <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4, lineHeight: 16 }}>
              Location: {activeEarthquakeHazard?.name || 'Zamboanga Regional Epicenter Zone'}
            </Text>
            {activeEarthquakeHazard?.source && (
              <Text style={{ color: '#94a3b8', fontSize: 10.5, marginTop: 4, fontStyle: 'italic' }}>
                Feed: {activeEarthquakeHazard.source}
              </Text>
            )}
          </View>

          {/* Safety Directives (Tailored by Tsunami / Tier / Zone) */}
          <View style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: themeBorderSubtle,
            marginBottom: 18,
          }}>
            <Text style={{ color: themeColor, fontSize: 11.5, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 }}>
              {isTsunami
                ? (isUserInCoastalZone ? '🚨 IMMEDIATE COASTAL DIRECTIVES:' : '🛡️ INLAND SAFETY GUIDANCE:')
                : (isAdvisory ? 'SEISMIC ADVISORY DIRECTIVES:' : 'IMMEDIATE LIFE-SAFETY DIRECTIVES:')}
            </Text>
            {isTsunami ? (
              isUserInCoastalZone ? (
                <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                  • <Text style={{ color: '#fca5a5', fontWeight: 'bold' }}>EVACUATE INLAND IMMEDIATELY</Text> to higher ground ({'KCC Mall / Gov. Camins and above'}).{'\n'}
                  • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Do NOT stay at the shoreline</Text> or wait to observe receding sea water.{'\n'}
                  • Stay away from beaches, ports, and river mouths flowing into the sea.
                </Text>
              ) : (
                <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                  • <Text style={{ color: '#7dd3fc', fontWeight: 'bold' }}>YOU ARE IN AN INLAND SAFE ZONE</Text> ({'>15m elevation'}).{'\n'}
                  • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Do NOT drive towards coastal areas</Text> or the port.{'\n'}
                  • Keep primary evacuation routes clear for emergency responders and coastal evacuees.
                </Text>
              )
            ) : isAdvisory ? (
              <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: '#fef08a', fontWeight: 'bold' }}>EXPECT LIGHT TREMORS OR SWAYING</Text> due to distant seismic energy.{'\n'}
                • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Duck, Cover & Hold is NOT currently needed</Text> unless tremors intensify.{'\n'}
                • Check immediate surroundings for unstable items and monitor official DRRM bulletins.
              </Text>
            ) : (
              <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>DUCK, COVER & HOLD</Text> under a sturdy desk or table immediately.{'\n'}
                • Stay away from tall buildings, power lines, and falling glass.{'\n'}
                • Evacuate to open assembly fields once tremors stop. Avoid covered courts and buildings.
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={() => {
              if (isTsunami && isUserInCoastalZone && onRouteToHighGround) {
                onRouteToHighGround();
              }
              onDismiss();
              triggerCasualHaptic(40);
            }}
            style={{
              backgroundColor: themeColor,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: themeColor,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text style={{ color: isAdvisory || (!isUserInCoastalZone && isTsunami) ? '#ffffff' : '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
              {isTsunami
                ? (isUserInCoastalZone ? '🏃 Evacuate Inland to High Ground' : '✓ Acknowledge & Keep Roads Clear')
                : (isAdvisory ? '✓ Acknowledge Seismic Advisory' : '✓ Acknowledge & Stay Safe')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
