import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Package, ChevronLeft, Truck,
  CheckCircle, Clock, AlertTriangle, Box,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, spacing, typography, radii, shadows } from '../styles/theme';

const STATUS_CONFIG = {
  pending:    { label: 'PENDING',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  in_transit: { label: 'IN TRANSIT', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  delivered:  { label: 'DELIVERED',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  cancelled:  { label: 'CANCELLED',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function DispatchDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [delivered, setDelivered] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-order', orderId],
    queryFn: () => api.get('/dispatch-orders').then(r =>
      r.data.data.find(o => o.id === orderId)
    ),
    refetchInterval: 15000,
  });

  const order = data;
  const cfg = order ? (STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending) : null;

  // ── DEPART mutation ──
  const departMutation = useMutation({
    mutationFn: () => api.post(`/dispatch-orders/${orderId}/depart`),
    onSuccess: () => {
      Vibration.vibrate([0, 100, 80, 100]);
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-order', orderId] });
    },
    onError: (err) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not mark as departed.');
    },
  });

  // ── DELIVER mutation ──
  const deliverMutation = useMutation({
    mutationFn: () => api.post(`/dispatch-orders/${orderId}/deliver`),
    onSuccess: () => {
      Vibration.vibrate([0, 200, 100, 200, 100, 400]);
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
      setDelivered(true);
    },
    onError: (err) => {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not confirm delivery.');
    },
  });

  const handleDepart = () => {
    Alert.alert(
      '📦 Load & Depart',
      `Confirm you have loaded all items for ${order?.shelter?.name}?\n\nThis will mark the order as In Transit.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Departing Now', style: 'default', onPress: () => departMutation.mutate() },
      ]
    );
  };

  const handleDeliver = () => {
    Alert.alert(
      '✅ Confirm Delivery',
      `Confirm all items have been delivered to ${order?.shelter?.name}?\n\nWarehouse stock will be deducted immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Delivered!', style: 'default', onPress: () => deliverMutation.mutate() },
      ]
    );
  };

  // ── Delivery success screen ──
  if (delivered) {
    return (
      <View style={[styles.successScreen, { paddingTop: insets.top }]}>
        <View style={styles.successIconWrap}>
          <CheckCircle size={72} color={colors.successLight} />
        </View>
        <Text style={styles.successTitle}>DELIVERY CONFIRMED</Text>
        <Text style={styles.successSubtitle}>
          Order #{orderId} · {order?.shelter?.name}
        </Text>

        <View style={styles.successManifest}>
          {order?.items?.map(item => (
            <View key={item.id} style={styles.successItem}>
              <Box size={14} color={colors.successLight} />
              <Text style={styles.successItemText}>
                {item.inventory_item?.item_name} — {item.quantity} {item.inventory_item?.unit_type}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.backToQueueBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Text style={styles.backToQueueText}>← Back to Queue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalUnits = order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const formatDateTime = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleString('en-PH', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={20} color={colors.textSecondary} />
        <Text style={styles.backText}>Dispatch Queue</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{orderId}</Text>
          <View style={styles.shelterRow}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.shelterName}>{order.shelter?.name}</Text>
          </View>
        </View>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Clock size={14} color={colors.textMuted} />
          <Text style={styles.timelineText}>Created: {formatDateTime(order.created_at)}</Text>
        </View>
        {order.departed_at && (
          <View style={styles.timelineItem}>
            <Truck size={14} color='#f59e0b' />
            <Text style={styles.timelineText}>Departed: {formatDateTime(order.departed_at)}</Text>
          </View>
        )}
        {order.delivered_at && (
          <View style={styles.timelineItem}>
            <CheckCircle size={14} color={colors.successLight} />
            <Text style={styles.timelineText}>Delivered: {formatDateTime(order.delivered_at)}</Text>
          </View>
        )}
        {order.creator && (
          <View style={styles.timelineItem}>
            <Package size={14} color={colors.textMuted} />
            <Text style={styles.timelineText}>Created by: {order.creator.name}</Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {order.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>📝 INSTRUCTIONS</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* Manifest */}
      <Text style={styles.sectionTitle}>MANIFEST — {order.items?.length} items · {totalUnits} units</Text>
      <View style={styles.manifest}>
        {order.items?.map((item, idx) => (
          <View key={item.id ?? idx} style={[styles.manifestRow, idx < order.items.length - 1 && styles.manifestDivider]}>
            <View style={styles.manifestLeft}>
              <Box size={16} color={colors.primary} />
              <View>
                <Text style={styles.manifestItemName}>{item.inventory_item?.item_name ?? item.inventoryItem?.item_name ?? '—'}</Text>
                <Text style={styles.manifestUnit}>{item.inventory_item?.unit_type ?? item.inventoryItem?.unit_type ?? ''}</Text>
              </View>
            </View>
            <Text style={styles.manifestQty}>× {item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      {order.status === 'pending' && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.departBtn, departMutation.isPending && styles.btnDisabled]}
            onPress={handleDepart}
            activeOpacity={0.85}
            disabled={departMutation.isPending}
          >
            {departMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Truck size={20} color="#fff" />
            }
            <Text style={styles.actionBtnText}>LOAD & DEPART</Text>
          </TouchableOpacity>
          <Text style={styles.actionHint}>Marks order as in transit. Drive to {order.shelter?.name}.</Text>
        </View>
      )}

      {order.status === 'in_transit' && (
        <View style={styles.actionSection}>
          <View style={styles.inTransitBanner}>
            <Truck size={18} color='#f59e0b' />
            <Text style={styles.inTransitText}>En route to {order.shelter?.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deliverBtn, deliverMutation.isPending && styles.btnDisabled]}
            onPress={handleDeliver}
            activeOpacity={0.85}
            disabled={deliverMutation.isPending}
          >
            {deliverMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <CheckCircle size={20} color="#fff" />
            }
            <Text style={styles.actionBtnText}>CONFIRM DELIVERY</Text>
          </TouchableOpacity>
          <View style={styles.warningRow}>
            <AlertTriangle size={13} color={colors.warning} />
            <Text style={styles.warningText}>
              Stock will be deducted from warehouse on confirmation.
            </Text>
          </View>
        </View>
      )}

      {order.status === 'delivered' && (
        <View style={styles.deliveredBanner}>
          <CheckCircle size={22} color={colors.successLight} />
          <Text style={styles.deliveredText}>Delivered · {formatDateTime(order.delivered_at)}</Text>
        </View>
      )}

      {order.status === 'cancelled' && (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledText}>This order was cancelled.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.base, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Back
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.base },
  backText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Header
  orderHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.base,
  },
  orderNumber: { color: colors.textPrimary, fontWeight: '900', fontSize: 22, letterSpacing: 0.5 },
  shelterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  shelterName: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full, marginTop: 4 },
  statusLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // Timeline
  timeline: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.base, marginBottom: spacing.base, gap: 8, ...shadows.sm,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineText: { color: colors.textSecondary, fontSize: 13 },

  // Notes
  notesBox: {
    backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: radii.lg,
    padding: spacing.base, marginBottom: spacing.base,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  notesLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  notesText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  // Manifest
  sectionTitle: {
    ...typography.label, color: colors.textMuted,
    letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  manifest: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    marginBottom: spacing.lg, overflow: 'hidden', ...shadows.sm,
  },
  manifestRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: spacing.base,
  },
  manifestDivider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceElevated },
  manifestLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  manifestItemName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  manifestUnit: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  manifestQty: { color: colors.primary, fontWeight: '900', fontSize: 16 },

  // Actions
  actionSection: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: radii.lg, padding: 16, ...shadows.md,
  },
  departBtn: { backgroundColor: colors.primary },
  deliverBtn: { backgroundColor: '#16a34a' },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  actionHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  // In-transit banner
  inTransitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: radii.lg,
    padding: spacing.base,
  },
  inTransitText: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },

  // Warning
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  warningText: { color: colors.textMuted, fontSize: 11 },

  // Delivered/Cancelled banners
  deliveredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: radii.lg, padding: spacing.base,
  },
  deliveredText: { color: colors.successLight, fontWeight: '700', fontSize: 15 },
  cancelledBanner: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.base, alignItems: 'center',
  },
  cancelledText: { color: colors.textMuted, fontSize: 14 },

  // Success screen
  successScreen: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: spacing.base,
  },
  successIconWrap: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    color: colors.textPrimary, fontWeight: '900', fontSize: 26,
    letterSpacing: 2, marginBottom: 6, textAlign: 'center',
  },
  successSubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  successManifest: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    padding: spacing.base, width: '100%', gap: 8, marginBottom: spacing.lg, ...shadows.sm,
  },
  successItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successItemText: { color: colors.textSecondary, fontSize: 14 },
  backToQueueBtn: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  backToQueueText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
};
