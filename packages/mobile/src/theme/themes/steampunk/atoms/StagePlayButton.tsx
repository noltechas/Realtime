import React from 'react'
import { Pressable, View, Animated } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop, Line, Path } from 'react-native-svg'
import { hexToRgba } from '../../../helpers'
import {
  Gear,
  BRASS,
  BRASS_BRIGHT,
  useLinearLoop,
  useOscillator,
  useDelayedBursts,
} from './_steam'
import type { PlayButtonProps } from '../../../types'

// Steampunk StagePlayButton — the Great Engine, and the theme's hero moment:
//   1. A large brass master gear turning slowly behind everything, with a
//      smaller iron gear counter-rotating inside it.
//   2. A fixed engraved chapter ring (watch-face ticks) framing the works —
//      machinery reads as an instrument, not a pinwheel.
//   3. The center is the singer's enamel lens set in a polished brass bezel
//      with a glass glint; its halo breathes in the singer's color.
//   4. A slow steam ring vents outward every few seconds.
export function SteampunkStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const halo = useOscillator(3400)
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] })

  const master = useLinearLoop(26000)
  const inner = useLinearLoop(14000)
  const masterRot = master.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const innerRot = inner.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })

  const vent = useDelayedBursts(3600, 2600, 600)
  const ventScale = vent.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.35] })
  const ventOpacity = vent.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.4, 0] })

  const haloColor = hexToRgba(singerColor, 0.55) ?? 'rgba(232,169,59,0.55)'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 260,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      {/* venting steam ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 236,
          height: 236,
          borderRadius: 118,
          borderWidth: 1.5,
          borderColor: '#E8DDC5',
          opacity: ventOpacity,
          transform: [{ scale: ventScale }],
        }}
      />

      {/* singer-color halo */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 230, height: 230, opacity: haloOpacity, transform: [{ scale: haloScale }] }}
      >
        <Svg width={230} height={230}>
          <Defs>
            <RadialGradient id="engine-halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={haloColor} stopOpacity={0.55} />
              <Stop offset="60%" stopColor={haloColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={haloColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={115} cy={115} r={113} fill="url(#engine-halo)" />
        </Svg>
      </Animated.View>

      {/* master gear */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 238, height: 238, transform: [{ rotate: masterRot }] }}
      >
        <Gear size={238} teeth={16} tone="brass" opacity={0.85} />
      </Animated.View>

      {/* inner counter-gear */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 158, height: 158, transform: [{ rotate: innerRot }] }}
      >
        <Gear size={158} teeth={12} tone="iron" opacity={0.95} />
      </Animated.View>

      {/* fixed chapter ring — engraved instrument ticks */}
      <View pointerEvents="none" style={{ position: 'absolute', width: 190, height: 190 }}>
        <Svg width={190} height={190} viewBox="0 0 190 190">
          <Circle cx={95} cy={95} r={90} fill="none" stroke="rgba(200,151,62,0.4)" strokeWidth={1} />
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2
            const major = i % 5 === 0
            const r1 = major ? 84 : 87
            return (
              <Line
                key={i}
                x1={95 + Math.cos(a) * r1}
                y1={95 + Math.sin(a) * r1}
                x2={95 + Math.cos(a) * 90}
                y2={95 + Math.sin(a) * 90}
                stroke={major ? BRASS : 'rgba(200,151,62,0.45)'}
                strokeWidth={major ? 1.6 : 1}
              />
            )
          })}
        </Svg>
      </View>

      {/* enamel lens in a brass bezel */}
      <View
        style={{
          position: 'absolute',
          width: 106,
          height: 106,
          borderRadius: 53,
          backgroundColor: singerColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: BRASS_BRIGHT,
          shadowColor: singerColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 16,
        }}
      >
        {/* recessed seat ring */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 1.5,
            borderColor: 'rgba(0,0,0,0.35)',
          }}
        />
        {/* glass glint */}
        <View pointerEvents="none" style={{ position: 'absolute', width: 106, height: 106 }}>
          <Svg width={106} height={106} viewBox="0 0 106 106">
            <Defs>
              <RadialGradient id="lens-glint" cx="34%" cy="26%" rx="55%" ry="55%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
                <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0.08} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={53} cy={53} r={50} fill="url(#lens-glint)" />
          </Svg>
        </View>

        {isPlaying ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={pistonStyle} />
            <View style={pistonStyle} />
          </View>
        ) : (
          <Svg width={44} height={44} viewBox="0 0 44 44" style={{ marginLeft: 6 }}>
            <Path d="M 8 4 L 40 22 L 8 40 Z" fill="rgba(18,12,7,0.92)" />
          </Svg>
        )}
      </View>
    </Pressable>
  )
}

const pistonStyle = {
  width: 11,
  height: 38,
  borderRadius: 3,
  backgroundColor: 'rgba(18,12,7,0.92)',
  borderWidth: 1,
  borderColor: 'rgba(255,245,220,0.25)',
} as const
