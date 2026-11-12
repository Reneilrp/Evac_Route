import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Universal Mobile Modal Dialog
 * Clean themed backdrop, card shell, header with title & dismiss, content container.
 */
export default function ModalDialog({
  visible,
  onClose,
  title,
  subtitle,
  children,
  icon: Icon,
  iconColor,
  closeOnBackdrop = true,
  animationType = 'fade',
  footer,
}) {
  const { colors, isDarkMode } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={closeOnBackdrop ? onClose : undefined}
      >
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: isDarkMode ? (colors.cardDark || '#1e293b') : (colors.cardLight || '#ffffff'),
              borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.8)',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || onClose) && (
            <View style={[styles.header, { borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
              <View style={styles.titleRow}>
                {Icon && (
                  <View style={styles.iconBox}>
                    <Icon size={20} color={iconColor || colors.primary} />
                  </View>
                )}
                <View style={styles.titleTextContainer}>
                  {title && (
                    <Text style={[styles.title, { color: colors.text || '#0f172a' }]}>
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: colors.textMuted || '#64748b' }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>
              {onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.textMuted || '#64748b'} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Body */}
          <View style={styles.body}>{children}</View>

          {/* Optional Footer */}
          {footer && (
            <View style={[styles.footer, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
              {footer}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
