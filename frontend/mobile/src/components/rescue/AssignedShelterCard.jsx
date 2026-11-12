import React from 'react';
import { View, Text } from 'react-native';
import { Building } from 'lucide-react-native';

export default function AssignedShelterCard({
  currentMission,
  shelters = [],
  styles,
}) {
  if (!currentMission) return null;

  return (
    <View style={styles.shelterCard}>
      <View style={styles.shelterHeaderRow}>
        <Building size={16} color="#34d399" />
        <Text style={styles.shelterSectionTitle}>ASSIGNED DROP-OFF SHELTER</Text>
      </View>
      <Text style={styles.shelterNameText}>
        {currentMission.target_shelter?.name ||
          shelters[0]?.name ||
          'Tetuan Covered Court Evacuation Center'}
      </Text>
      <Text style={styles.shelterMetaText}>
        Barangay {currentMission.target_shelter?.barangay || 'Tetuan'} • Automatic CSWDO intake
        verified upon arrival.
      </Text>
    </View>
  );
}
