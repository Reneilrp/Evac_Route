import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Plus, Minus, Footprints, Bike, Car } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { useResidentStore } from '../context/useResidentStore';
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

    } catch (error) {
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
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="09..."
            placeholderTextColor="#64748b"
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
            placeholderTextColor="#64748b"
            value={barangay}
            onChangeText={setBarangay}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Transportation Mode</Text>
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              style={[styles.selectorButton, transportationMode === 'pedestrian' && styles.selectorButtonActive]}
              onPress={() => setTransportationMode('pedestrian')}
            >
              <Footprints size={24} color={transportationMode === 'pedestrian' ? '#fff' : '#94a3b8'} />
              <Text style={[styles.selectorText, transportationMode === 'pedestrian' && styles.selectorTextActive]}>Pedestrian</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorButton, transportationMode === '2_wheel' && styles.selectorButtonActive]}
              onPress={() => setTransportationMode('2_wheel')}
            >
              <Bike size={24} color={transportationMode === '2_wheel' ? '#fff' : '#94a3b8'} />
              <Text style={[styles.selectorText, transportationMode === '2_wheel' && styles.selectorTextActive]}>2-Wheel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorButton, transportationMode === '4_wheel' && styles.selectorButtonActive]}
              onPress={() => setTransportationMode('4_wheel')}
            >
              <Car size={24} color={transportationMode === '4_wheel' ? '#fff' : '#94a3b8'} />
              <Text style={[styles.selectorText, transportationMode === '4_wheel' && styles.selectorTextActive]}>4-Wheel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.counterBox}>
          <Text style={styles.counterLabel}>Family Headcount</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => setHeadcount(Math.max(1, headcount - 1))}
            >
              <Minus size={32} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.counterNumber}>{headcount}</Text>

            <TouchableOpacity
              style={[styles.circleBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => setHeadcount(headcount + 1)}
            >
              <Plus size={32} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            This ensures we reserve enough food and water for your exact family size.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'GENERATING...' : 'REGISTER & GENERATE QR'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
