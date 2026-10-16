import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Phone, Bell, Users, LogOut, ShieldCheck, ChevronRight, MapPin, X, Sun, Moon, Edit3, Footprints, Bike, Car, Check } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import ConfirmationModal from '../components/ConfirmationModal';
import { getStyles } from '../styles/ProfileQRScreen.styles';
import * as Crypto from 'expo-crypto';

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

export default function ProfileQRScreen({ navigation }) {
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
  const { user, logout } = useAuth();

  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [customLat, setCustomLat] = useState(homeLocation ? homeLocation[1].toString() : '6.9185');
  const [customLng, setCustomLng] = useState(homeLocation ? homeLocation[0].toString() : '122.0882');

  const effectiveId = profile?.id || user?.id || 1;
  const effectiveName = profile?.name || user?.name || 'Resident';
  const effectiveBarangay = profile?.barangay || user?.family_profile?.barangay || user?.familyProfile?.barangay || 'Tetuan';
  const effectiveHeadcount = profile?.headcount || user?.family_profile?.headcount || user?.familyProfile?.headcount || 1;
  const effectiveTransportMode = transportationMode || profile?.transportation_mode || user?.family_profile?.transportation_mode || user?.familyProfile?.transportation_mode || 'pedestrian';
  const effectiveQrHash = qrHash || user?.family_profile?.qr_code_hash || user?.familyProfile?.qr_code_hash || `family_hash_${effectiveId}`;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Dynamic TOTP Payload Generation
  const [totpPayload, setTotpPayload] = useState(null);
  useEffect(() => {
    let isMounted = true;
    
    const generateTotp = async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const dataToSign = `${effectiveId}:${timestamp}:${effectiveQrHash}`;
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataToSign);
      if (isMounted) {
        setTotpPayload(`${effectiveId}:${timestamp}:${hash.substring(0, 16)}`);
      }
    };

    generateTotp();
    const interval = setInterval(generateTotp, 5000); // Regenerate every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [effectiveId, effectiveQrHash]);

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

          <Text style={{
            color: colors.textSecondary,
            fontSize: 11,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            marginTop: 12,
            fontWeight: '600'
          }} numberOfLines={1} ellipsizeMode="middle">
            {totpPayload || 'N/A'}
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

      </ScrollView>

      {/* ─── CUSTOM PINPOINT HOME LOCATION MODAL ─── */}
      <Modal
        visible={isHomeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsHomeModalOpen(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: colors.modalBackdrop,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: colors.primary,
            padding: 22,
            elevation: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>Pinpoint Home Address</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>A* System Evacuation Starting Point</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsHomeModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Current Coordinates Badge */}
            <View style={{ backgroundColor: colors.surfaceElevated, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>CURRENT PINPOINT COORDINATES:</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                Lat: {customLat} | Lng: {customLng}
              </Text>
            </View>

            {/* Barangay Preset Buttons */}
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 8 }}>QUICK BARANGAY PRESET ANCHORS:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[
                { name: 'Sto. Niño (Triplet)', lat: 6.9050, lng: 122.0720 },
                { name: 'Tetuan', lat: 6.9185, lng: 122.0882 },
                { name: 'Tumaga', lat: 6.9410, lng: 122.0780 },
                { name: 'Baliwasan', lat: 6.9126, lng: 122.0573 },
                { name: 'San Jose', lat: 6.9230, lng: 122.0450 },
                { name: 'Putik', lat: 6.9350, lng: 122.0950 },
              ].map((b, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setCustomLat(b.lat.toString());
                    setCustomLng(b.lng.toString());
                    setHomeLocation([b.lng, b.lat]);
                    setProfileData({
                      ...(profile || {}),
                      name: effectiveName,
                      barangay: b.name.replace(' (Triplet)', ''),
                      headcount: effectiveHeadcount
                    }, effectiveQrHash);
                  }}
                  style={{
                    backgroundColor: customLat === b.lat.toString() ? colors.primaryDark : colors.surfaceElevated,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: customLat === b.lat.toString() ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: customLat === b.lat.toString() ? '#ffffff' : colors.textPrimary, fontSize: 11, fontWeight: '800' }}>📍 {b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Inputs */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Latitude (e.g. 6.9185)</Text>
                <TextInput
                  value={customLat}
                  onChangeText={setCustomLat}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: colors.inputBorder }}
                />
              </View>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Longitude (e.g. 122.0882)</Text>
                <TextInput
                  value={customLng}
                  onChangeText={setCustomLng}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: colors.inputBorder }}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setIsHomeModalOpen(false);
                  navigation.navigate('Evacuation Map', { pinHome: true });
                }}
                style={{
                  backgroundColor: colors.success,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.successLight,
                  shadowColor: colors.success,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13.5, fontWeight: '900' }}>
                  🗺️ Tap Map to Select Home Address
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const latNum = parseFloat(customLat);
                  const lngNum = parseFloat(customLng);
                  if (isNaN(latNum) || isNaN(lngNum)) {
                    Alert.alert('Invalid Coordinates', 'Please enter valid numerical latitude and longitude.');
                    return;
                  }
                  setHomeLocation([lngNum, latNum]);
                  setIsHomeModalOpen(false);
                  Alert.alert(
                    '📍 Home Address Pinpointed!',
                    `Home location set to [${latNum.toFixed(4)}, ${lngNum.toFixed(4)}]. System A* evacuation routes will now start from this home address!`,
                    [{ text: 'OK' }]
                  );
                }}
                style={{ backgroundColor: colors.primaryDark, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>Save Custom Coordinates</Text>
              </TouchableOpacity>

              {homeLocation && (
                <TouchableOpacity
                  onPress={() => {
                    setHomeLocation(null);
                    setIsHomeModalOpen(false);
                    Alert.alert('Reset Home Location', 'Home pinpoint removed. App will default to live GPS signal.');
                  }}
                  style={{ backgroundColor: colors.dangerBg, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger }}
                >
                  <Text style={{ color: colors.dangerText, fontSize: 12, fontWeight: '800' }}>Reset to Live GPS Signal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── TRANSPORTATION MODE & DISASTER PROTOCOL MODAL ─── */}
      <Modal
        visible={isTransportModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTransportModalOpen(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: colors.modalBackdrop,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 400,
            maxHeight: '85%',
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: colors.primary,
            padding: 20,
            elevation: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primaryGlow,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {effectiveTransportMode === '4_wheel' ? (
                    <Car size={20} color={colors.primary} />
                  ) : effectiveTransportMode === '2_wheel' ? (
                    <Bike size={20} color={colors.primary} />
                  ) : (
                    <Footprints size={20} color={colors.primary} />
                  )}
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>Transportation Mode</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>A* Routing & Flood Safety Protocols</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsTransportModalOpen(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              {TRANSPORTATION_OPTIONS.map((opt) => {
                const isSelected = effectiveTransportMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setTransportationMode(opt.id);
                      setProfileData({
                        ...(profile || {}),
                        transportation_mode: opt.id,
                      }, effectiveQrHash);
                      setIsTransportModalOpen(false);
                      Alert.alert(
                        'Transportation Mode Updated',
                        `Switched to ${opt.label}. Evacuation routes on the map will now adapt to this mode.`,
                        [{ text: 'OK' }]
                      );
                    }}
                    style={{
                      backgroundColor: isSelected ? (isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe') : colors.surfaceElevated,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                        <View>
                          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '900' }}>
                            {opt.label}
                          </Text>
                          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                            {opt.badge}
                          </Text>
                        </View>
                      </View>
                      <View style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                    </View>

                    {/* Operational Protocols */}
                    <View style={{
                      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                      borderRadius: 10,
                      padding: 10,
                      gap: 4,
                    }}>
                      <Text style={{ color: colors.successLight, fontSize: 11, lineHeight: 15 }}>
                        {opt.pros}
                      </Text>
                      <Text style={{ color: colors.warning, fontSize: 11, lineHeight: 15 }}>
                        {opt.floodWarning}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10.5, lineHeight: 14 }}>
                        {opt.limits}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
