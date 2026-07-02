import React from 'react'
import { View, Animated, StyleSheet, Dimensions } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Rect, LinearGradient as SvgLinearGradient } from 'react-native-svg'
import {
  IRON_DEEP,
  Gear,
  IronSeam,
  SteamWisp,
  useLinearLoop,
  useOscillator,
} from './_steam'

// Steampunk backdrop — a dim engine-room wall, kept deliberately QUIET so the
// instrument panels in front carry the theme:
//   1. Near-black iron with a faint vertical sheet-metal gradient, two riveted
//      seams (upper wall + skirting), and a heavy edge vignette.
//   2. One enormous gear ghosted behind each of two corners, rotating on very
//      slow opposing loops — ambient machinery, barely above the noise floor.
//   3. Two soft steam wisps rising near the floor, and a gas-lamp pool of
//      warmth low on the wall that breathes on a slow sine.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

export function Backdrop(): React.ReactElement {
  const cogA = useLinearLoop(90000)
  const cogB = useLinearLoop(120000)
  const rotA = cogA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const rotB = cogB.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })

  // Gas-lamp pool breathing low on the wall.
  const lamp = useOscillator(7600)
  const lampOpacity = lamp.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: IRON_DEEP, overflow: 'hidden' }]}
    >
      {/* Sheet-metal wall gradient + vignette */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="wall" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1A110A" stopOpacity={1} />
            <Stop offset="55%" stopColor="#140D07" stopOpacity={1} />
            <Stop offset="100%" stopColor="#0D0804" stopOpacity={1} />
          </SvgLinearGradient>
          <RadialGradient id="vignette" cx="50%" cy="45%" rx="75%" ry="60%">
            <Stop offset="0%" stopColor="#000" stopOpacity={0} />
            <Stop offset="78%" stopColor="#000" stopOpacity={0} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wall)" />
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      {/* Ghosted clockwork behind the wall's corners */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -SCREEN_W * 0.42,
          right: -SCREEN_W * 0.42,
          opacity: 0.055,
          transform: [{ rotate: rotA }],
        }}
      >
        <Gear size={SCREEN_W * 0.95} teeth={16} tone="brass" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          bottom: -SCREEN_W * 0.35,
          left: -SCREEN_W * 0.38,
          opacity: 0.045,
          transform: [{ rotate: rotB }],
        }}
      >
        <Gear size={SCREEN_W * 0.8} teeth={12} tone="copper" />
      </Animated.View>

      {/* Riveted wall seams */}
      <IronSeam y={SCREEN_H * 0.16} />
      <IronSeam y={SCREEN_H * 0.86} />

      {/* Steam wisps near the floor */}
      <SteamWisp x={SCREEN_W * 0.22} baseY={SCREEN_H - 40} interval={7200} duration={5200} delay={800} maxOpacity={0.14} />
      <SteamWisp x={SCREEN_W * 0.78} baseY={SCREEN_H - 70} interval={8600} duration={5800} delay={4200} maxOpacity={0.11} />

      {/* Gas-lamp warmth pooling low on the wall */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: lampOpacity }]}>
        <Svg width={SCREEN_W} height={SCREEN_H}>
          <Defs>
            <RadialGradient id="lampPool" cx="50%" cy="82%" rx="72%" ry="46%">
              <Stop offset="0%" stopColor="#E8A93B" stopOpacity={0.08} />
              <Stop offset="100%" stopColor="#E8A93B" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#lampPool)" />
        </Svg>
      </Animated.View>
    </View>
  )
}
