import React from 'react'
import { View, Animated, StyleSheet, Dimensions } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, LinearGradient as SvgLinearGradient } from 'react-native-svg'
import { Gear } from '../Gear'
import { useLinearLoop, useDelayedBursts, useOscillator } from '../_shared'

// Steampunk backdrop — three composited layers:
//   1. Coal-fire ember base with a warm vignette: a radial gradient from
//      coal-glow amber at the bottom-center to deep walnut at the edges,
//      evoking a fire-lit boiler room.
//   2. Background clockwork — four large brass gears positioned just off-
//      screen at the corners and edges, slowly rotating on independent loops
//      (some forward, some reverse, periods 28–58s). Heavily faded so they
//      live as "ambient machinery" without competing with the foreground.
//   3. Steam plumes — three columns of rising/dissipating steam puffs on
//      independent self-rescheduled bursts. Each plume puffs at its own
//      cadence (4–8s intervals) so the boiler always has multiple plumes
//      mid-rise. A faint gas-lamp warmth ripples across the entire scene on
//      a 7s sinusoidal oscillator.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

export function Backdrop(): React.ReactElement {
  // Gas-lamp warmth — entire scene gently brightens and dims, as if a wick
  // were settling. Very subtle: 0.92 → 1.0 opacity on the vignette overlay.
  const lampPulse = useOscillator(7200)
  const lampOpacity = lampPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  })

  // Four background gears — generous spread of periods + directions.
  const cog1 = useLinearLoop(34000)
  const cog2 = useLinearLoop(46000)
  const cog3 = useLinearLoop(28000)
  const cog4 = useLinearLoop(58000)

  const r1 = cog1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const r2 = cog2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) // reverse
  const r3 = cog3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const r4 = cog4.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) // reverse

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#1F1108', overflow: 'hidden' }]}
    >
      {/* Base vignette — coal-fire glow gradient. */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="emberVignette"
            cx="50%"
            cy="78%"
            rx="90%"
            ry="80%"
          >
            <Stop offset="0%" stopColor="#5C2E12" stopOpacity={0.85} />
            <Stop offset="45%" stopColor="#2E1608" stopOpacity={0.65} />
            <Stop offset="100%" stopColor="#0A0502" stopOpacity={0.95} />
          </RadialGradient>
          <SvgLinearGradient id="topShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0A0502" stopOpacity={0.85} />
            <Stop offset="50%" stopColor="#0A0502" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#emberVignette)" />
        <Rect width="100%" height="100%" fill="url(#topShade)" />
      </Svg>

      {/* Background clockwork — large cogs spinning slowly off-screen. */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -110,
          left: -140,
          opacity: 0.16,
          transform: [{ rotate: r1 }],
        }}
      >
        <Gear size={320} teeth={14} bodyColor="#7A4D1A" edgeColor="#3E2810" hubColor="#2A1808" highlightColor="#B8762D" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.18,
          right: -200,
          opacity: 0.14,
          transform: [{ rotate: r2 }],
        }}
      >
        <Gear size={420} teeth={18} bodyColor="#5C8A7A" edgeColor="#2E4640" hubColor="#1A2820" highlightColor="#8AB5A0" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          opacity: 0.18,
          transform: [{ rotate: r3 }],
        }}
      >
        <Gear size={360} teeth={20} bodyColor="#B8762D" edgeColor="#5C3A12" hubColor="#3E2810" highlightColor="#E8C078" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: SCREEN_H * 0.12,
          right: -130,
          opacity: 0.13,
          transform: [{ rotate: r4 }],
        }}
      >
        <Gear size={260} teeth={12} bodyColor="#C97D3E" edgeColor="#6E3A14" hubColor="#3A1E0A" highlightColor="#F0A058" />
      </Animated.View>

      {/* Steam plumes — three columns rising from the bottom. */}
      <SteamPlume
        x={SCREEN_W * 0.18}
        baseY={SCREEN_H - 60}
        interval={5400}
        duration={4200}
        delay={0}
      />
      <SteamPlume
        x={SCREEN_W * 0.52}
        baseY={SCREEN_H - 40}
        interval={6800}
        duration={5000}
        delay={1900}
      />
      <SteamPlume
        x={SCREEN_W * 0.82}
        baseY={SCREEN_H - 80}
        interval={4800}
        duration={3800}
        delay={3400}
      />

      {/* Gas-lamp warmth overlay — gently breathes amber over everything. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { opacity: lampOpacity },
        ]}
      >
        <Svg width={SCREEN_W} height={SCREEN_H}>
          <Defs>
            <RadialGradient id="lampGlow" cx="50%" cy="70%" rx="80%" ry="60%">
              <Stop offset="0%" stopColor="#E8A93B" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#E8A93B" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#lampGlow)" />
        </Svg>
      </Animated.View>
    </View>
  )
}

// A single steam plume column — repeatedly puffs a soft ellipse upward from
// `baseY` at `x`, fading + scaling as it rises. Each puff is independent.
function SteamPlume({
  x,
  baseY,
  interval,
  duration,
  delay,
}: {
  x: number
  baseY: number
  interval: number
  duration: number
  delay: number
}) {
  const puff = useDelayedBursts(interval, duration, delay)

  const translateY = puff.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -220],
  })
  const translateX = puff.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 12, -8],
  })
  const scale = puff.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.4, 1.0, 2.4],
  })
  const opacity = puff.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 0.45, 0.22, 0],
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 50,
        top: baseY - 50,
        width: 100,
        height: 100,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Svg width={100} height={100}>
        <Defs>
          <RadialGradient id={`steam-${x}`} cx="50%" cy="50%" rx="55%" ry="55%">
            <Stop offset="0%" stopColor="#E8DDC5" stopOpacity={0.6} />
            <Stop offset="60%" stopColor="#C9B89A" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#A89878" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill={`url(#steam-${x})`} />
      </Svg>
    </Animated.View>
  )
}
