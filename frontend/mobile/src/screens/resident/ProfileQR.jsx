import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput, Switch, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Phone, Bell, Users, LogOut, ShieldCheck, ChevronRight, MapPin, X, Sun, Moon, Edit3, Footprints, Bike, Car, Check, Vibrate, VibrateOff, Sparkles } from 'lucide-react-native';
import { useResidentStore } from '../../context/useResidentStore';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PrimaryButton from '../../components/common/PrimaryButton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PinpointHomeModal from '../../components/resident/modals/PinpointHomeModal';
import TransportProtocolModal from '../../components/resident/modals/TransportProtocolModal';
import * as Location from 'expo-location';
import { clampToZamboanga, ZAMBOANGA_WMSU, getNearestBarangay } from '../../utils/zamboangaGeo';
import { getStyles } from '../../styles/ProfileQR.styles';
import * as Crypto from 'expo-crypto';
import { APP_FULL_VERSION } from '../../config/version';

const TRANSPORTATION_OPTIONS = [
  {
    id: 'pedestrian',
    label: 'Walking / Pedestrian',
    badge: 'FOOT TRAVEL · NARROW ALLEYS',
    icon: '🚶',
    description: 'Evacuation on foot through residential corridors and alleys.',
    pros: '✓ Accessible across narrow footpaths, stairs, and footbridges.',
    floodWarning: '⚠️ Hazard: Avoid water depth >0.3m (knee deep) due to hidden open drains and strong currents.',
    limits: '• Limited supply payload; higher fatigue risk over long distances.',
  },
  {
    id: '2_wheel',
    label: '2-Wheel (Motorcycle / Bike)',
    badge: 'HIGH AGILITY · FAST EVAC',
    icon: '🏍️',
    description: 'Rapid escape through light traffic and residential side streets.',
    pros: '✓ Fast bypass through traffic gridlock and narrow neighborhood roads.',
    floodWarning: '⚠️ Hazard: Engine stalls if water reaches exhaust pipe (>0.2m depth); extreme slip hazard on wet mud/silt.',
    limits: '• Capacity limited to 1 passenger and small emergency bug-out pack.',
  },
  {
    id: '4_wheel',
    label: '4-Wheel (Car / SUV / Truck)',
    badge: 'FAMILY EVAC · PROVISION HAUL',
    icon: '🚗',
    description: 'Vehicle evacuation for entire household, provisions, and pets.',
    pros: '✓ High capacity: transports entire family, seniors, children, and heavy supplies.',
    floodWarning: '⚠️ Hazard: Strictly confined to wide roads; high risk of traffic gridlocks, fallen power lines, and tree blocks.',
    limits: '• Cannot traverse footbridges or narrow alleys; water >0.4m causes vehicle floating and loss of steering.',
  },
];

export default function ProfileQR({ navigation }) {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const styles = useThemedStyles(getStyles);

  const profile = useResidentStore(state => state.profile);
  const qrHash = useResidentStore(state => state.qrHash);
  const setSafeStatus = useResidentStore(state => state.setSafeStatus);
  const homeLocation = useResidentStore(state => state.homeLocation);
  const setHomeLocation = useResidentStore(state => state.setHomeLocation);
  const setProfileData = useResidentStore(state => state.setProfileData);
  const transportationMode = useResidentStore(state => state.transportationMode);
  const setTransportationMode = useResidentStore(state => state.setTransportationMode);
  const hapticFeedbackEnabled = useResidentStore(state => state.hapticFeedbackEnabled);
  const setHapticFeedbackEnabled = useResidentStore(state => state.setHapticFeedbackEnabled);
  const { user, logout } = useAuth();

  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [homeLatInput, setHomeLatInput] = useState(homeLocation ? homeLocation[1].toString() : '6.9185');
  const [homeLngInput, setHomeLngInput] = useState(homeLocation ? homeLocation[0].toString() : '122.0882');
  const [homeBarangay, setHomeBarangay] = useState(effectiveBarangay);
  const [homeAddressDesc, setHomeAddressDesc] = useState('');
  const [isPinpointLoading, setIsPinpointLoading] = useState(false);

  const handleUseCurrentGps = async () => {
    setIsPinpointLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to capture current GPS.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const clamped = clampToZamboanga([loc.coords.longitude, loc.coords.latitude], ZAMBOANGA_WMSU);
      setHomeLngInput(clamped[0].toFixed(5));
      setHomeLatInput(clamped[1].toFixed(5));
      const nearest = getNearestBarangay(clamped[0], clamped[1]);
      if (nearest) setHomeBarangay(nearest);
      Alert.alert('GPS Captured', `Coordinates set to ${clamped[1].toFixed(4)}°N, ${clamped[0].toFixed(4)}°E (${nearest}).`);
    } catch (_err) {
      Alert.alert('Error', 'Failed to retrieve current GPS location.');
    } finally {
      setIsPinpointLoading(false);
    }
  };

  const handleSaveHomeLocation = () => {
    const lat = parseFloat(homeLatInput);
    const lng = parseFloat(homeLngInput);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid numerical latitude and longitude values.');
      return;
    }
    const clamped = clampToZamboanga([lng, lat], ZAMBOANGA_WMSU);
    setHomeLocation([clamped[0], clamped[1]]);
    setProfileData({
      ...(profile || {}),
      name: effectiveName,
      barangay: homeBarangay || effectiveBarangay,
      headcount: effectiveHeadcount,
    }, effectiveQrHash);
    setIsHomeModalOpen(false);
    Alert.alert(
      '📍 Home Location Saved',
      `Home location set to [${clamped[1].toFixed(4)}, ${clamped[0].toFixed(4)}]. Evacuation routes will originate from this location.`,
      [{ text: 'OK' }]
    );
  };

  const familyObj = user?.family_profile || user?.familyProfile || user?.family || {};
  const effectiveId = profile?.user_id || user?.id || profile?.id || 1;
  const effectiveFamilyId = familyObj.id || profile?.family_profile_id || profile?.id || user?.id || 1;
  const effectiveName = profile?.name || user?.name || 'Resident';
  const effectiveBarangay = profile?.barangay || familyObj.barangay || 'Tetuan';
  const effectiveHeadcount = profile?.headcount || familyObj.headcount || 1;
  const effectiveTransportMode = transportationMode || profile?.transportation_mode || familyObj.transportation_mode || 'pedestrian';
  const effectiveQrHash = familyObj.qr_code_hash || qrHash || `hash_${effectiveId}`;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Dynamic TOTP Payload Generation
  const [totpPayload, setTotpPayload] = useState(null);
  useEffect(() => {
    let isMounted = true;
    
    const generateTotp = async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const dataToSign = `${effectiveFamilyId}:${timestamp}${effectiveQrHash}`;
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataToSign);
      if (isMounted) {
        setTotpPayload(`${effectiveFamilyId}:${timestamp}:${hash}`);
      }
    };

    generateTotp();
    const interval = setInterval(generateTotp, 5000); // Regenerate every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [effectiveFamilyId, effectiveQrHash]);

  // Poll check-in status every 5 seconds
  const { data: statusUpdate } = useQuery({
    queryKey: ['my-status'],
    queryFn: () => api.get('/my-status').then(res => res.data),
    refetchInterval: (query) => (query.state.data?.status === 'safe' ? false : 5000),
    enabled: !!effectiveQrHash
  });

  useEffect(() => {
    if (statusUpdate?.status === 'safe') {
      setSafeStatus(statusUpdate);
    }
  }, [statusUpdate, setSafeStatus]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.safeHomeScroll} contentContainerStyle={styles.safeHomeContent}>

        {/* ─── 1. HERO: Family Relief QR Code Card (High Contrast) ─── */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 24,
          padding: 20,
          alignItems: 'center',
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.35 : 0.08,
          shadowRadius: 10,
          elevation: 4,
        }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14 }}>
            FAMILY RELIEF QR CODE
          </Text>

          {/* Barcode scanner target container: must ALWAYS remain white background */}
          <View style={{
            padding: 14,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}>
            {totpPayload ? (
              <QRCode value={totpPayload} size={180} color="#000000" backgroundColor="#ffffff" />
            ) : (
              <EmptyState
                title="Generating QR Code..."
                subtitle="Please wait while your family QR code initializes"
              />
            )}
          </View>

          <Text
            selectable
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              marginTop: 12,
              fontWeight: '700',
            }}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            Manual Hash: {effectiveQrHash}
          </Text>

          <Text style={{
            color: colors.textMuted,
            fontSize: 11,
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 16,
            fontWeight: '500'
          }}>
            Present this QR code to LGU shelter staff upon arrival for immediate check-in and relief supply entry.
          </Text>
        </View>

        {/* ─── 2. Compact Resident Profile Summary Card ─── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          elevation: 3,
        }}>
          {/* Avatar Ring */}
          <View style={{ position: 'relative', marginRight: 14 }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primaryDark,
              borderWidth: 2,
              borderColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '900' }}>
                {getInitials(effectiveName)}
              </Text>
            </View>
            <View style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: colors.success,
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: colors.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={12} color="#ffffff" />
            </View>
          </View>

          {/* Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 2 }} numberOfLines={2}>
                {effectiveName}
              </Text>
              <TouchableOpacity
                onPress={() => setIsHomeModalOpen(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: colors.primaryGlow,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
                accessibilityLabel="Edit Profile"
              >
                <Edit3 size={11} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              ID: RES-{effectiveId.toString().padStart(6, '0')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <MapPin size={11} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>
                  Brgy. {effectiveBarangay}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.success }}>
                <Users size={11} color={colors.successText} />
                <Text style={{ color: colors.successText, fontSize: 10, fontWeight: 'bold' }}>
                  Family of {effectiveHeadcount}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsTransportModalOpen(true)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
              >
                {effectiveTransportMode === '4_wheel' ? (
                  <Car size={11} color={colors.primary} />
                ) : effectiveTransportMode === '2_wheel' ? (
                  <Bike size={11} color={colors.primary} />
                ) : (
                  <Footprints size={11} color={colors.primary} />
                )}
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 'bold' }}>
                  {effectiveTransportMode === '4_wheel' ? 'Car (4-Wheel)' : effectiveTransportMode === '2_wheel' ? 'Bike (2-Wheel)' : 'Walking'}
                </Text>
                <Edit3 size={9} color={colors.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── 3. Clickable Action Menu List ─── */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {/* Appearance / Theme Toggle item */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDarkMode ? 'rgba(251, 191, 36, 0.15)' : 'rgba(2, 132, 199, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              {isDarkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#0284c7" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>
                Appearance Theme
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                {isDarkMode ? 'Dark Mode enabled (tap to switch to Light)' : 'Light Mode enabled (tap to switch to Dark)'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: colors.primaryDark }}
              thumbColor={isDarkMode ? colors.primary : '#f8fafc'}
            />
          </TouchableOpacity>

          {/* Touch Haptic Feedback Toggle (Default: OFF) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: hapticFeedbackEnabled ? 'rgba(2, 132, 199, 0.15)' : (isDarkMode ? '#334155' : '#e2e8f0'),
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              {hapticFeedbackEnabled ? (
                <Vibrate size={20} color={colors.primary} />
              ) : (
                <VibrateOff size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              )}
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>
                Touch Haptic Feedback
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                {hapticFeedbackEnabled
                  ? 'Vibration enabled for button taps'
                  : 'Vibration disabled for regular taps (Default). Emergency alarms remain active.'}
              </Text>
            </View>
            <Switch
              value={hapticFeedbackEnabled}
              onValueChange={setHapticFeedbackEnabled}
              trackColor={{ false: '#cbd5e1', true: colors.primaryDark }}
              thumbColor={hapticFeedbackEnabled ? colors.primary : '#f8fafc'}
            />
          </View>

          {[
            {
              title: 'Transportation Mode & Safety',
              subtitle: `${effectiveTransportMode === '4_wheel' ? '🚗 4-Wheel (Car / SUV)' : effectiveTransportMode === '2_wheel' ? '🏍️ 2-Wheel (Motorcycle)' : '🚶 Walking (Pedestrian)'} · Tap to change mode & safety guidance`,
              icon: effectiveTransportMode === '4_wheel' ? <Car size={20} color={colors.primary} /> : effectiveTransportMode === '2_wheel' ? <Bike size={20} color={colors.primary} /> : <Footprints size={20} color={colors.primary} />,
              iconBg: colors.primaryGlow,
              onPress: () => setIsTransportModalOpen(true),
            },
            {
              title: 'Pinpoint Home Address',
              subtitle: (Array.isArray(homeLocation) && homeLocation.length >= 2) ? `📍 Home set: ${Number(homeLocation[1]).toFixed(4)}, ${Number(homeLocation[0]).toFixed(4)}` : 'Tap to pinpoint home GPS coordinates for A* routing',
              icon: <MapPin size={20} color={colors.primary} />,
              iconBg: colors.primaryGlow,
              onPress: () => setIsHomeModalOpen(true),
            },
            {
              title: 'Emergency Contacts',
              subtitle: 'Tap to view emergency hotlines & medical numbers',
              icon: <Phone size={20} color={colors.dangerLight} />,
              iconBg: colors.dangerBg,
              onPress: () => navigation.navigate('EmergencyContacts'),
            },
            {
              title: 'Alert History',
              subtitle: 'Past evacuation orders & emergency notifications',
              icon: <Bell size={20} color={colors.warning} />,
              iconBg: colors.warningBg,
              onPress: () => navigation.navigate('AlertHistory'),
            },
            {
              title: 'Relief Allocation Receipt',
              subtitle: 'View claimed shelter supplies & active allocations',
              icon: <Users size={20} color={colors.primary} />,
              iconBg: colors.primaryGlow,
              onPress: () => navigation.navigate('SafeCheckIn'),
            },
            {
              title: "What's New & Updates",
              subtitle: `v1.3.0 Release Notes, dynamic SOS & patch history`,
              icon: <Sparkles size={20} color="#f59e0b" />,
              iconBg: 'rgba(245, 158, 11, 0.15)',
              onPress: () => navigation.navigate('PatchNotes'),
            },
          ].map((item, index, array) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderBottomWidth: index < array.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: item.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                {item.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                  {item.subtitle}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 4. Sign Out Footer Button ─── */}
        <View style={{ marginBottom: 12 }}>
          <PrimaryButton
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            size="small"
            icon={<LogOut size={16} color={colors.textMuted} />}
          />
        </View>

        {/* ─── App Version Stamp (Synced via Hub) ─── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('PatchNotes')}
          activeOpacity={0.7}
        >
          <Text style={{
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
            marginBottom: 24,
            opacity: 0.8,
          }}>
            {APP_FULL_VERSION} · Tap for Patch Notes
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ─── CUSTOM PINPOINT HOME LOCATION MODAL ─── */}
      <PinpointHomeModal
        visible={isHomeModalOpen}
        onClose={() => setIsHomeModalOpen(false)}
        colors={colors}
        homeLocation={homeLocation}
        setHomeLocation={setHomeLocation}
        homeLatInput={homeLatInput}
        setHomeLatInput={setHomeLatInput}
        homeLngInput={homeLngInput}
        setHomeLngInput={setHomeLngInput}
        homeBarangay={homeBarangay}
        setHomeBarangay={setHomeBarangay}
        homeAddressDesc={homeAddressDesc}
        setHomeAddressDesc={setHomeAddressDesc}
        isPinpointLoading={isPinpointLoading}
        handleUseCurrentGps={handleUseCurrentGps}
        handleSaveHomeLocation={handleSaveHomeLocation}
      />

      {/* ─── TRANSPORTATION MODE & DISASTER PROTOCOL MODAL ─── */}
      <TransportProtocolModal
        visible={isTransportModalOpen}
        onClose={() => setIsTransportModalOpen(false)}
        colors={colors}
        isDarkMode={isDarkMode}
        selectedMode={effectiveTransportMode}
        onSelectMode={(mode) => {
          setTransportationMode(mode);
          setProfileData({
            ...(profile || {}),
            transportation_mode: mode,
          }, effectiveQrHash);
          setIsTransportModalOpen(false);
          Alert.alert(
            'Transportation Mode Updated',
            `Switched evacuation mode. Routes on the map will now adapt to this protocol.`,
            [{ text: 'OK' }]
          );
        }}
        transportOptions={TRANSPORTATION_OPTIONS}
      />

      {/* Styled Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        detail={effectiveName}
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        icon={LogOut}
        onConfirm={logout}
        onClose={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}
