
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapPin, QrCode } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

// Import Screens
import EvacMapScreen from '../screens/EvacMapScreen';
import ProfileQRScreen from '../screens/ProfileQRScreen';
import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import SafeCheckInScreen from '../screens/SafeCheckInScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Protected Resident Tabs
function ResidentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Evacuation Map') {
            return <MapPin color={color} size={size} />;
          } else if (route.name === 'Resident Home') {
            return <QrCode color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' }
      })}
    >
      <Tab.Screen name="Resident Home" component={ProfileQRScreen} />
      <Tab.Screen name="Evacuation Map" component={EvacMapScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>EVAC_ROUTE</Text>
        <Text style={styles.splashSubtitle}>Disaster Response System</Text>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // If logged in, show the protected tabs
          <Stack.Group>
            <Stack.Screen name="Root" component={ResidentTabs} />
            <Stack.Screen name="SafeCheckIn" component={SafeCheckInScreen} />
          </Stack.Group>
        ) : (
          // If NOT logged in, show the Auth stack
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SetupProfile" component={ProfileSetupScreen} options={{ headerShown: true, title: 'Back' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
  },
  splashSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
