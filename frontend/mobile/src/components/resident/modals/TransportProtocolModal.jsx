import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Navigation, X, Check } from 'lucide-react-native';

export default function TransportProtocolModal({
  visible,
  onClose,
  colors,
  isDarkMode,
  selectedMode,
  onSelectMode,
  transportOptions = [],
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: colors.modalBackdrop,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          width: '100%',
          maxWidth: 400,
          maxHeight: '85%',
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: colors.primary,
          padding: 20,
          elevation: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Navigation size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>
                  Transportation Mode
                </Text>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                  TACTICAL ROUTING PROTOCOL
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>
            EvacRoute dynamically recalculates safe high-ground detours based on your transport capabilities and vehicle flood wading limits.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
            {transportOptions.map((opt) => {
              const isSelected = selectedMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    onSelectMode(opt.key);
                    onClose();
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isSelected ? (isDarkMode ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.08)') : colors.surface,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                      <View>
                        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '900' }}>
                          {opt.label}
                        </Text>
                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                          {opt.badge}
                        </Text>
                      </View>
                    </View>
                    <View style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                  </View>

                  {/* Operational Protocols */}
                  <View style={{
                    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 10,
                    padding: 10,
                    gap: 4,
                  }}>
                    <Text style={{ color: colors.successLight, fontSize: 11, lineHeight: 15 }}>
                      {opt.pros}
                    </Text>
                    <Text style={{ color: colors.warning, fontSize: 11, lineHeight: 15 }}>
                      {opt.floodWarning}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10.5, lineHeight: 14 }}>
                      {opt.limits}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
