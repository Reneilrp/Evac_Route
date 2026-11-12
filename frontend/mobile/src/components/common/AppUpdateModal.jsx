import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Sparkles, Download, CheckCircle2, X, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppUpdate } from '../../context/AppUpdateContext';

export default function AppUpdateModal() {
  const { colors, isDarkMode } = useTheme();
  const {
    showUpdateModal,
    setShowUpdateModal,
    isDownloading,
    applyUpdateNow,
    activePatchNotes,
    currentVersion,
  } = useAppUpdate();

  if (!showUpdateModal) return null;

  return (
    <Modal
      visible={showUpdateModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDownloading) setShowUpdateModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: isDarkMode ? '#0f172a' : colors.surface || '#ffffff' },
          ]}
        >
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            {isDownloading ? (
              <ActivityIndicator size="large" color="#38bdf8" />
            ) : (
              <Sparkles size={28} color="#f59e0b" />
            )}
          </View>

          {/* Title & Badge */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDarkMode ? '#ffffff' : colors.textPrimary || '#0f172a' },
              ]}
            >
              {isDownloading ? 'Updating EvacRoute...' : 'New Update Available!'}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{activePatchNotes?.version || currentVersion}</Text>
            </View>
          </View>

          <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#94a3b8' : colors.textSecondary }]}>
            {isDownloading
              ? 'Downloading latest tactical patches and hotfixes. The app will reload automatically when ready.'
              : activePatchNotes?.title || 'A new update is ready for installation.'}
          </Text>

          {/* Highlights Preview */}
          {!isDownloading && activePatchNotes?.highlights && (
            <View
              style={[
                styles.highlightsBox,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' },
              ]}
            >
              <Text style={styles.highlightsHeader}>WHAT'S NEW IN THIS RELEASE:</Text>
              <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                {activePatchNotes.highlights.slice(0, 4).map((item, index) => (
                  <View key={index} style={styles.highlightItem}>
                    <Text style={styles.highlightBullet}>•</Text>
                    <Text
                      style={[
                        styles.highlightText,
                        { color: isDarkMode ? '#cbd5e1' : '#334155' },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionWrap}>
            {isDownloading ? (
              <View style={styles.downloadingStatusBox}>
                <RefreshCw size={16} color="#38bdf8" />
                <Text style={styles.downloadingStatusText}>
                  Installing update package (0s downtime)...
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryUpdateBtn}
                  onPress={applyUpdateNow}
                  activeOpacity={0.85}
                >
                  <Download size={18} color="#ffffff" />
                  <Text style={styles.primaryUpdateBtnText}>UPDATE NOW &amp; RELOAD</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.laterBtn}
                  onPress={() => setShowUpdateModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.laterBtnText, { color: colors.textMuted || '#94a3b8' }]}>
                    Later / Remind Me Next Launch
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  versionBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  versionBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  highlightsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  highlightsHeader: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#38bdf8',
    marginBottom: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  highlightBullet: {
    color: '#f59e0b',
    fontSize: 14,
    lineHeight: 18,
  },
  highlightText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  actionWrap: {
    width: '100%',
    gap: 10,
  },
  primaryUpdateBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryUpdateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  laterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadingStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  downloadingStatusText: {
    color: '#38bdf8',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
