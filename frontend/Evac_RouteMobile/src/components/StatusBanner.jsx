import { useRef, useEffect } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { colors, spacing, typography } from '../styles/theme';

/**
 * StatusBanner — Safe-area-aware status banner with pulse animation in danger mode.
 */
export default function StatusBanner({ status = 'danger', text, icon }) {
  const pulseAnimRef = useRef(new Animated.Value(1));

  useEffect(() => {
    const anim = pulseAnimRef.current;
    if (status === 'danger') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.02, duration: 800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      anim.setValue(1);
    }
  }, [status]);

  const isDanger = status === 'danger';

  const defaultText = isDanger ? 'EVACUATION MANDATORY' : 'YOU ARE MARKED AS SAFE';
  const defaultIcon = isDanger
    ? <AlertTriangle color={colors.white} size={28} style={{ marginRight: 10 }} />
    : <ShieldCheck color={colors.white} size={28} style={{ marginRight: 10 }} />;

  return (
    <Animated.View
      style={[
        styles.banner,
        isDanger ? styles.bannerDanger : styles.bannerSafe,
        { transform: [{ scale: pulseAnimRef.current }] },
      ]}
    >
      {icon || defaultIcon}
      <Text style={styles.bannerText}>{text || defaultText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  bannerDanger: { backgroundColor: colors.danger },
  bannerSafe: { backgroundColor: colors.success },
  bannerText: {
    color: colors.white,
    ...typography.heading,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
