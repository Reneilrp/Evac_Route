import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Tag,
  Calendar,
  Layers,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppUpdate } from '../../context/AppUpdateContext';
import { APP_FULL_VERSION, APP_BUILD_NUMBER } from '../../config/version';

export default function PatchNotesScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const {
    currentVersion,
    patchHistory,
    isChecking,
    checkForAppUpdate,
    markPatchNotesAsSeen,
  } = useAppUpdate();

  React.useEffect(() => {
    markPatchNotesAsSeen();
  }, [markPatchNotesAsSeen]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#0b1326' : colors.background },
      ]}
      edges={['top', 'bottom']}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.headerRow,
          { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={isDarkMode ? '#ffffff' : colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.headerTitle,
              { color: isDarkMode ? '#ffffff' : colors.textPrimary },
            ]}
          >
            What's New &amp; Updates
          </Text>
          <Text
            style={[
              styles.headerSub,
              { color: isDarkMode ? '#94a3b8' : colors.textSecondary },
            ]}
          >
            EvacRoute Release Notes &amp; Patches
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.checkUpdateBtn, isChecking && { opacity: 0.6 }]}
          onPress={() => checkForAppUpdate(true)}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#38bdf8" />
          ) : (
            <>
              <RefreshCw size={14} color="#38bdf8" />
              <Text style={styles.checkUpdateBtnText}>Check</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Active Build Card */}
        <View
          style={[
            styles.currentBuildCard,
            { backgroundColor: isDarkMode ? '#111e38' : colors.surface || '#ffffff' },
          ]}
        >
          <View style={styles.buildInfoRow}>
            <View style={styles.buildIconCircle}>
              <Layers size={22} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.buildTagRow}>
                <Text style={styles.buildLabel}>INSTALLED VERSION</Text>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>CURRENT</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.buildVersionText,
                  { color: isDarkMode ? '#ffffff' : colors.textPrimary },
                ]}
              >
                v{currentVersion} (Build {APP_BUILD_NUMBER})
              </Text>
              <Text
                style={[
                  styles.buildChannelText,
                  { color: isDarkMode ? '#94a3b8' : colors.textMuted },
                ]}
              >
                OTA Channel: Production • Runtime: appVersion
              </Text>
            </View>
          </View>
        </View>

        {/* Patch History Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: isDarkMode ? '#94a3b8' : colors.textMuted },
          ]}
        >
          RELEASE HISTORY &amp; CHANGELOG
        </Text>

        {patchHistory.map((item, index) => {
          const isLatest = index === 0;
          return (
            <View
              key={item.version}
              style={[
                styles.patchCard,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : colors.surface || '#ffffff',
                  borderColor: isLatest
                    ? 'rgba(56, 189, 248, 0.4)'
                    : isDarkMode
                    ? 'rgba(255,255,255,0.06)'
                    : colors.border,
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.versionRow}>
                    <Text
                      style={[
                        styles.versionNumber,
                        { color: isDarkMode ? '#ffffff' : colors.textPrimary },
                      ]}
                    >
                      v{item.version}
                    </Text>
                    <View
                      style={[
                        styles.badgeWrap,
                        {
                          backgroundColor:
                            item.badgeVariant === 'success'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.badgeVariant === 'success'
                                ? '#10b981'
                                : isDarkMode
                                ? '#94a3b8'
                                : '#64748b',
                          },
                        ]}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>Released {item.date}</Text>
                </View>
              </View>

              {/* Title */}
              <Text
                style={[
                  styles.patchTitle,
                  { color: isDarkMode ? '#e2e8f0' : colors.textPrimary },
                ]}
              >
                {item.title}
              </Text>

              {/* Highlights */}
              <View style={styles.highlightsContainer}>
                <Text style={styles.subsectionHeader}>FEATURES &amp; ENHANCEMENTS</Text>
                {item.highlights.map((h, hIdx) => (
                  <View key={hIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text
                      style={[
                        styles.bulletText,
                        { color: isDarkMode ? '#cbd5e1' : '#334155' },
                      ]}
                    >
                      {h}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Fixes */}
              {item.fixes && item.fixes.length > 0 && (
                <View style={[styles.fixesContainer, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                  <Text style={styles.fixesHeader}>BUG FIXES &amp; RELIABILITY</Text>
                  {item.fixes.map((f, fIdx) => (
                    <View key={fIdx} style={styles.bulletRow}>
                      <CheckCircle2 size={13} color="#10b981" style={{ marginTop: 2 }} />
                      <Text
                        style={[
                          styles.bulletText,
                          { color: isDarkMode ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footerSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  checkUpdateBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  currentBuildCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  buildInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buildIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  buildLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#0284c7',
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeTagText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  buildVersionText: {
    fontSize: 15,
    fontWeight: '900',
  },
  buildChannelText: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  patchCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  patchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },
  highlightsContainer: {
    marginBottom: 10,
  },
  subsectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#0284c7',
    marginBottom: 6,
  },
  fixesContainer: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  fixesHeader: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#10b981',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 5,
  },
  bulletDot: {
    color: '#0284c7',
    fontSize: 13,
    lineHeight: 16,
  },
  bulletText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  footerSpacing: {
    height: 30,
  },
});
