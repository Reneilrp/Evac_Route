import { useEffect } from 'react';
import { View, Text, Vibration, ScrollView } from 'react-native';
import { CheckCircle, Package, PackageX } from 'lucide-react-native';
import CustomHeader from '../components/CustomHeader';
import { useResidentStore } from '../context/useResidentStore';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import { getStyles } from '../styles/SafeCheckInScreen.styles';

export default function SafeCheckInScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);

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
    <View style={styles.container}>
      {/* ─── Custom Top Bar ─── */}
      <CustomHeader
        title="Relief Allocation Receipt"
        subtitle={isCheckedIn ? 'Claimed Shelter Supplies & Entry' : 'No Active Relief Allocation'}
        onBack={handleReturnToProfile}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isCheckedIn ? (
          /* ─── STATE A: No Active Relief Allocation Receipt ─── */
          <>
            <View style={[styles.statusBadgeIcon, { backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.border }]}>
              <PackageX size={38} color={colors.textMuted} />
            </View>

            <Text style={styles.statusTitle}>NO ACTIVE RELIEF RECEIPT</Text>
            <Text style={styles.statusSubtitle}>
              You currently have no claimed shelter relief allocations or active check-in records.
            </Text>

            {/* Information Card */}
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 18,
              width: '100%',
              borderWidth: 1,
              borderColor: colors.cardBorder,
              marginBottom: 24,
              gap: 14,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                  <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 13 }}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 2 }}>Proceed to Designated Shelter</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>Follow the evacuation map navigation to reach your assigned evacuation facility.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                  <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 13 }}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 2 }}>Show Family QR Code</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>Present the barcode on your Profile screen to LGU intake officers at the gate.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                  <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 13 }}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 2 }}>Automatic Receipt Issued</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>Your check-in timestamp and relief supply allocation will appear here automatically.</Text>
                </View>
              </View>
            </View>

            <PrimaryButton
              title="Return to Evacuation Map"
              onPress={() => navigation.navigate('Evacuation Map')}
              style={{ width: '100%', marginBottom: 12 }}
            />
          </>
        ) : (
          /* ─── STATE B: Active Relief Check-In Receipt ─── */
          <>
            <View style={[styles.statusBadgeIcon, { backgroundColor: colors.successBg, borderWidth: 2, borderColor: colors.success }]}>
              <CheckCircle size={44} color={colors.successLight} />
            </View>

            <Text style={styles.statusTitle}>OFFICIALLY CHECKED IN</Text>
            <Text style={styles.statusSubtitle}>
              Your household is securely recorded in the LGU Disaster Management Registry.
            </Text>

            {/* Official Relief Allocation Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Package size={24} color={colors.successLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>CSWDO Relief Receipt</Text>
                  <Text style={styles.cardSubtitle}>
                    Allocated at {allocation?.shelter_name || 'Evacuation Center'}
                  </Text>
                </View>
              </View>

              <View style={styles.list}>
                <View style={styles.listItem}>
                  <Text style={styles.itemLabel}>Intake Timestamp</Text>
                  <Text style={styles.itemValue}>
                    {allocation?.scanned_at
                      ? new Date(allocation.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.listItem}>
                  <Text style={styles.itemLabel}>Registered Headcount</Text>
                  <Text style={styles.itemValue}>
                    {allocation?.headcount || 1} Pax
                  </Text>
                </View>

                <View style={styles.listItem}>
                  <Text style={styles.itemLabel}>Relief Pack Status</Text>
                  <Text style={[styles.itemValue, { color: colors.successLight }]}>
                    {allocation?.relief_pack_claimed ? '✓ Claimed' : 'Pending Distribution'}
                  </Text>
                </View>

                <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
                  <Text style={styles.itemLabel}>Assigned Facility</Text>
                  <Text style={styles.itemValue} numberOfLines={1}>
                    {allocation?.shelter_name || 'Baliwasan Gym'}
                  </Text>
                </View>
              </View>

              <View style={styles.instructionBox}>
                <Text style={styles.instructionText}>
                  🛡️ Keep this screen ready when claiming hot meals, medical supplies, and relief kit supplements from logistics marshals.
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="Back to Home / Map"
              onPress={handleReturnToProfile}
              style={{ width: '100%', marginBottom: 12 }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
