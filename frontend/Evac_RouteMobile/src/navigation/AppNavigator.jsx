import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MapPin, QrCode, AlertTriangle, BarChart2, Package, User, LifeBuoy, Navigation } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../styles/theme';
import api from '../services/api';
import FloatingDock from '../components/FloatingDock';

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
import StaffScannerScreen from '../screens/StaffScannerScreen';
import StaffOverviewScreen from '../screens/StaffOverviewScreen';
import StaffProfileScreen from '../screens/StaffProfileScreen';
import DispatchQueueScreen from '../screens/DispatchQueueScreen';
import DispatchDetailScreen from '../screens/DispatchDetailScreen';
import RescueDutyScreen from '../screens/RescueDutyScreen';
import RescueMapScreen from '../screens/RescueMapScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Protected Staff Tabs (Rescue + Scanner + Dispatch + Overview + Profile)
function StaffTabs({ pendingDispatchCount, user }) {
  const { colors } = useTheme();
  const isAdmin = user?.role === 'admin';
  const isRescueUser =
    user?.operator_type === 'rescue' ||
    !!user?.assigned_rescue_unit_id ||
    !!user?.rescue_role ||
    user?.email?.toLowerCase().includes('rescue');
  const isScannerUser =
    user?.operator_type === 'scanner' ||
    !!user?.assigned_shelter_id ||
    user?.email?.toLowerCase().includes('scanner');

  const initialRoute = isRescueUser ? 'Rescue' : 'Scanner';

  return (
    <Tab.Navigator
      initialRouteName={initialRoute}
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Rescue')    return <LifeBuoy   color={color} size={size} />;
          if (route.name === 'RescueMap') return <Navigation color={color} size={size} />;
          if (route.name === 'Scanner')   return <QrCode     color={color} size={size} />;
          if (route.name === 'Dispatch')  return <Package    color={color} size={size} />;
          if (route.name === 'Overview')  return <BarChart2  color={color} size={size} />;
          if (route.name === 'Profile')   return <User       color={color} size={size} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
      })}
    >
      {(isAdmin || isRescueUser) && (
        <Tab.Screen
          name="Rescue"
          component={RescueDutyScreen}
          options={{
            tabBarLabel: 'Rescue',
            tabBarActiveTintColor: colors.danger,
          }}
        />
      )}
      {(isAdmin || isRescueUser) && (
        <Tab.Screen
          name="RescueMap"
          component={RescueMapScreen}
          options={{
            tabBarLabel: 'Map',
            tabBarActiveTintColor: '#06b6d4',
            tabBarStyle: { display: 'none' },
          }}
        />
      )}
      {(isAdmin || isScannerUser || (!isRescueUser && !isScannerUser)) && (
        <Tab.Screen
          name="Scanner"
          component={StaffScannerScreen}
          options={{
            tabBarLabel: 'Intake',
            tabBarActiveTintColor: colors.primary,
          }}
        />
      )}
      {(isAdmin || isRescueUser) && (
        <Tab.Screen
          name="Dispatch"
          component={DispatchQueueScreen}
          options={{
            tabBarLabel: 'Missions',
            tabBarBadge: pendingDispatchCount > 0 ? pendingDispatchCount : undefined,
          }}
        />
      )}
      {(isAdmin || !isRescueUser) && (
        <Tab.Screen
          name="Overview"
          component={StaffOverviewScreen}
          options={{
            tabBarLabel: 'Overview',
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarActiveTintColor: colors.primary,
        }}
      />
    </Tab.Navigator>
  );
}

// Protected Resident Tabs
function ResidentTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingDock {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Evacuation Map') {
            return <MapPin color={color} size={size} />;
          } else if (route.name === 'Report Hazard') {
            return <AlertTriangle color={color} size={size} />;
          } else if (route.name === 'Profile') {
            return <User color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Evacuation Map"
        component={EvacMapScreen}
        options={{ tabBarLabel: 'Evac Map' }}
      />
      <Tab.Screen
        name="Report Hazard"
        component={ReportIncidentScreen}
        options={{
          tabBarLabel: 'Report',
          tabBarActiveTintColor: colors.warning,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileQRScreen}
        options={{ tabBarLabel: 'My QR' }}
      />
    </Tab.Navigator>
  );
}

// Animated Splash Screen
function SplashScreen() {
  const { colors } = useTheme();
  const fadeAnimRef = useRef(new Animated.Value(0));
  const scaleAnimRef = useRef(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimRef.current, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnimRef.current, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
    ]).start();
  }, []);

  return (
    <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
      <Animated.View style={{ opacity: fadeAnimRef.current, transform: [{ scale: scaleAnimRef.current }] }}>
        <Text style={[styles.splashTitle, { color: colors.textPrimary }]}>EVAC_ROUTE</Text>
        <Text style={[styles.splashSubtitle, { color: colors.textMuted }]}>Disaster Response System</Text>
      </Animated.View>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [hasOnboarded, setHasOnboarded] = useState(null);

  // Dynamic NavigationContainer theme compatible with React Navigation 7
  const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const navTheme = useMemo(() => ({
    ...baseTheme,
    dark: isDarkMode,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.danger,
    },
  }), [isDarkMode, colors, baseTheme]);

  // Pending dispatch count for the tab badge — only fetched when logged in as staff
  const isStaff = user?.role === 'admin' || user?.role === 'lgu_staff';
  const { data: dispatchData } = useQuery({
    queryKey: ['dispatch-orders'],
    queryFn: () => api.get('/dispatch-orders').then(r => r.data),
    enabled: !!isStaff,
    refetchInterval: 30000,
  });
  const pendingDispatchCount = (dispatchData?.data ?? []).filter(o => o.status === 'pending').length;

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {user ? (
            // ─── Authenticated: Protected screens ───
            <Stack.Group>
              {user.role === 'admin' || user.role === 'lgu_staff' ? (
                // Staff: Scanner + Dispatch + Overview tabs, plus Dispatch detail stack
                <>
                  <Stack.Screen
                    name="Root"
                  >
                    {() => (
                      <StaffTabs
                        pendingDispatchCount={pendingDispatchCount}
                        user={user}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen
                    name="DispatchDetail"
                    component={DispatchDetailScreen}
                    options={{ animation: 'slide_from_right' }}
                  />
                  <Stack.Screen
                    name="RescueMap"
                    component={RescueMapScreen}
                    options={{ animation: 'slide_from_right' }}
                  />
                </>
              ) : (
                <>
                  <Stack.Screen name="Root" component={ResidentTabs} />
                  <Stack.Screen
                    name="SafeCheckIn"
                    component={SafeCheckInScreen}
                    options={{ animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
                  <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
                </>
              )}
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
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    ...typography.hero,
    textAlign: 'center',
    letterSpacing: 4,
  },
  splashSubtitle: {
    ...typography.label,
    letterSpacing: 2,
    marginTop: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
