import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, AlertTriangle, X } from 'lucide-react-native';
import api from '../services/api';
import ChipSelector from '../components/ChipSelector';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../styles/theme';
import styles from '../styles/ReportIncidentScreen.styles';

const HAZARD_TYPES = [
  // Natural Hazards
  { value: 'flood', label: '🌊 Flood' },
  { value: 'earthquake', label: '🏚️ Earthquake' },
  { value: 'typhoon', label: '🌀 Typhoon / Storm' },
  { value: 'landslide', label: '⛰️ Landslide' },
  
  // Man-Made Threats (REV-02)
  { value: 'siege', label: '⚔️ Siege / Conflict' },
  { value: 'building_fire', label: '🔥 Building Fire' },
  { value: 'chemical_spill', label: '🧪 Chemical Spill' },
  { value: 'gas_leak', label: '⚠️ Gas Leak' },
  { value: 'active_shooter', label: '🚨 Security Threat' },
  { value: 'structural_collapse', label: '🏗️ Collapse' },
  { value: 'maintenance', label: '🚧 Road Block' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'LOW' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'high', label: 'HIGH' },
];

const SEVERITY_COLORS = {
  low: colors.successLight,
  medium: colors.warning,
  high: colors.danger,
};

export default function ReportIncidentScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [photo, setPhoto] = useState(null); // { uri, type, fileName }
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Use current GPS location ---
  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to pin this report.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (_e) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  // --- Pick photo from camera or gallery ---
  const handlePickPhoto = async (useCamera) => {
    const permFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', `${useCamera ? 'Camera' : 'Gallery'} access is required.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? `incident_${Date.now()}.jpg`,
      });
    }
  };

  const showPhotoPicker = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => handlePickPhoto(true) },
      { text: 'Choose from Gallery', onPress: () => handlePickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // --- Submit report ---
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please provide a name for this incident.');
      return;
    }
    if (!coords) {
      Alert.alert('Missing Location', 'Please pin your current location first.');
      return;
    }

    if (!photo) {
      Alert.alert(
        'Add Photo?',
        'Providing a photo of the incident helps the LGU verify and approve it immediately. Would you like to take/select one now?',
        [
          { text: 'Add Photo', onPress: () => showPhotoPicker() },
          { text: 'Submit Anyway', onPress: () => sendReportToServer() }
        ]
      );
    } else {
      sendReportToServer();
    }
  };

  const sendReportToServer = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      formData.append('hazard_type', hazardType);
      formData.append('severity_level', severityLevel);
      if (description.trim()) formData.append('description', description.trim());
      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: photo.type,
          name: photo.fileName,
        });
      }

      await api.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        '✓ Report Submitted',
        'Your incident report has been sent to LGU for review. Thank you for helping keep your community safe.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to submit report. Please try again.';
      Alert.alert('Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <View style={styles.header}>
        <AlertTriangle color={colors.warning} size={24} />
        <Text style={styles.title}>Report a Hazard</Text>
      </View>
      <Text style={styles.subtitle}>
        Help your community by reporting road hazards, floods, or blocked paths to LGU.
      </Text>

      {/* Incident Name */}
      <Text style={styles.label}>Incident Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Flooded Tetuan Main Road"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        maxLength={100}
      />

      {/* Description */}
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe what you observed..."
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        maxLength={500}
      />

      {/* Hazard Type */}
      <Text style={styles.label}>Hazard Type *</Text>
      <ChipSelector
        options={HAZARD_TYPES}
        value={hazardType}
        onChange={setHazardType}
      />

      {/* Severity Level */}
      <Text style={styles.label}>Severity Level *</Text>
      <ChipSelector
        options={SEVERITY_LEVELS}
        value={severityLevel}
        onChange={setSeverityLevel}
        colorMap={SEVERITY_COLORS}
      />

      {/* Location Pin */}
      <Text style={styles.label}>Location *</Text>
      <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation} disabled={locating}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <MapPin color={coords ? colors.successLight : colors.primary} size={18} />
        )}
        <Text style={[styles.locationText, coords && { color: colors.successLight }]}>
          {locating
            ? 'Getting location...'
            : coords
            ? `📍 ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
            : 'Use My Current Location'}
        </Text>
      </TouchableOpacity>

      {/* Photo */}
      <Text style={styles.label}>Photo (Recommended for fast LGU approval)</Text>
      {photo ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
            <X color={colors.white} size={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.photoBtn} onPress={showPhotoPicker}>
          <Camera color={colors.textMuted} size={24} />
          <Text style={styles.photoBtnText}>Tap to add a photo</Text>
          <Text style={styles.photoBtnHint}>JPG/PNG up to 5MB</Text>
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
        Your report will be reviewed by LGU staff before appearing on the live map.
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
