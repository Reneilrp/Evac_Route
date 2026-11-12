import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { ChevronDown, Info } from 'lucide-react-native';

export default function EvacMapHeaderBar({
  insets,
  showSituationBrief,
  setShowSituationBrief,
  setIsDisasterFilterExpanded,
  isDisasterFilterExpanded,
  setIsFilterExpanded,
  isFilterExpanded,
  isStyleMenuOpen = false,
  setIsStyleMenuOpen,
  triggerCasualHaptic,
  isHighContrast,
  isDarkMode,
  colors,
  hazards,
  shelters,
  selectedDisasterFilter,
  setSelectedDisasterFilter,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  isOffline = false,
  cacheSyncStatus = {},
}) {
  return (
    <>
      {/* ─── Unified Floating Pill Header Bar (Option A) ─── */}
      <View style={{
        position: 'absolute',
        top: Math.max(insets.top + 8, 48),
        left: 16,
        right: 16,
        zIndex: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left Side: Explicit Live Emergency Status Pill */}
        <TouchableOpacity
          onPress={() => {
            setShowSituationBrief(prev => !prev);
            setIsDisasterFilterExpanded(false);
            setIsFilterExpanded(false);
            setIsStyleMenuOpen(false);
            triggerCasualHaptic(40);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)'),
            paddingHorizontal: 10,
            paddingVertical: hazards.length > 0 ? 5 : 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: showSituationBrief ? colors.primary : (isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)')),
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 4,
            gap: 5,
          }}
        >
          {hazards.length > 0 ? (
            <View style={{ flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
                <Text style={{ color: isHighContrast ? '#FFFF00' : colors.textPrimary, fontSize: 10.5, fontWeight: 'bold' }}>
                  {shelters.length} Shelters
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626', fontSize: 10.5, fontWeight: 'bold' }}>
                  {hazards.length} Hazards
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />
              <Text style={{ color: isHighContrast ? '#FFFF00' : colors.textPrimary, fontSize: 11, fontWeight: 'bold' }}>
                {shelters.length} Shelters
              </Text>
            </View>
          )}
          {isOffline && (
            <View style={{ backgroundColor: '#eab308', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 7.5, fontWeight: '900' }}>
                {cacheSyncStatus.shelters ? 'OFFLINE · CACHED' : 'OFFLINE · NO CACHE'}
              </Text>
            </View>
          )}
          <Info size={12} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Right Side: Dual Dropdown Selector Pills (Disasters & Places) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Disaster Event Dropdown Pill */}
          <TouchableOpacity
            onPress={() => {
              setIsDisasterFilterExpanded(prev => !prev);
              setIsFilterExpanded(false);
              setShowSituationBrief(false);
              setIsStyleMenuOpen(false);
              triggerCasualHaptic(40);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectedDisasterFilter !== 'all' ? '#0284c7' : (isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)')),
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isDisasterFilterExpanded ? colors.primary : (isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)')),
              elevation: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              gap: 5,
            }}
          >
            <Text style={{ fontSize: 12 }}>
              {selectedDisasterFilter === 'flood' ? '🌊' :
               selectedDisasterFilter === 'fire' ? '🚒' :
               selectedDisasterFilter === 'earthquake' ? '🌋' :
               selectedDisasterFilter === 'siege' ? '⚔️' :
               selectedDisasterFilter === 'chemical' ? '🧪' : '🌐'}
            </Text>
            <Text style={{
              color: selectedDisasterFilter !== 'all' ? '#ffffff' : (isHighContrast ? '#FFFF00' : colors.textPrimary),
              fontSize: 11,
              fontWeight: 'bold'
            }}>
              {selectedDisasterFilter === 'flood' ? 'Flood' :
               selectedDisasterFilter === 'fire' ? 'Fire' :
               selectedDisasterFilter === 'earthquake' ? 'Quake' :
               selectedDisasterFilter === 'siege' ? 'Siege' :
               selectedDisasterFilter === 'chemical' ? 'Chem' : 'Disasters'}
            </Text>
            <ChevronDown size={13} color={selectedDisasterFilter !== 'all' ? '#ffffff' : colors.primary} style={{ transform: [{ rotate: isDisasterFilterExpanded ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>

          {/* Place Category Dropdown Pill */}
          <TouchableOpacity
            onPress={() => {
              setIsFilterExpanded(prev => !prev);
              setIsDisasterFilterExpanded(false);
              setShowSituationBrief(false);
              setIsStyleMenuOpen(false);
              triggerCasualHaptic(40);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectedCategoryFilter !== 'all' ? colors.primary : (isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)')),
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isFilterExpanded ? colors.primary : (isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)')),
              elevation: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              gap: 5,
            }}
          >
            <Text style={{ fontSize: 12 }}>
              {selectedCategoryFilter === 'shelter' ? '🏠' :
               selectedCategoryFilter === 'safe_zone' ? '🛡️' :
               selectedCategoryFilter === 'assembly_point' ? '🚩' :
               selectedCategoryFilter === 'security' ? '👮' : '📍'}
            </Text>
            <Text style={{
              color: selectedCategoryFilter !== 'all' ? '#ffffff' : (isHighContrast ? '#FFFF00' : colors.textPrimary),
              fontSize: 11,
              fontWeight: 'bold'
            }}>
              {selectedCategoryFilter === 'shelter' ? 'Shelters' :
               selectedCategoryFilter === 'safe_zone' ? 'Safe' :
               selectedCategoryFilter === 'assembly_point' ? 'Assembly' :
               selectedCategoryFilter === 'security' ? 'Police' : 'Places'}
            </Text>
            <ChevronDown size={13} color={selectedCategoryFilter !== 'all' ? '#ffffff' : colors.primary} style={{ transform: [{ rotate: isFilterExpanded ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Tap-Outside Dismiss Backdrop for Open Dropdowns & Overlays ─── */}
      {(isDisasterFilterExpanded || isFilterExpanded || showSituationBrief || isStyleMenuOpen) && (
        <Pressable
          onPress={() => {
            setIsDisasterFilterExpanded(false);
            setIsFilterExpanded(false);
            setShowSituationBrief(false);
            setIsStyleMenuOpen(false);
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 42,
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* Active Disaster Filter Contextual Notification Banner */}
      {selectedDisasterFilter !== 'all' && (
        <View style={{
          position: 'absolute',
          top: Math.max(insets.top + 48, 92),
          left: 16,
          right: 16,
          zIndex: 38,
          backgroundColor: selectedDisasterFilter === 'flood' ? 'rgba(2, 132, 199, 0.95)' :
                           selectedDisasterFilter === 'fire' ? 'rgba(234, 88, 12, 0.95)' :
                           selectedDisasterFilter === 'earthquake' ? 'rgba(217, 119, 6, 0.95)' :
                           selectedDisasterFilter === 'siege' ? 'rgba(79, 70, 229, 0.95)' : 'rgba(225, 29, 72, 0.95)',
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          elevation: 6,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={{ fontSize: 13 }}>
              {selectedDisasterFilter === 'flood' ? '🌊' :
               selectedDisasterFilter === 'fire' ? '🚒' :
               selectedDisasterFilter === 'earthquake' ? '🌋' :
               selectedDisasterFilter === 'siege' ? '⚔️' : '🧪'}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800', flex: 1 }} numberOfLines={1}>
              {selectedDisasterFilter === 'flood' ? 'FLOOD MODE: Safe High-Ground & Evac Centers' :
               selectedDisasterFilter === 'fire' ? 'FIRE MODE: Safe Assembly Points & Fire Stations' :
               selectedDisasterFilter === 'earthquake' ? 'EARTHQUAKE MODE: Open Areas & Hospitals' :
               selectedDisasterFilter === 'siege' ? 'SIEGE MODE: Police & Military Security Points' :
               'CHEMICAL MODE: Hospitals & Decontamination Safe Zones'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedDisasterFilter('all');
              triggerCasualHaptic(30);
            }}
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              marginLeft: 6,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Disaster Event Dropdown Menu Options ─── */}
      {isDisasterFilterExpanded && (
        <View style={{
          position: 'absolute',
          top: Math.max(insets.top + 48, 92),
          right: 125,
          width: 175,
          backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'),
          borderRadius: 16,
          padding: 6,
          borderWidth: 1,
          borderColor: isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.4 : 0.15,
          shadowRadius: 8,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: isDarkMode ? '#38bdf8' : colors.primary, paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase' }}>
            Filter Disaster Event
          </Text>
          {[
            { key: 'all', label: 'All Disasters', icon: '🌐' },
            { key: 'flood', label: 'Flood Event', icon: '🌊' },
            { key: 'fire', label: 'Fire Outbreak', icon: '🚒' },
            { key: 'earthquake', label: 'Earthquake', icon: '🌋' },
            { key: 'siege', label: 'Armed Siege', icon: '⚔️' },
            { key: 'chemical', label: 'Chemical Spill', icon: '🧪' },
          ].map(dItem => (
            <TouchableOpacity
              key={dItem.key}
              onPress={() => {
                setSelectedDisasterFilter(dItem.key);
                setIsDisasterFilterExpanded(false);
                triggerCasualHaptic(30);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: selectedDisasterFilter === dItem.key ? (isHighContrast ? '#FFFF00' : colors.primary) : 'transparent',
                marginBottom: 2,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 8 }}>{dItem.icon}</Text>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: selectedDisasterFilter === dItem.key ? (isHighContrast ? '#000000' : '#ffffff') : (isDarkMode ? '#cbd5e1' : colors.textPrimary)
              }}>
                {dItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── Place Category Dropdown Menu Options ─── */}
      {isFilterExpanded && (
        <View style={{
          position: 'absolute',
          top: Math.max(insets.top + 48, 92),
          right: 16,
          width: 175,
          backgroundColor: isHighContrast ? '#000000' : (isDarkMode ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)'),
          borderRadius: 16,
          padding: 6,
          borderWidth: 1,
          borderColor: isHighContrast ? '#FFFF00' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDarkMode ? 0.4 : 0.15,
          shadowRadius: 8,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: isDarkMode ? '#94a3b8' : colors.textSecondary, paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase' }}>
            Filter Place Type
          </Text>
          {[
            { key: 'all', label: 'All Places', icon: '📍' },
            { key: 'shelter', label: 'Evac Centers', icon: '🏠' },
            { key: 'safe_zone', label: 'Safe Zones', icon: '🛡️' },
            { key: 'assembly_point', label: 'Assembly Points', icon: '🚩' },
            { key: 'security', label: 'Police/Military', icon: '👮' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                setSelectedCategoryFilter(item.key);
                setIsFilterExpanded(false);
                triggerCasualHaptic(30);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: selectedCategoryFilter === item.key ? (isHighContrast ? '#FFFF00' : colors.primary) : 'transparent',
                marginBottom: 2,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 8 }}>{item.icon}</Text>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: selectedCategoryFilter === item.key ? (isHighContrast ? '#000000' : '#ffffff') : (isDarkMode ? '#cbd5e1' : colors.textPrimary)
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

    </>
  );
}
