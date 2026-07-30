import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Phone, Bell, Users, LogOut, ShieldCheck, ChevronRight, MapPin, X } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { colors } from '../styles/theme';
import styles from '../styles/ProfileQRScreen.styles';
import * as Crypto from 'expo-crypto';

export default function ProfileQRScreen({ navigation }) {
  const profile = useResidentStore(state => state.profile);
  const qrHash = useResidentStore(state => state.qrHash);
  const setSafeStatus = useResidentStore(state => state.setSafeStatus);
  const homeLocation = useResidentStore(state => state.homeLocation);
  const setHomeLocation = useResidentStore(state => state.setHomeLocation);
  const setProfileData = useResidentStore(state => state.setProfileData);
  const { user, logout } = useAuth();

  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [customLat, setCustomLat] = useState(homeLocation ? homeLocation[1].toString() : '6.9185');
  const [customLng, setCustomLng] = useState(homeLocation ? homeLocation[0].toString() : '122.0882');

  const effectiveId = profile?.id || user?.id || 1;
  const effectiveName = profile?.name || user?.name || 'Resident';
  const effectiveBarangay = profile?.barangay || user?.family_profile?.barangay || 'Tetuan';
  const effectiveHeadcount = profile?.headcount || user?.family_profile?.headcount || 1;
  const effectiveQrHash = qrHash || user?.family_profile?.qr_code_hash || `family_hash_${effectiveId}`;

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout? You will need to sign in again to access your account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
      ]
    );
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
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.safeHomeScroll} contentContainerStyle={styles.safeHomeContent}>

        {/* ─── 1. HERO: Family Relief QR Code Card (Top Priority) ─── */}
        <View style={{
          backgroundColor: '#0f172a',
          borderRadius: 24,
          padding: 20,
          alignItems: 'center',
          marginBottom: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14 }}>
            FAMILY RELIEF QR CODE
          </Text>

          <View style={{
            padding: 14,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
          }}>
            {totpPayload ? (
              <QRCode value={totpPayload} size={180} color="#000000" bgColor="#ffffff" />
            ) : (
              <EmptyState
                title="Generating QR Code..."
                subtitle="Please wait while your family QR code initializes"
              />
            )}
          </View>

          <Text style={{
            color: '#94a3b8',
            fontSize: 11,
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            marginTop: 12,
            fontWeight: '600'
          }} numberOfLines={1} ellipsizeMode="middle">
            {totpPayload || 'N/A'}
          </Text>

          <Text style={{
            color: '#cbd5e1',
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
          backgroundColor: '#0f172a',
          borderRadius: 20,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          elevation: 4,
        }}>
          {/* Avatar Ring */}
          <View style={{ position: 'relative', marginRight: 14 }}>
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#0284c7',
              borderWidth: 2,
              borderColor: '#38bdf8',
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
              backgroundColor: '#16a34a',
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: '#0f172a',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={12} color="#ffffff" />
            </View>
          </View>

          {/* Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 2 }}>
                {effectiveName}
              </Text>
              <TouchableOpacity
                onPress={() => setIsHomeModalOpen(true)}
                style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' }}
              >
                <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              ID: RES-{effectiveId.toString().padStart(6, '0')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ backgroundColor: '#1e293b', color: '#38bdf8', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                📍 Brgy. {effectiveBarangay}
              </Text>
              <Text style={{ backgroundColor: '#14532d', color: '#4ade80', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                👨‍👩‍👧‍👦 Family of {effectiveHeadcount}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 3. Clickable Action Menu List ─── */}
        <View style={{
          backgroundColor: '#0f172a',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {[
            {
              title: 'Pinpoint Home Address',
              subtitle: homeLocation ? `📍 Home set: ${homeLocation[1].toFixed(4)}, ${homeLocation[0].toFixed(4)}` : 'Tap to pinpoint home GPS coordinates for A* routing',
              icon: <MapPin size={20} color="#38bdf8" />,
              iconBg: 'rgba(56, 189, 248, 0.15)',
              onPress: () => setIsHomeModalOpen(true),
            },
            {
              title: 'Emergency Contacts',
              subtitle: 'Tap to view emergency hotlines & medical numbers',
              icon: <Phone size={20} color={colors.dangerLight} />,
              iconBg: 'rgba(239, 68, 68, 0.15)',
              onPress: () => navigation.navigate('EmergencyContacts'),
            },
            {
              title: 'Alert History',
              subtitle: 'Past evacuation orders & emergency notifications',
              icon: <Bell size={20} color={colors.warning} />,
              iconBg: 'rgba(245, 158, 11, 0.15)',
              onPress: () => navigation.navigate('AlertHistory'),
            },
            {
              title: 'Relief Allocation Receipt',
              subtitle: 'View claimed shelter supplies & active allocations',
              icon: <Users size={20} color={colors.primary} />,
              iconBg: 'rgba(59, 130, 246, 0.15)',
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
                borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>
                  {item.title}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                  {item.subtitle}
                </Text>
              </View>
              <ChevronRight size={18} color="#64748b" />
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
          backgroundColor: 'rgba(2, 6, 23, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: '#0f172a',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: '#38bdf8',
            padding: 22,
            elevation: 15,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 1, borderColor: '#38bdf8', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={22} color="#38bdf8" />
                </View>
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '900' }}>Pinpoint Home Address</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>A* System Evacuation Starting Point</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsHomeModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Current Coordinates Badge */}
            <View style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', marginBottom: 16 }}>
              <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>CURRENT PINPOINT COORDINATES:</Text>
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                Lat: {customLat} | Lng: {customLng}
              </Text>
            </View>

            {/* Barangay Preset Buttons */}
            <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '800', marginBottom: 8 }}>QUICK BARANGAY PRESET ANCHORS:</Text>
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
                    backgroundColor: customLat === b.lat.toString() ? '#0284c7' : 'rgba(30, 41, 59, 0.6)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: customLat === b.lat.toString() ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>📍 {b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Inputs */}
            <View style={{ gap: 10, marginBottom: 20 }}>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Latitude (e.g. 6.9185)</Text>
                <TextInput
                  value={customLat}
                  onChangeText={setCustomLat}
                  keyboardType="numeric"
                  placeholderTextColor="#64748b"
                  style={{ backgroundColor: '#1e293b', color: '#ffffff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#334155' }}
                />
              </View>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Longitude (e.g. 122.0882)</Text>
                <TextInput
                  value={customLng}
                  onChangeText={setCustomLng}
                  keyboardType="numeric"
                  placeholderTextColor="#64748b"
                  style={{ backgroundColor: '#1e293b', color: '#ffffff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: '#334155' }}
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
                  backgroundColor: '#16a34a',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(74, 222, 128, 0.4)',
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
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
                style={{ backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
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
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '800' }}>Reset to Live GPS Signal</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
