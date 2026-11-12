import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export default function ActiveHazardsDrawer({
  showDisasterView,
  setShowDisasterView,
  activeHazards = [],
  activeRescuerLocation,
  getHaversineDistanceMeters,
  insets,
  isDarkMode,
  colors,
}) {
  if (!showDisasterView) return null;

  return (
    <View style={{
      position: 'absolute',
      top: insets.top + 130,
      left: 14,
      right: 14,
      maxHeight: 280,
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: '#ef4444',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 90,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0', paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={16} color="#ef4444" />
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
            DISASTER SITUATIONAL VIEW ({activeHazards.length} ACTIVE)
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowDisasterView(false)} style={{ padding: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
        {activeHazards.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
            ✓ No active disaster hazards reported in sector.
          </Text>
        ) : (
          activeHazards.map((hz) => {
            const hzLat = parseFloat(hz.latitude);
            const hzLng = parseFloat(hz.longitude);
            const distM = (activeRescuerLocation && !isNaN(hzLat) && !isNaN(hzLng) && getHaversineDistanceMeters)
              ? Math.round(getHaversineDistanceMeters(activeRescuerLocation[1], activeRescuerLocation[0], hzLat, hzLng))
              : null;
            const hzType = (hz.hazard_type || '').toLowerCase();
            const icon = hzType.includes('fire') ? '🔥' : hzType.includes('landslide') ? '⛰️' : hzType.includes('flood') ? '🌊' : '⚠️';

            return (
              <View key={hz.id} style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 16 }}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                      {hz.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                      {hz.hazard_type?.toUpperCase()} • {hz.severity_level?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {distM !== null && (
                  <View style={{ backgroundColor: distM < 500 ? '#ef4444' : (isDarkMode ? '#334155' : '#e2e8f0'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: distM < 500 ? '#ffffff' : colors.textPrimary, fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }}>
                      {distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`} away
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
