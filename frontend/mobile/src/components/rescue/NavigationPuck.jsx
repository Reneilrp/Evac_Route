import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';

/**
 * Google Maps Style Dual-Mode Location Indicator
 *
 * 1. PASSIVE MODE (isNavigating === false):
 *    - Classic Google Maps / Apple Maps illuminated blue dot.
 *    - High-contrast crisp white outline barrier (halo) for universal legibility on any map terrain.
 *    - Soft compass field-of-view "flashlight" beam indicating the direction the user is facing.
 *    - Translucent GPS accuracy ring / barrier.
 *
 * 2. ACTIVE NAVIGATION MODE (isNavigating === true):
 *    - Iconic Google Navigation 3D faceted chevron/arrowhead puck.
 *    - Elevated base disc with realistic directional depth (light left face, deep right face).
 *    - Forward turn-by-turn navigation beam pointing along route bearing.
 *    - Outer guidance beacon ring.
 *
 * @param {number} heading - Bearing in degrees (0-360)
 * @param {string} theme - 'resident' (Google Blue) | 'rescue' (Tactical Emerald) | 'rescueCyan' | 'warning' (Amber)
 * @param {number} size - Overall diameter (default 46)
 * @param {boolean} showBeam - Whether to display a forward heading cone
 * @param {boolean} isNavigating - Active turn-by-turn navigation state (true = 3D Chevron, false = Blue Dot)
 * @param {React.ReactNode} children - Optional callout or badge rendered above/below marker
 */
export default function NavigationPuck({
  heading = 0,
  theme = 'resident',
  size = 46,
  showBeam = false,
  isNavigating = false,
  children = null,
}) {
  // Theme Color Configurations
  const colors = {
    resident: {
      leftFace: '#2563eb',    // Vibrant Royal Blue
      rightFace: '#1d4ed8',   // Deeper 3D Blue
      rim: '#93c5fd',         // Soft Sky Blue rim
      aura: 'rgba(37, 99, 235, 0.22)',
      beam: 'rgba(59, 130, 246, 0.25)',
    },
    rescue: {
      leftFace: '#059669',    // Tactical Emerald
      rightFace: '#047857',   // Deep Tactical Green
      rim: '#6ee7b7',         // Mint highlight
      aura: 'rgba(16, 185, 129, 0.25)',
      beam: 'rgba(16, 185, 129, 0.22)',
    },
    rescueCyan: {
      leftFace: '#0284c7',    // Sky/Cyan Tactical
      rightFace: '#0369a1',   // Deep Ocean
      rim: '#7dd3fc',
      aura: 'rgba(2, 132, 199, 0.25)',
      beam: 'rgba(56, 189, 248, 0.22)',
    },
    warning: {
      leftFace: '#f59e0b',    // Tactical Amber
      rightFace: '#d97706',
      rim: '#fde68a',
      aura: 'rgba(245, 158, 11, 0.25)',
      beam: 'rgba(245, 158, 11, 0.20)',
    },
  }[theme] || {
    leftFace: '#2563eb',
    rightFace: '#1d4ed8',
    rim: '#93c5fd',
    aura: 'rgba(37, 99, 235, 0.22)',
    beam: 'rgba(59, 130, 246, 0.25)',
  };

  const safeHeading = isNaN(Number(heading)) ? 0 : Number(heading);

  return (
    <View style={[styles.container, { width: size + 16, height: size + 16 }]}>
      {/* Outer Accuracy Aura / Barrier Ring */}
      <View
        style={[
          styles.auraRing,
          {
            width: isNavigating ? size + 14 : size + 8,
            height: isNavigating ? size + 14 : size + 8,
            borderRadius: (isNavigating ? size + 14 : size + 8) / 2,
            backgroundColor: colors.aura,
            borderColor: colors.rim,
            borderWidth: isNavigating ? 1.5 : 1,
          },
        ]}
      />

      {/* Rotating Disc / Dot Component */}
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
            {/* Soft Flashlight Field-of-View Gradient for Passive Dot Mode */}
            <LinearGradient id="flashlightBeam" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="0%" stopColor={colors.leftFace} stopOpacity="0.45" />
              <Stop offset="60%" stopColor={colors.leftFace} stopOpacity="0.18" />
              <Stop offset="100%" stopColor={colors.leftFace} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {isNavigating ? (
            /* ═════════════════════════════════════════════════════════════════
               MODE 1: ACTIVE TURN-BY-TURN 3D NAVIGATION CHEVRON PUCK
               ═════════════════════════════════════════════════════════════════ */
            <>
              {/* Forward Heading Beam Cone (Active Route Guidance) */}
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
            </>
          ) : (
            /* ═════════════════════════════════════════════════════════════════
               MODE 2: PASSIVE BROWSING BLUE ILLUMINATED DOT WITH WHITE HALO
               ═════════════════════════════════════════════════════════════════ */
            <>
              {/* Compass Field-of-View "Flashlight" Beam (Showing Facing Direction) */}
              <Path
                d="M 24 24 L 10 4 A 22 22 0 0 1 38 4 Z"
                fill="url(#flashlightBeam)"
              />

              {/* Accuracy Barrier Ring */}
              <Circle
                cx="24"
                cy="24"
                r="16.5"
                fill={colors.aura}
                stroke={colors.rim}
                strokeWidth="1"
                strokeOpacity="0.7"
              />

              {/* Crisp Elevated White Outer Disc (Halo Barrier) */}
              <Circle
                cx="24"
                cy="24"
                r="11.5"
                fill="#ffffff"
                stroke="rgba(15, 23, 42, 0.18)"
                strokeWidth="1.2"
              />

              {/* Vibrant Illuminated Center Dot */}
              <Circle
                cx="24"
                cy="24"
                r="8"
                fill={colors.leftFace}
              />

              {/* Specular Highlight for Polished Physical Glass Finish */}
              <Circle
                cx="21.5"
                cy="21.5"
                r="2.2"
                fill="rgba(255, 255, 255, 0.85)"
              />
            </>
          )}
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
