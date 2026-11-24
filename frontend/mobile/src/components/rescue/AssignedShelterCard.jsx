import React from 'react';
import { View, Text } from 'react-native';
import { Building, AlertTriangle } from 'lucide-react-native';

export default function AssignedShelterCard({
  currentMission,
  shelters = [],
  styles,
}) {
  if (!currentMission) return null;

  const targetShelter = currentMission.target_shelter || shelters.find(s => s.id === currentMission.target_shelter_id) || shelters[0];
  const maxCap = Number(targetShelter?.max_capacity || targetShelter?.capacity || 0);
  const occ = Number(targetShelter?.current_occupancy || 0);
  const remaining = targetShelter?.available_capacity !== undefined
    ? Number(targetShelter.available_capacity)
    : Math.max(0, maxCap - occ);
  const headcount = Number(currentMission?.headcount || currentMission?.victim?.headcount || 1);
  const isFull = maxCap > 0 && (remaining <= 0 || remaining < headcount);

  return (
    <View style={[styles.shelterCard, isFull && { borderColor: '#ef4444', borderWidth: 1.5 }]}>
      <View style={styles.shelterHeaderRow}>
        <Building size={16} color={isFull ? '#f87171' : '#34d399'} />
        <Text style={[styles.shelterSectionTitle, isFull && { color: '#f87171' }]}>
          {isFull ? 'ASSIGNED DROP-OFF SHELTER • AT CAPACITY' : 'ASSIGNED DROP-OFF SHELTER'}
        </Text>
      </View>
      <Text style={styles.shelterNameText}>
        {targetShelter?.name || 'Tetuan Covered Court Evacuation Center'}
      </Text>
      <Text style={styles.shelterMetaText}>
        Barangay {targetShelter?.barangay || 'Tetuan'} • Automatic CSWDO intake verified upon arrival.
      </Text>

      {/* Capacity Indicator Pill */}
      <View style={{
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}>
        {isFull ? <AlertTriangle size={14} color="#ef4444" /> : null}
        <Text style={{
          fontSize: 11,
          fontWeight: '800',
          color: isFull ? '#f87171' : '#34d399',
        }}>
          {isFull
            ? `⚠️ At Full Capacity: ${occ}/${maxCap} Occupied (${remaining} spots left for ${headcount} IDPs)`
            : `Capacity: ${remaining} of ${maxCap} spots available`}
        </Text>
      </View>
      {isFull && (
        <Text style={{ fontSize: 10, color: '#fca5a5', marginTop: 4 }}>
          Rescuers may proceed anyway for emergency overflow or switch destinations in Navigation Map.
        </Text>
      )}
    </View>
  );
}
