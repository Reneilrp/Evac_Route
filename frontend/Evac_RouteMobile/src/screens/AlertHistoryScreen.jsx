import { View, Text, FlatList } from 'react-native';
import { Bell } from 'lucide-react-native';
import CustomHeader from '../components/CustomHeader';
import { useResidentStore } from '../context/useResidentStore';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import EmptyState from '../components/EmptyState';
import { getStyles } from '../styles/AlertHistoryScreen.styles';

const getAlertTypeConfig = (colors) => ({
  evacuation: {
    color: colors.danger,
    bgColor: colors.dangerBg,
    textColor: colors.dangerText,
    label: 'EVACUATION',
  },
  status_change: {
    color: colors.successLight,
    bgColor: colors.successBg,
    textColor: colors.successText,
    label: 'STATUS',
  },
  relief: {
    color: colors.primary,
    bgColor: colors.primaryGlow,
    textColor: colors.primary,
    label: 'RELIEF',
  },
  route_update: {
    color: colors.warning,
    bgColor: colors.warningBg,
    textColor: colors.warningText,
    label: 'ROUTE',
  },
  info: {
    color: colors.textMuted,
    bgColor: colors.surfaceElevated,
    textColor: colors.textSecondary,
    label: 'INFO',
  },
});

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AlertHistoryScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);
  const ALERT_TYPE_CONFIG = getAlertTypeConfig(colors);
  const alertHistory = useResidentStore(state => state.alertHistory);

  const renderAlert = ({ item }) => {
    const config = ALERT_TYPE_CONFIG[item.type] || ALERT_TYPE_CONFIG.info;

    return (
      <View style={styles.alertCard}>
        <View style={[styles.alertIconStrip, { backgroundColor: config.color }]} />
        <View style={styles.alertContent}>
          <View style={[styles.alertBadge, { backgroundColor: config.bgColor }]}>
            <Text style={[styles.alertBadgeText, { color: config.textColor }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={styles.alertTime}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Broadcast Alerts"
        subtitle="Past warnings and emergency notices"
        onBack={() => navigation?.goBack?.()}
      />
      <View style={styles.scrollContent}>

        {alertHistory && alertHistory.length > 0 ? (
          <FlatList
            data={alertHistory}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderAlert}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            icon={<Bell size={48} color={colors.textMuted} />}
            title="No Alerts Yet"
            subtitle="You'll see evacuation orders, status changes, and relief updates here."
          />
        )}
      </View>
    </View>
  );
}
