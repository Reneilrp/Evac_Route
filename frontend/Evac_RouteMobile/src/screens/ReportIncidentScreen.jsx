import { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, AlertTriangle, X, Plus, Eye, Clock, CheckCircle2, XCircle, ShieldAlert, LifeBuoy, Archive, ArchiveRestore } from 'lucide-react-native';
import api from '../services/api';
import ChipSelector from '../components/ChipSelector';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmationModal from '../components/ConfirmationModal';
import { colors } from '../styles/theme';
import styles from '../styles/ReportIncidentScreen.styles';

const HAZARD_TYPES = [
  // Natural Hazards
  { value: 'flood', label: '🌊 Flood' },
  { value: 'earthquake', label: '🏚️ Earthquake' },
  { value: 'typhoon', label: '🌀 Typhoon / Storm' },
  { value: 'landslide', label: '⛰️ Landslide' },
  
  // Man-Made Threats
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
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [historyTab, setHistoryTab] = useState('active'); // 'active' | 'archived'

  // --- Form State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [photos, setPhotos] = useState([]); // array of { uri, type, fileName }, max 3
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);

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

  const handleTriggerSOS = () => {
    setConfirmModal({
      visible: true,
      title: 'Request Emergency Rescue?',
      message: 'This will broadcast an urgent Search & Rescue SOS to CDRRMO EOC with your live GPS location for immediate boat/truck dispatch.',
      detail: 'Quick Response Teams (QRT) will be mobilized.',
      confirmText: 'CONFIRM & SEND SOS',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: LifeBuoy,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        setIsSendingSOS(true);
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          let lat = 6.9214, lng = 122.0790;
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }

          await api.post('/rescue/sos', {
            latitude: lat,
            longitude: lng,
            headcount: 4,
            situation: 'Emergency flood rescue requested via Resident Mobile App SOS button.',
          });

          queryClient.invalidateQueries({ queryKey: ['my-incidents'] });
          closeConfirmModal();
          Alert.alert(
            '🚨 RESCUE SOS DISPATCHED',
            'Your distress signal has been received by CDRRMO EOC. Quick Response Teams (QRT) have been alerted and will be dispatched to your location.',
            [{ text: 'OK' }]
          );
        } catch (err) {
          closeConfirmModal();
          Alert.alert('Error', err?.response?.data?.message || 'Failed to transmit SOS signal.');
        } finally {
          setIsSendingSOS(false);
        }
      },
    });
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
        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS_TIMEOUT')), 4000))
      ]).catch(async () => {
        return await Location.getLastKnownPositionAsync();
      });

      if (!loc || !loc.coords || (loc.coords.latitude === 0 && loc.coords.longitude === 0)) {
        Alert.alert('⚠️ GPS Signal Weak', 'Could not acquire a valid GPS location lock. Please ensure Location Services are enabled and try again.');
        return;
      }

      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (_e) {
      Alert.alert('Error', 'Could not get your location. Please ensure GPS location services are enabled.');
    } finally {
      setLocating(false);
    }
  };

  // --- Pick photo from camera or gallery (up to 3 photos) ---
  const handlePickPhoto = async (useCamera) => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos per incident report.');
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
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum of 3 photos reached.');
      return;
    }
    Alert.alert('Add Photo', `Photo ${photos.length + 1} of 3 — Choose source`, [
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
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('latitude', String(coords.latitude));
      formData.append('longitude', String(coords.longitude));
      formData.append('hazard_type', hazardType);
      formData.append('severity_level', severityLevel);
      if (description.trim()) formData.append('description', description.trim());

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
            <Text style={{ fontSize: 16 }}>
              {HAZARD_TYPES.find(h => h.value === item.hazard_type)?.label || `⚠️ ${item.hazard_type}`}
            </Text>
          </View>

          <View style={{
            backgroundColor: SEVERITY_COLORS[item.severity_level] || colors.surface,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textPrimary, textTransform: 'uppercase' }}>
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
      {/* Header Bar with Top Right Archive Button */}
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
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {historyTab === 'archived' ? (
              <Archive color={colors.primary} size={22} />
            ) : (
              <AlertTriangle color={colors.warning} size={22} />
            )}
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>
              {historyTab === 'archived' ? 'Archived Reports' : 'Incident Reports'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {historyTab === 'archived'
              ? 'Past and resolved incident reports history'
              : 'Track and report community disaster hazards'}
          </Text>
        </View>

        {/* Top Right Archive History Icon Button */}
        <TouchableOpacity
          onPress={() => setHistoryTab(prev => prev === 'active' ? 'archived' : 'active')}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
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
            size={20}
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

      {/* Emergency Rescue SOS Banner */}
      <View style={{
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 6,
        backgroundColor: '#450a0a',
        borderWidth: 1,
        borderColor: '#dc2626',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 3,
      }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <LifeBuoy color="#fca5a5" size={16} />
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>
              TRAPPED OR NEED RESCUE?
            </Text>
          </View>
          <Text style={{ color: '#fecaca', fontSize: 11, lineHeight: 15 }}>
            Send an instant emergency distress SOS with your exact GPS to CDRRMO Quick Response Teams.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleTriggerSOS}
          disabled={isSendingSOS}
          style={{
            backgroundColor: '#dc2626',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#fca5a5',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
            {isSendingSOS ? 'SENDING...' : '🚨 CALL SOS'}
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
          contentContainerStyle={{ padding: 16, paddingBottom: 95 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
          }
        />
      )}

      {/* Fixed Bottom-Right (+ icon) Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 5,
          elevation: 8,
          zIndex: 999,
        }}
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
            <ChipSelector options={HAZARD_TYPES} value={hazardType} onChange={setHazardType} />

            {/* Severity Level */}
            <Text style={styles.label}>Severity Level *</Text>
            <ChipSelector options={SEVERITY_LEVELS} value={severityLevel} onChange={setSeverityLevel} colorMap={SEVERITY_COLORS} />

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

            {/* Photos (Up to 3 photos) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
              <Text style={styles.label}>Photos (Up to 3 Recommended)</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{photos.length}/3 photos</Text>
            </View>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {photos.map((item, idx) => (
                  <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                    <Image source={{ uri: item.uri }} style={{ width: 90, height: 90, borderRadius: 8 }} />
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
                    <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>Photo {idx + 1}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {photos.length < 3 && (
              <TouchableOpacity style={styles.photoBtn} onPress={showPhotoPicker}>
                <Camera color={colors.textMuted} size={24} />
                <Text style={styles.photoBtnText}>
                  {photos.length === 0 ? 'Tap to add photos (Up to 3)' : `Add Photo ${photos.length + 1} of 3`}
                </Text>
                <Text style={styles.photoBtnHint}>JPG/PNG up to 5MB each</Text>
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
    </SafeAreaView>
  );
}


