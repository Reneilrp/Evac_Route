import { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus, Footprints, Bike, Car } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import ChipSelector from '../components/ChipSelector';
import { colors } from '../styles/theme';
import styles from '../styles/ProfileSetupScreen.styles';

export default function ProfileSetupScreen() {
  const { login } = useAuth();
  const setProfileData = useResidentStore((state) => state.setProfileData);

  const [name, setName] = useState('');
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
    if (!name || !contact) {
      alert('Please enter your Full Name and Contact Number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call the real Laravel API
      const response = await api.post('/register/family', {
        name,
        barangay,
        headcount,
        contact_number: contact,
        transportation_mode: transportationMode
      });

      const { access_token, qr_code_hash } = response.data;

      // 2. Save auth token securely FIRST (login() will use it to call /user)
      await SecureStore.setItemAsync('auth_token', access_token);

      // 3. Use ZUSTAND to save the profile and QR hash (Persists to AsyncStorage automatically)
      setProfileData({ name, barangay, headcount, contact_number: contact, transportation_mode: transportationMode }, qr_code_hash);

      // 4. Sync user state from backend using the real token
      await login();
      setLoading(false);

    } catch (_error) {
      alert('Registration failed. Please check your connection and try again.');
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
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan Dela Cruz"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Barangay</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tetuan"
            placeholderTextColor={colors.textMuted}
            value={barangay}
            onChangeText={setBarangay}
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
