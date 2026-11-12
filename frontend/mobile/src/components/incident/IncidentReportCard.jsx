import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
} from 'lucide-react-native';

export default function IncidentReportCard({
  item,
  colors,
  hazardTypes = [],
  severityColors = {},
}) {
  const isApproved = item.status === 'approved';
  const isRejected = item.status === 'rejected';
  const isRead = item.is_read || isApproved || isRejected;

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
      borderColor: isRead ? colors.border : '#3b82f6',
    }}>
      {/* Top Header: Hazard & Severity */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
            {hazardTypes.find(h => h.value === item.hazard_type)?.label || `⚠️ ${item.hazard_type}`}
          </Text>
        </View>

        <View style={{
          backgroundColor: severityColors[item.severity_level] || colors.surface,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' }}>
            {item.severity_level}
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

      {/* Photos Preview */}
      {photosList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {photosList.map((url, idx) => (
            <Image key={idx} source={{ uri: url }} style={{ width: 80, height: 70, borderRadius: 8, marginRight: 8 }} />
          ))}
        </ScrollView>
      )}

      {/* Location & Time */}
      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>
        📍 {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)} • {formattedDate}
      </Text>

      {/* OFFICIAL READ & REVIEW STATUS BADGE */}
      <View style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: isApproved
          ? '#dcfce7'
          : isRejected
          ? '#fee2e2'
          : isRead
          ? '#e0f2fe'
          : '#fef3c7',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        {isApproved ? (
          <>
            <CheckCircle2 color="#166534" size={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                ✅ Approved & Live on Map
              </Text>
              <Text style={{ fontSize: 11, color: '#15803d' }}>
                LGU has verified this report and activated it on the live evacuation map.
              </Text>
            </View>
          </>
        ) : isRejected ? (
          <>
            <XCircle color="#991b1b" size={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#991b1b' }}>
                ❌ Report Rejected
              </Text>
              {item.review_note && (
                <Text style={{ fontSize: 11, color: '#b91c1c' }}>Note: {item.review_note}</Text>
              )}
            </View>
          </>
        ) : isRead ? (
          <>
            <Eye color="#0369a1" size={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1' }}>
                👀 Read by LGU Officials
              </Text>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>
                Your report has been opened and read by LGU command staff. Currently under evaluation.
              </Text>
            </View>
          </>
        ) : (
          <>
            <Clock color="#b45309" size={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#b45309' }}>
                ⏳ Pending Review (Unread)
              </Text>
              <Text style={{ fontSize: 11, color: '#92400e' }}>
                Queued for review by CDRRMO evaluation desk.
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
