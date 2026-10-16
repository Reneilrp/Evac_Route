import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, AlertTriangle, X, Plus, Eye, Clock, CheckCircle2, XCircle, ShieldAlert, LifeBuoy, Archive, ArchiveRestore } from 'lucide-react-native';
import api from '../services/api';
import ChipSelector from '../components/ChipSelector';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmationModal from '../components/ConfirmationModal';
import EmergencySOSModal from '../components/EmergencySOSModal';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getStyles } from '../styles/ReportIncidentScreen.styles';

const HAZARD_TYPES = [
  { value: 'flood', label: '🌊 Flood' },
  { value: 'landslide', label: '⛰️ Landslide' },
  { value: 'building_fire', label: '🔥 Building Fire' },
  { value: 'earthquake', label: '🏚️ Earthquake' },
];

const CONTEXTUAL_SEVERITY = {
  building_fire: [
    { level: 'low', title: '1st Alarm (Low)', desc: 'Early stage / localized room fire. Contained to single room or small area, 2-3 fire engines sufficient.' },
    { level: 'medium', title: '2nd Alarm (Medium)', desc: 'Spreading / multi-room fire. Commercial or multi-family structure threatened, backup units requested.' },
    { level: 'high', title: '3rd Alarm / Task Force (High)', desc: 'Conflagration / General alarm. Multiple structures engulfed, mass evacuation and citywide firefighting needed.' },
  ],
  flood: [
    { level: 'low', title: 'Low (Ankle / Gutter Deep)', desc: 'Water ~0.1m - 0.2m. Passable to all vehicles, gutters and curbs overflowing.' },
    { level: 'medium', title: 'Medium (Knee to Waist Deep)', desc: 'Water ~0.5m - 1.0m. Light vehicles impassable, ground floors starting to inundate.' },
    { level: 'high', title: 'High (Chest Deep / Submerged Roofs)', desc: 'Water >1.5m. Completely impassable, trapped residents, rooftop evacuation needed.' },
  ],
  landslide: [
    { level: 'low', title: 'Low (Minor Slope Erosion)', desc: 'Soil slumping on roadside ditch or shoulder. Roadway remains passable with caution.' },
    { level: 'medium', title: 'Medium (Partial Road Blockage)', desc: 'Boulders and mud blocking one lane. Secondary slips imminent; clearance crew required.' },
    { level: 'high', title: 'High (Massive Slope Collapse / Impassable)', desc: 'Complete hillside collapse covering both lanes or structures. Evacuation route severed.' },
  ],
  earthquake: [
    { level: 'low', title: 'Low (Minor Surface Cracks)', desc: 'Hairline cracks on pavement or fences. No structural failure.' },
    { level: 'medium', title: 'Medium (Fractured Pavement / Wall Damage)', desc: 'Road surface displaced, walls cracked, light vehicles must detour.' },
    { level: 'high', title: 'High (Major Structural / Bridge Collapse)', desc: 'Road fissure, bridge deck dropped, or building collapse blocking thoroughfare.' },
  ],
  default: [
    { level: 'low', title: 'Low Priority', desc: 'Minor hazard, manageable locally, no immediate risk to life.' },
    { level: 'medium', title: 'Medium Priority', desc: 'Significant hazard affecting travel or property; requires response.' },
    { level: 'high', title: 'High / Critical Priority', desc: 'Severe emergency threatening life safety or completely cutting off access.' },
  ],
};

export default function ReportIncidentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [historyTab, setHistoryTab] = useState('active'); // 'active' | 'archived'

  const SEVERITY_COLORS = {
    low: colors.successLight,
    medium: colors.warning,
    high: colors.danger,
  };

  const HAZARD_HINTS = {
    flood: '🌊 Flood: Note whether water is ankle, knee, or waist-deep, and if light vehicles can pass.',
    landslide: '⛰️ Landslide: Note whether soil or debris blocks the entire lane or access road.',
    building_fire: '🔥 Fire: Note if structural, commercial, or residential, and if spread is imminent.',
    earthquake: '🏚️ Earthquake: Note structural cracks, collapsed walls, or damaged power lines.',
  };

  const PHOTO_ROLE_LABELS = [
    '1. Overview',
    '2. Close-up Depth',
    '3. Landmark / Sign',
    '4. Road Blockage',
  ];

  // --- Form State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [photos, setPhotos] = useState([]); // array of { uri, type, fileName }, max 4
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [streetAddress, setStreetAddress] = useState('');
  const [barangayName, setBarangayName] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const isSubmittingRef = useRef(false);

  // --- Reverse geocode coordinates to human-readable street/barangay ---
  const reverseGeocodeCoords = useCallback(async (latitude, longitude) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const item = results[0];
        const street = item.street || item.name || '';
        const district = item.district || item.subregion || item.city || '';
        if (street) setStreetAddress(street);
        if (district) setBarangayName(district);
      }
    } catch (_e) {
      // Gracefully ignore reverse geocoding errors
    }
  }, []);

  // Auto-open modal if navigated with params (e.g. from EvacMapScreen)
  useEffect(() => {
    if (route?.params?.openSOS) {
      setTimeout(() => setShowSOSModal(true), 0);
    }
    if (route?.params?.openCreate) {
      const timer = setTimeout(() => {
        if (route?.params?.initialCoords) {
          const initCoords = {
            latitude: Number(route.params.initialCoords.latitude),
            longitude: Number(route.params.initialCoords.longitude),
          };
          setCoords(initCoords);
          reverseGeocodeCoords(initCoords.latitude, initCoords.longitude);
        }
        setShowCreateModal(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [route?.params, reverseGeocodeCoords]);

  // --- Styled Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    detail: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'warning',
    icon: null,
    loading: false,
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, visible: false, loading: false }));
  };

  // --- Fetch resident's report history ---
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['my-incidents'],
    queryFn: () => api.get('/user/incidents').then(r => r.data.data),
  });

  const incidents = data ?? [];
  const activeIncidents = incidents.filter(i => !i.is_archived);
  const archivedIncidents = incidents.filter(i => i.is_archived);
  const displayedIncidents = historyTab === 'active' ? activeIncidents : archivedIncidents;

  const handleArchive = (incident) => {
    setConfirmModal({
      visible: true,
      title: 'Archive Incident Report',
      message: 'Move this report to your archive history? You can review or restore it at any time from the Archived tab.',
      detail: incident.name,
      confirmText: 'Archive Report',
      cancelText: 'Cancel',
      variant: 'warning',
      icon: Archive,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.patch(`/user/incidents/${incident.id}/archive`);
          queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
          closeConfirmModal();
        } catch (err) {
          closeConfirmModal();
          Alert.alert('Error', err?.response?.data?.message || 'Failed to archive report.');
        }
      },
    });
  };

  const handleUnarchive = (incident) => {
    setConfirmModal({
      visible: true,
      title: 'Restore Incident Report',
      message: 'Restore this report back to your active incident reports feed?',
      detail: incident.name,
      confirmText: 'Restore to Active',
      cancelText: 'Cancel',
      variant: 'primary',
      icon: ArchiveRestore,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          await api.patch(`/user/incidents/${incident.id}/unarchive`);
          queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
          closeConfirmModal();
        } catch (err) {
          closeConfirmModal();
          Alert.alert('Error', err?.response?.data?.message || 'Failed to restore report.');
        }
      },
    });
  };


  // --- Use current GPS location ---
  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to pin this report.');
        return;
      }
      
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), 4500))
      ]).catch(async () => {
        return await Location.getLastKnownPositionAsync();
      });

      if (!loc || !loc.coords || (loc.coords.latitude === 0 && loc.coords.longitude === 0)) {
        Alert.alert('⚠️ GPS Signal Weak', 'Could not acquire a valid GPS location lock. Please ensure Location Services are enabled and try again.');
        return;
      }

      const acquired = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCoords(acquired);
      await reverseGeocodeCoords(acquired.latitude, acquired.longitude);
    } catch (_e) {
      Alert.alert('Error', 'Could not get your location. Please ensure GPS location services are enabled.');
    } finally {
      setLocating(false);
    }
  };

  // --- Pick photo from camera or gallery (up to 4 photos for credibility) ---
  const handlePickPhoto = async (useCamera) => {
    if (photos.length >= 4) {
      Alert.alert('Limit Reached', 'You can attach up to 4 credibility photos per incident report.');
      return;
    }

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
      const newPhoto = {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? `incident_${Date.now()}_${photos.length + 1}.jpg`,
      };
      setPhotos((prev) => [...prev, newPhoto]);
    }
  };

  const showPhotoPicker = () => {
    if (photos.length >= 4) {
      Alert.alert('Limit Reached', 'Maximum of 4 credibility photos reached.');
      return;
    }
    Alert.alert('Add Credibility Photo', `Photo ${photos.length + 1} of 4 — Choose source`, [
      { text: 'Take Photo', onPress: () => handlePickPhoto(true) },
      { text: 'Choose from Gallery', onPress: () => handlePickPhoto(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setHazardType('flood');
    setSeverityLevel('medium');
    setPhotos([]);
    setCoords(null);
    setStreetAddress('');
    setBarangayName('');
  };

  // --- Submit report ---
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please provide a name for this incident.');
      return;
    }

    if (!coords || (coords.latitude === 0 && coords.longitude === 0)) {
      Alert.alert(
        '📍 Acquiring GPS Location...',
        'Valid GPS coordinates are required before transmitting your emergency report. Please tap "Pin My Location" first.',
        [{ text: 'Acquire Location', onPress: () => handleGetLocation() }]
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'Add Photo?',
        'Providing photos of the incident helps the LGU verify and approve it immediately. Would you like to add photos now?',
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
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      formData.append('hazard_type', hazardType);
      formData.append('severity_level', severityLevel);

      let finalDescription = description.trim();
      const locationParts = [];
      if (barangayName.trim()) locationParts.push(`Barangay: ${barangayName.trim()}`);
      if (streetAddress.trim()) locationParts.push(`Address: ${streetAddress.trim()}`);
      if (locationParts.length > 0) {
        finalDescription = `[${locationParts.join(' | ')}]` + (finalDescription ? `\n\n${finalDescription}` : '');
      }
      if (finalDescription) formData.append('description', finalDescription);

      photos.forEach((photoObj, index) => {
        const fileData = {
          uri: photoObj.uri,
          type: photoObj.type,
          name: photoObj.fileName,
        };
        formData.append('photos[]', fileData);
        if (index === 0) {
          formData.append('photo', fileData);
        }
      });

      await api.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
      resetForm();
      setShowCreateModal(false);

      Alert.alert(
        '✓ Report Submitted',
        'Your incident report has been sent to LGU for review. Thank you for helping keep your community safe.'
      );
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to submit report. Please try again.';
      Alert.alert('Submission Failed', msg);
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  // --- Render Individual Incident Card in History ---
  const renderIncidentCard = ({ item }) => {
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
              {HAZARD_TYPES.find(h => h.value === item.hazard_type)?.label || `⚠️ ${item.hazard_type}`}
            </Text>
          </View>

          <View style={{
            backgroundColor: SEVERITY_COLORS[item.severity_level] || colors.surface,
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

        {/* OFFICIAL READ & REVIEW STATUS BADGE (Crucial Feature) */}
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
                <Text style={{ fontSize: 11, color: '#d97706' }}>
                  Transmitted to LGU review queue. Waiting for an official to view this report.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action Bar (Archive / Restore) */}
        <View style={{
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {item.is_archived ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Archive size={13} color={colors.textMuted} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Archived {item.archived_at ? new Date(item.archived_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleUnarchive(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <ArchiveRestore size={13} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  Restore
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Report #{item.id}
              </Text>

              <TouchableOpacity
                onPress={() => handleArchive(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Archive size={13} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                  Archive
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Bar with Action Buttons */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.surface,
      }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {historyTab === 'archived' ? (
              <Archive color={colors.primary} size={22} />
            ) : (
              <AlertTriangle color={colors.warning} size={22} />
            )}
            <Text style={{ fontSize: 19, fontWeight: '800', color: colors.textPrimary }}>
              {historyTab === 'archived' ? 'Archived Reports' : 'Incident Reports'}
            </Text>
          </View>
          {historyTab === 'archived' && (
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
              Past and resolved incident reports history
            </Text>
          )}
        </View>

        {/* Header Action Buttons: [+ File Report] & [Archive History] */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.headerCreateBtn}
            activeOpacity={0.8}
            accessibilityLabel="File New Incident Report"
          >
            <Plus color={colors.white} size={15} strokeWidth={2.5} />
            <Text style={styles.headerCreateBtnText}>File Report</Text>
          </TouchableOpacity>

          {/* Archive History Icon Button */}
          <TouchableOpacity
            onPress={() => setHistoryTab(prev => prev === 'active' ? 'archived' : 'active')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: historyTab === 'archived' ? colors.primary : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: historyTab === 'archived' ? colors.primary : colors.border,
              position: 'relative',
            }}
            accessibilityLabel={historyTab === 'archived' ? 'Switch to Active Reports' : 'View Archive History'}
          >
            <Archive
              size={18}
              color={historyTab === 'archived' ? colors.white : colors.textPrimary}
            />
            {archivedIncidents.length > 0 && historyTab !== 'archived' && (
              <View style={{
                position: 'absolute',
                top: -3,
                right: -3,
                backgroundColor: colors.primary,
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: colors.background,
              }}>
                <Text style={{
                  color: colors.white,
                  fontSize: 9,
                  fontWeight: '800',
                }}>
                  {archivedIncidents.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* --- COMMUNITY HAZARD REPORT HERO BANNER --- */}
      <View style={styles.heroBanner}>
        <View style={styles.heroHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertTriangle color={colors.warning} size={18} />
            <Text style={styles.heroTitle}>Report Hazard / Disaster</Text>
          </View>
          <View style={{
            backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>LGU FIELD DISPATCH</Text>
          </View>
        </View>

        <Text style={styles.heroSubtitle}>
          Spotted road flooding, landslides, or blocked evacuation paths? Alert CDRRMO with live GPS and up to 4 credibility photos for immediate review.
        </Text>

        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={styles.heroActionBtn}
          activeOpacity={0.85}
        >
          <Plus color={colors.white} size={16} strokeWidth={2.5} />
          <Text style={styles.heroActionBtnText}>File Incident Report (4 Photos + GPS)</Text>
        </TouchableOpacity>
      </View>

      {/* --- EMERGENCY SOS QUICK ACTIONS (ORDERING SYSTEM LAUNCHER) --- */}
      <View style={{
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 6,
        backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
        borderWidth: 1.5,
        borderColor: isDarkMode ? '#dc2626' : '#f87171',
        borderRadius: 16,
        padding: 14,
        elevation: isDarkMode ? 4 : 2,
        shadowColor: isDarkMode ? '#000' : '#dc2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.35 : 0.1,
        shadowRadius: 6,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <LifeBuoy color="#ef4444" size={18} />
            <Text style={{
              color: isDarkMode ? '#fca5a5' : '#991b1b',
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 0.6,
            }}>
              RAPID EMERGENCY RESCUE SOS
            </Text>
          </View>
          <View style={{
            backgroundColor: '#ef4444',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}>
            <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>
              INSTANT
            </Text>
          </View>
        </View>

        <Text style={{
          color: isDarkMode ? '#fecaca' : '#7f1d1d',
          fontSize: 12,
          lineHeight: 16,
          marginBottom: 10,
        }}>
          Trapped in floodwaters, fire, or critical medical danger? Tap below to select disaster type, set victim headcount, and toggle special needs for immediate CDRRMO dispatch.
        </Text>

        <TouchableOpacity
          onPress={() => setShowSOSModal(true)}
          style={{
            backgroundColor: '#dc2626',
            paddingVertical: 12,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: '#fca5a5',
            shadowColor: '#dc2626',
            paddingHorizontal: 12,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 16 }}>🚨</Text>
          <Text
            style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.5 }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            EMERGENCY SOS (ORDER RESCUE)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Archive Active Notification Bar (shown when viewing archive) */}
      {historyTab === 'archived' && (
        <View style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Viewing Archived Reports ({archivedIncidents.length})
          </Text>
          <TouchableOpacity
            onPress={() => setHistoryTab('active')}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.white }}>
              Back to Active
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content: History List or Empty State */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 13, color: colors.textMuted }}>
            Loading incident history...
          </Text>
        </View>
      ) : displayedIncidents.length === 0 ? (
        historyTab === 'archived' ? (
          /* Empty Archived State */
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Archive color={colors.textMuted} size={36} />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
              No Archived Reports
            </Text>

            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
              Past or resolved incident reports that you archive will appear here for your history and reference.
            </Text>
          </ScrollView>
        ) : (
          /* Empty Active State */
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <ShieldAlert color={colors.warning} size={40} />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
              No Active Reports
            </Text>

            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20, paddingHorizontal: 16 }}>
              Have you observed street flooding, landslides, or road blockages in your neighborhood? Submit a field report to alert LGU officials immediately.
            </Text>

            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus color={colors.white} size={18} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.white }}>
                Submit First Incident Report
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )
      ) : (
        /* History List */
        <FlatList
          data={displayedIncidents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderIncidentCard}
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(115, insets.bottom + 100) }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
          }
        />
      )}

      {/* Fixed Bottom-Right (+ icon) Floating Action Button - Positioned safely above FloatingDock */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        style={[
          styles.fabRepositioned,
          { bottom: Math.max(88, insets.bottom + 80) },
        ]}
        activeOpacity={0.85}
        accessibilityLabel="Report New Incident"
      >
        <Plus color={colors.white} size={28} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Creation Modal Form */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
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

            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ padding: 4 }}>
              <X color={colors.textMuted} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
              maxLength={100}
            />

            {/* Description */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what you observed (water depth, vehicle passability, blockage)..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            {/* Hazard Type */}
            <Text style={styles.label}>Disaster / Hazard Type *</Text>
            <ChipSelector options={HAZARD_TYPES} value={hazardType} onChange={setHazardType} />

            {/* Contextual Hazard Hint */}
            {HAZARD_HINTS[hazardType] && (
              <View style={styles.hazardHintBox}>
                <Text style={styles.hazardHintText}>{HAZARD_HINTS[hazardType]}</Text>
              </View>
            )}

            {/* Severity Level (Contextual Disaster Severity Basis) */}
            <Text style={styles.label}>Basis of Severity ({HAZARD_TYPES.find(h => h.value === hazardType)?.label || hazardType}) *</Text>
            <View style={{ marginBottom: 12 }}>
              {(CONTEXTUAL_SEVERITY[hazardType] || CONTEXTUAL_SEVERITY.default).map((opt) => {
                const isSelected = severityLevel === opt.level;
                const accentColor = SEVERITY_COLORS[opt.level] || colors.primary;
                return (
                  <TouchableOpacity
                    key={opt.level}
                    onPress={() => setSeverityLevel(opt.level)}
                    activeOpacity={0.75}
                    style={[
                      styles.contextualSeverityCard,
                      {
                        backgroundColor: isSelected
                          ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)')
                          : (isDarkMode ? '#1e293b' : '#f8fafc'),
                        borderColor: isSelected ? accentColor : (isDarkMode ? '#334155' : '#e2e8f0'),
                      }
                    ]}
                  >
                    <View style={styles.contextualSeverityHeader}>
                      <Text style={[styles.contextualSeverityTitle, { color: isSelected ? accentColor : colors.textPrimary }]}>
                        {opt.title}
                      </Text>
                      <View style={{
                        backgroundColor: isSelected ? accentColor : (isDarkMode ? '#334155' : '#cbd5e1'),
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}>
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

            {/* Location Pin */}
            <Text style={styles.label}>Location & Coordinates *</Text>
            <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MapPin color={coords ? colors.successLight : colors.primary} size={18} />
              )}
              <Text style={[styles.locationText, coords && { color: colors.successLight }]}>
                {locating
                  ? 'Acquiring GPS & Address...'
                  : coords
                  ? `📍 ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                  : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>

            {/* Reverse Geocoded Address & Barangay Card */}
            {coords && (
              <View style={[styles.addressCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                  📍 Verified Locality / Barangay
                </Text>
                <View style={{ gap: 6 }}>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Barangay</Text>
                    <TextInput
                      style={[styles.addressInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Barangay name (e.g. Tetuan, Tumaga)"
                      placeholderTextColor={colors.textMuted}
                      value={barangayName}
                      onChangeText={setBarangayName}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Street / Landmark</Text>
                    <TextInput
                      style={[styles.addressInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Street or nearest landmark"
                      placeholderTextColor={colors.textMuted}
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                    />
                  </View>
                  <Text style={styles.geocodeCoords}>Coordinates: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
                </View>
              </View>
            )}

            {/* Photos */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 }}>
              <Text style={styles.label}>Photos</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '700' }}>{photos.length}/4</Text>
            </View>

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
                      onPress={() => handleRemovePhoto(idx)}
                    >
                      <X color={colors.white} size={14} />
                    </TouchableOpacity>
                    <View style={styles.photoSlotBadge}>
                      <Text style={styles.photoSlotBadgeText}>{PHOTO_ROLE_LABELS[idx] || `Photo ${idx + 1}`}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 4 && (
              <TouchableOpacity style={styles.photoBtn} onPress={showPhotoPicker}>
                <Camera color={colors.textMuted} size={24} />
                <Text style={styles.photoBtnText}>
                  {photos.length === 0 ? 'Tap to add photos' : `Add Photo ${photos.length + 1} of 4 (${PHOTO_ROLE_LABELS[photos.length]})`}
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
        </SafeAreaView>
      </Modal>

      {/* Reusable Styled Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onClose={closeConfirmModal}
      />

      {/* Rapid Ordering Emergency SOS Modal */}
      <EmergencySOSModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        initialCoords={coords}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-incidents'] })}
      />
    </SafeAreaView>
  );
}


