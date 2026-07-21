import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Phone, Bell, Users, LogOut, ShieldCheck, ChevronRight } from 'lucide-react-native';
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
  const { user, logout } = useAuth();

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
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '900', marginBottom: 2 }}>
              {effectiveName}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              ID: RES-{effectiveId.toString().padStart(6, '0')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
    </SafeAreaView>
  );
}
