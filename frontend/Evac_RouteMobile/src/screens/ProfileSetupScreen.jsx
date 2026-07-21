import { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus, Footprints, Bike, Car } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import ChipSelector from '../components/ChipSelector';
import BarangayAutocomplete from '../components/BarangayAutocomplete';
import { colors } from '../styles/theme';
import styles from '../styles/ProfileSetupScreen.styles';

export default function ProfileSetupScreen() {
  const { login } = useAuth();
  const setProfileData = useResidentStore((state) => state.setProfileData);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [barangay, setBarangay] = useState('Tetuan');
  const [headcount, setHeadcount] = useState(1);
  const [contact, setContact] = useState('');
  const [transportationMode, setTransportationMode] = useState('pedestrian');
  const [loading, setLoading] = useState(false);

  const transportOptions = [
    {
      value: 'pedestrian',
      label: 'Pedestrian',
      icon: <Footprints size={18} color={transportationMode === 'pedestrian' ? colors.white : colors.textSecondary} />,
    },
    {
      value: '2_wheel',
      label: '2-Wheel',
      icon: <Bike size={18} color={transportationMode === '2_wheel' ? colors.white : colors.textSecondary} />,
    },
    {
      value: '4_wheel',
      label: '4-Wheel',
      icon: <Car size={18} color={transportationMode === '4_wheel' ? colors.white : colors.textSecondary} />,
    },
  ];

  const handleRegister = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast || !contact) {
      alert('Please fill in First Name, Last Name, and Contact Number.');
      return;
    }

    const fullName = [trimmedFirst, trimmedMiddle, trimmedLast].filter(Boolean).join(' ');

    setLoading(true);
    try {
      // 1. Call the real Laravel API
      const response = await api.post('/register/family', {
        name: fullName,
        barangay,
        headcount,
        contact_number: contact,
        transportation_mode: transportationMode
      });

      const { access_token, qr_code_hash, user, family } = response.data;

      const registeredUser = {
        ...(user || {}),
        family_profile: family || {
          barangay,
          headcount,
          contact_number: contact,
          transportation_mode: transportationMode,
          qr_code_hash,
        },
      };

      // 2. Save auth token securely FIRST
      await SecureStore.setItemAsync('auth_token', access_token);

      // 3. Use ZUSTAND to save the profile and QR hash (Persists to AsyncStorage automatically)
      setProfileData({ name: fullName, barangay, headcount, contact_number: contact, transportation_mode: transportationMode }, qr_code_hash);

      // 4. Sync user state into AuthContext directly
      await login(registeredUser);
      setLoading(false);

    } catch (error) {
      const serverMsg = error?.response?.data?.message || error?.message || 'Connection error. Please check your network and try again.';
      console.error('[Registration Failed]:', error?.response?.data || error);
      alert(`Registration Failed: ${serverMsg}`);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Family Profile</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan"
            placeholderTextColor={colors.textMuted}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Middle Name (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Santos"
            placeholderTextColor={colors.textMuted}
            value={middleName}
            onChangeText={setMiddleName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Dela Cruz"
            placeholderTextColor={colors.textMuted}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="09..."
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={contact}
            onChangeText={setContact}
          />
        </View>

        <View style={[styles.inputGroup, { zIndex: 1000 }]}>
          <Text style={styles.label}>Barangay</Text>
          <BarangayAutocomplete
            value={barangay}
            onChangeText={setBarangay}
            placeholder="Search or type Barangay (e.g. Tetuan)"
          />
        </View>

        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>Transportation Mode</Text>
          <ChipSelector
            options={transportOptions}
            value={transportationMode}
            onChange={setTransportationMode}
          />
        </View>

        <View style={styles.counterBox}>
          <Text style={styles.counterLabel}>Family Headcount</Text>
          <View style={styles.counterRow}>
            <PrimaryButton
              title=""
              onPress={() => setHeadcount(Math.max(1, headcount - 1))}
              variant="outline"
              size="small"
              icon={<Minus size={32} color={colors.white} />}
              style={styles.circleBtn}
              haptic={true}
            />

            <Text style={styles.counterNumber}>{headcount}</Text>

            <PrimaryButton
              title=""
              onPress={() => setHeadcount(headcount + 1)}
              variant="primary"
              size="small"
              icon={<Plus size={32} color={colors.white} />}
              style={[styles.circleBtn, { backgroundColor: colors.primaryDark }]}
              haptic={true}
            />
          </View>
          <Text style={styles.helperText}>
            This ensures we reserve enough food and water for your exact family size.
          </Text>
        </View>

        <PrimaryButton
          title={loading ? 'GENERATING...' : 'REGISTER & GENERATE QR'}
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          variant="primary"
          size="large"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
