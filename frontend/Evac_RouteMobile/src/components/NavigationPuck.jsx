import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * Google Maps Style 3D Navigation Chevron Puck
 *
 * Recreates the iconic Google Navigation puck:
 * - A crisp white circular base disc with subtle border and elevation drop shadow.
 * - A faceted 3D chevron/arrowhead pointing in the heading direction:
 *   - Lighter face on the left, darker face on the right for realistic 3D lighting.
 *   - Clean white border separating the chevron from the base disc.
 * - Outer accuracy aura / beacon ring.
 *
 * @param {number} heading - Bearing in degrees (0-360)
 * @param {string} theme - 'resident' (Google Blue) | 'rescue' (Tactical Emerald/Cyan) | 'warning' (Amber)
 * @param {number} size - Overall diameter (default 48)
 * @param {boolean} showBeam - Whether to display a forward heading cone
 * @param {boolean} isNavigating - Active turn-by-turn state (elevates puck prominence)
 */
export default function NavigationPuck({
  heading = 0,
  theme = 'resident',
  size = 46,
  showBeam = false,
  isNavigating = true,
  children = null,
}) {
  // Theme Color Configurations
  const colors = {
    resident: {
      leftFace: '#2563eb',    // Vibrant Royal Blue
      rightFace: '#1d4ed8',   // Deeper 3D Blue
      rim: '#93c5fd',         // Soft Sky Blue rim
      aura: 'rgba(37, 99, 235, 0.22)',
      beam: 'rgba(59, 130, 246, 0.18)',
    },
    rescue: {
      leftFace: '#059669',    // Tactical Emerald
      rightFace: '#047857',   // Deep Tactical Green
      rim: '#6ee7b7',         // Mint highlight
      aura: 'rgba(16, 185, 129, 0.25)',
      beam: 'rgba(16, 185, 129, 0.20)',
    },
    rescueCyan: {
      leftFace: '#0284c7',    // Sky/Cyan Tactical
      rightFace: '#0369a1',   // Deep Ocean
      rim: '#7dd3fc',
      aura: 'rgba(2, 132, 199, 0.25)',
      beam: 'rgba(56, 189, 248, 0.20)',
    },
    warning: {
      leftFace: '#f59e0b',    // Tactical Amber
      rightFace: '#d97706',
      rim: '#fde68a',
      aura: 'rgba(245, 158, 11, 0.25)',
      beam: 'rgba(245, 158, 11, 0.18)',
    },
  }[theme] || {
    leftFace: '#2563eb',
    rightFace: '#1d4ed8',
    rim: '#93c5fd',
    aura: 'rgba(37, 99, 235, 0.22)',
    beam: 'rgba(59, 130, 246, 0.18)',
  };

  const safeHeading = isNaN(Number(heading)) ? 0 : Number(heading);

  return (
    <View style={[styles.container, { width: size + 16, height: size + 16 }]}>
      {/* Outer Pulsing Accuracy Aura */}
      <View
        style={[
          styles.auraRing,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
            backgroundColor: colors.aura,
            borderColor: colors.rim,
          },
        ]}
      />

      {/* Rotating 3D Puck Core */}
      <View
        style={[
          styles.puckDisc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: `${safeHeading}deg` }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Defs>
            <RadialGradient id="discGrad" cx="50%" cy="40%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="85%" stopColor="#f8fafc" stopOpacity="1" />
              <Stop offset="100%" stopColor="#e2e8f0" stopOpacity="1" />
            </RadialGradient>
          </Defs>

          {/* Forward Heading Beam Cone (if enabled) */}
          {showBeam && (
            <Path
              d="M 24 24 L 10 0 L 38 0 Z"
              fill={colors.beam}
            />
          )}

          {/* 3D Circular Base Disc */}
          <Circle
            cx="24"
            cy="24"
            r="20.5"
            fill="url(#discGrad)"
            stroke="rgba(15, 23, 42, 0.15)"
            strokeWidth="1.2"
          />

          {/* Subtle Inner Bevel Ring */}
          <Circle
            cx="24"
            cy="24"
            r="18.5"
            fill="none"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth="1"
          />

          {/* ─── 3D FACETED NAVIGATION CHEVRON / ARROWHEAD ─── */}
          {/* Left Arrow Face (Lighter for top-left directional light) */}
          <Path
            d="M 24 8 L 12.5 35.5 L 24 28.5 Z"
            fill={colors.leftFace}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Right Arrow Face (Darker for 3D depth) */}
          <Path
            d="M 24 8 L 35.5 35.5 L 24 28.5 Z"
            fill={colors.rightFace}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Central Crease Line Highlight */}
          <Path
            d="M 24 9 L 24 28"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Optional Child Tag / Label (Rendered outside rotation) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  puckDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
