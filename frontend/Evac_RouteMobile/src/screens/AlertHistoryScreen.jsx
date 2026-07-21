import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft } from 'lucide-react-native';
import { useResidentStore } from '../context/useResidentStore';
import EmptyState from '../components/EmptyState';
import { colors } from '../styles/theme';
import styles from '../styles/AlertHistoryScreen.styles';

const ALERT_TYPE_CONFIG = {
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
    bgColor: 'rgba(59, 130, 246, 0.2)',
    textColor: '#93c5fd',
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
};

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.scrollContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation?.goBack?.()}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              marginRight: 12,
            }}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Alert History</Text>
            <Text style={styles.headerSubtitle}>Past alerts and notifications</Text>
          </View>
        </View>

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
    </SafeAreaView>
  );
}
