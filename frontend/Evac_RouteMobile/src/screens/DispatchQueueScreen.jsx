import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Clock, MapPin, ChevronRight, CheckCircle, Truck } from 'lucide-react-native';
import api from '../services/api';
import { colors, spacing, typography, radii, shadows } from '../styles/theme';

const STATUS_CONFIG = {
  pending:    { label: 'PENDING',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    icon: Clock },
  in_transit: { label: 'IN TRANSIT', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   icon: Truck },
  delivered:  { label: 'DELIVERED',  color: '#22c55e', bg: 'rgba(34,197,94,0.15)',    icon: CheckCircle },
  cancelled:  { label: 'CANCELLED',  color: '#6b7280', bg: 'rgba(107,114,128,0.15)',  icon: Package },
};

const FILTERS = ['All', 'Pending', 'In Transit', 'Delivered'];

// Module-level timestamp — stable across renders, avoids Date.now in render path
const MODULE_NOW = new Date().getTime();
const timeAgo = (dateStr) => {
  const diff = (MODULE_NOW - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function DispatchQueueScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('All');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dispatch-orders'],
    queryFn: () => api.get('/dispatch-orders').then(r => r.data),
    refetchInterval: 30000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
  }, [queryClient]);

  const orders = data?.data ?? [];

  const filtered = orders.filter(o => {
    if (activeFilter === 'All') return o.status !== 'cancelled';
    if (activeFilter === 'Pending')    return o.status === 'pending';
    if (activeFilter === 'In Transit') return o.status === 'in_transit';
    if (activeFilter === 'Delivered')  return o.status === 'delivered';
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const totalUnits = (order) =>
    order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const renderOrder = ({ item: order }) => {
    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    const isPending = order.status === 'pending';


    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: cfg.color }]}
        onPress={() => navigation.navigate('DispatchDetail', { orderId: order.id })}
        activeOpacity={0.82}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={styles.shelterName}>{order.shelter?.name ?? '—'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
            <StatusIcon size={11} color={cfg.color} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.itemSummary}>
          {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''} · {totalUnits(order)} units total
        </Text>

        <View style={styles.cardBottom}>
          <Text style={styles.metaText}>
            {order.creator?.name ?? 'Admin'} · {timeAgo(order.created_at)}
          </Text>
          {isPending && (
            <View style={styles.assignedBadge}>
              <Text style={styles.assignedText}>Tap to act</Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.textMuted} />
        </View>

        {order.notes ? (
          <Text style={styles.notes} numberOfLines={1}>📝 {order.notes}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DISPATCH ORDERS</Text>
          <Text style={styles.subtitle}>
            {pendingCount > 0 ? `${pendingCount} pending · action required` : 'All caught up'}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <Package size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Could not load dispatch orders.</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <View style={styles.center}>
          <CheckCircle size={40} color={colors.successLight} />
          <Text style={styles.emptyText}>No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} orders.</Text>
        </View>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={o => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.heading, color: colors.textPrimary, letterSpacing: 2, fontSize: 17 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.danger,
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  shelterName: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, flex: 1 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full,
  },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  itemSummary: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  assignedBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radii.full, marginRight: 6,
  },
  assignedText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  notes: { color: colors.textMuted, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  retryBtn: { backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { color: colors.primary, fontWeight: '700' },
};
