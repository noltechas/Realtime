import React, { useEffect, useRef } from 'react'
import { Pressable, View, Animated, StyleSheet } from 'react-native'
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
} from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop, useOscillator } from '../_shared'
import type { PlayButtonProps } from '../../../types'

// Space StagePlayButton — a pulsar with accretion-disk geometry:
//   1. Three concentric orbit rings — slim ellipses on different tilt angles
//      that all rotate continuously on independent loops.
//   2. A pulsing nebula halo (magenta→cyan radial gradient) that scales
//      between 1.0 and 1.08.
//   3. Three sonar pulse rings expanding outward on staggered loops.
//   4. Inner singer-color disc with the play/pause glyph painted void-dark
//      so it reads against the bright singer color.
export function SpaceStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const haloBreath = useOscillator(3200)
  const haloScale = haloBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.08],
  })
  const haloOpacity = haloBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.95],
  })

  // Three rotating orbit rings at different tilt angles + speeds.
  const ring1 = useLinearLoop(15000)
  const ring2 = useLinearLoop(11000)
  const ring3 = useLinearLoop(19000)
  const ring1Rot = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ring2Rot = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })
  const ring3Rot = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // Three sonar pulse rings — same staggered cadence as the desktop pulsar.
  const sonar1 = useRef(new Animated.Value(0)).current
  const sonar2 = useRef(new Animated.Value(0)).current
  const sonar3 = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const mk = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(val, {
            toValue: 1,
            duration: 2600,
            useNativeDriver: true,
          }),
        ),
      ])
    const a = mk(sonar1, 0)
    const b = mk(sonar2, 870)
    const c = mk(sonar3, 1740)
    a.start()
    b.start()
    c.start()
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
  }, [sonar1, sonar2, sonar3])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 240,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      {/* Sonar rings — behind everything */}
      <SonarRing value={sonar1} color="#E040FB" />
      <SonarRing value={sonar2} color="#40E0D0" />
      <SonarRing value={sonar3} color="#A8C2FF" />

      {/* Nebula halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        }}
      >
        <Svg width={220} height={220}>
          <Defs>
            <RadialGradient id="spaceHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#E040FB" stopOpacity={0.55} />
              <Stop offset="55%" stopColor="#7818A0" stopOpacity={0.3} />
              <Stop offset="85%" stopColor="#40E0D0" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#40E0D0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={110} cy={110} r={108} fill="url(#spaceHalo)" />
        </Svg>
      </Animated.View>

      {/* Three rotating orbit ellipses at different tilt angles */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          transform: [{ rotate: ring1Rot }],
        }}
      >
        <Svg width={200} height={200}>
          <Ellipse
            cx={100}
            cy={100}
            rx={94}
            ry={32}
            fill="none"
            stroke="#E040FB"
            strokeWidth={1.5}
            opacity={0.6}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          transform: [{ rotate: ring2Rot }],
        }}
      >
        <Svg width={200} height={200}>
          <Ellipse
            cx={100}
            cy={100}
            rx={88}
            ry={26}
            fill="none"
            stroke="#40E0D0"
            strokeWidth={1.4}
            opacity={0.7}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          transform: [{ rotate: ring3Rot }],
        }}
      >
        <Svg width={200} height={200}>
          <Ellipse
            cx={100}
            cy={100}
            rx={98}
            ry={20}
            fill="none"
            stroke="#A8C2FF"
            strokeWidth={1.2}
            opacity={0.5}
          />
        </Svg>
      </Animated.View>

      {/* Inner singer-color disc — pulsar core */}
      <View
        style={{
          position: 'absolute',
          width: 124,
          height: 124,
          borderRadius: 62,
          backgroundColor: singerColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(232,230,240,0.9)',
          shadowColor: singerColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 22,
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

function SonarRing({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.5],
  })
  const opacity = value.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.6, 0],
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
          width: 220,
          height: 220,
          borderRadius: 110,
          borderWidth: 2,
          borderColor: color,
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
  borderLeftColor: '#08080F',
  marginLeft: 10,
}
const pauseBar = {
  width: 12,
  height: 44,
  backgroundColor: '#08080F',
  borderRadius: 2,
}
