import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';

/**
 * Custom styled Armed Threat: Shelter In Place Modal
 */
export default function ShelterInPlaceModal({
  visible,
  onClose,
  activeSiegeThreat,
  onOverrideNavigate,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
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
          borderColor: '#ef4444',
          padding: 22,
          shadowColor: '#ef4444',
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
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 2,
              borderColor: '#ef4444',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}>
              <ShieldAlert size={34} color="#f87171" />
            </View>
            <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
              ARMED THREAT SAFETY PROTOCOL
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 4 }}>
              SHELTER IN PLACE
            </Text>
          </View>

          {/* Warning Message Card */}
          <View style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            marginBottom: 16,
          }}>
            <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              ⚠️ DANGEROUS OUTDOOR MOVEMENT DETECTED
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: 12.5, lineHeight: 18, fontWeight: '600' }}>
              Your current location is <Text style={{ color: '#ffffff', fontWeight: '900' }}>INSIDE an active Siege & Crossfire Zone</Text> ({activeSiegeThreat?.name || 'Armed Siege Zone'}). Moving outdoors to reach a shelter exposes you to extreme risk.
            </Text>
          </View>

          {/* Checklist Recommendations */}
          <View style={{ gap: 10, marginBottom: 22 }}>
            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 2 }}>
              WE ADVISE YOU TO STAY INSIDE:
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>🚫</Text>
              <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700', flex: 1 }}>
                Do NOT attempt to go outdoors or evacuate.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700', flex: 1 }}>
                Close and lock all doors, windows, and open areas.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700', flex: 1 }}>
                Turn off lights and stay away from exterior glass.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700', flex: 1 }}>
                Remain low indoors until security forces arrive.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 10 }}>
            {/* Primary Green Action Button: Understand & Stay Inside */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#16a34a',
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: 'rgba(74, 222, 128, 0.4)',
                shadowColor: '#16a34a',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
                ✓ Understand & Stay Inside
              </Text>
            </TouchableOpacity>

            {/* Secondary Red Outline Override Button: Override & Force Navigate */}
            <TouchableOpacity
              onPress={onOverrideNavigate}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(239, 68, 68, 0.4)',
              }}
            >
              <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                ⚠️ Override & Force Navigate
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
