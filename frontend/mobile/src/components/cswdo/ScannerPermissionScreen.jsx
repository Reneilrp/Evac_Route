import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, QrCode, Settings, Camera as CameraIcon, RefreshCw } from 'lucide-react-native';
import { spacing } from '../../styles/theme';

export default function ScannerPermissionScreen({
  permission,
  insets,
  styles,
  colors,
  handleOpenSettings,
  handleRequestPermission,
  getPermission,
  setManualOnlyMode,
}) {
  const isPermanentlyDenied = !permission?.canAskAgain;

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
