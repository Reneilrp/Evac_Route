import { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../styles/theme';
import styles from '../styles/LoginScreen.styles';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

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
          <Text style={styles.cityLabel}>ZAMBOANGA CITY</Text>
        </View>

        {/* Action Buttons */}
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
        </View>

        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}
