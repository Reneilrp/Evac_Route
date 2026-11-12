import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { triggerCasualHaptic } from '../../../utils/haptics';

/**
 * Destination Near Siege / Disaster Warning Modal
 */
export default function DestinationProximityModal({
  visible,
  onClose,
  targetFacility,
  hazardInfo,
  onProceedAnyway,
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#0f172a',
          borderRadius: 24,
          padding: 24,
          borderWidth: 2,
          borderColor: '#ef4444',
          elevation: 20,
          shadowColor: '#ef4444',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 15,
        }}>
          {/* Header Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#ef4444',
            }}>
              <AlertTriangle size={36} color="#ef4444" />
            </View>
          </View>

          {/* Title */}
          <Text style={{
            color: '#ffffff',
            fontSize: 17,
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: 8,
            letterSpacing: 0.5,
          }}>
            ⚠️ DESTINATION NEAR DISASTER ZONE
          </Text>

          {/* Warning Text */}
          <Text style={{
            color: '#cbd5e1',
            fontSize: 13.5,
            lineHeight: 20,
            textAlign: 'center',
            marginBottom: 16,
          }}>
            You are currently in a safe area, but your target{' '}
            <Text style={{ color: '#f87171', fontWeight: 'bold' }}>
              {targetFacility?.name || 'Destination'}
            </Text>{' '}
            is located within{' '}
            <Text style={{ color: '#f87171', fontWeight: 'bold' }}>
              {hazardInfo?.distToDest || 0}m
            </Text>{' '}
            of an active{' '}
            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>
              {hazardInfo?.hazard?.name || hazardInfo?.hazard?.hazard_type || 'Disaster Zone'}
            </Text>{' '}
            (radius: {hazardInfo?.rad || 150}m).
          </Text>

          {/* Recommendations */}
          <View style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            marginBottom: 20,
          }}>
            <Text style={{ color: '#fca5a5', fontSize: 11.5, fontWeight: '700', marginBottom: 4 }}>
              RECOMMENDED SAFETY ACTIONS:
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: 11.5, lineHeight: 16 }}>
              {`• Reroute to a safe shelter located further away from the threat zone.\n• Follow official LGU DRRM emergency directives.`}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                triggerCasualHaptic(40);
              }}
              style={{
                backgroundColor: '#334155',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#475569',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                onProceedAnyway?.();
                triggerCasualHaptic(60);
              }}
              style={{
                backgroundColor: 'transparent',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: '#ef4444',
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '800' }}>
                ⚠️ Proceed Anyway
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
