import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  ScrollView,
  Linking,
  AppState,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Users,
  Home,
  Settings,
  Camera as CameraIcon,
  RotateCcw,
  UserPlus,
  HeartHandshake,
  CloudOff,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import api from '../../services/api';
import {
  enqueueOfflineCheckin,
  getOfflineCheckinCount,
  flushOfflineCheckinQueue,
} from '../../services/offlineCheckinQueue';
import { parseTotpPayload } from '../../utils/totpQr';
import { spacing, radii, typography, shadows } from '../../styles/theme';

import getStyles from '../../styles/StaffScanner.styles';
import ScannerPermissionScreen from '../../components/cswdo/ScannerPermissionScreen';
import ScanResultCard from '../../components/cswdo/ScanResultCard';
import ManualQrEntryCard from '../../components/cswdo/ManualQrEntryCard';
import RapidWalkInModal from '../../components/cswdo/RapidWalkInModal';
import LogDonationModal from '../../components/cswdo/LogDonationModal';

const BARCODE_SETTINGS = {
  barcodeTypes: ['qr'],
};

export default function StaffScanner() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);

  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [activeScannerTab, setActiveScannerTab] = useState('camera'); // 'camera' | 'walkin' | 'donation'
  const [manualOnlyMode, setManualOnlyMode] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [layoutNudge, setLayoutNudge] = useState(false);

  const [scanned, setScanned] = useState(false);
  const [manualHash, setManualHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  // Real-world operational modal states
  const [rapidModalVisible, setRapidModalVisible] = useState(false);
  const [rapidLoading, setRapidLoading] = useState(false);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [dayPassLoading, setDayPassLoading] = useState(false);

  const isClaimingRef = useRef(false);
  const isCheckingInRef = useRef(false);
  const hasAutoPromptedRef = useRef(false);
  const cameraTimeoutRef = useRef(null);

  const refreshQueueCount = useCallback(async () => {
    const count = await getOfflineCheckinCount();
    setOfflineQueueCount(count);
  }, []);

  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount, isFocused]);

  // Auto-sync offline check-in queue upon network reconnection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flushOfflineCheckinQueue().then((res) => {
          if (res?.synced > 0) {
            refreshQueueCount();
            Alert.alert('Cloud Sync Complete', `Successfully synced ${res.synced} offline check-in(s) with central server.`);
          }
        });
      }
    });
    return () => unsubscribe();
  }, [refreshQueueCount]);

  const handleManualFlush = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    try {
      const res = await flushOfflineCheckinQueue();
      await refreshQueueCount();
      if (res?.synced > 0) {
        Alert.alert('Cloud Sync Complete', `Synced ${res.synced} offline check-in(s) to central database.`);
      } else {
        Alert.alert('Sync Status', 'All queued records are already up to date or device is currently offline.');
      }
    } catch (_e) {
      Alert.alert('Sync Error', 'Could not reach server. Check internet connection and try again.');
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const getTargetShelterId = async () => {
    const assignedShelter = user?.assigned_shelter || user?.assignedShelter;
    let targetShelterId = user?.assigned_shelter_id || assignedShelter?.id;
    if (!targetShelterId) {
      try {
        const shelterRes = await api.get('/shelters');
        const list = shelterRes.data?.data || shelterRes.data || [];
        if (list.length > 0) {
          targetShelterId = list[0].id;
        }
      } catch (_e) {
        // Fallback handled by caller
      }
    }
    return targetShelterId;
  };

  const processQRHash = useCallback(async (hash) => {
    setLoading(true);
    setError(null);
    setScanResult(null);
    setClaimSuccess(null);

    try {
      const response = await api.get('/relief/status', {
        params: { qr_code_hash: hash },
      });

      setScanResult({
        hash: response.data.qr_code_hash || hash,
        familyName: response.data.family_name,
        headcount: response.data.headcount || 0,
        actualHeadcount: response.data.actual_headcount || response.data.headcount || 1,
        checkedIn: response.data.checked_in,
        shelter: response.data.shelter,
        shelterId: response.data.shelter_id,
        logId: response.data.log_id,
        isTemporaryOffsite: response.data.is_temporary_offsite || false,
        walkInVoucher: response.data.walk_in_voucher,
        vulnerabilities: response.data.vulnerabilities || [],
        rationClaimed: response.data.ration_claimed,
        hasClaimed: response.data.has_claimed,
        isDuplicateClaim: response.data.is_duplicate_claim,
        duplicateWarning: response.data.duplicate_warning,
        claimedAt: response.data.claimed_at,
        isOfflineMode: false,
      });
    } catch (err) {
      // If network unreachable / offline, fall back to offline verification
      const isNetworkErr = !err.response || err.message?.includes('Network') || err.message?.includes('timeout');
      if (isNetworkErr) {
        const parsed = parseTotpPayload(hash);
        const extractedFamilyId = parsed.familyId || 'Citizen';
        const extractedHeadcount = parsed.headcount || 1;
        setScanResult({
          hash: hash,
          familyName: `IDP Household #${extractedFamilyId} (Offline Token)`,
          headcount: extractedHeadcount,
          actualHeadcount: extractedHeadcount,
          checkedIn: false,
          shelter: user?.assigned_shelter?.name || user?.assignedShelter?.name || 'Assigned Evacuation Shelter',
          shelterId: user?.assigned_shelter_id || user?.assigned_shelter?.id,
          vulnerabilities: ['Offline Queued Admission'],
          hasClaimed: false,
          isOfflineMode: true,
        });
        Vibration.vibrate(100);
      } else {
        Vibration.vibrate([0, 100, 100, 100]); // Error vibration pattern
        setError(err.response?.data?.message || 'Failed to verify QR Code. Code might be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-request camera permission on initial screen entry if undetermined
  useEffect(() => {
    if (isFocused && permission && !permission.granted && permission.canAskAgain && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      requestPermission().catch((err) => {
        console.warn('Auto camera permission request failed:', err);
      });
    }
  }, [isFocused, permission, requestPermission]);

  // Re-check permission when app returns from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && typeof getPermission === 'function') {
        getPermission().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [getPermission]);

  // Re-check permission when the tab gains focus & reset cameraReady when unfocused
  useEffect(() => {
    if (isFocused && typeof getPermission === 'function') {
      getPermission().catch(() => {});
    }
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    return () => {
      setCameraReady(false);
    };
  }, [isFocused, getPermission]);

  useEffect(() => () => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
    }
  }, []);

  // Force native Android PreviewView layout pass after CameraX surface attaches
  useEffect(() => {
    if (!isFocused || !permission?.granted || manualOnlyMode || scanned || cameraError) {
      return undefined;
    }
    const t1 = setTimeout(() => setLayoutNudge((prev) => !prev), 250);
    const t2 = setTimeout(() => setLayoutNudge((prev) => !prev), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cameraError, cameraKey, isFocused, manualOnlyMode, permission?.granted, scanned]);

  // Listen for results from native full-screen Google Code Scanner modal
  useEffect(() => {
    if (typeof CameraView.onModernBarcodeScanned !== 'function') {
      return undefined;
    }
    const sub = CameraView.onModernBarcodeScanned((event) => {
      if (event?.data) {
        setScanned(true);
        Vibration.vibrate(100);
        processQRHash(event.data);
      }
    });
    return () => sub?.remove?.();
  }, [processQRHash]);

  useEffect(() => {
    if (!isFocused || !permission?.granted || manualOnlyMode || scanned || cameraReady || cameraError) {
      return undefined;
    }

    cameraTimeoutRef.current = setTimeout(() => {
      cameraTimeoutRef.current = null;
      setCameraError('Camera preview did not start. Tap "Open System QR Scanner" or "Retry Camera" below.');
    }, 8000);

    return () => {
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
    };
  }, [cameraError, cameraKey, cameraReady, isFocused, manualOnlyMode, permission?.granted, scanned]);

  const handleLaunchSystemScanner = async () => {
    try {
      setError(null);
      if (typeof CameraView.launchScanner === 'function') {
        await CameraView.launchScanner(BARCODE_SETTINGS);
      }
    } catch (err) {
      if (err?.message && !err.message.toLowerCase().includes('cancel')) {
        setError(err.message);
      }
    }
  };

  const handleRequestPermission = async () => {
    try {
      const res = await requestPermission();
      if (!res?.granted && !res?.canAskAgain) {
        await Linking.openSettings();
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      try {
        await Linking.openSettings();
      } catch (_e) {}
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Failed to open app settings:', err);
    }
  };

  // Reset scanner state
  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setError(null);
    setManualHash('');
    setClaimSuccess(null);
    setCheckInSuccess(null);
    setCameraError(null);
    setCameraReady(false);
    setCameraKey((prev) => prev + 1);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || loading || claimLoading) return;
    setScanned(true);
    Vibration.vibrate(100);
    processQRHash(data);
  };

  const handleManualSubmit = () => {
    if (!manualHash.trim()) return;
    setScanned(true);
    processQRHash(manualHash.trim());
  };

  const executeClaim = async () => {
    if (!scanResult || claimLoading || isClaimingRef.current) return;
    isClaimingRef.current = true;
    setClaimLoading(true);
    setError(null);

    try {
      const response = await api.post('/relief/claim', {
        qr_code_hash: scanResult.hash,
      });

      Vibration.vibrate([0, 200, 100, 200]);
      setClaimSuccess({
        familyName: response.data.family_name,
        headcount: response.data.headcount,
        claimedAt: response.data.claimed_at,
        message: response.data.message || 'Ration claim recorded.',
      });

      setScanResult((prev) => ({
        ...prev,
        rationClaimed: true,
        claimedAt: response.data.claimed_at,
      }));
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]);
      setError(err.response?.data?.message || 'Failed to record claim. Please try again.');
    } finally {
      isClaimingRef.current = false;
      setClaimLoading(false);
    }
  };

  const executeCheckIn = async (actualHeadcount, selectedNfis = []) => {
    if (!scanResult || checkInLoading || isCheckingInRef.current) return;

    const targetShelterId = await getTargetShelterId();
    if (!targetShelterId) {
      setError('No evacuation shelter assigned to your marshal profile. Please contact CSWDO supervisor.');
      return;
    }

    isCheckingInRef.current = true;
    setCheckInLoading(true);
    setError(null);

    const checkinPayload = {
      qr_code_hash: scanResult.hash,
      actual_headcount: actualHeadcount || scanResult.headcount || 1,
      target_shelter_id: targetShelterId,
      shelter_id: targetShelterId,
      family_name: scanResult.familyName,
      claimed_nfi_items: selectedNfis,
    };

    // If already in offline mode, queue directly
    if (scanResult.isOfflineMode) {
      try {
        await enqueueOfflineCheckin(checkinPayload);
        await refreshQueueCount();
        Vibration.vibrate([0, 150, 100, 150]);
        const admittedShelter = user?.assigned_shelter?.name || user?.assignedShelter?.name || 'Local Evacuation Center';
        setCheckInSuccess({
          shelterName: admittedShelter,
          message: `Offline Check-In Queued: ${scanResult.familyName} (${checkinPayload.actual_headcount} Pax) recorded locally. Auto-syncs when online.`,
        });
        setScanResult((prev) => ({
          ...prev,
          checkedIn: true,
          isQueuedOffline: true,
        }));
      } catch (_e) {
        setError('Failed to queue offline check-in locally.');
      } finally {
        isCheckingInRef.current = false;
        setCheckInLoading(false);
      }
      return;
    }

    try {
      const response = await api.post(`/shelters/${targetShelterId}/check-in`, checkinPayload);

      Vibration.vibrate([0, 200, 100, 200]);
      const admittedShelter = response.data?.shelter?.name || user?.assigned_shelter?.name || 'Assigned Shelter';
      setCheckInSuccess({
        shelterName: admittedShelter,
        message: `Resident admitted to ${admittedShelter} (${actualHeadcount || scanResult.headcount} Pax).`,
      });

      setScanResult((prev) => ({
        ...prev,
        checkedIn: true,
        shelter: admittedShelter,
        shelterId: targetShelterId,
        actualHeadcount: actualHeadcount || scanResult.headcount,
        logId: response.data?.log?.id || prev.logId,
      }));
    } catch (err) {
      // If network dropped during submission, save to offline queue as fallback
      if (!err.response) {
        await enqueueOfflineCheckin(checkinPayload);
        await refreshQueueCount();
        Vibration.vibrate([0, 150, 100, 150]);
        const admittedShelter = user?.assigned_shelter?.name || user?.assignedShelter?.name || 'Assigned Shelter';
        setCheckInSuccess({
          shelterName: admittedShelter,
          message: `Network offline: Check-in saved locally (${actualHeadcount || scanResult.headcount} Pax). Will sync when reconnected.`,
        });
        setScanResult((prev) => ({
          ...prev,
          checkedIn: true,
          isQueuedOffline: true,
        }));
      } else {
        Vibration.vibrate([0, 100, 100, 100]);
        setError(err.response?.data?.message || 'Failed to check in resident to shelter. Please try again.');
      }
    } finally {
      isCheckingInRef.current = false;
      setCheckInLoading(false);
    }
  };

  const handleIssueDayPass = async (logId) => {
    setDayPassLoading(true);
    try {
      const shelterId = scanResult?.shelterId || (await getTargetShelterId());
      if (!shelterId) throw new Error('Shelter ID unknown.');
      await api.post(`/shelters/${shelterId}/day-pass`, {
        evacuation_log_id: logId,
      });
      Vibration.vibrate(100);
      setScanResult((prev) => ({
        ...prev,
        isTemporaryOffsite: true,
      }));
      Alert.alert('Day Pass Issued', 'Resident marked temporarily offsite for daytime inspection/cleaning.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to issue day pass.');
    } finally {
      setDayPassLoading(false);
    }
  };

  const handleReturnDayPass = async (logId) => {
    setDayPassLoading(true);
    try {
      const shelterId = scanResult?.shelterId || (await getTargetShelterId());
      if (!shelterId) throw new Error('Shelter ID unknown.');
      await api.post(`/shelters/${shelterId}/return-day-pass`, {
        evacuation_log_id: logId,
      });
      Vibration.vibrate(100);
      setScanResult((prev) => ({
        ...prev,
        isTemporaryOffsite: false,
      }));
      Alert.alert('Return Recorded', 'Resident confirmed returned to shelter safely.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record return.');
    } finally {
      setDayPassLoading(false);
    }
  };

  const handleRapidWalkInSubmit = async (formData) => {
    setRapidLoading(true);
    try {
      const shelterId = await getTargetShelterId();
      if (!shelterId) throw new Error('No shelter assigned.');

      const res = await api.post(`/shelters/${shelterId}/rapid-check-in`, formData);
      Vibration.vibrate([0, 200, 100, 200]);
      return { voucher: res.data?.voucher };
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]);
      Alert.alert('Intake Error', err.response?.data?.message || 'Failed to process rapid walk-in.');
      throw err;
    } finally {
      setRapidLoading(false);
    }
  };

  const handleLogDonationSubmit = async (donationData) => {
    setDonationLoading(true);
    try {
      const shelterId = await getTargetShelterId();
      if (!shelterId) throw new Error('No shelter assigned.');

      const res = await api.post(`/shelters/${shelterId}/donations`, donationData);
      Vibration.vibrate([0, 150, 100, 150]);
      return res.data;
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]);
      Alert.alert('Donation Error', err.response?.data?.message || 'Failed to log donation.');
      throw err;
    } finally {
      setDonationLoading(false);
    }
  };

  const assignedShelterName =
    user?.assigned_shelter?.name || user?.assignedShelter?.name || 'Tetuan Covered Court';

  // If permission object is not yet loaded from native bridge
  if (!permission) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: Math.max(spacing.lg, insets.left),
            paddingRight: Math.max(spacing.lg, insets.right),
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing Scanner Hardware...</Text>
      </View>
    );
  }

  // Permission not granted and not explicitly in manual-only fallback
  if (!permission.granted && !manualOnlyMode) {
    return (
      <ScannerPermissionScreen
        permission={permission}
        insets={insets}
        styles={styles}
        colors={colors}
        handleOpenSettings={handleOpenSettings}
        handleRequestPermission={handleRequestPermission}
        getPermission={getPermission}
        setManualOnlyMode={setManualOnlyMode}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(spacing.md, insets.top + spacing.xs),
            paddingLeft: Math.max(spacing.md, insets.left),
            paddingRight: Math.max(spacing.md, insets.right),
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>CSWDO INTAKE &amp; RELIEF DESK</Text>
          <Text style={styles.headerSubtitle}>Operator: {user?.name || 'Gate Marshal'}</Text>
          {(user?.assigned_shelter || user?.assignedShelter) && (
            <View style={styles.shelterHeaderBadge}>
              <Home size={12} color="#60a5fa" />
              <Text style={styles.shelterBadgeText} numberOfLines={1}>
                {user?.assigned_shelter?.name || user?.assignedShelter?.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Offline Queue Sync Indicator Bar */}
      {offlineQueueCount > 0 && (
        <View
          style={{
            backgroundColor: '#854d0e',
            borderBottomWidth: 1,
            borderColor: '#ca8a04',
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CloudOff size={14} color="#fef08a" />
            <Text style={{ color: '#fef08a', fontSize: 11, fontWeight: '800' }}>
              Offline Check-In Queue: {offlineQueueCount} Resident(s)
            </Text>
          </View>
          <TouchableOpacity
            disabled={isSyncingQueue}
            onPress={handleManualFlush}
            style={{
              backgroundColor: '#ca8a04',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isSyncingQueue ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <RefreshCw size={11} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>Sync Cloud</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Main Scroll Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(140, insets.bottom + 95) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Clean 3-Segment Desk Mode Switcher */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              borderRadius: 14,
              padding: 4,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeScannerTab === 'camera' ? colors.primary : 'transparent',
              }}
              onPress={() => {
                setActiveScannerTab('camera');
                if (scanned) resetScanner();
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeScannerTab === 'camera' }}
              accessibilityLabel="QR Scanner Mode"
            >
              <QrCode size={15} color={activeScannerTab === 'camera' ? '#ffffff' : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: activeScannerTab === 'camera' ? '#ffffff' : colors.textSecondary,
                }}
              >
                QR Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeScannerTab === 'walkin' ? '#2563eb' : 'transparent',
              }}
              onPress={() => setActiveScannerTab('walkin')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeScannerTab === 'walkin' }}
              accessibilityLabel="Walk-in Intake Mode"
            >
              <UserPlus size={15} color={activeScannerTab === 'walkin' ? '#ffffff' : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: activeScannerTab === 'walkin' ? '#ffffff' : colors.textSecondary,
                }}
              >
                Walk-In Intake
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeScannerTab === 'donation' ? '#e11d48' : 'transparent',
              }}
              onPress={() => setActiveScannerTab('donation')}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeScannerTab === 'donation' }}
              accessibilityLabel="Log Donation Mode"
            >
              <HeartHandshake size={15} color={activeScannerTab === 'donation' ? '#ffffff' : colors.textSecondary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: activeScannerTab === 'donation' ? '#ffffff' : colors.textSecondary,
                }}
              >
                Log Donation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode 1: Walk-In Intake Form Inline */}
          {activeScannerTab === 'walkin' && (
            <RapidWalkInModal
              inline={true}
              visible={true}
              onClose={() => setActiveScannerTab('camera')}
              onSubmit={handleRapidWalkInSubmit}
              shelterName={assignedShelterName}
              loading={rapidLoading}
            />
          )}

          {/* Mode 2: Community Donation Logger Inline */}
          {activeScannerTab === 'donation' && (
            <LogDonationModal
              inline={true}
              visible={true}
              onClose={() => setActiveScannerTab('camera')}
              onSubmit={handleLogDonationSubmit}
              shelterName={assignedShelterName}
              loading={donationLoading}
            />
          )}

          {/* Mode 3: QR Camera Scanner or Active Scan Inspection */}
          {activeScannerTab === 'camera' && (
            <>
              <View style={styles.displayCard}>
            {!scanned ? (
              manualOnlyMode || !permission?.granted ? (
                <View style={styles.manualModeNotice}>
                  <QrCode size={48} color={colors.primary} />
                  <Text style={styles.manualModeTitle}>Manual Input Mode Active</Text>
                  <Text style={styles.manualModeSubtitle}>
                    Camera scanner is offline or inactive. Type or paste resident QR code hash below to lookup status.
                  </Text>
                  {permission?.granted && (
                    <TouchableOpacity
                      style={styles.enableCamSmallBtn}
                      onPress={() => {
                        setManualOnlyMode(false);
                        setCameraError(null);
                      }}
                    >
                      <CameraIcon size={14} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.enableCamSmallBtnText}>Switch to Live Camera</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.cameraOuter}>
                  {cameraError ? (
                    <View style={styles.cameraErrorBox}>
                      <AlertTriangle size={36} color={colors.danger} />
                      <Text style={styles.cameraErrorTitle}>Camera Feed Failed</Text>
                      <Text style={styles.cameraErrorSubtitle}>{cameraError}</Text>
                      {CameraView.isModernBarcodeScannerAvailable && (
                        <TouchableOpacity
                          style={[styles.retryCameraBtn, { backgroundColor: colors.primary }]}
                          onPress={handleLaunchSystemScanner}
                          accessibilityRole="button"
                          accessibilityLabel="Open System QR Scanner"
                        >
                          <QrCode size={16} color={colors.white} style={{ marginRight: 6 }} />
                          <Text style={styles.retryCameraBtnText}>Open System QR Scanner</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.retryCameraBtn}
                        onPress={() => {
                          setCameraError(null);
                          setCameraReady(false);
                          setCameraKey((prev) => prev + 1);
                          if (cameraTimeoutRef.current) {
                            clearTimeout(cameraTimeoutRef.current);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Retry Camera"
                      >
                        <RotateCcw size={15} color={colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.retryCameraBtnText}>Retry Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.manualEntryAltBtn}
                        onPress={() => setManualOnlyMode(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Switch to Manual Code Entry"
                      >
                        <Text style={styles.manualEntryAltBtnText}>Switch to Manual Code Entry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.cameraWrapper, { height: layoutNudge ? 321 : 320 }]}>
                      {isFocused && (
                        <CameraView
                          key={`camera-scanner-${cameraKey}`}
                          style={[
                            StyleSheet.absoluteFillObject,
                            { width: '100%', height: '100%', bottom: layoutNudge ? 1 : 0 },
                          ]}
                          facing="back"
                          active={isFocused && permission.granted && !scanned}
                          barcodeScannerSettings={BARCODE_SETTINGS}
                          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                          onCameraReady={() => {
                            if (cameraTimeoutRef.current) {
                              clearTimeout(cameraTimeoutRef.current);
                              cameraTimeoutRef.current = null;
                            }
                            setCameraReady(true);
                            setLayoutNudge((prev) => !prev);
                          }}
                          onMountError={(e) => {
                            console.error('Camera onMountError:', e);
                            if (cameraTimeoutRef.current) {
                              clearTimeout(cameraTimeoutRef.current);
                              cameraTimeoutRef.current = null;
                            }
                            setCameraError(e?.message || 'Camera hardware unavailable.');
                          }}
                        />
                      )}

                      {!cameraReady && isFocused && (
                        <View style={styles.cameraInitializingOverlay}>
                          <ActivityIndicator size="small" color={colors.white} />
                          <Text style={styles.cameraInitializingText}>Starting camera preview...</Text>
                        </View>
                      )}

                      {/* Aiming Reticle Overlay */}
                      <View style={styles.overlayFrame} pointerEvents="none">
                        <View style={styles.reticleCornerTopLeft} />
                        <View style={styles.reticleCornerTopRight} />
                        <View style={styles.reticleCornerBottomLeft} />
                        <View style={styles.reticleCornerBottomRight} />
                      </View>
                    </View>
                  )}

                  <Text style={styles.scannerHelperText}>Align resident&apos;s QR code within the frame</Text>

                  {CameraView.isModernBarcodeScannerAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.permissionButton,
                        { marginTop: spacing.md, minHeight: 56 },
                      ]}
                      onPress={handleLaunchSystemScanner}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Open Full-Screen System QR Scanner"
                    >
                      <QrCode size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.permissionButtonText}>Open System QR Scanner</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.switchModeLink}
                    onPress={() => setManualOnlyMode(true)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to Manual Entry"
                  >
                    <Text style={styles.switchModeLinkText}>Camera having trouble? Switch to Manual Entry</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      marginTop: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: '#0284c7',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                    onPress={() => {
                      setScanned(true);
                      Vibration.vibrate(100);
                      processQRHash('hash_test_code_pheinz');
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel="Simulate pheinz resident QR scan"
                  >
                    <QrCode size={18} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                      ⚡ Demo: Simulate &apos;pheinz&apos; QR Pass
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <ScanResultCard
                styles={styles}
                colors={colors}
                loading={loading}
                error={error}
                resetScanner={resetScanner}
                scanResult={scanResult}
                claimSuccess={claimSuccess}
                checkInSuccess={checkInSuccess}
                user={user}
                checkInLoading={checkInLoading}
                executeCheckIn={executeCheckIn}
                claimLoading={claimLoading}
                executeClaim={executeClaim}
                onIssueDayPass={handleIssueDayPass}
                onReturnDayPass={handleReturnDayPass}
                dayPassLoading={dayPassLoading}
              />
            )}
          </View>

          {/* Manual Fallback Input Form */}
          {!scanned && (
            <ManualQrEntryCard
              styles={styles}
              colors={colors}
              isDarkMode={isDarkMode}
              manualHash={manualHash}
              setManualHash={setManualHash}
              handleManualSubmit={handleManualSubmit}
            />
          )}
        </>
      )}
    </ScrollView>
      </KeyboardAvoidingView>

      {/* Rapid Walk-in Modal */}
      <RapidWalkInModal
        visible={rapidModalVisible}
        onClose={() => setRapidModalVisible(false)}
        onSubmit={handleRapidWalkInSubmit}
        shelterName={assignedShelterName}
        loading={rapidLoading}
      />

      {/* Log Donation Modal */}
      <LogDonationModal
        visible={donationModalVisible}
        onClose={() => setDonationModalVisible(false)}
        onSubmit={handleLogDonationSubmit}
        shelterName={assignedShelterName}
        loading={donationLoading}
      />
    </View>
  );
}
