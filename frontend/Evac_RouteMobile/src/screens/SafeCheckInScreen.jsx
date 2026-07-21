import { useEffect } from 'react';
import { View, Text, Vibration, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Package, PackageX, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import SkeletonLoader from '../components/SkeletonLoader';
import { colors } from '../styles/theme';
import styles from '../styles/SafeCheckInScreen.styles';

export default function SafeCheckInScreen({ navigation }) {
  const status = useResidentStore(state => state.status);
  const allocation = useResidentStore(state => state.allocation);
  const isCheckedIn = status === 'safe' || !!allocation?.shelter_name;

  useEffect(() => {
    if (isCheckedIn) {
      // Physical Haptic Feedback — success pattern
      Vibration.vibrate([0, 500, 200, 500]);
    }
  }, [isCheckedIn]);

  const handleReturnToProfile = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Top Header Navigation Bar ─── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleReturnToProfile} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Relief Allocation Receipt</Text>
          <Text style={styles.headerSubtitle}>
            {isCheckedIn ? 'Claimed Shelter Supplies & Entry' : 'No Active Relief Allocation'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isCheckedIn ? (
          /* ─── STATE A: No Active Relief Allocation Receipt ─── */
          <>
            <View style={[styles.statusBadgeIcon, { backgroundColor: 'rgba(148, 163, 184, 0.15)', borderWidth: 2, borderColor: '#64748b' }]}>
              <PackageX size={38} color="#94a3b8" />
            </View>

            <Text style={styles.statusTitle}>NO ACTIVE RELIEF RECEIPT</Text>
            <Text style={styles.statusSubtitle}>
              You currently have no claimed shelter relief allocations or active check-in records.
            </Text>

            {/* Information Card */}
            <View style={{
              backgroundColor: '#0f172a',
              borderRadius: 20,
              padding: 18,
              width: '100%',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              marginBottom: 24,
              gap: 14,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <ShieldCheck size={20} color="#38bdf8" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>Shelter Entry & Relief Receipt</Text>
                  <Text style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 16 }}>
                    Present your Family Relief QR code on your Profile tab to LGU shelter door staff upon arrival.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Package size={20} color="#4ade80" style={{ marginRight: 10, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>Automatic Allocation Sync</Text>
                  <Text style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 16 }}>
                    Once scanned, your itemized food packs, hygiene kits, and shelter allocation receipt will record here automatically.
                  </Text>
                </View>
              </View>
            </View>

            {/* Go to Profile Button */}
            <View style={{ width: '100%' }}>
              <PrimaryButton
                title="Go to Profile (View Family QR)"
                onPress={handleReturnToProfile}
                variant="primary"
                size="large"
              />
            </View>
          </>
        ) : (
          /* ─── STATE B: Checked-In & Active Relief Allocation Receipt ─── */
          <>
            <View style={[styles.statusBadgeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 2, borderColor: '#4ade80' }]}>
              <CheckCircle size={44} color="#4ade80" />
            </View>

            <Text style={styles.statusTitle}>CHECK-IN & RELIEF RECEIPT</Text>
            <Text style={styles.statusSubtitle}>Verified Safe • Zamboanga City Disaster Management</Text>

            {/* High-Contrast Digital Relief Receipt Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Package size={24} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Official Relief Receipt</Text>
                  <Text style={styles.cardSubtitle}>
                    📍 {allocation?.shelter_name || 'Assigned Evacuation Shelter'}
                  </Text>
                </View>
              </View>

              <View style={styles.list}>
                {allocation?.allocation ? (
                  <FlatList
                    data={allocation.allocation}
                    keyExtractor={(_item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <View style={styles.listItem}>
                        <Text style={styles.itemLabel}>{item.name}</Text>
                        <Text style={styles.itemValue}>{item.quantity} {item.unit}</Text>
                      </View>
                    )}
                    scrollEnabled={false}
                  />
                ) : (
                  <View>
                    {[1, 2, 3].map(i => (
                      <View key={i} style={styles.skeletonRow}>
                        <SkeletonLoader width="55%" height={18} />
                        <SkeletonLoader width="25%" height={18} />
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.instructionBox}>
                <Text style={styles.instructionText}>
                  Please present this digital receipt at Relief Desk B to claim your physical supplies.
                </Text>
              </View>
            </View>

            <View style={{ width: '100%' }}>
              <PrimaryButton
                title="Return to Profile"
                onPress={handleReturnToProfile}
                variant="outline"
                size="medium"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
