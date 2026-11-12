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
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import api from '../../services/api';
import { spacing, radii, typography, shadows } from '../../styles/theme';

import getStyles from '../../styles/StaffScanner.styles';
import ScannerPermissionScreen from '../../components/cswdo/ScannerPermissionScreen';
import ScanResultCard from '../../components/cswdo/ScanResultCard';
import ManualQrEntryCard from '../../components/cswdo/ManualQrEntryCard';
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

  const isClaimingRef = useRef(false);
  const isCheckingInRef = useRef(false);
  const hasAutoPromptedRef = useRef(false);
  const cameraTimeoutRef = useRef(null);

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
        checkedIn: response.data.checked_in,
        shelter: response.data.shelter,
        rationClaimed: response.data.ration_claimed,
        claimedAt: response.data.claimed_at,
      });
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]); // Error vibration pattern
      setError(err.response?.data?.message || 'Failed to verify QR Code. Code might be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-request camera permission on initial screen entry if undetermined
  useEffect(() => {
    if (isFocused && permission && !permission.granted && permission.canAskAgain && !hasAutoPromptedRef.current) {
      hasAutoPromptedRef.current = true;
      requestPermission().catch((err) => {
        console.warn('Auto camera permission request failed:', err);
      });
    }
  }, [isFocused, permission, requestPermission]);

  // Re-check permission when app returns from background (e.g. after toggling in device App Settings)
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
    Vibration.vibrate(100); // Quick scan feedback
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

      Vibration.vibrate([0, 200, 100, 200]); // Success vibration pattern
      setClaimSuccess({
        familyName: response.data.family_name,
        headcount: response.data.headcount,
        claimedAt: response.data.claimed_at,
        message: response.data.message || 'Ration claimed recorded.',
      });

      // Update local scan state to match
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

  const executeCheckIn = async () => {
    if (!scanResult || checkInLoading || isCheckingInRef.current) return;

    const assignedShelter = user?.assigned_shelter || user?.assignedShelter;
    let targetShelterId = user?.assigned_shelter_id || assignedShelter?.id;
    let sName = assignedShelter?.name;

    if (!targetShelterId) {
      try {
        const shelterRes = await api.get('/shelters');
        const list = shelterRes.data?.data || shelterRes.data || [];
        if (list.length > 0) {
          targetShelterId = list[0].id;
          sName = list[0].name;
        }
      } catch (_e) {
        // Fallback check below
      }
    }

    if (!targetShelterId) {
      setError('No evacuation shelter assigned to your marshal profile. Please contact CSWDO supervisor.');
      return;
    }

    isCheckingInRef.current = true;
    setCheckInLoading(true);
    setError(null);

    try {
      const response = await api.post(`/shelters/${targetShelterId}/check-in`, {
        qr_code_hash: scanResult.hash,
      });

      Vibration.vibrate([0, 200, 100, 200]);
      const admittedShelter = response.data?.shelter?.name || sName || 'Assigned Shelter';
      setCheckInSuccess({
        shelterName: admittedShelter,
        message: `Resident admitted to ${admittedShelter}.`,
      });

      // Update scanResult state to checkedIn
      setScanResult((prev) => ({
        ...prev,
        checkedIn: true,
        shelter: admittedShelter,
      }));
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]);
      setError(err.response?.data?.message || 'Failed to check in resident to shelter. Please try again.');
    } finally {
      isCheckingInRef.current = false;
      setCheckInLoading(false);
    }
  };

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
        {/* Camera Scanner or Status Details */}
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
                        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', bottom: layoutNudge ? 1 : 0 }]}
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
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);
}
