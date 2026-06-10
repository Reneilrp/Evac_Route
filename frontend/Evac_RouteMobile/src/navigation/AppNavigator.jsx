import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MapPin, QrCode, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../styles/theme';

// Import Screens
import EvacMapScreen from '../screens/EvacMapScreen';
import ProfileQRScreen from '../screens/ProfileQRScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import SafeCheckInScreen from '../screens/SafeCheckInScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import AlertHistoryScreen from '../screens/AlertHistoryScreen';

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
          } else if (route.name === 'Report Hazard') {
            return <AlertTriangle color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.surface,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Resident Home" component={ProfileQRScreen} />
      <Tab.Screen name="Evacuation Map" component={EvacMapScreen} />
      <Tab.Screen
        name="Report Hazard"
        component={ReportIncidentScreen}
        options={{ tabBarActiveTintColor: colors.warning }}
      />
    </Tab.Navigator>
  );
}

// Animated Splash Screen
function SplashScreen() {
  const fadeAnimRef = useRef(new Animated.Value(0));
  const scaleAnimRef = useRef(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimRef.current, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnimRef.current, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
    ]).start();
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={{ opacity: fadeAnimRef.current, transform: [{ scale: scaleAnimRef.current }] }}>
        <Text style={styles.splashTitle}>EVAC_ROUTE</Text>
        <Text style={styles.splashSubtitle}>Disaster Response System</Text>
      </Animated.View>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(null); // null = loading, true/false = known

  // Check onboarding status on mount
  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then(value => {
      setHasOnboarded(value === 'true');
    });
  }, []);

  if (loading || hasOnboarded === null) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {user ? (
            // ─── Authenticated: Protected screens ───
            <Stack.Group>
              <Stack.Screen name="Root" component={ResidentTabs} />
              <Stack.Screen
                name="SafeCheckIn"
                component={SafeCheckInScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
              <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
            </Stack.Group>
          ) : (
            // ─── Unauthenticated: Onboarding + Auth stack ───
            <Stack.Group>
              {!hasOnboarded && (
                <Stack.Screen
                  name="Onboarding"
                  component={OnboardingScreen}
                  options={{ animation: 'fade' }}
                />
              )}
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ animation: 'fade' }}
              />
              <Stack.Screen
                name="SetupProfile"
                component={ProfileSetupScreen}
                options={{
                  headerShown: true,
                  title: 'Back',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  animation: 'slide_from_right',
                }}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  splashSubtitle: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
