import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { ShieldAlert, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LoginScreen.styles';

export default function LoginScreen({ navigation }) {
  const { loginWithCredentials } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Input Focus States for glowing borders
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Animated values
  const bgAnimRef = useRef(new Animated.Value(0));
  const floatAnimRef = useRef(new Animated.Value(0));
  const fadeAnimRef = useRef(new Animated.Value(0));

  useEffect(() => {
    const bgAnim = bgAnimRef.current;
    const floatAnim = floatAnimRef.current;
    const fadeAnim = fadeAnimRef.current;

    // Background color shift loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, { toValue: 1, duration: 4000, useNativeDriver: false }),
        Animated.timing(bgAnim, { toValue: 0, duration: 4000, useNativeDriver: false }),
      ])
    ).start();

    // Floating icon loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    // Fade in content
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleQuickSelect = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
  };

  const handleLoginSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please provide your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await loginWithCredentials(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result || !result.success) {
      setError(result?.message || 'Invalid email or password. Please try again.');
    }
  };

  const backgroundColor = bgAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['#090d16', '#0f172a'],
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View style={[styles.container, { backgroundColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Logo */}
            <View style={styles.logoSection}>
              <Animated.View
                style={[
                  styles.iconRing,
                  {
                    transform: [{ translateY: floatAnimRef.current }],
                  },
                ]}
              >
                <ShieldAlert size={48} color="#38bdf8" />
              </Animated.View>
              <Text style={styles.title}>EVAC-ROUTE</Text>
              <Text style={styles.subtitle}>Emergency Evacuation System</Text>
              <View style={styles.cityBadge}>
                <Text style={styles.cityLabel}>ZAMBOANGA CITY</Text>
              </View>
            </View>

            {/* Auth Card */}
            <Animated.View style={[styles.card, { opacity: fadeAnimRef.current }]}>
              {/* Quick Test Account Select */}
              <View style={styles.quickChipsHeader}>
                <Text style={styles.quickChipsTitle}>Quick Select Test Account</Text>
                <Sparkles size={12} color="#64748b" />
              </View>

              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('rescue1@lgu.gov.ph', 'password')}
                  style={[styles.quickChip, styles.quickChipRescue]}
                >
                  <Text style={[styles.quickChipText, { color: '#f87171' }]}>🚤 Rescue QRT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('scanner1@lgu.gov.ph', 'password')}
                  style={[styles.quickChip, styles.quickChipScanner]}
                >
                  <Text style={[styles.quickChipText, { color: '#38bdf8' }]}>📋 Scanner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('pheinz@evacroute.local', 'password')}
                  style={[styles.quickChip, styles.quickChipResident]}
                >
                  <Text style={[styles.quickChipText, { color: '#34d399' }]}>👤 Resident</Text>
                </TouchableOpacity>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    isEmailFocused && styles.textInputFocused,
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor="#475569"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!loading}
                />

                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.passwordInputContainer,
                    isPasswordFocused && styles.passwordInputContainerFocused,
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (error) setError('');
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleLoginSubmit}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#94a3b8" />
                    ) : (
                      <Eye size={18} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit CTA */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleLoginSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>SIGN IN</Text>
                  )}
                </TouchableOpacity>

                {/* Need to evacuate? Register as Evacuee */}
                <View style={styles.registerPrompt}>
                  <Text style={styles.registerPromptText}>Need to evacuate household?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SetupProfile')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.registerLinkText}>Register as Evacuee</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>

            <Text style={styles.versionText}>EVAC_ROUTE MOBILE • v1.0.1</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
