import { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../styles/theme';
import styles from '../styles/LoginScreen.styles';

export default function LoginScreen({ navigation }) {
  const { login, loginWithCredentials } = useAuth();
  const insets = useSafeAreaInsets();

  const [isStaffMode, setIsStaffMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animated values stored as refs
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
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Fade in content
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  const handleStaffLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await loginWithCredentials(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  const backgroundColor = bgAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0f172a', '#0c1524'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <Animated.View
        style={[
          styles.gradient,
          { opacity: fadeAnimRef.current, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View
            style={[
              styles.iconRing,
              { transform: [{ translateY: floatAnimRef.current }] },
            ]}
          >
            <ShieldAlert size={56} color={colors.primary} />
          </Animated.View>
          <Text style={styles.title}>EVAC-ROUTE</Text>
          <Text style={styles.subtitle}>Emergency Evacuation System</Text>
          <Text style={styles.cityLabel}>{isStaffMode ? 'LGU STAFF PORTAL' : 'ZAMBOANGA CITY'}</Text>
        </View>

        {/* Action Buttons */}
        {!isStaffMode ? (
          <View style={styles.buttonSection}>
            <PrimaryButton
              title="REGISTER FAMILY"
              onPress={() => navigation.navigate('SetupProfile')}
              variant="primary"
              size="large"
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <PrimaryButton
              title="I ALREADY REGISTERED"
              onPress={() => login()}
              variant="outline"
              size="medium"
            />

            <TouchableOpacity
              style={styles.staffPortalButton}
              onPress={() => {
                setError('');
                setIsStaffMode(true);
              }}
            >
              <Text style={styles.staffPortalText}>LGU Staff Portal Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonSection}>
            <Text style={styles.inputLabel}>LGU Email Address</Text>
            <TextInput
              style={styles.textInput}
              placeholder="operator@zamboanga.gov.ph"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <PrimaryButton
                title="LOG IN AS STAFF"
                onPress={handleStaffLogin}
                variant="primary"
                size="large"
              />
            )}

            <PrimaryButton
              title="BACK TO RESIDENT SIGN IN"
              onPress={() => {
                setError('');
                setIsStaffMode(false);
              }}
              variant="outline"
              size="medium"
              disabled={loading}
            />
          </View>
        )}

        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}
