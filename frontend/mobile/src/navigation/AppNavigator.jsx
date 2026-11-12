import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, StatusBar, Image } from 'react-native';
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
import FloatingDock from '../components/common/FloatingDock';

// Import Screens
import EvacMap from '../screens/resident/EvacMap';
import ProfileQR from '../screens/resident/ProfileQR';
import Login from '../screens/auth/Login';
import Onboarding from '../screens/auth/Onboarding';
import ProfileSetup from '../screens/auth/ProfileSetup';
import SafeCheckIn from '../screens/resident/SafeCheckIn';
import ReportIncident from '../screens/resident/ReportIncident';
import EmergencyContacts from '../screens/resident/EmergencyContacts';
import AlertHistory from '../screens/resident/AlertHistory';
import StaffScanner from '../screens/cswdo/StaffScanner';
import StaffOverview from '../screens/cswdo/StaffOverview';
import StaffProfile from '../screens/cswdo/StaffProfile';
import DispatchQueue from '../screens/cdrrmo/DispatchQueue';
import DispatchDetail from '../screens/cdrrmo/DispatchDetail';
import RescueDuty from '../screens/cdrrmo/RescueDuty';
import RescueMap from '../screens/cdrrmo/RescueMap';
import PatchNotesScreen from '../screens/common/PatchNotesScreen';
import AppUpdateModal from '../components/common/AppUpdateModal';
import { AppUpdateProvider } from '../context/AppUpdateContext';

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
          component={RescueDuty}
          options={{
            tabBarLabel: 'Rescue',
            tabBarActiveTintColor: colors.danger,
          }}
        />
      )}
      {(isAdmin || isRescueUser) && (
        <Tab.Screen
          name="RescueMap"
          component={RescueMap}
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
          component={StaffScanner}
          options={{
            tabBarLabel: 'Intake',
            tabBarActiveTintColor: colors.primary,
          }}
        />
      )}
      {(isAdmin || isRescueUser) && (
        <Tab.Screen
          name="Dispatch"
          component={DispatchQueue}
          options={{
            tabBarLabel: 'Missions',
            tabBarBadge: pendingDispatchCount > 0 ? pendingDispatchCount : undefined,
          }}
        />
      )}
      {(isAdmin || !isRescueUser) && (
        <Tab.Screen
          name="Overview"
          component={StaffOverview}
          options={{
            tabBarLabel: 'Overview',
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={StaffProfile}
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
        component={EvacMap}
        options={{ tabBarLabel: 'Evac Map' }}
      />
      <Tab.Screen
        name="Report Hazard"
        component={ReportIncident}
        options={{
          tabBarLabel: 'Report',
          tabBarActiveTintColor: colors.warning,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileQR}
        options={{ tabBarLabel: 'My QR' }}
      />
    </Tab.Navigator>
  );
}

// Animated Splash Screen
function SplashScreen() {
  const { colors, isDarkMode } = useTheme();
  const fadeAnimRef = useRef(new Animated.Value(0));
  const scaleAnimRef = useRef(new Animated.Value(0.85));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnimRef.current, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnimRef.current, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
    ]).start();
  }, []);

  return (
    <View style={[styles.splashContainer, { backgroundColor: isDarkMode ? '#0b1326' : colors.background }]}>
      <Animated.View style={{ alignItems: 'center', opacity: fadeAnimRef.current, transform: [{ scale: scaleAnimRef.current }] }}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={{ width: 130, height: 130, marginBottom: 18, borderRadius: 28 }}
          resizeMode="contain"
        />
        <Text style={[styles.splashTitle, { color: isDarkMode ? '#ffffff' : colors.textPrimary }]}>EVAC-ROUTE</Text>
        <Text style={[styles.splashSubtitle, { color: isDarkMode ? '#94a3b8' : colors.textMuted }]}>Disaster Response System</Text>
      </Animated.View>
      <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 32 }} />
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
    <AppUpdateProvider>
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
                      component={DispatchDetail}
                      options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                      name="RescueMap"
                      component={RescueMap}
                      options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                      name="PatchNotes"
                      component={PatchNotesScreen}
                      options={{ animation: 'slide_from_right' }}
                    />
                  </>
                ) : (
                  <>
                    <Stack.Screen name="Root" component={ResidentTabs} />
                    <Stack.Screen
                      name="SafeCheckIn"
                      component={SafeCheckIn}
                      options={{ animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen name="EmergencyContacts" component={EmergencyContacts} />
                    <Stack.Screen name="AlertHistory" component={AlertHistory} />
                    <Stack.Screen
                      name="PatchNotes"
                      component={PatchNotesScreen}
                      options={{ animation: 'slide_from_right' }}
                    />
                  </>
                )}
              </Stack.Group>
            ) : (
              // ─── Unauthenticated: Onboarding + Auth stack ───
              <Stack.Group>
                {!hasOnboarded && (
                  <Stack.Screen
                    name="Onboarding"
                    component={Onboarding}
                    options={{ animation: 'fade' }}
                  />
                )}
                <Stack.Screen
                  name="Login"
                  component={Login}
                  options={{ animation: 'fade' }}
                />
                <Stack.Screen
                  name="SetupProfile"
                  component={ProfileSetup}
                  options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        {/* Global EAS Over-The-Air Update Modal */}
        <AppUpdateModal />
      </View>
    </AppUpdateProvider>
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
