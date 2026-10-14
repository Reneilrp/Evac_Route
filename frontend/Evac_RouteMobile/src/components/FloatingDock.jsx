import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radii, shadows } from '../styles/theme';

/**
 * FloatingDock — Immersive, elevated floating pill dock replacing native bottom tabs.
 * Supports frosted glass BlurView, haptic feedback, active pill highlights, and badges.
 */
export default function FloatingDock({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);

  // Check if current focused screen explicitly requested to hide tab bar
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor?.options || {};
  const isTabBarHidden =
    focusedOptions.tabBarStyle?.display === 'none' ||
    focusedOptions.tabBarVisible === false;

  if (isTabBarHidden) {
    return null;
  }

  const triggerHaptic = () => {
    try {
      Haptics.selectionAsync();
    } catch (_e) {
      // Gracefully handle if device has no haptics
    }
  };

  const dockContent = (
    <View style={styles.dockInner}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const badge = options.tabBarBadge;
        const activeColor = options.tabBarActiveTintColor || colors.primary;
        const inactiveColor = options.tabBarInactiveTintColor || colors.textMuted;

        const onPress = () => {
          triggerHaptic();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          triggerHaptic();
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel || String(label)}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
              styles.tabItem,
              isFocused && { backgroundColor: isDarkMode ? `${activeColor}25` : `${activeColor}18` },
            ]}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrapper}>
              {options.tabBarIcon &&
                options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? activeColor : inactiveColor,
                  size: 20,
                })}

              {badge !== undefined && badge !== null && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? activeColor : inactiveColor },
                isFocused && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View
      style={[
        styles.outerContainer,
        { bottom: Math.max(14, insets.bottom + 6) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.dockShadowWrap}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={70}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.blurContainer}
          >
            {dockContent}
          </BlurView>
        ) : (
          <View style={[styles.blurContainer, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)' }]}>
            {dockContent}
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    outerContainer: {
      position: 'absolute',
      left: 14,
      right: 14,
      alignItems: 'center',
      zIndex: 100,
    },
    dockShadowWrap: {
      width: '100%',
      maxWidth: 500,
      borderRadius: radii.full,
      overflow: 'hidden',
      borderWidth: 1.2,
      borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.9)',
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
      ...shadows.lg,
    },
    blurContainer: {
      width: '100%',
    },
    dockInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: radii.full,
      minHeight: 46,
    },
    iconWrapper: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 24,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
      letterSpacing: 0.2,
    },
    tabLabelActive: {
      fontWeight: '900',
    },
    badgePill: {
      position: 'absolute',
      top: -4,
      right: -8,
      backgroundColor: colors.danger,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    badgeText: {
      color: colors.white,
      fontSize: 8.5,
      fontWeight: '900',
      textAlign: 'center',
    },
  });
