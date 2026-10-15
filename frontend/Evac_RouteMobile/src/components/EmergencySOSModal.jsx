import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  LifeBuoy,
  X,
  Plus,
  Minus,
  MapPin,
  Check,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const HAZARD_OPTIONS = [
  {
    id: 'flood',
    title: 'Flood Rescue',
    badge: 'WATER RESCUE',
    description: 'Rapid rising water, trapped in home/roof, boat required',
    emoji: '🌊',
    iconColor: '#0284c7',
    bgColor: '#e0f2fe',
    darkBgColor: '#082f49',
    borderColor: '#38bdf8',
  },
  {
    id: 'fire',
    title: 'Fire Emergency',
    badge: 'FIRETRUCK',
    description: 'Active structure fire, heavy smoke, trapped by flames',
    emoji: '🔥',
    iconColor: '#ea580c',
    bgColor: '#ffedd5',
    darkBgColor: '#431407',
    borderColor: '#fb923c',
  },
  {
    id: 'medical',
    title: 'Medical / Trauma',
    badge: 'AMBULANCE',
    description: 'Severe injury, respiratory failure, bedridden, cannot walk',
    emoji: '🚑',
    iconColor: '#dc2626',
    bgColor: '#fee2e2',
    darkBgColor: '#450a0a',
    borderColor: '#f87171',
  },
];

const MODIFIER_OPTIONS = [
  { id: 'infant', label: 'Infant / Child', icon: '👶' },
  { id: 'elderly', label: 'Senior / Elderly', icon: '👵' },
  { id: 'pwd', label: 'PWD / Bedridden', icon: '♿' },
  { id: 'roof_trapped', label: 'Trapped on Roof', icon: '🏠' },
  { id: 'injured', label: 'Injured / Bleeding', icon: '🩸' },
  { id: 'chest_deep_water', label: 'Chest-Deep Water', icon: '🌊' },
];

export default function EmergencySOSModal({ visible, onClose, initialCoords, onSuccess }) {
  const { isDarkMode } = useTheme();

  const [hazardType, setHazardType] = useState('flood');
  const [headcount, setHeadcount] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coords, setCoords] = useState(initialCoords || null);
  const [addressLabel, setAddressLabel] = useState('Detecting current GPS location...');

  const triggerHaptic = (style = 'selection') => {
    try {
      if (style === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.selectionAsync();
      }
    } catch (_e) {}
  };

  // On open, resolve GPS coords & address
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    async function resolveLocation() {
      try {
        let lat = initialCoords?.latitude;
        let lng = initialCoords?.longitude;

        if (!lat || !lng) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          } else {
            lat = 6.9214;
            lng = 122.0790;
          }
        }

        if (isMounted) {
          setCoords({ latitude: lat, longitude: lng });
          try {
            const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (geocoded && geocoded.length > 0) {
              const g = geocoded[0];
              const parts = [
                g.name || g.street,
                g.district || g.subregion || g.city,
                'Zamboanga City',
              ].filter(Boolean);
              setAddressLabel(parts.join(', '));
            } else {
              setAddressLabel(`${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`);
            }
          } catch {
            setAddressLabel(`${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`);
          }
        }
      } catch (_err) {
        if (isMounted) {
          setCoords({ latitude: 6.9214, longitude: 122.0790 });
          setAddressLabel('Zamboanga City (Default)');
        }
      }
    }

    resolveLocation();
    return () => {
      isMounted = false;
    };
  }, [visible, initialCoords]);

  // Ordering Modifier toggle
  const toggleModifier = (modId) => {
    triggerHaptic('impact');
    setSelectedModifiers(prev => {
      if (prev.includes(modId)) {
        return prev.filter(m => m !== modId);
      } else {
        return [...prev, modId];
      }
    });
  };

  // Headcount Stepper handlers
  const handleDecrement = () => {
    triggerHaptic();
    setHeadcount(prev => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    triggerHaptic();
    setHeadcount(prev => Math.min(30, prev + 1));
  };

  const handleQuickAdd = (amount) => {
    triggerHaptic('impact');
    setHeadcount(prev => Math.min(30, prev + amount));
  };

  // Submit SOS Order
  const handleSubmitSOS = async () => {
    if (isSubmitting) return;
    triggerHaptic('impact');
    setIsSubmitting(true);

    const lat = coords?.latitude || 6.9214;
    const lng = coords?.longitude || 122.0790;

    const selectedModLabels = MODIFIER_OPTIONS
      .filter(m => selectedModifiers.includes(m.id))
      .map(m => m.label);

    const activeHazard = HAZARD_OPTIONS.find(h => h.id === hazardType);

    try {
      await api.post('/rescue/sos', {
        latitude: lat,
        longitude: lng,
        headcount: headcount,
        hazard_type: hazardType,
        modifiers: selectedModifiers,
        situation: `🚨 URGENT ${activeHazard?.title?.toUpperCase() || 'SOS'}: ${headcount} person(s) stranded at ${addressLabel}. Special Needs: ${selectedModLabels.join(', ') || 'None stated'}.`,
      });

      Alert.alert(
        '🚨 RESCUE SOS DISPATCHED',
        `Your emergency signal for ${headcount} person(s) (${activeHazard?.title}) has been transmitted to CDRRMO Command Center.\n\nResponding rescue units are being dispatched to your coordinates. Stay where you are and keep your phone charged.`,
        [{ text: 'OK', onPress: () => {
          onClose();
          if (onSuccess) onSuccess();
        }}]
      );
    } catch (err) {
      Alert.alert(
        'SOS Transmission Failed',
        err?.response?.data?.message || 'Could not contact CDRRMO emergency dispatch. Please call emergency hotline 911 directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeHazard = HAZARD_OPTIONS.find(h => h.id === hazardType);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[
          styles.modalSheet,
          { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.pulseIconContainer}>
                <LifeBuoy color="#ef4444" size={22} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                  EMERGENCY RESCUE SOS
                </Text>
                <Text style={styles.headerSubtitle}>
                  CDRRMO Command Desk Instant Dispatch
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            >
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* GPS Location Bar */}
          <View style={[
            styles.locationBar,
            { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }
          ]}>
            <MapPin size={14} color="#ef4444" />
            <Text style={[styles.locationText, { color: isDarkMode ? '#cbd5e1' : '#334155' }]} numberOfLines={1}>
              {addressLabel}
            </Text>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* SECTION 1: DISASTER EMERGENCY TYPE (Ordering Item Selection) */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                1. SELECT DISASTER TYPE (CLICK TO CHOOSE)
              </Text>
              <View style={styles.hazardGrid}>
                {HAZARD_OPTIONS.map((opt) => {
                  const isSelected = hazardType === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => {
                        triggerHaptic('impact');
                        setHazardType(opt.id);
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.hazardCard,
                        {
                          backgroundColor: isDarkMode ? (isSelected ? opt.darkBgColor : '#1e293b') : (isSelected ? opt.bgColor : '#f8fafc'),
                          borderColor: isSelected ? opt.borderColor : (isDarkMode ? '#334155' : '#e2e8f0'),
                          borderWidth: isSelected ? 2 : 1,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                        <View style={[
                          styles.badgePill,
                          { backgroundColor: isSelected ? opt.iconColor : (isDarkMode ? '#334155' : '#e2e8f0') }
                        ]}>
                          <Text style={[
                            styles.badgePillText,
                            { color: isSelected ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b') }
                          ]}>
                            {opt.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={[
                        styles.hazardTitle,
                        { color: isDarkMode ? '#f8fafc' : '#0f172a', fontWeight: isSelected ? '900' : '700' }
                      ]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.hazardDesc, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                        {opt.description}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: opt.iconColor }]}>
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* SECTION 2: HEADCOUNT STEPPER (Quantity Selector) */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.sectionHeading, { color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: 0 }]}>
                  2. VICTIMS STRANDED (HEADCOUNT)
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                  {headcount} Person{headcount > 1 ? 's' : ''}
                </Text>
              </View>

              <View style={[
                styles.stepperContainer,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }
              ]}>
                <TouchableOpacity
                  onPress={handleDecrement}
                  disabled={headcount <= 1}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', opacity: headcount <= 1 ? 0.3 : 1 }
                  ]}
                >
                  <Minus size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>

                <View style={styles.headcountDisplay}>
                  <Text style={[styles.headcountNumber, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                    {String(headcount).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.headcountLabel, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                    TOTAL PERSONS
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleIncrement}
                  disabled={headcount >= 30}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: '#ef4444' }
                  ]}
                >
                  <Plus size={20} color="#ffffff" strokeWidth={3} />
                </TouchableOpacity>
              </View>

              {/* Quick Add Buttons */}
              <View style={styles.quickAddRow}>
                {[
                  { label: '+1 Person', amount: 1 },
                  { label: '+2 Persons', amount: 2 },
                  { label: '+5 Family', amount: 5 },
                ].map(q => (
                  <TouchableOpacity
                    key={q.label}
                    onPress={() => handleQuickAdd(q.amount)}
                    style={[
                      styles.quickAddChip,
                      { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }
                    ]}
                  >
                    <Plus size={12} color="#ef4444" />
                    <Text style={[styles.quickAddText, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SECTION 3: RESCUE NEEDS / MODIFIERS (Ordering Modifiers) */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                3. SPECIAL RESCUE NEEDS (CLICK TO ENABLE / DISABLE)
              </Text>
              <View style={styles.modifiersGrid}>
                {MODIFIER_OPTIONS.map((m) => {
                  const isActive = selectedModifiers.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleModifier(m.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.modifierChip,
                        {
                          backgroundColor: isActive
                            ? (isDarkMode ? '#450a0a' : '#fee2e2')
                            : (isDarkMode ? '#1e293b' : '#f8fafc'),
                          borderColor: isActive ? '#ef4444' : (isDarkMode ? '#334155' : '#e2e8f0'),
                          borderWidth: isActive ? 1.5 : 1,
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>{m.icon}</Text>
                      <Text style={[
                        styles.modifierLabel,
                        {
                          color: isActive ? '#ef4444' : (isDarkMode ? '#cbd5e1' : '#475569'),
                          fontWeight: isActive ? '800' : '600',
                        }
                      ]}>
                        {m.label}
                      </Text>
                      {isActive && (
                        <View style={styles.modifierActiveCheck}>
                          <Check size={10} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* BOTTOM ORDER SUMMARY & SOS TRANSMIT BUTTON */}
          <View style={[
            styles.footerContainer,
            { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0' }
          ]}>
            <View style={styles.summaryBar}>
              <Text style={[styles.summaryText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                {activeHazard?.emoji} {activeHazard?.title} • <Text style={{ color: '#ef4444', fontWeight: '900' }}>{headcount} Person{headcount > 1 ? 's' : ''}</Text>
              </Text>
              {selectedModifiers.length > 0 && (
                <Text style={styles.summarySubtext}>
                  {selectedModifiers.length} special need{selectedModifiers.length > 1 ? 's' : ''} tagged
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmitSOS}
              disabled={isSubmitting}
              activeOpacity={0.85}
              style={[
                styles.submitBtn,
                { opacity: isSubmitting ? 0.7 : 1 }
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <ShieldAlert size={20} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    BROADCAST RESCUE SOS
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  pulseIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBar: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  bodyScroll: {
    paddingHorizontal: 18,
  },
  section: {
    marginVertical: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  hazardGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  hazardCard: {
    borderRadius: 14,
    padding: 12,
    position: 'relative',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hazardTitle: {
    fontSize: 14,
    marginTop: 4,
  },
  hazardDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  checkCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headcountDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headcountNumber: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  headcountLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickAddChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modifiersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modifierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modifierLabel: {
    fontSize: 12,
  },
  modifierActiveCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  footerContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summaryBar: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summarySubtext: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
