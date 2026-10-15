import { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import BarangayAutocomplete from '../components/BarangayAutocomplete';
import CustomHeader from '../components/CustomHeader';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getStyles } from '../styles/ProfileSetupScreen.styles';

export default function ProfileSetupScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);
  const { login } = useAuth();
  const setProfileData = useResidentStore((state) => state.setProfileData);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [headcount, setHeadcount] = useState(1);
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const isRegisteringRef = useRef(false);

  // Default transportation mode to pedestrian (residents can change anytime in Profile)
  const transportationMode = 'pedestrian';

  const handleRegister = async () => {
    if (isRegisteringRef.current || loading) return;

    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast || !contact) {
      alert('Please fill in First Name, Last Name, and Contact Number.');
      return;
    }

    if (!barangay.trim()) {
      alert('Please select or specify your Barangay.');
      return;
    }

    const fullName = [trimmedFirst, trimmedMiddle, trimmedLast].filter(Boolean).join(' ');

    isRegisteringRef.current = true;
    setLoading(true);
    try {
      // 1. Call the real Laravel API
      const response = await api.post('/register/family', {
        name: fullName,
        barangay: barangay.trim(),
        headcount,
        contact_number: contact,
        transportation_mode: transportationMode
      });

      const { access_token, qr_code_hash, user, family } = response.data;

      const registeredUser = {
        ...(user || {}),
        family_profile: family || {
          barangay: barangay.trim(),
          headcount,
          contact_number: contact,
          transportation_mode: transportationMode,
          qr_code_hash,
        },
      };

      // 2. Save auth token securely FIRST
      await SecureStore.setItemAsync('auth_token', access_token);

      // 3. Use ZUSTAND to save the profile and QR hash (Persists to AsyncStorage automatically)
      setProfileData({ name: fullName, barangay: barangay.trim(), headcount, contact_number: contact, transportation_mode: transportationMode }, qr_code_hash);

      // 4. Sync user state into AuthContext directly
      await login(registeredUser);
    } catch (error) {
      const serverMsg = error?.response?.data?.message || error?.message || 'Connection error. Please check your network and try again.';
      console.error('[Registration Failed]:', error?.response?.data || error);
      alert(`Registration Failed: ${serverMsg}`);
    } finally {
      isRegisteringRef.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <CustomHeader
        title="Family Registration"
        subtitle="Evacuee intake credentials"
        onBack={() => navigation?.goBack?.()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

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

        <View style={[styles.inputGroup, { zIndex: 5000, elevation: 15 }]}>
          <Text style={styles.label}>Barangay</Text>
          <BarangayAutocomplete
            value={barangay}
            onChangeText={setBarangay}
            placeholder="Select or search Barangay (e.g. Tetuan)"
          />
        </View>

        <View style={[styles.counterBox, { zIndex: 1, elevation: 1 }]}>
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
