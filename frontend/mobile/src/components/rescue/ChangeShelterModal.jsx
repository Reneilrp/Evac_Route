import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building,
  AlertTriangle,
  X,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { getHaversineDistanceMeters } from '../../utils/tacticalRescueRouter';

export default function ChangeShelterModal({
  visible,
  onClose,
  currentShelter,
  shelters = [],
  rescuerLocation = [0, 0],
  victimHeadcount = 1,
  onSelectShelter,
  onProceedAnyway,
  isDarkMode = true,
}) {
  const insets = useSafeAreaInsets();

  // Current shelter stats
  const currentMax = Number(currentShelter?.max_capacity || currentShelter?.capacity || 0);
  const currentOcc = Number(currentShelter?.current_occupancy || 0);
  const currentRemaining = currentShelter?.available_capacity !== undefined
    ? Number(currentShelter.available_capacity)
    : Math.max(0, currentMax - currentOcc);
  const isCurrentFull = currentMax > 0 && (currentRemaining <= 0 || currentRemaining < victimHeadcount);

  // Sort other shelters by distance
  const sortedShelters = useMemo(() => {
    return [...shelters]
      .filter((s) => s.id !== currentShelter?.id)
      .map((s) => {
        const sLat = Number(s.latitude);
        const sLng = Number(s.longitude);
        const distM = getHaversineDistanceMeters(
          rescuerLocation[1],
          rescuerLocation[0],
          sLat,
          sLng
        );
        const max = Number(s.max_capacity || s.capacity || 0);
        const occ = Number(s.current_occupancy || 0);
        const remaining = s.available_capacity !== undefined ? Number(s.available_capacity) : Math.max(0, max - occ);
        const isFull = max > 0 && (remaining <= 0 || remaining < victimHeadcount);

        return {
          ...s,
          distanceM: distM,
          distanceKm: (distM / 1000).toFixed(1),
          maxCapacity: max,
          currentOccupancy: occ,
          remainingSpots: remaining,
          isFull,
        };
      })
      .sort((a, b) => {
        // Prefer shelters with available capacity first, then by distance
        if (!a.isFull && b.isFull) return -1;
        if (a.isFull && !b.isFull) return 1;
        return a.distanceM - b.distanceM;
      });
  }, [shelters, currentShelter, rescuerLocation, victimHeadcount]);

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
          paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top,
        }}
      >
        {/* Top Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building color="#0284c7" size={20} />
            </View>
            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                Change Drop-Off Shelter
              </Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                Tactical In-Transit Destination Re-Routing
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          }}
        >
          {/* Current Shelter Card with Overflow Choice */}
          <View
            style={{
              backgroundColor: isCurrentFull
                ? (isDarkMode ? '#450a0a' : '#fef2f2')
                : (isDarkMode ? '#1e293b' : '#ffffff'),
              borderRadius: 14,
              padding: 14,
              borderWidth: 1.5,
              borderColor: isCurrentFull ? '#ef4444' : '#38bdf8',
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: isCurrentFull ? '#f87171' : '#38bdf8', textTransform: 'uppercase' }}>
                Current Assigned Shelter
              </Text>
              <View
                style={{
                  backgroundColor: isCurrentFull ? '#ef4444' : '#10b981',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                  {isCurrentFull ? '⚠️ AT CAPACITY' : '🟢 OPEN & HAS SPOTS'}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              {currentShelter?.name || 'Assigned Evacuation Center'}
            </Text>

            <Text style={{ fontSize: 12, color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: 2 }}>
              Barangay {currentShelter?.barangay || 'Zamboanga'} • Occupancy: {currentOcc}/{currentMax} ({currentRemaining} spots left for {victimHeadcount} IDPs)
            </Text>

            {isCurrentFull && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: isDarkMode ? '#fca5a5' : '#b91c1c', lineHeight: 15 }}>
                  This center is full or nearing maximum capacity. You can proceed anyway for emergency intake overflow, or divert to an alternative open center below.
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    onProceedAnyway?.();
                    onClose?.();
                  }}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                    borderWidth: 1.5,
                    borderColor: '#ef4444',
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={16} color={isDarkMode ? '#fca5a5' : '#991b1b'} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#fca5a5' : '#991b1b' }}>
                    Proceed Anyway (Emergency Overflow)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Alternative Shelters Section Title */}
          <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#94a3b8' : '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
            Available Alternative Evacuation Centers ({sortedShelters.length})
          </Text>

          {/* Shelters List */}
          {sortedShelters.map((shelter) => {
            const hasFreeSlots = !shelter.isFull;

            return (
              <View
                key={shelter.id}
                style={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: hasFreeSlots
                    ? (isDarkMode ? '#334155' : '#e2e8f0')
                    : (isDarkMode ? '#3b1c1c' : '#fee2e2'),
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                      {shelter.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isDarkMode ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                      Barangay {shelter.barangay} • 📍 {shelter.distanceKm} km away
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: hasFreeSlots
                        ? (isDarkMode ? '#064e3b' : '#dcfce7')
                        : (isDarkMode ? '#450a0a' : '#fee2e2'),
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: hasFreeSlots ? (isDarkMode ? '#34d399' : '#166534') : (isDarkMode ? '#f87171' : '#991b1b'),
                      }}
                    >
                      {hasFreeSlots ? `🟢 ${shelter.remainingSpots} FREE` : '🔴 FULL'}
                    </Text>
                  </View>
                </View>

                {/* Occupancy bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                    Occupancy: {shelter.currentOccupancy} / {shelter.maxCapacity} ({Math.round(shelter.maxCapacity > 0 ? (shelter.currentOccupancy / shelter.maxCapacity) * 100 : 0)}%)
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#38bdf8' }}>
                    {shelter.type === 'primary' ? '⭐ Primary' : 'Secondary'}
                  </Text>
                </View>

                {/* Switch Destination Button */}
                <TouchableOpacity
                  onPress={() => onSelectShelter?.(shelter)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: hasFreeSlots ? '#0284c7' : (isDarkMode ? '#334155' : '#cbd5e1'),
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Navigation size={15} color="#ffffff" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Divert Route to This Center
                  </Text>
                  <ArrowRight size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
