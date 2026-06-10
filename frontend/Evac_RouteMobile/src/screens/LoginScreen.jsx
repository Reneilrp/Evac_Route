
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react-native';
import styles from '../styles/LoginScreen.styles';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <ShieldAlert size={80} color="#3b82f6" />
      </View>
      <Text style={styles.title}>EVAC-ROUTE</Text>
      <Text style={styles.subtitle}>Zamboanga City Emergency Evacuation System</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('SetupProfile')}
      >
        <Text style={styles.buttonText}>REGISTER FAMILY</Text>
      </TouchableOpacity>

      {/* Dev helper to jump straight in */}
      <TouchableOpacity
        style={styles.devLink}
        onPress={() => login()}
      >
        <Text style={styles.devText}>[Dev] Login as Existing Resident</Text>
      </TouchableOpacity>
    </View>
  );
}

