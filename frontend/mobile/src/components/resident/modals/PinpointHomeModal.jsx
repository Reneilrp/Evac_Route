import React from 'react';
import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MapPin, X, Navigation, Check } from 'lucide-react-native';

export default function PinpointHomeModal({
  visible,
  onClose,
  colors,
  homeLocation,
  setHomeLocation,
  homeLatInput,
  setHomeLatInput,
  homeLngInput,
  setHomeLngInput,
  homeBarangay,
  setHomeBarangay,
  homeAddressDesc,
  setHomeAddressDesc,
  isPinpointLoading,
  handleUseCurrentGps,
  handleSaveHomeLocation,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: colors.modalBackdrop,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: colors.primary,
            padding: 22,
            elevation: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>
                    Pinpoint Home Location
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                    ZAMBOANGA CITY RESIDENT
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
              Designate your permanent home coordinate. When GPS is weak during severe weather, EvacRoute routes your family directly from this fixed origin point.
            </Text>

            {/* Quick 1-Tap: Use Current Live GPS */}
            <TouchableOpacity
              onPress={handleUseCurrentGps}
              disabled={isPinpointLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.surface,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.primary,
                marginBottom: 16,
              }}
            >
              {isPinpointLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Navigation size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>
                    Capture Current GPS as Home
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>OR ENTER MANUALLY</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Barangay Input */}
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              Barangay *
            </Text>
            <TextInput
              value={homeBarangay}
              onChangeText={setHomeBarangay}
              placeholder="e.g. Tetuan, Pasonanca, Santa Maria"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.textPrimary,
                fontSize: 13,
                marginBottom: 12,
              }}
            />

            {/* Coordinates Row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  Latitude
                </Text>
                <TextInput
                  value={homeLatInput}
                  onChangeText={setHomeLatInput}
                  placeholder="6.9214"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.textPrimary,
                    fontSize: 13,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                  Longitude
                </Text>
                <TextInput
                  value={homeLngInput}
                  onChangeText={setHomeLngInput}
                  placeholder="122.0790"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.textPrimary,
                    fontSize: 13,
                  }}
                />
              </View>
            </View>

            {/* Address / Landmark */}
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              House / Landmark Description
            </Text>
            <TextInput
              value={homeAddressDesc}
              onChangeText={setHomeAddressDesc}
              placeholder="e.g. Block 4 Lot 12, Near Covered Court"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 14,
                paddingVertical: 10,
                color: colors.textPrimary,
                fontSize: 13,
                marginBottom: 16,
              }}
            />

            {/* Actions */}
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={handleSaveHomeLocation}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900' }}>
                  Save & Lock Home Location
                </Text>
              </TouchableOpacity>

              {homeLocation && (
                <TouchableOpacity
                  onPress={() => {
                    setHomeLocation(null);
                    onClose();
                    Alert.alert('Reset Home Location', 'Home pinpoint removed. App will default to live GPS signal.');
                  }}
                  style={{ backgroundColor: colors.dangerBg, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger }}
                >
                  <Text style={{ color: colors.dangerText, fontSize: 12, fontWeight: '800' }}>Reset to Live GPS Signal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
