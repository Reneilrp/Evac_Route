import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Activity, AlertCircle } from 'lucide-react-native';
import { triggerCasualHaptic } from '../../../utils/haptics';

/**
 * Earthquake Warning Broadcast & Epicenter Modal
 * Supports 3 guidance tiers:
 * - 'emergency': Nearby strong event -> Immediate Duck, Cover & Hold
 * - 'advisory': Distant event -> Expect light tremors/swaying
 * - 'informational': Logged only
 */
export default function EarthquakeWarningModal({
  visible,
  onDismiss,
  activeEarthquakeHazard,
}) {
  const distKm = parseFloat(activeEarthquakeHazard?.distance_km ?? 0);
  const isAdvisory = activeEarthquakeHazard?.guidance_tier === 'advisory'
    || (!activeEarthquakeHazard?.guidance_tier && distKm > 40.0);

  const themeColor = isAdvisory ? '#f59e0b' : '#ef4444';
  const themeBgSubtle = isAdvisory ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.18)';
  const themeBorderSubtle = isAdvisory ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.45)';
  const themeText = isAdvisory ? '#fde047' : '#fca5a5';

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
              {isAdvisory ? (
                <AlertCircle size={36} color={themeColor} />
              ) : (
                <Activity size={36} color={themeColor} />
              )}
            </View>
            <Text style={{ color: themeColor, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
              {isAdvisory ? 'SEISMIC ADVISORY BROADCAST' : 'EMERGENCY LIFE-SAFETY ALERT'}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
              {isAdvisory ? '🟡 DISTANT QUAKE: EXPECT TREMORS' : '🚨 CRITICAL: EARTHQUAKE DETECTED'}
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
                  MAGNITUDE {Number(activeEarthquakeHazard.magnitude).toFixed(1)} • {isAdvisory ? 'EXPECT TREMORS' : (activeEarthquakeHazard.severity?.toUpperCase() || 'STRONG SHAKING')}
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

          {/* Safety Directives (Tailored by Tier) */}
          <View style={{
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: themeBorderSubtle,
            marginBottom: 18,
          }}>
            <Text style={{ color: themeColor, fontSize: 11.5, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 }}>
              {isAdvisory ? 'SEISMIC ADVISORY DIRECTIVES:' : 'IMMEDIATE LIFE-SAFETY DIRECTIVES:'}
            </Text>
            {isAdvisory ? (
              <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: '#fef08a', fontWeight: 'bold' }}>EXPECT LIGHT TREMORS OR SWAYING</Text> due to distant seismic energy.{'\n'}
                • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Duck, Cover & Hold is NOT currently needed</Text> unless tremors intensify.{'\n'}
                • Check immediate surroundings for unstable items and monitor official DRRM bulletins.
              </Text>
            ) : (
              <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>DUCK, COVER & HOLD</Text> under a sturdy desk or table immediately.{'\n'}
                • Stay away from tall buildings, power lines, and falling glass.{'\n'}
                • If indoors, do NOT use elevators. Evacuate to open assembly points once tremors stop.
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={() => {
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
            <Text style={{ color: isAdvisory ? '#0f172a' : '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
              {isAdvisory ? '✓ Acknowledge Seismic Advisory' : '✓ Acknowledge & Stay Safe'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
