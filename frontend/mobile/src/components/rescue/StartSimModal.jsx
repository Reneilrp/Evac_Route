import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function StartSimModal({
  visible,
  onClose,
  onStartSimulation,
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
        <View style={[styles.startSimModalContent, { backgroundColor: colors.surface || '#1e293b' }]}>
          <View style={styles.startSimIconCircle}>
            <Play size={28} color="#f59e0b" />
          </View>

          <Text style={[styles.startSimTitle, { color: colors.textPrimary || '#ffffff' }]}>⚡ START RESCUE SIMULATION</Text>
          <Text style={[styles.startSimSubtitle, { color: colors.textSecondary || '#94a3b8' }]}>
            This will initiate an interactive 5-step emergency rescue sequence with automated 10m/s tactical routing and 20-meter geofencing triggers.
          </Text>

          <View style={[styles.startSimStepsList, { backgroundColor: colors.surfaceElevated || '#0f172a' }]}>
            <View style={styles.startSimStepItem}>
              <View style={styles.startSimStepNum}>
                <Text style={styles.startSimStepNumText}>1</Text>
              </View>
              <Text style={styles.startSimStepText}>
                <Text style={[styles.startSimStepTitle, { color: colors.textPrimary || '#ffffff' }]}>Duty Hub Dispatch: </Text>
                <Text style={[styles.startSimStepDesc, { color: colors.textSecondary || '#94a3b8' }]}>Accept distress order in Duty Hub</Text>
              </Text>
            </View>

            <View style={styles.startSimStepItem}>
              <View style={styles.startSimStepNum}>
                <Text style={styles.startSimStepNumText}>2</Text>
              </View>
              <Text style={styles.startSimStepText}>
                <Text style={[styles.startSimStepTitle, { color: colors.textPrimary || '#ffffff' }]}>En Route (10 m/s): </Text>
                <Text style={[styles.startSimStepDesc, { color: colors.textSecondary || '#94a3b8' }]}>Navigate along tactical route to victim</Text>
              </Text>
            </View>

            <View style={styles.startSimStepItem}>
              <View style={styles.startSimStepNum}>
                <Text style={styles.startSimStepNumText}>3</Text>
              </View>
              <Text style={styles.startSimStepText}>
                <Text style={[styles.startSimStepTitle, { color: colors.textPrimary || '#ffffff' }]}>On Scene (≤ 20m): </Text>
                <Text style={[styles.startSimStepDesc, { color: colors.textSecondary || '#94a3b8' }]}>Geofence alerts arrival & secures victim onboard</Text>
              </Text>
            </View>

            <View style={styles.startSimStepItem}>
              <View style={styles.startSimStepNum}>
                <Text style={styles.startSimStepNumText}>4</Text>
              </View>
              <Text style={styles.startSimStepText}>
                <Text style={[styles.startSimStepTitle, { color: colors.textPrimary || '#ffffff' }]}>Transporting (10 m/s): </Text>
                <Text style={[styles.startSimStepDesc, { color: colors.textSecondary || '#94a3b8' }]}>Reroute and navigate to nearest shelter</Text>
              </Text>
            </View>

            <View style={styles.startSimStepItem}>
              <View style={styles.startSimStepNum}>
                <Text style={styles.startSimStepNumText}>5</Text>
              </View>
              <Text style={styles.startSimStepText}>
                <Text style={[styles.startSimStepTitle, { color: colors.textPrimary || '#ffffff' }]}>CSWDO Handover: </Text>
                <Text style={[styles.startSimStepDesc, { color: colors.textSecondary || '#94a3b8' }]}>Shelter gate geofence & return to standby</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalActionPrimaryBtn}
            onPress={onStartSimulation}
          >
            <Play size={18} color="#ffffff" />
            <Text style={styles.modalActionPrimaryText}>
              START SIMULATION &amp; GO TO DUTY HUB
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalActionSecondaryBtn}
            onPress={onClose}
          >
            <Text style={[styles.modalActionSecondaryText, { color: colors.textSecondary || '#94a3b8' }]}>Cancel</Text>
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
  startSimModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  startSimIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  startSimTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  startSimSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  startSimStepsList: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  startSimStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  startSimStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  startSimStepNumText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '900',
  },
  startSimStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  startSimStepTitle: {
    fontWeight: '700',
  },
  startSimStepDesc: {
    fontWeight: '400',
  },
  modalActionPrimaryBtn: {
    width: '100%',
    backgroundColor: '#0284c7',
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
