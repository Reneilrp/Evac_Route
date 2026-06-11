import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Navigation, MapPin, Phone, Bell, Users, LogOut } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import StatusBanner from '../components/StatusBanner';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { colors } from '../styles/theme';
import styles from '../styles/ProfileQRScreen.styles';
import * as Crypto from 'expo-crypto';

export default function ProfileQRScreen({ navigation }) {
  const profile = useResidentStore(state => state.profile);
  const qrHash = useResidentStore(state => state.qrHash);
  const status = useResidentStore(state => state.status);
  const setSafeStatus = useResidentStore(state => state.setSafeStatus);
  const { logout } = useAuth();

  // Danger mode pulse animation
  const pulseAnimRef = useRef(new Animated.Value(1));
  useEffect(() => {
    const anim = pulseAnimRef.current;
    if (status === 'danger') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.setValue(1);
    }
  }, [status]);

  // Dynamic TOTP Payload Generation
  const [totpPayload, setTotpPayload] = useState(null);
  useEffect(() => {
    if (!qrHash || !profile?.id) return;
    
    let isMounted = true;
    
    const generateTotp = async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const dataToSign = `${profile.id}:${timestamp}${qrHash}`;
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataToSign);
      if (isMounted) {
        setTotpPayload(`${profile.id}:${timestamp}:${hash}`);
      }
    };

    generateTotp();
    const interval = setInterval(generateTotp, 5000); // Regenerate every 5 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [qrHash, profile?.id]);

  // Poll check-in status every 5 seconds
  const { data: statusUpdate } = useQuery({
    queryKey: ['my-status'],
    queryFn: () => api.get('/my-status').then(res => res.data),
    refetchInterval: (query) => (query.state.data?.status === 'safe' ? false : 5000),
    enabled: !!qrHash
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

  // ─── SAFE MODE: Calm home screen ───
  if (status !== 'danger') {
    return (
      <View style={styles.container}>
        <StatusBanner status="safe" />

        <ScrollView style={styles.safeHomeScroll} contentContainerStyle={styles.safeHomeContent}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{getInitials(profile?.name)}</Text>
            </View>
            <Text style={styles.profileName}>{profile?.name || 'Resident'}</Text>
            <Text style={styles.profileBarangay}>Brgy. {profile?.barangay || 'N/A'}</Text>
            <Text style={styles.profileTimestamp}>Last updated: Just now</Text>
          </View>

          {/* Quick Links Grid */}
          <View style={styles.quickLinksGrid}>
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('Evacuation Map')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MapPin size={22} color={colors.successLight} />
              </View>
              <Text style={styles.quickLinkLabel}>View Shelters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('EmergencyContacts')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Phone size={22} color={colors.dangerLight} />
              </View>
              <Text style={styles.quickLinkLabel}>Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('AlertHistory')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Bell size={22} color={colors.warning} />
              </View>
              <Text style={styles.quickLinkLabel}>Alert History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('SafeCheckIn')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Users size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickLinkLabel}>Relief Info</Text>
            </TouchableOpacity>
          </View>

          {/* QR Code Card (Compact) */}
          <View style={styles.qrCardSmall}>
            <Text style={styles.qrCardTitle}>YOUR FAMILY QR ID</Text>

            <View style={styles.qrWrapper}>
              {totpPayload ? (
                <QRCode value={totpPayload} size={180} color="#000000" bgColor="#ffffff" />
              ) : (
                <EmptyState
                  title="No QR Generated"
                  subtitle="Complete registration to receive your family QR code"
                />
              )}
            </View>

            <Text style={styles.qrHashText} numberOfLines={1} ellipsizeMode="middle">{totpPayload || 'N/A'}</Text>

            {profile && (
              <View style={styles.qrInfoBox}>
                <Text style={styles.qrInfoText}>{profile.name}</Text>
                <Text style={styles.qrInfoText}>Brgy. {profile.barangay}</Text>
                <View style={styles.headcountBadge}>
                  <Text style={styles.headcountText}>Family of {profile.headcount}</Text>
                </View>
              </View>
            )}

            <Text style={styles.qrInstruction}>
              Keep this screen open. LGU staff will scan this at the shelter door.
            </Text>
          </View>

          {/* Logout */}
          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              title="Sign Out"
              onPress={logout}
              variant="outline"
              size="small"
              icon={<LogOut size={16} color={colors.textMuted} />}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── DANGER MODE: Evacuation urgency ───
  return (
    <View style={styles.container}>
      <StatusBanner status="danger" />

      {/* Pulsing Evacuate Button */}
      <View style={styles.dangerActionArea}>
        <Animated.View style={{ width: '100%', transform: [{ scale: pulseAnimRef.current }] }}>
          <TouchableOpacity
            style={styles.evacuateBtn}
            onPress={() => navigation.navigate('Evacuation Map')}
            activeOpacity={0.8}
          >
            <Navigation color="#fff" size={48} style={{ marginBottom: 10 }} />
            <Text style={styles.evacuateText}>FIND SAFE ROUTE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Full QR Card */}
      <View style={styles.qrCardFull}>
        <Text style={styles.qrCardTitle}>YOUR FAMILY QR ID</Text>

        <View style={styles.qrWrapper}>
          {totpPayload ? (
            <QRCode value={totpPayload} size={180} color="#000000" bgColor="#ffffff" />
          ) : (
            <EmptyState
              title="No QR Generated"
              subtitle="Complete registration to receive your family QR code"
            />
          )}
        </View>

        <Text style={styles.qrHashText} numberOfLines={1} ellipsizeMode="middle">{totpPayload || 'N/A'}</Text>

        {profile && (
          <View style={styles.qrInfoBox}>
            <Text style={styles.qrInfoText}>{profile.name}</Text>
            <Text style={styles.qrInfoText}>Brgy. {profile.barangay}</Text>
            <View style={styles.headcountBadge}>
              <Text style={styles.headcountText}>Family of {profile.headcount}</Text>
            </View>
          </View>
        )}

        <Text style={styles.qrInstruction}>
          Keep this screen open. LGU staff will scan this at the shelter door.
        </Text>
      </View>
    </View>
  );
}
