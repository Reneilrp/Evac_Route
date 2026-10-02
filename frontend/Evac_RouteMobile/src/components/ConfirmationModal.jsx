import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { AlertTriangle, Archive, ArchiveRestore, CheckCircle2 } from 'lucide-react-native';
import { colors, radii } from '../styles/theme';

const VARIANT_CONFIGS = {
  warning: {
    iconColor: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconBorder: 'rgba(245, 158, 11, 0.35)',
    buttonBg: '#d97706',
    defaultIcon: Archive,
  },
  danger: {
    iconColor: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconBorder: 'rgba(239, 68, 68, 0.35)',
    buttonBg: '#dc2626',
    defaultIcon: AlertTriangle,
  },
  primary: {
    iconColor: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconBorder: 'rgba(59, 130, 246, 0.35)',
    buttonBg: '#2563eb',
    defaultIcon: ArchiveRestore,
  },
  success: {
    iconColor: '#22c55e',
    iconBg: 'rgba(34, 197, 94, 0.15)',
    iconBorder: 'rgba(34, 197, 94, 0.35)',
    buttonBg: '#16a34a',
    defaultIcon: CheckCircle2,
  },
};

export default function ConfirmationModal({
  visible = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  detail = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'warning' | 'danger' | 'primary' | 'success'
  icon: CustomIcon,
  loading = false,
}) {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.warning;
  const IconComponent = CustomIcon || config.defaultIcon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading && onClose) onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={() => !loading && onClose && onClose()}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.card}>
              {/* Top Accent Pill Indicator */}
              <View style={[styles.pillAccent, { backgroundColor: config.iconColor }]} />

              {/* Icon Container with glowing ring */}
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: config.iconBg,
                    borderColor: config.iconBorder,
                  },
                ]}
              >
                <IconComponent color={config.iconColor} size={28} strokeWidth={2.2} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              <Text style={styles.message}>{message}</Text>

              {/* Optional Detail Container */}
              {detail ? (
                <View style={styles.detailContainer}>
                  <Text style={styles.detailText} numberOfLines={2}>
                    {detail}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: config.buttonBg },
                    loading && { opacity: 0.75 },
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  pillAccent: {
    position: 'absolute',
    top: 0,
    left: '35%',
    right: '35%',
    height: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailContainer: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  detailText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
