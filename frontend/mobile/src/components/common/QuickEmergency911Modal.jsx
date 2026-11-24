import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Phone, Shield, Flame, Anchor, Heart, X, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export const EMERGENCY_NUMBERS = [
  {
    name: 'National Emergency Hotline',
    number: '911',
    description: 'Immediate police, fire, and medical dispatch',
    icon: Phone,
    badge: 'PRIORITY 1',
    color: '#ef4444',
    bgColor: '#fee2e2',
    darkBgColor: '#450a0a',
  },
  {
    name: 'CDRRMO Zamboanga Operations',
    number: '(062) 955-9601',
    description: 'City disaster command & search and rescue',
    icon: Shield,
    badge: 'LOCAL DRRM',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    darkBgColor: '#082f49',
  },
  {
    name: 'Bureau of Fire Protection (BFP)',
    number: '(062) 991-2267',
    description: 'Fire suppression & structural extraction',
    icon: Flame,
    badge: 'FIRE / RESCUE',
    color: '#f97316',
    bgColor: '#ffedd5',
    darkBgColor: '#431407',
  },
  {
    name: 'Philippine Coast Guard (PCG)',
    number: '(062) 992-2694',
    description: 'Water rescue, sea patrol & coastal evacuation',
    icon: Anchor,
    badge: 'WATER RESCUE',
    color: '#10b981',
    bgColor: '#d1fae5',
    darkBgColor: '#064e3b',
  },
  {
    name: 'Zamboanga City Medical Center',
    number: '(062) 991-2934',
    description: 'Level 3 government hospital & trauma center',
    icon: Heart,
    badge: 'HOSPITAL',
    color: '#ec4899',
    bgColor: '#fce7f3',
    darkBgColor: '#500724',
  },
];

export function dialEmergencyNumber(number, name) {
  const cleanNumber = number.replace(/[^0-9+]/g, '');
  const url = `tel:${cleanNumber}`;
  Linking.openURL(url).catch(() => {
    Alert.alert(
      'Cannot Open Phone Dialer',
      `Could not open phone dialer for ${name}. Please dial ${number} directly.`
    );
  });
}

/**
 * 1-Tap Emergency Hotline Bottom Sheet Modal
 */
export default function QuickEmergency911Modal({ visible, onClose }) {
  const { colors, isDarkMode } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#334155' : '#e2e8f0' },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.alertIconCircle, { backgroundColor: '#fee2e2' }]}>
                <Phone size={20} color="#dc2626" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                  Emergency Hotlines
                </Text>
                <Text style={styles.headerSubtitle}>Tap to dial immediately (Toll-Free / Direct)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {/* Hotline List */}
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {EMERGENCY_NUMBERS.map((item, index) => {
              const IconComp = item.icon;
              return (
                <View
                  key={index}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isDarkMode ? item.darkBgColor : item.bgColor },
                    ]}
                  >
                    <IconComp size={22} color={item.color} />
                  </View>

                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={[styles.cardTitle, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                        {item.name}
                      </Text>
                      <View style={[styles.badgePill, { backgroundColor: item.color + '22' }]}>
                        <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc}>{item.description}</Text>
                    <Text style={[styles.cardNumber, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>
                      {item.number}
                    </Text>
                  </View>

                  {/* 56pt Emergency Call Button */}
                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => dialEmergencyNumber(item.number, item.name)}
                    activeOpacity={0.8}
                  >
                    <Phone size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Floating 1-Tap 911 Pill to place in Map or Report Headers
 */
export function Quick911FloatingPill({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.floatingPill}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Open Emergency 911 Hotlines"
    >
      <View style={styles.redPulseDot} />
      <Phone size={14} color="#ffffff" />
      <Text style={styles.pillText}>911 HOTLINE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#33415533',
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  list: {
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 3,
  },
  cardNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  callBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  redPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  pillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
