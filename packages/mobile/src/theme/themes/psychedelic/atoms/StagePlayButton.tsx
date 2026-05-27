import React, { useEffect, useRef } from 'react'
import { Pressable, View, Animated, StyleSheet } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useOscillator } from '../_shared'
import type { PlayButtonProps } from '../../../types'

// Psychedelic StagePlayButton — three concentric layers:
//   1. Three sonar ripple rings expanding outward on staggered 2.4s loops.
//   2. A breathing lava orb (acid yellow → tangerine → hot-pink RadialGradient)
//      that scales 1.0 ↔ 1.06.
//   3. An inner singer-color disc with a soft hue-shift glow.
// Center: a play triangle or pause bars rendered with View geometry, with a
// soft cream-white shadow.
export function PsychedelicStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const breath = useOscillator(2800)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.06],
  })

  // Three sonar rings. Each Animated.Value loops 0→1 over 2.4s with staggered
  // start times so the rings emanate at 0s, 0.8s, 1.6s in the cycle.
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current
  const ring3 = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const mk = (val: Animated.Value, delay: number) => {
      const seq = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(val, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
        ),
      ])
      return seq
    }
    const a = mk(ring1, 0)
    const b = mk(ring2, 800)
    const c = mk(ring3, 1600)
    a.start()
    b.start()
    c.start()
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
  }, [ring1, ring2, ring3])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      {/* Sonar rings — sit behind the orb. */}
      <SonarRing value={ring1} />
      <SonarRing value={ring2} />
      <SonarRing value={ring3} />

      {/* Breathing lava orb. */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          transform: [{ scale: breathScale }],
        }}
      >
        <Svg width={180} height={180} viewBox="0 0 180 180">
          <Defs>
            <RadialGradient id="psyPlayOrb" cx="40%" cy="35%" rx="60%" ry="60%" fx="40%" fy="35%">
              <Stop offset="0%" stopColor="#ffe98a" stopOpacity={1} />
              <Stop offset="35%" stopColor="#ffc34d" stopOpacity={1} />
              <Stop offset="70%" stopColor="#ff8c2d" stopOpacity={0.95} />
              <Stop offset="100%" stopColor="#ff2d95" stopOpacity={0.7} />
            </RadialGradient>
          </Defs>
          <Circle cx={90} cy={90} r={88} fill="url(#psyPlayOrb)" />
        </Svg>
      </Animated.View>

      {/* Inner singer-color disc. */}
      <View
        style={{
          position: 'absolute',
          width: 112,
          height: 112,
          borderRadius: 56,
          backgroundColor: singerColor,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 18,
        }}
      >
        {isPlaying ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={pauseBar} />
            <View style={pauseBar} />
          </View>
        ) : (
          <View style={playTri} />
        )}
      </View>
    </Pressable>
  )
}

function SonarRing({ value }: { value: Animated.Value }) {
  const scale = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.45],
  })
  const opacity = value.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.55, 0],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 2,
          borderColor: '#ff8c2d',
        }}
      />
    </Animated.View>
  )
}

const playTri = {
  width: 0,
  height: 0,
  borderTopWidth: 22,
  borderBottomWidth: 22,
  borderLeftWidth: 38,
  borderTopColor: 'transparent' as const,
  borderBottomColor: 'transparent' as const,
  borderLeftColor: '#f5ecff',
  marginLeft: 10,
}
const pauseBar = {
  width: 12,
  height: 44,
  backgroundColor: '#f5ecff',
  borderRadius: 6,
}
