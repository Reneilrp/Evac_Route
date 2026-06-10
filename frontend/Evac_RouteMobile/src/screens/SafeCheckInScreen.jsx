import { useEffect } from 'react';
import { View, Text, Vibration, FlatList } from 'react-native';
import { CheckCircle, Package } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import SkeletonLoader from '../components/SkeletonLoader';
import { colors } from '../styles/theme';
import styles from '../styles/SafeCheckInScreen.styles';

export default function SafeCheckInScreen({ navigation }) {
  const allocation = useResidentStore(state => state.allocation);

  useEffect(() => {
    // Physical Haptic Feedback — success pattern
    Vibration.vibrate([0, 500, 200, 500]);
  }, []);

  return (
    <View style={styles.container}>
      <CheckCircle size={100} color={colors.white} style={styles.icon} />

      <Text style={styles.title}>CHECK-IN SUCCESSFUL</Text>
      <Text style={styles.subtitle}>You are safe.</Text>

      {/* Real Relief Receipt from Backend */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Package size={28} color={colors.success} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Relief Allocation</Text>
            <Text style={styles.cardSubtitle}>
              {allocation?.shelter_name || 'Assigned Shelter'}
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {allocation?.allocation ? (
            <FlatList
              data={allocation.allocation}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={styles.itemLabel}>{item.name}</Text>
                  <Text style={styles.itemValue}>{item.quantity} {item.unit}</Text>
                </View>
              )}
              scrollEnabled={false}
            />
          ) : (
            // Skeleton loading placeholders
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
            Please proceed to the relief desk to claim your supplies.
          </Text>
        </View>
      </View>

      <View style={styles.backBtnContainer}>
        <PrimaryButton
          title="Return to Home Screen"
          onPress={() => navigation.navigate('Resident Home')}
          variant="outline"
          size="medium"
          textStyle={{ color: colors.successText }}
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        />
      </View>
    </View>
  );
}
