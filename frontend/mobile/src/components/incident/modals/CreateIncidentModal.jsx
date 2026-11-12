import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  X,
  MapPin,
  Camera,
  Trash2,
} from 'lucide-react-native';
import PrimaryButton from '../../common/PrimaryButton';
import ChipSelector from '../../common/ChipSelector';
import BarangayAutocomplete from '../../common/BarangayAutocomplete';

export default function CreateIncidentModal({
  visible,
  onClose,
  colors = {},
  isDarkMode = false,
  insets: insetsProp,
  styles = {},
  name = '',
  setName,
  hazardType = 'flood',
  setHazardType,
  severity = 'medium',
  severityLevel,
  setSeverity,
  setSeverityLevel,
  description = '',
  setDescription,
  isRecurringDrainage = false,
  setIsRecurringDrainage,
  barangay = '',
  barangayName,
  setBarangay,
  setBarangayName,
  streetAddress = '',
  setStreetAddress,
  coords,
  gettingLocation = false,
  locating,
  handleGetLocation,
  photos = [],
  removePhoto,
  handleRemovePhoto,
  showPhotoPicker,
  handleSubmit,
  submitting = false,
  hazardTypes = [],
  severityLevels = [],
  contextualSeverity = {},
  severityColors = {},
  hazardHints = {},
  photoRoleLabels = [],
}) {
  let hookInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hookInsets = useSafeAreaInsets();
  } catch (_e) {
    // Safe fallback if called outside provider
  }

  const insets = insetsProp || hookInsets || { top: 0, bottom: 0, left: 0, right: 0 };

  // Normalize aliases
  const selectedSeverity = severityLevel || severity || 'medium';
  const setActualSeverity = setSeverityLevel || setSeverity;
  const selectedBarangay = typeof (barangayName || barangay) === 'string' ? (barangayName || barangay) : '';
  const setActualBarangay = setBarangayName || setBarangay;
  const isLocating = locating ?? gettingLocation ?? false;
  const onRemovePhoto = handleRemovePhoto || removePhoto;

  // Safe coordinate string extraction
  const getCoordsDisplay = () => {
    if (!coords) return null;
    const rawLat = coords?.latitude ?? coords?.lat ?? (Array.isArray(coords) ? coords[1] : null);
    const rawLng = coords?.longitude ?? coords?.lng ?? (Array.isArray(coords) ? coords[0] : null);
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!isNaN(lat) && !isNaN(lng) && rawLat !== null && rawLng !== null) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return null;
  };

  const coordsString = getCoordsDisplay();

  // Safe list of contextual severity options
  const severityOptions = Array.isArray(contextualSeverity?.[hazardType])
    ? contextualSeverity[hazardType]
    : Array.isArray(contextualSeverity?.default)
    ? contextualSeverity.default
    : [
        { level: 'low', title: 'Low Priority', desc: 'Minor hazard, manageable locally, no immediate risk to life.' },
        { level: 'medium', title: 'Medium Priority', desc: 'Significant hazard affecting travel or property; requires response.' },
        { level: 'high', title: 'High / Critical Priority', desc: 'Severe emergency threatening life safety or completely cutting off access.' },
      ];

  const currentHazardLabel = Array.isArray(hazardTypes)
    ? (hazardTypes.find((h) => h?.value === hazardType)?.label || hazardType)
    : hazardType;

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background || '#0f172a',
          paddingTop: Platform.OS === 'android' ? Math.max(insets.top || 0, 28) : (insets.top || 0),
        }}
      >
        {/* Modal Top Header Bar with Safe Clearance */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle color={colors.warning || '#f59e0b'} size={20} />
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary || '#f8fafc' }}>
                Report an Incident
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary || '#94a3b8' }}>
                Citizen Disaster &amp; Hazard Dispatch
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onClose?.()}
            accessibilityLabel="Close Incident Form"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color={colors.textSecondary || '#94a3b8'} size={20} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            style={styles?.container || { flex: 1 }}
            contentContainerStyle={[
              styles?.content || { paddingHorizontal: 16 },
              { paddingBottom: Math.max(insets.bottom || 0, 24) + 120 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles?.subtitle || { fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
              Help your community by reporting road hazards, floods, or blocked paths to LGU with GPS and up to 4 credibility photos.
            </Text>

            {/* 1. Incident Name */}
            <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>
              Incident Name *
            </Text>
            <TextInput
              style={styles?.input || {
                backgroundColor: colors.inputBg || '#1e293b',
                color: colors.textPrimary || '#f8fafc',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.inputBorder || '#334155',
              }}
              placeholder="e.g. Flooded Tetuan Main Road"
              placeholderTextColor={colors.textMuted || '#94a3b8'}
              value={name}
              onChangeText={(text) => setName?.(text)}
              maxLength={100}
            />

            {/* 2. Disaster / Hazard Type (ChipSelector) */}
            <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>
              Disaster / Hazard Type *
            </Text>
            <ChipSelector
              options={hazardTypes}
              value={hazardType}
              onChange={(val) => setHazardType?.(val)}
            />

            {/* Contextual Hazard Hint */}
            {hazardHints?.[hazardType] && (
              <View style={styles?.hazardHintBox || {
                padding: 10,
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
                borderLeftWidth: 3,
                borderLeftColor: colors.primary || '#38bdf8',
                marginTop: 8,
              }}>
                <Text style={styles?.hazardHintText || { fontSize: 12, color: isDarkMode ? '#93c5fd' : '#1d4ed8' }}>
                  {hazardHints[hazardType]}
                </Text>
              </View>
            )}

            {/* Chronic / Frequent Flooding Hotspot Toggle */}
            {hazardType === 'flood' && typeof setIsRecurringDrainage === 'function' && (
              <TouchableOpacity
                onPress={() => setIsRecurringDrainage(!isRecurringDrainage)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: isRecurringDrainage
                    ? (isDarkMode ? '#1e3a5f' : '#e0f2fe')
                    : (isDarkMode ? '#1e293b' : '#f8fafc'),
                  borderWidth: 1.5,
                  borderColor: isRecurringDrainage
                    ? '#0284c7'
                    : (isDarkMode ? '#334155' : '#cbd5e1'),
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 10,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isRecurringDrainage ? '#0284c7' : '#94a3b8',
                    backgroundColor: isRecurringDrainage ? '#0284c7' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isRecurringDrainage && (
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>✓</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: isRecurringDrainage
                        ? (isDarkMode ? '#7dd3fc' : '#0369a1')
                        : (colors.textPrimary || '#f8fafc'),
                    }}
                  >
                    🌧️ Frequent / Chronic Flooding Area
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isDarkMode ? '#94a3b8' : '#64748b',
                      marginTop: 2,
                      lineHeight: 15,
                    }}
                  >
                    Check if this street/corner always gets flooded during heavy rain due to clogged canals or low ground.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* 3. Basis of Severity (Contextual Cards) */}
            <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>
              Basis of Severity ({currentHazardLabel}) *
            </Text>
            <View style={{ marginBottom: 12, gap: 8 }}>
              {severityOptions.map((opt) => {
                const isSelected = selectedSeverity === opt.level;
                const accentColor = severityColors?.[opt.level] || (opt.level === 'high' ? '#ef4444' : opt.level === 'medium' ? '#f59e0b' : '#10b981');
                return (
                  <TouchableOpacity
                    key={opt.level}
                    onPress={() => setActualSeverity?.(opt.level)}
                    activeOpacity={0.75}
                    style={[
                      styles?.contextualSeverityCard || {
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1.5,
                        marginBottom: 8,
                      },
                      {
                        backgroundColor: isSelected
                          ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)')
                          : (isDarkMode ? '#1e293b' : '#f8fafc'),
                        borderColor: isSelected ? accentColor : (isDarkMode ? '#334155' : '#e2e8f0'),
                      },
                    ]}
                  >
                    <View style={styles?.contextualSeverityHeader || { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[styles?.contextualSeverityTitle || { fontSize: 13, fontWeight: '800' }, { color: isSelected ? accentColor : (colors.textPrimary || '#f8fafc') }]}>
                        {opt.title}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isSelected ? accentColor : (isDarkMode ? '#334155' : '#cbd5e1'),
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' }}>
                          {opt.level}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles?.contextualSeverityDesc || { fontSize: 11, lineHeight: 15 }, { color: colors.textSecondary || '#94a3b8' }]}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Location Coordinates (GPS) */}
            <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>
              Location Coordinates *
            </Text>
            <TouchableOpacity
              style={styles?.locationBtn || {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: colors.surfaceElevated || '#334155',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border || '#334155',
              }}
              onPress={() => handleGetLocation?.()}
              disabled={isLocating}
              activeOpacity={0.8}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primary || '#38bdf8'} />
              ) : (
                <MapPin color={coordsString ? (colors.primary || '#38bdf8') : (colors.textMuted || '#94a3b8')} size={20} />
              )}
              <Text style={styles?.locationText || { color: colors.primary || '#38bdf8', fontWeight: '700' }}>
                {isLocating
                  ? 'Acquiring GPS...'
                  : coordsString
                  ? `📍 ${coordsString}`
                  : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>

            {/* 5. Verified Locality & Barangay */}
            <View
              style={[
                styles?.addressCard || {
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  gap: 8,
                },
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  marginTop: 10,
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary || '#f8fafc', marginBottom: 4 }}>
                📍 Verified Locality / Barangay *
              </Text>
              <BarangayAutocomplete
                value={selectedBarangay}
                onChangeText={(val) => setActualBarangay?.(val)}
                onSelect={(val) => setActualBarangay?.(val)}
                placeholder="Search barangay (e.g. Tetuan, Tumaga)"
              />

              {typeof setStreetAddress === 'function' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted || '#94a3b8', marginBottom: 4 }}>
                    Street / Landmark (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles?.addressInput || { fontSize: 12, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1 },
                      {
                        backgroundColor: colors.background || '#0f172a',
                        color: colors.textPrimary || '#f8fafc',
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                      },
                    ]}
                    placeholder="Street or nearest landmark"
                    placeholderTextColor={colors.textMuted || '#94a3b8'}
                    value={streetAddress}
                    onChangeText={(val) => setStreetAddress?.(val)}
                  />
                </View>
              )}

              {coordsString && (
                <Text style={styles?.geocodeCoords || { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 4 }}>
                  Coordinates: {coordsString}
                </Text>
              )}
            </View>

            {/* 6. Description */}
            <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles?.input || {
                  backgroundColor: colors.inputBg || '#1e293b',
                  color: colors.textPrimary || '#f8fafc',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: colors.inputBorder || '#334155',
                },
                styles?.textArea || { minHeight: 80, textAlignVertical: 'top' },
              ]}
              placeholder="Describe the hazard, water depth, passability for vehicles, landmark, etc."
              placeholderTextColor={colors.textMuted || '#94a3b8'}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={(text) => setDescription?.(text)}
              maxLength={500}
            />

            {/* 7. Evidence Photos (up to 4) */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              <Text style={styles?.label || { fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                Evidence Photos (up to 4)
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted || '#94a3b8', fontWeight: '700' }}>
                {photos.length}/4
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted || '#94a3b8', marginBottom: 10 }}>
              1: Wide scene | 2: Depth reference | 3: Surrounding landmark | 4: Alternate detour view
            </Text>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {photos.map((item, idx) => (
                  <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                    <Image source={{ uri: item.uri }} style={{ width: 95, height: 95, borderRadius: 8 }} />
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        borderRadius: 12,
                        padding: 4,
                      }}
                      onPress={() => onRemovePhoto?.(idx)}
                      accessibilityLabel={`Remove photo ${idx + 1}`}
                    >
                      <Trash2 color="#ffffff" size={14} />
                    </TouchableOpacity>
                    <View style={styles?.photoSlotBadge || { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={styles?.photoSlotBadgeText || { color: '#ffffff', fontSize: 9, fontWeight: '700' }}>
                        {photoRoleLabels?.[idx] || `Photo ${idx + 1}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 4 && (
              <TouchableOpacity
                style={styles?.photoBtn || {
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.border || '#334155',
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  gap: 6,
                }}
                onPress={() => showPhotoPicker?.()}
                activeOpacity={0.8}
              >
                <Camera color={colors.textMuted || '#94a3b8'} size={24} />
                <Text style={styles?.photoBtnText || { color: colors.textSecondary || '#94a3b8', fontWeight: '700' }}>
                  {photos.length === 0
                    ? 'Tap to add photos'
                    : `Add Photo ${photos.length + 1} of 4 (${photoRoleLabels?.[photos.length] || `Photo ${photos.length + 1}`})`}
                </Text>
                <Text style={styles?.photoBtnHint || { color: colors.textMuted || '#64748b', fontSize: 11 }}>
                  Include wide scene, depth indicator &amp; landmarks
                </Text>
              </TouchableOpacity>
            )}

            {/* 8. Submit Button */}
            <View style={styles?.submitBtnContainer || { marginTop: 24 }}>
              <PrimaryButton
                title="Submit Report to LGU"
                onPress={() => handleSubmit?.()}
                loading={!!submitting}
                disabled={!!submitting}
                variant="primary"
                size="large"
              />
            </View>

            <Text style={styles?.disclaimer || { textAlign: 'center', color: colors.textMuted || '#64748b', fontSize: 11, marginTop: 12 }}>
              Your report will be evaluated and reviewed by LGU staff before appearing on the live map.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
