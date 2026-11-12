import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { ChevronDown, ChevronUp, Navigation, Footprints, Bike, Car, AlertTriangle } from 'lucide-react-native';
import PrimaryButton from '../common/PrimaryButton';

export default function ShelterBottomSheet({
  styles,
  sheetHeightRef,
  isHighContrast,
  panResponder,
  isSheetExpanded,
  setIsSheetExpanded,
  triggerCasualHaptic,
  nearestShelter,
  colors,
  isDarkMode,
  distanceMeters,
  shelters,
  activeSubTab,
  setActiveSubTab,
  transportationMode,
  setTransportationMode,
  getETAMinutes,
  routeWarnings,
  isNavigating,
  setIsNavigating,
  handleOneClickEvacuate,
  openExternalNavigation,
  bottomDockClearance,
}) {
  return (
    <>
      {/* ─── Draggable Bottom Sheet ─── */}
      <Animated.View style={[
        styles.bottomSheet, 
        { height: sheetHeightRef.current }, 
        isHighContrast && { backgroundColor: '#000000', borderTopWidth: 3, borderTopColor: '#FFFF00' }
      ]}>
        {/* Handle Area (Tap to toggle or Drag) */}
        <View 
          {...panResponder.panHandlers} 
          style={[styles.bottomSheetHandle, isHighContrast && { backgroundColor: '#000000' }]}
        >
          <View style={[styles.bottomSheetBar, isHighContrast && { backgroundColor: '#FFFF00' }]} />
          <View style={styles.handleIndicatorRow}>
            <Text style={[styles.handleHintText, isHighContrast && { color: '#FFFF00' }]}>
              {isSheetExpanded ? 'Swipe down to minimize' : 'Swipe up for details'}
            </Text>
            {isSheetExpanded ? (
              <ChevronDown size={14} color={isHighContrast ? '#FFFF00' : colors.textMuted} />
            ) : (
              <ChevronUp size={14} color={isHighContrast ? '#FFFF00' : colors.textMuted} />
            )}
          </View>
        </View>

        <View style={[styles.bottomSheetContent, { paddingBottom: bottomDockClearance }]}>
          {nearestShelter ? (
            <>
              {/* Header Summary Row */}
              <View style={styles.sheetHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.destinationLabel, isHighContrast && { color: '#FFFF00', fontSize: 11, fontWeight: '900' }]}>
                    NEAREST OPEN SHELTER:
                  </Text>
                  <Text style={[styles.destinationName, isHighContrast && { color: '#FFFF00', fontSize: 17, fontWeight: '900' }]} numberOfLines={1}>
                    {nearestShelter.type === 'primary' ? '⭐ ' : '🏠 '}
                    {nearestShelter.name}
                  </Text>
                </View>
                <View style={[styles.etaBadge, isHighContrast && { backgroundColor: '#FFFF00', borderColor: '#FFFF00' }]}>
                  <Text style={[styles.etaBadgeText, isHighContrast && { color: '#000000', fontWeight: '900' }]}>
                    {getETAMinutes(distanceMeters, transportationMode)} · {(distanceMeters / 1000).toFixed(1)} km
                  </Text>
                </View>
              </View>

              {/* Collapsed Mode: Quick Capacity Pill & Alert summary */}
              {!isSheetExpanded && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: (nearestShelter.current_occupancy / nearestShelter.max_capacity) > 0.8 ? colors.danger : colors.successLight
                  }} />
                  <Text style={{ fontSize: 11, color: isHighContrast ? '#FFFF00' : colors.textSecondary, fontWeight: '600' }}>
                    {nearestShelter.current_occupancy}/{nearestShelter.max_capacity} capacity ({Math.min(100, Math.round((nearestShelter.current_occupancy / nearestShelter.max_capacity) * 100))}%)
                  </Text>
                  {routeWarnings.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 3 }}>
                      <AlertTriangle size={12} color="#f59e0b" />
                      <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'bold' }}>
                        {routeWarnings.length} alert{routeWarnings.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Expanded Mode: Tabs & Scrollable Details */}
              {isSheetExpanded && (
                <>
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isHighContrast ? '#FFFF00' : 'rgba(0,0,0,0.06)', marginBottom: 10, paddingBottom: 4 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setActiveSubTab('info');
                        triggerCasualHaptic(40);
                      }}
                      style={{ marginRight: 16, paddingVertical: 4, borderBottomWidth: activeSubTab === 'info' ? 2 : 0, borderBottomColor: isHighContrast ? '#FFFF00' : colors.primary }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'info' ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#FFFF00' : '#888') }}>
                        Map Details
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setActiveSubTab('checklist');
                        triggerCasualHaptic(40);
                      }}
                      style={{ paddingVertical: 4, borderBottomWidth: activeSubTab === 'checklist' ? 2 : 0, borderBottomColor: isHighContrast ? '#FFFF00' : colors.primary }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'checklist' ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#FFFF00' : '#888') }}>
                        Checklist Guide
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={{ flex: 1, marginBottom: 8 }} 
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {activeSubTab === 'info' ? (
                      <View style={styles.routingInfo}>
                        {/* Transport mode selector inside bottom sheet */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isHighContrast ? '#FFFF00' : colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Transport Mode
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                          {[
                            { key: 'pedestrian', Icon: Footprints, label: 'Walk' },
                            { key: '2_wheel',    Icon: Bike,       label: 'Bike' },
                            { key: '4_wheel',    Icon: Car,        label: 'Car'  },
                          ].map(m => {
                            const isActive = transportationMode === m.key;
                            const iconColor = isActive ? colors.white : colors.textSecondary;
                            return (
                              <TouchableOpacity
                                key={m.key}
                                style={[
                                  styles.modeButton,
                                  { flex: 1, paddingVertical: 6, justifyContent: 'center' },
                                  isActive && styles.modeButtonActive
                                ]}
                                onPress={() => {
                                  setTransportationMode(m.key);
                                  triggerCasualHaptic(50);
                                }}
                                accessibilityLabel={`Switch mode to ${m.label}`}
                              >
                                <m.Icon size={16} color={iconColor} style={{ marginBottom: 3 }} />
                                <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive]}>
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Occupancy progress bar */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isHighContrast ? '#FFFF00' : colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Shelter Capacity
                          </Text>
                          <Text style={[styles.occupancyText, isHighContrast && { color: '#FFFF00', fontWeight: 'bold' }]}>
                            {nearestShelter.current_occupancy}/{nearestShelter.max_capacity}
                          </Text>
                        </View>
                        <View style={[styles.occupancyBarTrack, isHighContrast && { borderColor: '#FFFF00', borderWidth: 1, backgroundColor: '#000000' }]}>
                          <View
                            style={[
                              styles.occupancyBarFill,
                              {
                                width: `${Math.min(100, Math.round((nearestShelter.current_occupancy / nearestShelter.max_capacity) * 100))}%`,
                                backgroundColor:
                                  isHighContrast ? '#FFFF00' : (
                                    nearestShelter.current_occupancy / nearestShelter.max_capacity > 0.8
                                      ? colors.danger
                                      : colors.successLight
                                  ),
                              },
                            ]}
                          />
                        </View>

                        {/* Route warnings */}
                        {routeWarnings.length > 0 && (
                          <View style={styles.warningsContainer}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
                              Route Alerts & Hazards
                            </Text>
                            {routeWarnings.map((w, idx) => (
                              <View key={idx} style={[styles.warningPill, isHighContrast && { borderColor: '#FFFF00', borderWidth: 1, backgroundColor: '#000000' }]}>
                                <AlertTriangle size={12} color={isHighContrast ? '#FFFF00' : colors.warningText} />
                                <Text style={[styles.warningPillText, isHighContrast && { color: '#FFFF00', fontWeight: 'bold' }]}>{w}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={{ gap: 8, paddingVertical: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#22C55E', marginRight: 8, fontWeight: '900' }}>✓</Text>
                          <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                            Start from your current position
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>➔</Text>
                          <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                            Follow designated safe route ({transportationMode === 'pedestrian' ? 'Walking' : transportationMode === '2_wheel' ? 'Bike' : 'Driving'})
                          </Text>
                        </View>

                        {routeWarnings.length > 0 ? (
                          routeWarnings.map((w, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#F59E0B', marginRight: 8, fontWeight: '900' }}>⚠</Text>
                              <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                                {w}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#22C55E', marginRight: 8, fontWeight: '900' }}>✓</Text>
                            <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                              No hazard warning segments crossed
                            </Text>
                          </View>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>🏠</Text>
                          <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                            Arrive at {nearestShelter.name}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>📲</Text>
                          <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : (isDarkMode ? '#e2e8f0' : '#444'), fontWeight: '700' }}>
                            Go to QR Profile and present it to shelter staff to check in
                          </Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </>
              )}

              {/* Primary Sticky Action Row (Always visible in collapsed & expanded) */}
              <View style={styles.sheetActionRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={isNavigating ? "Stop Navigation" : "Start Navigation"}
                    onPress={() => {
                      if (!isNavigating) {
                        handleOneClickEvacuate(nearestShelter);
                      } else {
                        setIsNavigating(false);
                        triggerCasualHaptic(80);
                      }
                    }}
                    variant={isNavigating ? "outline" : "primary"}
                    size="large"
                    icon={<Navigation color={isNavigating ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#000000' : colors.white)} size={20} />}
                    style={isHighContrast && { backgroundColor: '#FFFF00' }}
                    textStyle={isHighContrast && { color: '#000000', fontWeight: '900' }}
                  />
                </View>
                <TouchableOpacity
                  onPress={openExternalNavigation}
                  style={[
                    styles.externalNavBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    isHighContrast && { borderColor: '#FFFF00', borderWidth: 2 }
                  ]}
                  accessibilityLabel="Open in External Navigation App"
                >
                  <Navigation color={isHighContrast ? '#FFFF00' : colors.primary} size={20} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.warningBox}>
              <AlertTriangle color={colors.danger} size={24} />
              <Text style={styles.warningText}>No open shelters available at this time.</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </>
  );
}
