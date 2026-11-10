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
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, radii, typography, shadows } from '../styles/theme';

const BARCODE_SETTINGS = {
  barcodeTypes: ['qr'],
};

export default function StaffScannerScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { colors } = useTheme();
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
    const isPermanentlyDenied = !permission.canAskAgain;

    return (
      <View
        style={[
          styles.permissionContainer,
          {
            paddingTop: Math.max(spacing.xl, insets.top + spacing.md),
            paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md),
            paddingLeft: Math.max(spacing.xl, insets.left + spacing.md),
            paddingRight: Math.max(spacing.xl, insets.right + spacing.md),
          },
        ]}
      >
        <View style={styles.permissionIconWrap}>
          {isPermanentlyDenied ? (
            <AlertTriangle size={64} color={colors.warning} />
          ) : (
            <QrCode size={64} color={colors.primary} />
          )}
        </View>

        <Text style={styles.permissionTitle}>
          {isPermanentlyDenied ? 'Camera Access Blocked in Device Settings' : 'Camera Permission Required'}
        </Text>

        <Text style={styles.permissionSubtitle}>
          {isPermanentlyDenied
            ? 'Camera access was permanently disabled for EvacRoute. To scan resident digital QR IDs, please open device settings and allow camera access.'
            : 'EvacRoute requires camera access to rapidly scan and verify resident digital QR passes at evacuation intake and relief distribution desks.'}
        </Text>

        {isPermanentlyDenied ? (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleOpenSettings}
            activeOpacity={0.85}
          >
            <Settings size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.permissionButtonText}>Open Device Settings</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
            activeOpacity={0.85}
          >
            <CameraIcon size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.permissionButtonText}>Enable Camera Access</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.refreshPermBtn}
          onPress={() => getPermission?.().catch(() => {})}
          activeOpacity={0.8}
        >
          <RefreshCw size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.refreshPermBtnText}>Re-check Permission Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualEntryAltBtn}
          onPress={() => setManualOnlyMode(true)}
          activeOpacity={0.85}
        >
          <QrCode size={16} color={colors.textPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.manualEntryAltBtnText}>Enter Resident QR Hash Manually</Text>
        </TouchableOpacity>
      </View>
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
              </View>
            )
          ) : (
            <View style={styles.resultContainer}>
              {loading && (
                <View style={styles.resultLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.resultLoadingText}>Fetching Resident Status...</Text>
                </View>
              )}

              {error && !loading && (
                <View style={styles.statusBox}>
                  <XCircle size={52} color={colors.danger} style={styles.statusIcon} />
                  <Text style={styles.statusTitle}>Verification Failed</Text>
                  <Text style={styles.statusMsg}>{error}</Text>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
                    <RefreshCw size={16} color={colors.white} />
                    <Text style={styles.resetBtnText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {scanResult && !loading && (
                <View style={styles.residentDetails}>
                  {claimSuccess ? (
                    <View style={styles.successBadge}>
                      <CheckCircle size={40} color={colors.success} />
                      <Text style={styles.successBadgeTitle}>RATION DISPENSED</Text>
                      <Text style={styles.successBadgeText}>
                        Successfully claimed for {claimSuccess.familyName} ({claimSuccess.headcount} Pax)
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.detailsHeader}>
                      <Text style={styles.familyName}>{scanResult.familyName}</Text>
                      <View style={styles.paxRow}>
                        <Users size={18} color={colors.textSecondary} />
                        <Text style={styles.paxCount}>{scanResult.headcount} Registered Pax</Text>
                      </View>
                    </View>
                  )}

                  {/* Status Badges */}
                  <View style={styles.badgeSection}>
                    {scanResult.checkedIn ? (
                      <View style={[styles.statusBadge, styles.badgeSuccess]}>
                        <CheckCircle size={14} color={colors.successText} />
                        <Text style={[styles.badgeText, styles.textSuccess]}>Checked In</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.badgeDanger]}>
                        <XCircle size={14} color={colors.dangerText} />
                        <Text style={[styles.badgeText, styles.textDanger]}>Not Checked In</Text>
                      </View>
                    )}

                    {scanResult.rationClaimed ? (
                      <View style={[styles.statusBadge, styles.badgeWarning]}>
                        <AlertTriangle size={14} color={colors.warningText} />
                        <Text style={[styles.badgeText, styles.textWarning]}>Ration Claimed</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.badgeSuccess]}>
                        <CheckCircle size={14} color={colors.successText} />
                        <Text style={[styles.badgeText, styles.textSuccess]}>Ration Available</Text>
                      </View>
                    )}
                  </View>

                  {/* Operational Info Card */}
                  <View style={styles.infoBlock}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned Shelter:</Text>
                      <Text style={styles.infoValue}>{scanResult.shelter || 'None (Must Check In)'}</Text>
                    </View>
                    {scanResult.rationClaimed && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Claim Timestamp:</Text>
                        <Text style={styles.infoValue}>
                          {new Date(scanResult.claimedAt).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.actionBlock}>
                    {checkInSuccess && (
                      <View style={styles.successBadge}>
                        <CheckCircle size={36} color={colors.success} />
                        <Text style={styles.successBadgeTitle}>INTAKE RECORDED</Text>
                        <Text style={styles.successBadgeText}>{checkInSuccess.message}</Text>
                      </View>
                    )}

                    {!scanResult.checkedIn && (
                      <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={executeCheckIn}
                        disabled={checkInLoading}
                      >
                        {checkInLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <CheckCircle size={18} color={colors.white} />
                            <Text style={styles.claimBtnText}>
                              {user?.assigned_shelter?.name || user?.assignedShelter?.name
                                ? `CHECK IN TO ${(user?.assigned_shelter?.name || user?.assignedShelter?.name).toUpperCase()}`
                                : 'CHECK IN RESIDENT'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {scanResult.checkedIn && !scanResult.rationClaimed && !claimSuccess ? (
                      <TouchableOpacity
                        style={styles.claimBtn}
                        onPress={executeClaim}
                        disabled={claimLoading}
                      >
                        {claimLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <Home size={18} color={colors.white} />
                            <Text style={styles.claimBtnText}>DISPENSE RATION PACKAGE</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {(!scanResult.checkedIn || (scanResult.rationClaimed && !claimSuccess)) && (
                      <View style={styles.statusWarningBox}>
                        <AlertTriangle size={18} color={colors.warning} />
                        <Text style={styles.warningBoxText}>
                          {!scanResult.checkedIn
                            ? 'Resident must check in to a shelter first to be eligible for relief rations.'
                            : 'This resident has already received their designated supply packages.'}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity style={styles.secondaryScanBtn} onPress={resetScanner}>
                      <RefreshCw size={16} color={colors.textSecondary} />
                      <Text style={styles.secondaryScanBtnText}>Scan Next Resident</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Manual Fallback Input Form */}
        {!scanned && (
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual Override Fallback</Text>
            <Text style={styles.manualSubtitle}>If code is damaged or camera unavailable, enter hash:</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter QR Code Hash..."
                placeholderTextColor={colors.textMuted}
                value={manualHash}
                onChangeText={setManualHash}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.manualSendBtn} onPress={handleManualSubmit}>
                <Send size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);
}

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.base,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    permissionContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    permissionIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    permissionTitle: {
      ...typography.heading,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
      fontSize: 20,
    },
    permissionSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing['2xl'],
      lineHeight: 22,
      maxWidth: 320,
    },
    permissionButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.glow(colors.primary),
    },
    permissionButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    refreshPermBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      marginTop: spacing.sm,
    },
    refreshPermBtnText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 1,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    shelterHeaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDarkMode ? '#1e3a8a30' : '#eff6ff',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
      marginTop: 5,
      borderWidth: 1,
      borderColor: isDarkMode ? '#3b82f640' : '#bfdbfe',
    },
    shelterBadgeText: {
      color: isDarkMode ? '#60a5fa' : '#2563eb',
      fontSize: 11,
      fontWeight: '700',
    },
    scrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    displayCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      ...shadows.md,
    },
    cameraOuter: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    cameraWrapper: {
      width: '100%',
      height: 320,
      minHeight: 280,
      borderRadius: radii.lg,
      overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
      position: 'relative',
      backgroundColor: 'transparent',
    },
    cameraInitializingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      zIndex: 5,
    },
    cameraInitializingText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '600',
    },
    cameraErrorBox: {
      width: '100%',
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    cameraErrorTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.dangerText,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    cameraErrorSubtitle: {
      fontSize: 13,
      color: colors.dangerText,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryCameraBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.danger,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
      width: '100%',
    },
    retryCameraBtnText: {
      color: colors.white,
      fontWeight: 'bold',
      fontSize: 14,
    },
    overlayFrame: {
      position: 'absolute',
      top: '15%',
      left: '15%',
      width: '70%',
      height: '70%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reticleCornerTopLeft: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 25,
      height: 25,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderColor: colors.primary,
    },
    reticleCornerTopRight: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 25,
      height: 25,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderColor: colors.primary,
    },
    reticleCornerBottomLeft: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: 25,
      height: 25,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderColor: colors.primary,
    },
    reticleCornerBottomRight: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 25,
      height: 25,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderColor: colors.primary,
    },
    scannerHelperText: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    switchModeLink: {
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    switchModeLinkText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    resultContainer: {
      padding: spacing.lg,
    },
    resultLoading: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    resultLoadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    statusBox: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    statusIcon: {
      marginBottom: spacing.md,
    },
    statusTitle: {
      ...typography.heading,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    statusMsg: {
      ...typography.body,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.danger,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      width: '100%',
    },
    resetBtnText: {
      color: colors.white,
      fontWeight: 'bold',
    },
    residentDetails: {
      width: '100%',
    },
    successBadge: {
      backgroundColor: colors.successBg,
      borderRadius: radii.lg,
      padding: spacing.base,
      alignItems: 'center',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.success,
    },
    successBadgeTitle: {
      color: colors.successText,
      fontWeight: '900',
      fontSize: 18,
      marginTop: spacing.xs,
      letterSpacing: 1,
    },
    successBadgeText: {
      color: isDarkMode ? colors.white : colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 4,
    },
    detailsHeader: {
      marginBottom: spacing.base,
    },
    familyName: {
      ...typography.title,
      color: colors.textPrimary,
    },
    paxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: 4,
    },
    paxCount: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    badgeSection: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: radii.sm,
      borderWidth: 1,
    },
    badgeSuccess: {
      backgroundColor: colors.successBg,
      borderColor: colors.success,
    },
    badgeDanger: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.danger,
    },
    badgeWarning: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warning,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    textSuccess: {
      color: colors.successText,
    },
    textDanger: {
      color: colors.dangerText,
    },
    textWarning: {
      color: colors.warningText,
    },
    infoBlock: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.lg,
      padding: spacing.base,
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    infoValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
    },
    actionBlock: {
      gap: spacing.base,
    },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.success,
      paddingVertical: spacing.lg,
      borderRadius: radii.md,
      ...shadows.glow(colors.success),
    },
    claimBtnText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '950',
      letterSpacing: 0.5,
    },
    checkInBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: spacing.lg,
      borderRadius: radii.md,
      ...shadows.glow(colors.primary),
    },
    statusWarningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warningBg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warningBoxText: {
      color: colors.warningText,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
      lineHeight: 18,
    },
    secondaryScanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      marginTop: spacing.xs,
    },
    secondaryScanBtnText: {
      color: colors.textSecondary,
      fontWeight: 'bold',
    },
    manualCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      ...shadows.sm,
    },
    manualTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    manualSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      marginBottom: spacing.md,
    },
    manualRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    manualInput: {
      flex: 1,
      backgroundColor: colors.inputBg,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      fontFamily: 'monospace',
      fontSize: 14,
    },
    manualSendBtn: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualEntryAltBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      width: '100%',
      maxWidth: 340,
      marginTop: spacing.md,
    },
    manualEntryAltBtnText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    manualModeNotice: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
    },
    manualModeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    manualModeSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    enableCamSmallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
      backgroundColor: colors.primary,
    },
    enableCamSmallBtnText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
  });
