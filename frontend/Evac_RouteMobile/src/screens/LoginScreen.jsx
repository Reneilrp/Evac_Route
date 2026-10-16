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
  Pressable,
} from 'react-native';
import { ShieldAlert, Eye, EyeOff, Sparkles, Sun, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { getStyles } from '../styles/LoginScreen.styles';

export default function LoginScreen({ navigation }) {
  const { loginWithCredentials } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const styles = useThemedStyles(getStyles);
  const insets = useSafeAreaInsets();
  const emailInputRef = useRef(null);
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

    // Fade in card entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleQuickSelect = (quickEmail, quickPass) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError('');
  };

  const isLoggingInRef = useRef(false);

  const handleLoginSubmit = async () => {
    if (isLoggingInRef.current || loading) return;
    if (!email.trim()) {
      setError('Please enter your email or identifier.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    isLoggingInRef.current = true;
    setLoading(true);
    setError('');

    try {
      const result = await loginWithCredentials(email.trim().toLowerCase(), password);
      if (!result || !result.success) {
        setError(result?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      isLoggingInRef.current = false;
      setLoading(false);
    }
  };

  const backgroundColor = bgAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: isDarkMode ? ['#090d16', '#0f172a'] : ['#f1f5f9', '#f8fafc'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      {/* Top Right Dark/Light Theme Icon Button */}
      <View style={[styles.topRightThemeContainer, { top: insets.top + (Platform.OS === 'ios' ? 8 : 14) }]}>
        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={[
            styles.themeToggleBtn,
            isDarkMode ? styles.themeToggleBtnDark : styles.themeToggleBtnLight,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <Sun size={20} color="#fbbf24" />
          ) : (
            <Moon size={20} color="#1e293b" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                <ShieldAlert size={48} color={colors.primary} />
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
                <Sparkles size={12} color={colors.textMuted} />
              </View>

              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('rescue1@lgu.gov.ph', 'password')}
                  style={[styles.quickChip, styles.quickChipRescue]}
                >
                  <Text
                    style={[styles.quickChipText, styles.quickChipRescueText]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    🚤 Rescue QRT
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('scanner1@lgu.gov.ph', 'password')}
                  style={[styles.quickChip, styles.quickChipScanner]}
                >
                  <Text
                    style={[styles.quickChipText, styles.quickChipScannerText]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    📋 Scanner
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleQuickSelect('pheinz@evacroute.local', 'password')}
                  style={[styles.quickChip, styles.quickChipResident]}
                >
                  <Text
                    style={[styles.quickChipText, styles.quickChipResidentText]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    👤 Resident
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                <Text
                  style={styles.inputLabel}
                  onPress={() => emailInputRef.current?.focus()}
                >
                  Email
                </Text>
                <TextInput
                  ref={emailInputRef}
                  style={[
                    styles.textInput,
                    isEmailFocused && styles.textInputFocused,
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
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
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!loading}
                />

                <Text
                  style={styles.inputLabel}
                  onPress={() => passwordInputRef.current?.focus()}
                >
                  Password
                </Text>
                <Pressable
                  onPress={() => passwordInputRef.current?.focus()}
                  style={[
                    styles.passwordInputContainer,
                    isPasswordFocused && styles.passwordInputContainerFocused,
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
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
                    autoComplete="password"
                    textContentType="password"
                    importantForAutofill="yes"
                    returnKeyType="go"
                    onSubmitEditing={handleLoginSubmit}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </Pressable>

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
  );
}
