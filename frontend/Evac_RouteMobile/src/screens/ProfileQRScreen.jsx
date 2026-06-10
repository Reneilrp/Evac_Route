import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AlertTriangle, Navigation } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import styles from '../styles/ProfileQRScreen.styles';

export default function ProfileQRScreen({ navigation }) {
  const profile = useResidentStore(state => state.profile);
  const qrHash = useResidentStore(state => state.qrHash);
  const status = useResidentStore(state => state.status);
  const setSafeStatus = useResidentStore(state => state.setSafeStatus);

  // POLLING: Check for check-in status every 5 seconds
  const { data: statusUpdate } = useQuery({
    queryKey: ['my-status'],
    queryFn: () => api.get('/my-status').then(res => res.data),
    refetchInterval: (query) => (query.state.data?.status === 'safe' ? false : 5000), // Stop polling once safe
    enabled: !!qrHash // Only poll if we have a registered hash
  });

  // Effect to sync store state with API result
  useEffect(() => {
    if (statusUpdate?.status === 'safe') {
      setSafeStatus(statusUpdate);
    }
  }, [statusUpdate, setSafeStatus]);

  return (
    <View style={styles.container}>

      {/* Dynamic Status Banner */}
      <View style={[styles.statusBanner, status === 'danger' ? styles.bannerDanger : styles.bannerSafe]}>
        {status === 'danger' ? (
          <>
            <AlertTriangle color="#fff" size={28} style={{ marginRight: 10 }} />
            <Text style={styles.bannerText}>EVACUATION MANDATORY</Text>
          </>
        ) : (
          <Text style={styles.bannerText}>YOU ARE MARKED AS SAFE</Text>
        )}
      </View>

      {/* Massive Call to Action */}
      <View style={styles.actionArea}>
        {status === 'danger' ? (
          <TouchableOpacity
            style={styles.evacuateBtn}
            onPress={() => navigation.navigate('Evacuation Map')}
          >
            <Navigation color="#fff" size={48} style={{ marginBottom: 10 }} />
            <Text style={styles.evacuateText}>FIND SAFE ROUTE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.safeBtn}
            onPress={() => navigation.navigate('SafeCheckIn')}
          >
            <Text style={styles.safeText}>VIEW RELIEF</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* The OFFLINE QR Digital ID (Always works even if API fails) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>YOUR FAMILY QR ID</Text>

        <View style={styles.qrContainer}>
          {qrHash ? (
            <QRCode
              value={qrHash}
              size={180}
              color="#000000"
              bgColor="#ffffff"
            />
          ) : (
            <View style={{ width: 180, height: 180, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8' }}>No QR Generated</Text>
            </View>
          )}
        </View>

        <Text style={styles.hashText}>{qrHash || 'N/A'}</Text>

        {profile && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{profile.name}</Text>
            <Text style={styles.infoText}>Brgy. {profile.barangay}</Text>
            <View style={styles.headcountBadge}>
              <Text style={styles.headcountText}>Family of {profile.headcount}</Text>
            </View>
          </View>
        )}

        <Text style={styles.instruction}>
          Keep this screen open. LGU staff will scan this at the shelter door.
        </Text>
      </View>
    </View>
  );
}

