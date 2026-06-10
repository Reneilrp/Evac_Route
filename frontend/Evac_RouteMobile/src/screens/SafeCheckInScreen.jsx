import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Vibration, FlatList } from 'react-native';
import { CheckCircle, Package } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import styles from '../styles/SafeCheckInScreen.styles';

export default function SafeCheckInScreen({ navigation }) {
  const allocation = useResidentStore(state => state.allocation);

  useEffect(() => {
    // 1. Physical Haptic Feedback
    Vibration.vibrate([0, 500, 200, 500]);
  }, []);

  return (
    <View style={styles.container}>
      <CheckCircle size={100} color="#fff" style={styles.icon} />

      <Text style={styles.title}>CHECK-IN SUCCESSFUL</Text>
      <Text style={styles.subtitle}>You are safe.</Text>

      {/* Real Relief Receipt from Backend */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Package size={28} color="#16a34a" />
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
            <Text style={{ textAlign: 'center', color: '#64748b' }}>Retrieving allocation data...</Text>
          )}
        </View>

        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Please proceed to the relief desk to claim your supplies.
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('Resident Home')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Return to Home Screen</Text>
      </TouchableOpacity>
    </View>
  );
}

