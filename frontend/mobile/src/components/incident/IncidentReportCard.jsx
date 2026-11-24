import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
} from 'lucide-react-native';

export default function IncidentReportCard({
  item,
  colors,
  hazardTypes = [],
  severityColors = {},
}) {
  const isApproved = item.status === 'validated' || item.status === 'approved' || !!item.validated_at;
  const isRejected = item.status === 'dismissed' || item.status === 'rejected';
  const isRead = item.is_read || isApproved || isRejected;

  const isSos = Boolean(
    (item.name && item.name.toUpperCase().includes('EMERGENCY SOS')) ||
    item.hazard_type === 'sos' ||
    (Array.isArray(item.modifiers) && item.modifiers.length > 0)
  );

  const photosList = item.photo_urls && item.photo_urls.length > 0
    ? item.photo_urls
    : item.photo_url ? [item.photo_url] : [];

  const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isApproved ? '#10b981' : isRejected ? colors.border : isSos ? '#ef4444' : '#38bdf8',
    }}>
      {/* Top Header: Hazard & Severity */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: isSos ? '#ef4444' : colors.textPrimary }}>
            {isSos ? '🚨 Emergency SOS' : (hazardTypes.find(h => h.value === item.hazard_type)?.label || `⚠️ ${item.hazard_type}`)}
          </Text>
          {isSos && item.hazard_type && item.hazard_type !== 'sos' && (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
              • {hazardTypes.find(h => h.value === item.hazard_type)?.label || item.hazard_type}
            </Text>
          )}
        </View>

        <View style={{
          backgroundColor: isSos ? '#ef4444' : (severityColors[item.severity_level] || colors.surface),
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' }}>
            {isSos ? 'CRITICAL RESCUE' : item.severity_level}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
        {item.name}
      </Text>

      {item.description ? (
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, lineHeight: 18 }}>
          {item.description}
        </Text>
      ) : null}

      {/* Special Needs / Vulnerability Modifiers */}
      {isSos && Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {item.modifiers.map((mod, idx) => (
            <View key={idx} style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#991b1b', textTransform: 'capitalize' }}>
                ⚠️ {String(mod).replace('_', ' ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Photos Preview */}
      {photosList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {photosList.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={{ width: 80, height: 70, borderRadius: 8, marginRight: 8 }} />
          ))}
        </ScrollView>
      )}

      {/* Location, Geometry & Time */}
      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>
        📍 {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
        {item.geometry_type ? ` • ${item.geometry_type === 'road_corridor' ? '🛣️ Road Corridor' : '🔘 Circle Radius'} (${item.radius_meters || 50}m)` : ''}
        {' • '}{formattedDate}
      </Text>

      {/* OFFICIAL READ & REVIEW STATUS BADGE */}
      <View style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: isApproved
          ? '#dcfce7'
          : isRejected
          ? (isSos ? '#eff6ff' : '#fee2e2')
          : (isSos ? '#fef2f2' : '#fef3c7'),
        borderWidth: 1,
        borderColor: isApproved
          ? '#bbf7d0'
          : isRejected
          ? (isSos ? '#bfdbfe' : '#fecaca')
          : (isSos ? '#fecaca' : '#fde68a'),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        {isSos ? (
          isApproved ? (
            <>
              <ShieldCheck color="#166534" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                  🛡️ SOS Acknowledged & Rescue Dispatched
                </Text>
                <Text style={{ fontSize: 11, color: '#15803d', marginTop: 1 }}>
                  CDRRMO operations center has mobilized rescue personnel to your location. Standby for rescue contact.
                </Text>
              </View>
            </>
          ) : isRejected ? (
            <>
              <CheckCircle2 color="#1e40af" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e40af' }}>
                  ✅ Rescue Mission Resolved / Closed
                </Text>
                <Text style={{ fontSize: 11, color: '#1d4ed8', marginTop: 1 }}>
                  {item.review_note ? `Note: ${item.review_note}` : 'CDRRMO rescue command has marked this mission as successfully resolved.'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <LifeBuoy color="#b91c1c" size={20} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#b91c1c' }}>
                  🚨 Distress Call Transmitted to CDRRMO
                </Text>
                <Text style={{ fontSize: 11, color: '#991b1b', marginTop: 1 }}>
                  Direct emergency SOS received by CDRRMO Tactical Dispatch. Private distress call visible only to you and DRRM rescue personnel.
                </Text>
              </View>
            </>
          )
        ) : (
          isApproved ? (
            <>
              <ShieldCheck color="#166534" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>
                  🛡️ Approved and Validated by CDRRMO
                </Text>
                <Text style={{ fontSize: 11, color: '#15803d', marginTop: 1 }}>
                  Verified by CDRRMO operations center. Official validation badge granted.
                </Text>
              </View>
            </>
          ) : isRejected ? (
            <>
              <XCircle color="#991b1b" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#991b1b' }}>
                  ❌ Dismissed by CDRRMO
                </Text>
                <Text style={{ fontSize: 11, color: '#b91c1c', marginTop: 1 }}>
                  {item.review_note ? `Note: ${item.review_note}` : 'CDRRMO reviewed this report and deemed it non-hazardous or resolved.'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <AlertTriangle color="#b45309" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309' }}>
                  ⚠️ Community Reported (Active on Live Map)
                </Text>
                <Text style={{ fontSize: 11, color: '#92400e', marginTop: 1 }}>
                  Instantly active on evacuation routing and live map. Pending official CDRRMO staff validation.
                </Text>
              </View>
            </>
          )
        )}
      </View>
    </View>
  );
}
