import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Building, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ShelterArrivalModal({
  visible,
  onClose,
  activeMission,
  targetShelterName,
  assignedUnitName,
  onConfirmHandover,
  isPending = false,
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.arrivalModalContent, { backgroundColor: colors.surface || '#1e293b', borderColor: colors.border || '#334155' }]}>
          <View style={[styles.arrivalIconCircle, styles.arrivalIconShelter]}>
            <Building size={32} color="#ffffff" />
          </View>

          <Text style={[styles.arrivalTitle, { color: colors.textPrimary || '#ffffff' }]}>🏢 ARRIVED AT EVACUATION SHELTER (≤ 20M)</Text>
          <Text style={[styles.arrivalSubtitle, { color: colors.textSecondary || '#94a3b8' }]}>
            You have arrived at{' '}
            <Text style={{ fontWeight: '700', color: colors.white || '#ffffff' }}>
              {targetShelterName || 'Baliwasan Gym'}
            </Text>
            . CSWDO intake staff are ready to accept {activeMission?.headcount || 1} evacuees.
          </Text>

          <View style={[styles.arrivalDetailsBox, { backgroundColor: colors.surfaceElevated || '#0f172a' }]}>
            <Text style={[styles.arrivalDetailsLabel, { color: colors.textSecondary || '#94a3b8' }]}>AUTOMATIC CSWDO INTAKE BRIDGE:</Text>
            <Text style={[styles.arrivalDetailsVal, { color: colors.textPrimary || '#ffffff' }]}>
              • Automatically increments shelter occupancy (+{activeMission?.headcount || 1})
            </Text>
            <Text style={[styles.arrivalDetailsVal, { color: colors.textPrimary || '#ffffff' }]}>
              • Registers {activeMission?.victim_name || 'Distress Evacuees'} in CSWDO intake ledger
            </Text>
            <Text style={[styles.arrivalDetailsVal, { color: colors.textPrimary || '#ffffff' }]}>
              • Resets {assignedUnitName || 'Unit'} to STANDBY for next rescue
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.modalActionPrimaryBtn, { backgroundColor: '#10b981' }]}
            onPress={onConfirmHandover}
            disabled={isPending}
          >
            <CheckCircle2 size={18} color={colors.white || '#ffffff'} />
            <Text style={styles.modalActionPrimaryText}>
              CONFIRM CSWDO INTAKE &amp; COMPLETE MISSION
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalActionSecondaryBtn}
            onPress={onClose}
          >
            <Text style={[styles.modalActionSecondaryText, { color: colors.textSecondary || '#94a3b8' }]}>Dismiss for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  arrivalModalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  arrivalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  arrivalIconShelter: {
    backgroundColor: '#0284c7',
  },
  arrivalTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  arrivalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  arrivalDetailsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  arrivalDetailsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  arrivalDetailsVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionPrimaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modalActionPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalActionSecondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
