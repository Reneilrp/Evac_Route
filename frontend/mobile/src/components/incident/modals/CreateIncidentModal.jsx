import React from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  AlertTriangle,
  X,
  MapPin,
  Camera,
  Trash2,
} from 'lucide-react-native';
import PrimaryButton from '../../common/PrimaryButton';
import BarangayAutocomplete from '../../common/BarangayAutocomplete';

export default function CreateIncidentModal({
  visible,
  onClose,
  colors,
  styles,
  name,
  setName,
  hazardType,
  setHazardType,
  severity,
  setSeverity,
  description,
  setDescription,
  barangay,
  setBarangay,
  coords,
  gettingLocation,
  handleGetLocation,
  photos = [],
  removePhoto,
  showPhotoPicker,
  handleSubmit,
  submitting,
  hazardTypes = [],
  severityLevels = [],
  photoRoleLabels = [],
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.surface,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle color={colors.warning} size={20} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
              Report an Incident
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X color={colors.textMuted} size={24} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Help your community by reporting road hazards, floods, or blocked paths to LGU with GPS and up to 4 credibility photos.
            </Text>

            {/* Incident Name */}
            <Text style={styles.label}>Incident Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flooded Tetuan Main Road"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Hazard Type */}
            <Text style={styles.label}>Hazard Type *</Text>
            <View style={styles.chipsContainer}>
              {hazardTypes.map((type) => {
                const isSelected = hazardType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setHazardType(type.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Level */}
            <Text style={styles.label}>Severity Level *</Text>
            <View style={styles.chipsContainer}>
              {severityLevels.map((level) => {
                const isSelected = severity === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setSeverity(level.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Barangay Autocomplete */}
            <Text style={styles.label}>Barangay (Zamboanga City) *</Text>
            <BarangayAutocomplete
              value={barangay}
              onSelect={setBarangay}
              placeholder="Search barangay (e.g. Tetuan, Tumaga)"
            />

            {/* Location (GPS Coordinates) */}
            <Text style={styles.label}>Location Coordinates *</Text>
            <View style={styles.locationContainer}>
              <View style={styles.coordsDisplay}>
                <MapPin color={coords ? colors.primary : colors.textMuted} size={18} />
                <Text style={styles.coordsText}>
                  {coords
                    ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`
                    : 'Location not captured yet'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={handleGetLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.locationBtnText}>
                    {coords ? 'Update GPS' : 'Get GPS'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the hazard, water depth, passability for vehicles, landmark, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            {/* Photos (up to 4) */}
            <View style={styles.photoHeaderRow}>
              <Text style={styles.label}>Evidence Photos (up to 4)</Text>
              <Text style={styles.photoCountText}>{photos.length}/4</Text>
            </View>
            <Text style={styles.photoHint}>
              1: Wide scene | 2: Depth reference | 3: Surrounding landmark | 4: Alternate detour view
            </Text>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                {photos.map((photo, idx) => (
                  <View key={idx} style={styles.photoThumbWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => removePhoto(idx)}
                      accessibilityLabel={`Remove photo ${idx + 1}`}
                    >
                      <Trash2 color={colors.white} size={14} />
                    </TouchableOpacity>
                    <View style={styles.photoSlotBadge}>
                      <Text style={styles.photoSlotBadgeText}>{photoRoleLabels[idx] || `Photo ${idx + 1}`}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 4 && (
              <TouchableOpacity style={styles.photoBtn} onPress={showPhotoPicker}>
                <Camera color={colors.textMuted} size={24} />
                <Text style={styles.photoBtnText}>
                  {photos.length === 0 ? 'Tap to add photos' : `Add Photo ${photos.length + 1} of 4 (${photoRoleLabels[photos.length]})`}
                </Text>
                <Text style={styles.photoBtnHint}>Include wide scene, depth indicator & landmarks</Text>
              </TouchableOpacity>
            )}

            {/* Submit */}
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
      </SafeAreaView>
    </Modal>
  );
}
