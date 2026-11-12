import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Activity } from 'lucide-react-native';
import { triggerCasualHaptic } from '../../../utils/haptics';

/**
 * Earthquake Warning Broadcast & Epicenter Modal
 */
export default function EarthquakeWarningModal({
  visible,
  onDismiss,
  activeEarthquakeHazard,
}) {
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
          borderColor: '#eab308',
          padding: 22,
          shadowColor: '#eab308',
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
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              borderWidth: 2,
              borderColor: '#eab308',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}>
              <Activity size={36} color="#eab308" />
            </View>
            <Text style={{ color: '#eab308', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
              EMERGENCY BROADCAST ALERT
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 19, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
              🚨 EARTHQUAKE DETECTED
            </Text>
          </View>

          {/* Epicenter Coordinates Card */}
          <View style={{
            backgroundColor: 'rgba(234, 179, 8, 0.12)',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(234, 179, 8, 0.35)',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#fef08a', fontSize: 12, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 }}>
              📍 EPICENTER LOCATION COORDINATES
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>
              Latitude: {parseFloat(activeEarthquakeHazard?.latitude || 0).toFixed(4)}° N
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
              Longitude: {parseFloat(activeEarthquakeHazard?.longitude || 0).toFixed(4)}° E
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 11.5, marginTop: 4 }}>
              Zone: {activeEarthquakeHazard?.name || 'Zamboanga Fault Line'} (Radius: {activeEarthquakeHazard?.radius_meters || 450}m)
            </Text>
          </View>

          {/* Safety Directives */}
          <View style={{
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            marginBottom: 20,
          }}>
            <Text style={{ color: '#eab308', fontSize: 11.5, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 }}>
              IMMEDIATE LIFE-SAFETY DIRECTIVES:
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 17 }}>
              • <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>DUCK, COVER & HOLD</Text> under a sturdy desk or table.{'
'}
              • Stay away from tall buildings, power lines, and falling glass.{'
'}
              • If indoors, do NOT use elevators. Evacuate to open assembly points once tremors stop.
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={() => {
              onDismiss();
              triggerCasualHaptic(40);
            }}
            style={{
              backgroundColor: '#eab308',
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#eab308',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
              ✓ Acknowledge & Stay Safe
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
