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
  colors,
  isDarkMode = false,
  styles,
  name,
  setName,
  hazardType = 'flood',
  setHazardType,
  severity = 'medium',
  severityLevel,
  setSeverity,
  setSeverityLevel,
  description,
  setDescription,
  isRecurringDrainage = false,
  setIsRecurringDrainage,
  barangay,
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
  const insets = useSafeAreaInsets();

  // Normalize aliases
  const selectedSeverity = severityLevel || severity;
  const setActualSeverity = setSeverityLevel || setSeverity;
  const selectedBarangay = barangayName || barangay || '';
  const setActualBarangay = setBarangayName || setBarangay;
  const isLocating = locating ?? gettingLocation;
  const onRemovePhoto = handleRemovePhoto || removePhoto;

  // Safe coordinate string extraction
  const getCoordsDisplay = () => {
    if (!coords) return null;
    const lat = coords.latitude ?? (Array.isArray(coords) ? coords[1] : null);
    const lng = coords.longitude ?? (Array.isArray(coords) ? coords[0] : null);
    if (typeof lat === 'number' && typeof lng === 'number') {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return null;
  };

  const coordsString = getCoordsDisplay();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 28) : insets.top,
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
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                Report an Incident
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                Citizen Disaster &amp; Hazard Dispatch
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
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
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, 24) + 120 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Help your community by reporting road hazards, floods, or blocked paths to LGU with GPS and up to 4 credibility photos.
            </Text>

            {/* 1. Incident Name */}
            <Text style={styles.label}>Incident Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flooded Tetuan Main Road"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />

            {/* 2. Disaster / Hazard Type (ChipSelector) */}
            <Text style={styles.label}>Disaster / Hazard Type *</Text>
            <ChipSelector
              options={hazardTypes}
              value={hazardType}
              onChange={setHazardType}
            />

            {/* Contextual Hazard Hint */}
            {hazardHints?.[hazardType] && (
              <View style={styles.hazardHintBox}>
                <Text style={styles.hazardHintText}>{hazardHints[hazardType]}</Text>
              </View>
            )}

            {/* Chronic / Frequent Flooding Hotspot Toggle */}
            {hazardType === 'flood' && setIsRecurringDrainage && (
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
                        : colors.textPrimary,
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
            <Text style={styles.label}>
              Basis of Severity ({hazardTypes.find(h => h.value === hazardType)?.label || hazardType}) *
            </Text>
            <View style={{ marginBottom: 12, gap: 8 }}>
              {(contextualSeverity?.[hazardType] || contextualSeverity?.default || [
                { level: 'low', title: 'Low Priority', desc: 'Minor hazard, manageable locally, no immediate risk to life.' },
                { level: 'medium', title: 'Medium Priority', desc: 'Significant hazard affecting travel or property; requires response.' },
                { level: 'high', title: 'High / Critical Priority', desc: 'Severe emergency threatening life safety or completely cutting off access.' },
              ]).map((opt) => {
                const isSelected = selectedSeverity === opt.level;
                const accentColor = severityColors?.[opt.level] || (opt.level === 'high' ? '#ef4444' : opt.level === 'medium' ? '#f59e0b' : '#10b981');
                return (
                  <TouchableOpacity
                    key={opt.level}
                    onPress={() => setActualSeverity?.(opt.level)}
                    activeOpacity={0.75}
                    style={[
                      styles.contextualSeverityCard,
                      {
                        backgroundColor: isSelected
                          ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)')
                          : (isDarkMode ? '#1e293b' : '#f8fafc'),
                        borderColor: isSelected ? accentColor : (isDarkMode ? '#334155' : '#e2e8f0'),
                      },
                    ]}
                  >
                    <View style={styles.contextualSeverityHeader}>
                      <Text style={[styles.contextualSeverityTitle, { color: isSelected ? accentColor : colors.textPrimary }]}>
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
                    <Text style={[styles.contextualSeverityDesc, { color: colors.textSecondary }]}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Location Coordinates (GPS) */}
            <Text style={styles.label}>Location Coordinates *</Text>
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={handleGetLocation}
              disabled={isLocating}
              activeOpacity={0.8}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MapPin color={coordsString ? colors.primary : colors.textMuted} size={20} />
              )}
              <Text style={styles.locationText}>
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
                styles.addressCard,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  marginTop: 10,
                },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                📍 Verified Locality / Barangay *
              </Text>
              <BarangayAutocomplete
                value={selectedBarangay}
                onSelect={setActualBarangay}
                placeholder="Search barangay (e.g. Tetuan, Tumaga)"
              />

              {setStreetAddress && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                    Street / Landmark (optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.addressInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.textPrimary,
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                      },
                    ]}
                    placeholder="Street or nearest landmark"
                    placeholderTextColor={colors.textMuted}
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                  />
                </View>
              )}

              {coordsString && (
                <Text style={styles.geocodeCoords}>
                  Coordinates: {coordsString}
                </Text>
              )}
            </View>

            {/* 6. Description */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the hazard, water depth, passability for vehicles, landmark, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
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
              <Text style={styles.label}>Evidence Photos (up to 4)</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>
                {photos.length}/4
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>
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
                    <View style={styles.photoSlotBadge}>
                      <Text style={styles.photoSlotBadgeText}>
                        {photoRoleLabels[idx] || `Photo ${idx + 1}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 4 && (
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={showPhotoPicker}
                activeOpacity={0.8}
              >
                <Camera color={colors.textMuted} size={24} />
                <Text style={styles.photoBtnText}>
                  {photos.length === 0
                    ? 'Tap to add photos'
                    : `Add Photo ${photos.length + 1} of 4 (${photoRoleLabels[photos.length] || `Photo ${photos.length + 1}`})`}
                </Text>
                <Text style={styles.photoBtnHint}>
                  Include wide scene, depth indicator &amp; landmarks
                </Text>
              </TouchableOpacity>
            )}

            {/* 8. Submit Button */}
            <View style={styles.submitBtnContainer}>
              <PrimaryButton
                title="Submit Report to LGU"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                variant="primary"
                size="large"
              />
            </View>

            <Text style={styles.disclaimer}>
              Your report will be evaluated and reviewed by LGU staff before appearing on the live map.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
