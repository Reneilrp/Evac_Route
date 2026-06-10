import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { QrCode, Map, Radio } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../styles/theme';
import styles from '../styles/OnboardingScreen.styles';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: QrCode,
    iconColor: colors.primary,
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconBorder: 'rgba(59, 130, 246, 0.3)',
    title: 'Your Family, Protected',
    subtitle:
      'Register your family once and get a unique QR code. Staff at evacuation shelters scan it to instantly check you in — no paperwork, no delays.',
  },
  {
    icon: Map,
    iconColor: colors.successLight,
    iconBg: 'rgba(34, 197, 94, 0.15)',
    iconBorder: 'rgba(34, 197, 94, 0.3)',
    title: 'Real-Time Hazard Maps',
    subtitle:
      'See active flood zones, blocked roads, and safe evacuation routes on a live map — even offline. The system finds the safest path for your transport type.',
  },
  {
    icon: Radio,
    iconColor: colors.warning,
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconBorder: 'rgba(245, 158, 11, 0.3)',
    title: 'LGU Connected',
    subtitle:
      'Your city\'s Disaster Response team tracks family safety status in real-time. They know exactly who is safe and who needs rescue — because of you.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);

  // Store animated values as arrays of refs (not .current)
  const fadeAnimsRef = useRef(SLIDES.map(() => new Animated.Value(0)));
  const scaleAnimsRef = useRef(SLIDES.map(() => new Animated.Value(0.8)));

  const animateSlide = useCallback((index) => {
    const fadeAnims = fadeAnimsRef.current;
    const scaleAnims = scaleAnimsRef.current;

    // Reset all
    fadeAnims.forEach((anim) => anim.setValue(0));
    scaleAnims.forEach((anim) => anim.setValue(0.8));

    // Animate current
    Animated.parallel([
      Animated.timing(fadeAnims[index], { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();
  }, []);

  // Animate first slide on mount
  useEffect(() => {
    animateSlide(0);
  }, [animateSlide]);

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentSlide && slideIndex >= 0 && slideIndex < SLIDES.length) {
      setCurrentSlide(slideIndex);
      animateSlide(slideIndex);
    }
  };

  const goToSlide = (index) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentSlide(index);
    animateSlide(index);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    navigation.replace('Login');
  };

  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.slideContainer}
      >
        {SLIDES.map((slide, index) => {
          const IconComponent = slide.icon;
          return (
            <View key={index} style={styles.slide}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: slide.iconBg,
                    borderColor: slide.iconBorder,
                    opacity: fadeAnimsRef.current[index],
                    transform: [{ scale: scaleAnimsRef.current[index] }],
                  },
                ]}
              >
                <IconComponent size={64} color={slide.iconColor} />
              </Animated.View>
              <Animated.View style={{ opacity: fadeAnimsRef.current[index] }}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer: Dots + Buttons */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={completeOnboarding}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.nextButton}>
            <PrimaryButton
              title={isLastSlide ? 'GET STARTED' : 'NEXT'}
              onPress={() => {
                if (isLastSlide) {
                  completeOnboarding();
                } else {
                  goToSlide(currentSlide + 1);
                }
              }}
              variant="primary"
              size="medium"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
