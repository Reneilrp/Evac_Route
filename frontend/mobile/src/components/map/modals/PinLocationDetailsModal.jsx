import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, Platform } from 'react-native';
import { User, Home, X } from 'lucide-react-native';
import { triggerCasualHaptic } from '../../../utils/haptics';

/**
 * Pin Location Details Modal (You & Home registered origin)
 */
export default function PinLocationDetailsModal({
  activePinDetails,
  onClose,
  activeUserLocation,
  homeLocation,
  homeDistanceKm,
  user,
  transportationMode,
  onRecenterOnMe,
  onNavigateToQR,
  onRepinHomeAddress,
  onCenterOnHome,
}) {
  if (!activePinDetails) return null;

  return (
    <Modal
      visible={activePinDetails !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(2, 6, 23, 0.75)',
          justifyContent: 'flex-end',
          paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          paddingHorizontal: 16,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: '#38bdf8',
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 20,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header with Icon, Title, and Close Button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#0284c7',
                borderWidth: 2,
                borderColor: '#38bdf8',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {activePinDetails === 'user' ? (
                  <User size={22} color="#ffffff" strokeWidth={2.5} />
                ) : (
                  <Home size={22} color="#ffffff" strokeWidth={2.5} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>
                  {activePinDetails === 'user' ? 'YOU (CURRENT LOCATION)' : 'HOME (REGISTERED RESIDENCE)'}
                </Text>
                <Text style={{ color: '#38bdf8', fontSize: 11.5, fontWeight: '700', marginTop: 1 }}>
                  {activePinDetails === 'user' ? '📍 Live Real-Time GPS Tracking' : '🏠 Primary Evacuation Origin'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Content Details */}
          {activePinDetails === 'user' ? (
            <View style={{ gap: 10, marginBottom: 18 }}>
              <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                <Text style={{ color: '#e0f2fe', fontSize: 12.5, lineHeight: 18 }}>
                  Your live GPS coordinates update automatically as you move. Routes and shelter travel times adapt in real time.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>GPS Coordinates:</Text>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                  {activeUserLocation ? `${activeUserLocation[1].toFixed(5)}, ${activeUserLocation[0].toFixed(5)}` : 'Detecting...'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Barangay Area:</Text>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  {user?.family_profile?.barangay || user?.barangay || 'Zamboanga City'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Travel Mode:</Text>
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>
                  {transportationMode === 'pedestrian' ? '🚶 Walking' : transportationMode === '2_wheel' ? '🏍️ 2-Wheel (Bike/Motor)' : '🚗 4-Wheel (Car/Vehicle)'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10, marginBottom: 18 }}>
              <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                <Text style={{ color: '#e0f2fe', fontSize: 12.5, lineHeight: 18 }}>
                  This is your saved household address. If physical GPS is unavailable, EvacRoute uses this point as your evacuation starting location.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Barangay / Address:</Text>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  {user?.family_profile?.barangay || user?.barangay || 'Zamboanga City'}
                </Text>
              </View>

              {homeDistanceKm && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Distance from You:</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>
                    {homeDistanceKm} km away
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>Coordinates:</Text>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                  {homeLocation ? `${homeLocation[1].toFixed(5)}, ${homeLocation[0].toFixed(5)}` : 'Not set'}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {activePinDetails === 'user' ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onRecenterOnMe?.();
                    triggerCasualHaptic(50);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#0284c7',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>🎯 Re-center On Me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onNavigateToQR?.();
                    triggerCasualHaptic(50);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>📱 View QR Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onRepinHomeAddress?.();
                    triggerCasualHaptic(60);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#0284c7',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>📍 Re-pin Home Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onCenterOnHome?.();
                    triggerCasualHaptic(50);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>🎯 Center on Home</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
