import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Users, MapPin, Phone, MessageSquare } from 'lucide-react-native';

export default function FamilyTargetCard({
  currentMission,
  isSuppressionMission = false,
  getVulnerabilities,
  handleCall,
  handleQuickSms,
  styles,
}) {
  if (!currentMission) return null;

  return (
    <View style={styles.familyCard}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardEyebrow}>
            {isSuppressionMission ? 'TARGET INCIDENT' : 'DISTRESS VICTIM / FAMILY'}
          </Text>
          <Text style={styles.victimName} numberOfLines={1}>
            {currentMission.victim_name}
          </Text>
        </View>

        <View style={styles.headcountBadge}>
          <Users size={14} color="#38bdf8" />
          <Text style={styles.headcountText}>
            {isSuppressionMission ? 'Hostile Area' : `${currentMission.headcount} Persons`}
          </Text>
        </View>
      </View>

      {/* Vulnerabilities Chips */}
      <View style={styles.vulnerabilitiesRow}>
        {getVulnerabilities(currentMission).map((v, idx) => (
          <View key={idx} style={styles.vulnerabilityChip}>
            <Text style={styles.vulnerabilityChipText}>{v}</Text>
          </View>
        ))}
      </View>

      {/* Location Detail */}
      <View style={styles.locationDetailRow}>
        <MapPin size={16} color="#ef4444" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>
            {currentMission.barangay || 'Zamboanga City'} Sector
          </Text>
          <Text style={styles.locationCoordinates}>
            GPS: {Number(currentMission.victim_latitude).toFixed(4)}°N,{' '}
            {Number(currentMission.victim_longitude).toFixed(4)}°E
          </Text>
        </View>
      </View>

      {/* Citizen Situation Report Quote */}
      {currentMission.situation_description ? (
        <View style={styles.situationQuoteBox}>
          <Text style={styles.situationQuoteTitle}>CITIZEN SITREP:</Text>
          <Text style={styles.situationQuoteText}>
            &ldquo;{currentMission.situation_description}&rdquo;
          </Text>
        </View>
      ) : null}

      {/* Fast Direct Communication Row */}
      <View style={styles.communicationRow}>
        <TouchableOpacity
          style={[styles.commBtn, styles.commCallBtn]}
          onPress={() => handleCall(currentMission.victim_phone)}
          activeOpacity={0.8}
        >
          <Phone size={16} color="#ffffff" />
          <Text style={styles.commBtnText}>Call Family</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.commBtn, styles.commSmsBtn]}
          onPress={() =>
            handleQuickSms(
              currentMission.victim_phone,
              currentMission.victim_name,
              currentMission.barangay
            )
          }
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color="#ffffff" />
          <Text style={styles.commBtnText}>Quick SMS Alert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
