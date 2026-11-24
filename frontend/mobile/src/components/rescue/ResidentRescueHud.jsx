import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  LifeBuoy,
  Phone,
  MapPin,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  XCircle,
  ShieldCheck,
  Radio,
  Building,
} from 'lucide-react-native';
import { useActiveSos } from '../../context/ActiveSosContext';
import { useTheme } from '../../context/ThemeContext';
import { dialEmergencyNumber } from '../common/QuickEmergency911Modal';
import ConfirmationModal from '../common/ConfirmationModal';

export default function ResidentRescueHud({ onOpenMap, onOpen911Modal }) {
  const { isDarkMode } = useTheme();
  const {
    activeSos,
    isTracking,
    trackingState,
    distanceMeters,
    etaMinutes,
    cancelSos,
    isCancelling,
  } = useActiveSos();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!isTracking || !activeSos) {
    return null;
  }

  const unit = activeSos.rescue_unit;
  const targetShelter = activeSos.target_shelter;

  // Format distance
  const distanceFormatted = distanceMeters !== null
    ? distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${distanceMeters} m`
    : 'Calculating distance...';

  const etaFormatted = etaMinutes !== null ? `~${etaMinutes} mins` : 'Locating...';

  const handleCallRescuer = () => {
    const phone = unit?.contact_number || '0917-555-0101';
    dialEmergencyNumber(phone, unit?.name || 'Rescue Unit Operator');
  };

  const handleCall911 = () => {
    if (onOpen911Modal) {
      onOpen911Modal();
    } else {
      dialEmergencyNumber('911', 'National Emergency 911');
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelSos();
      setShowCancelConfirm(false);
      Alert.alert('SOS Cancelled', 'Your emergency distress beacon has been safely deactivated.');
    } catch (e) {
      Alert.alert('Error', 'Could not cancel SOS beacon. Please try again or call 911.');
    }
  };

  // ─── Render Minimized Compact Pill ───
  if (isMinimized) {
    return (
      <View style={styles.dockWrapper}>
        <TouchableOpacity
          style={[
            styles.minimizedPill,
            { backgroundColor: isDarkMode ? '#0f172a' : '#1e293b' },
          ]}
          onPress={() => setIsMinimized(false)}
          activeOpacity={0.9}
        >
          <View style={styles.pulseDotRed} />
          <LifeBuoy size={18} color="#ef4444" />
          <Text style={styles.minimizedText} numberOfLines={1}>
            {trackingState === 'pending_dispatch'
              ? '📡 SOS Beacon Active · Waiting for Dispatch'
              : trackingState === 'on_scene'
              ? '📍 Rescuer Arrived On Scene!'
              : trackingState === 'transporting'
              ? `🏢 In Transit to ${targetShelter?.name || 'Shelter'}`
              : `🚨 ${unit?.call_sign || 'Rescuer'} ${distanceFormatted} (${etaFormatted})`}
          </Text>
          <ChevronUp size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render Full Emergency HUD Card ───
  return (
    <View style={styles.dockWrapper}>
      <View
        style={[
          styles.hudCard,
          {
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          },
        ]}
      >
        {/* Top Drag / Minimize Handle */}
        <TouchableOpacity
          style={styles.handleBarTouch}
          onPress={() => setIsMinimized(true)}
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        >
          <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
        </TouchableOpacity>

        {/* ─── STATE 1: PENDING DISPATCH ─── */}
        {trackingState === 'pending_dispatch' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#fef3c7', borderColor: '#fde047' }]}>
                <Radio size={13} color="#b45309" />
                <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>
                  TRANSMITTED · WAITING DISPATCH
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMinimized(true)}>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headlineTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
              Emergency SOS Beacon Active
            </Text>
            <Text style={styles.bodyDesc}>
              Transmitted to CDRRMO EOC. Operators are assigning nearest rescue asset. Keep phone on.
            </Text>

            <View style={styles.infoPillsRow}>
              <View style={styles.metaChip}>
                <Users size={13} color="#94a3b8" />
                <Text style={styles.metaChipText}>{activeSos.headcount || 1} Person(s)</Text>
              </View>
              <View style={styles.metaChip}>
                <LifeBuoy size={13} color="#ef4444" />
                <Text style={styles.metaChipText}>Priority: High</Text>
              </View>
            </View>

            {/* 56pt Call & Cancel Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleCall911}
                activeOpacity={0.85}
              >
                <Phone size={20} color="#ffffff" />
                <Text style={styles.primaryActionText}>DIAL 911 HOTLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCancelConfirm(true)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel SOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── STATE 2: EN ROUTE (DISPATCHED) ─── */}
        {(trackingState === 'dispatched' || trackingState === 'en_route') && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                <View style={styles.pulseDotRed} />
                <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>
                  RESCUE UNIT EN ROUTE
                </Text>
              </View>
              <View style={styles.etaPill}>
                <Clock size={12} color="#ffffff" />
                <Text style={styles.etaPillText}>{etaFormatted}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMinimized(true)}>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headlineTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]} numberOfLines={1}>
              {unit?.name || 'Emergency Rescue Asset'}
            </Text>
            <Text style={styles.unitCallSign}>
              Call Sign: {unit?.call_sign || 'ALPHA-1'} • Commander: {unit?.operator_name || 'QRT Lead'}
            </Text>

            {/* Distance & Info Pills */}
            <View style={styles.infoPillsRow}>
              <View style={[styles.metaChip, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <MapPin size={13} color="#0284c7" />
                <Text style={[styles.metaChipText, { color: isDarkMode ? '#38bdf8' : '#0284c7', fontWeight: '800' }]}>
                  {distanceFormatted}
                </Text>
              </View>

              <View style={[styles.metaChip, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <Users size={13} color="#94a3b8" />
                <Text style={styles.metaChipText}>
                  {activeSos.headcount} Pax ({activeSos.hazard_type || 'Flood'})
                </Text>
              </View>
            </View>

            {/* 56pt Emergency Dual Actions in Thumb Zone */}
            <View style={styles.dualActionsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1.5, backgroundColor: '#10b981' }]}
                onPress={handleCallRescuer}
                activeOpacity={0.85}
              >
                <Phone size={20} color="#ffffff" />
                <Text style={styles.primaryActionText}>CALL RESCUER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1, backgroundColor: '#334155' }]}
                onPress={handleCall911}
                activeOpacity={0.85}
              >
                <Phone size={18} color="#ffffff" />
                <Text style={styles.primaryActionText}>911</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── STATE 3: ARRIVED ON SCENE ─── */}
        {trackingState === 'on_scene' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
                <MapPin size={13} color="#0284c7" />
                <Text style={[styles.statusBadgeText, { color: '#0284c7' }]}>
                  RESCUER ARRIVED ON SCENE
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMinimized(true)}>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headlineTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
              {unit?.name || 'Rescue Team'} is Outside!
            </Text>
            <Text style={styles.bodyDesc}>
              Signal operators with flashlight, phone screen, whistle, or wave a bright cloth. Stay in a safe position.
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
                onPress={handleCallRescuer}
                activeOpacity={0.85}
              >
                <Phone size={20} color="#ffffff" />
                <Text style={styles.primaryActionText}>CALL OPERATOR ON SCENE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── STATE 4: IN TRANSIT TO SHELTER ─── */}
        {(trackingState === 'transporting' || trackingState === 'staged_at_assembly') && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }]}>
                <Building size={13} color="#7e22ce" />
                <Text style={[styles.statusBadgeText, { color: '#7e22ce' }]}>
                  EN ROUTE TO EVACUATION CENTER
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMinimized(true)}>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headlineTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
              Heading to: {targetShelter?.name || 'Assigned Shelter'}
            </Text>
            <Text style={styles.bodyDesc}>
              Victims safely secured aboard {unit?.call_sign || 'Rescue Unit'}. Automatic intake and relief pack reservations active.
            </Text>

            <View style={styles.infoPillsRow}>
              <View style={[styles.metaChip, { backgroundColor: '#f5f3ff' }]}>
                <ShieldCheck size={13} color="#7c3aed" />
                <Text style={[styles.metaChipText, { color: '#7c3aed', fontWeight: '800' }]}>
                  Safe Delivery Protocol Active
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── STATE 5: COMPLETED ─── */}
        {trackingState === 'completed' && (
          <View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <ShieldCheck size={13} color="#15803d" />
                <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>
                  EVACUATION COMPLETED & SAFE
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMinimized(true)}>
                <ChevronDown size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.headlineTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
              Safe Arrival Registered
            </Text>
            <Text style={styles.bodyDesc}>
              Turnover complete at {targetShelter?.name || 'Evacuation Center'}. Your household headcount has been logged with CSWDO.
            </Text>
          </View>
        )}
      </View>

      {/* Confirmation modal on Cancel SOS */}
      <ConfirmationModal
        visible={showCancelConfirm}
        title="Cancel Emergency SOS Beacon?"
        message="Are you sure you want to deactivate your SOS signal? Only cancel if you are no longer in danger or this was triggered by mistake."
        confirmText="Yes, Cancel SOS"
        cancelText="Keep Active"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
        variant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 76 : 64,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  hudCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  handleBarTouch: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  etaPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  pulseDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  headlineTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  unitCallSign: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  bodyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 10,
  },
  infoPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#33415522',
  },
  metaChipText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dualActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  minimizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  minimizedText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
});
