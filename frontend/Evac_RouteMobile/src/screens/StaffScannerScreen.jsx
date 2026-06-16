import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Vibration, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, LogOut, CheckCircle, XCircle, AlertTriangle, RefreshCw, Send, Users, Home } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, radii, typography, shadows } from '../styles/theme';

export default function StaffScannerScreen() {
  const { user, logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scanned, setScanned] = useState(false);
  const [manualHash, setManualHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);

  // Reset scanner state
  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setError(null);
    setManualHash('');
    setClaimSuccess(null);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || loading || claimLoading) return;
    setScanned(true);
    Vibration.vibrate(100); // Quick scan feedback
    processQRHash(data);
  };

  const processQRHash = async (hash) => {
    setLoading(true);
    setError(null);
    setScanResult(null);
    setClaimSuccess(null);
    
    try {
      const response = await api.get('/relief/status', {
        params: { qr_code_hash: hash }
      });
      
      setScanResult({
        hash,
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
  };

  const handleManualSubmit = () => {
    if (!manualHash.trim()) return;
    setScanned(true);
    processQRHash(manualHash.trim());
  };

  const executeClaim = async () => {
    if (!scanResult || claimLoading) return;
    setClaimLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/relief/claim', {
        qr_code_hash: scanResult.hash
      });
      
      Vibration.vibrate([0, 200, 100, 200]); // Success vibration pattern
      setClaimSuccess({
        familyName: response.data.family_name,
        headcount: response.data.headcount,
        claimedAt: response.data.claimed_at,
        message: response.data.message || 'Ration claimed recorded.'
      });
      
      // Update local scan state to match
      setScanResult(prev => ({
        ...prev,
        rationClaimed: true,
        claimedAt: response.data.claimed_at
      }));
    } catch (err) {
      Vibration.vibrate([0, 100, 100, 100]);
      setError(err.response?.data?.message || 'Failed to record claim. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Accessing Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
        <QrCode size={80} color={colors.primary} style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionSubtitle}>
          Zamboanga Evac_Route requires camera access to scan resident QR codes at distribution desks.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButtonTop} onPress={logout}>
          <LogOut size={20} color={colors.dangerLight} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RELIEF CLAIMS DESK</Text>
          <Text style={styles.headerSubtitle}>Staff: {user?.name || 'Operator'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutIconBtn} onPress={logout} title="Logout">
          <LogOut size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main View Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Camera Scanner or Status Details */}
        <View style={styles.displayCard}>
          {!scanned ? (
            <View style={styles.cameraOuter}>
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
                {/* Aiming Reticle Overlay */}
                <View style={styles.overlayFrame}>
                  <View style={styles.reticleCornerTopLeft} />
                  <View style={styles.reticleCornerTopRight} />
                  <View style={styles.reticleCornerBottomLeft} />
                  <View style={styles.reticleCornerBottomRight} />
                </View>
              </View>
              <Text style={styles.scannerHelperText}>Align resident&apos;s QR code within the frame</Text>
            </View>
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

                    {(!scanResult.checkedIn || scanResult.rationClaimed || claimSuccess) && (
                      <View style={styles.statusWarningBox}>
                        <AlertTriangle size={18} color={colors.warning} />
                        <Text style={styles.warningBoxText}>
                          {!scanResult.checkedIn 
                            ? 'Resident must check in to a shelter to be eligible.' 
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
            <Text style={styles.manualSubtitle}>If code is damaged, enter the QR hash manually:</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter QR Code Hash..."
                placeholderTextColor="#64748b"
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  permissionIcon: {
    marginBottom: spacing.xl,
  },
  permissionTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  permissionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
    padding: spacing.md,
  },
  logoutText: {
    color: colors.dangerLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
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
  logoutIconBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  displayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  cameraOuter: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  cameraWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
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
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultContainer: {
    minHeight: 320,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  resultLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  resultLoadingText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  statusIcon: {
    marginBottom: spacing.base,
  },
  statusTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusMsg: {
    ...typography.body,
    color: colors.dangerLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
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
    color: colors.white,
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
    color: colors.white,
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
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
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
});
