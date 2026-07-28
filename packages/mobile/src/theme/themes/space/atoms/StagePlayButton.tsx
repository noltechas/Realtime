import React from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import type { PlayButtonProps } from '../../../types'
import {
  GlowHalo,
  HULL_HI,
  ICE,
  MONO,
  STEEL,
  STEEL_HI,
  TEXT_FAINT,
  VOID,
  polygonPath,
  useLinearLoop,
  useOscillator,
  usePressTravel,
  useSvgId,
} from './_ship'

// Space stage control — the drive throttle.
//
// This is the app's hero moment (it only appears when it is your turn to sing),
// and it is deliberately 2D. The theme holds a hard ceiling of two Filament
// engines — the outboard viewport and the nav pod — and this screen is reached
// while both are already live. A third engine here would be the one place the
// theme could stutter on a low-end device, in exchange for an effect that
// layered SVG and a perspective press already sell: a hex throttle collar, a
// machined index ring whose lit arc sweeps while playing, and a singer-coloured
// core that physically depresses.
//
// If a third engine is ever acceptable, this is the atom to promote — the
// geometry is already modelled as `PodCollar` in space-navpod.glb.
const SIZE = 240
const COLLAR_RADIUS = 104
const INDEX_RADIUS = 86
const CORE_RADIUS = 62
const INDEX_TICKS = 36

export function SpaceStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { depth, transform, onPressIn, onPressOut } = usePressTravel(1.4)
  const gradientId = useSvgId('throttleCore')

  // Slow breath on the halo whenever the drive is running. Held still when
  // paused, so the button's state is legible without reading the glyph.
  const breath = useOscillator(3000)
  const haloScale = isPlaying
    ? breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] })
    : 1
  const haloOpacity = isPlaying
    ? breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] })
    : 0.3

  // The index ring's lit arc sweeps continuously while playing. A linear loop,
  // not an oscillator — an oscillator would run the arc forward and then back.
  const sweep = useLinearLoop(5200)
  const sweepRotate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Core seats deeper into the collar under the finger.
  const coreDepth = depth.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] })

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          transform,
        }}
      >
        {/* Halo — the drive's light, under the hardware. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        >
          <GlowHalo size={SIZE} color={singerColor} intensity={0.5} />
        </Animated.View>

        {/* Hex throttle collar + machined index ring. */}
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          {/* Collar: a hex plate, matching the nav pod's silhouette so the
              hero control is unmistakably from the same machine. */}
          <Path
            d={polygonPath(6, COLLAR_RADIUS, SIZE / 2, SIZE / 2, Math.PI / 6)}
            fill={HULL_HI}
            fillOpacity={0.92}
            stroke={STEEL_HI}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
          <Path
            d={polygonPath(6, COLLAR_RADIUS - 7, SIZE / 2, SIZE / 2, Math.PI / 6)}
            fill="none"
            stroke={ICE}
            strokeOpacity={0.18}
            strokeWidth={1}
          />

          {/* Index ring — engraved graduations around the core. */}
          {Array.from({ length: INDEX_TICKS }, (_, index) => {
            const angle = (index / INDEX_TICKS) * Math.PI * 2 - Math.PI / 2
            const major = index % 6 === 0
            const inner = INDEX_RADIUS - (major ? 11 : 6)
            return (
              <Path
                key={index}
                d={`M ${SIZE / 2 + Math.cos(angle) * inner} ${
                  SIZE / 2 + Math.sin(angle) * inner
                } L ${SIZE / 2 + Math.cos(angle) * INDEX_RADIUS} ${
                  SIZE / 2 + Math.sin(angle) * INDEX_RADIUS
                }`}
                stroke={major ? STEEL_HI : STEEL}
                strokeOpacity={major ? 0.75 : 0.55}
                strokeWidth={major ? 2 : 1.2}
                strokeLinecap="round"
              />
            )
          })}
        </Svg>

        {/* Lit sweep arc — only while the drive is running. Rotated as a whole
            view so the arc geometry itself never re-renders. */}
        {isPlaying ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              transform: [{ rotate: sweepRotate }],
            }}
          >
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={INDEX_RADIUS}
                fill="none"
                stroke={ICE}
                strokeWidth={2.5}
                strokeLinecap="round"
                // A 70°-of-circumference lit segment with the remainder dark.
                strokeDasharray={`${2 * Math.PI * INDEX_RADIUS * 0.19} ${
                  2 * Math.PI * INDEX_RADIUS
                }`}
                strokeOpacity={0.9}
              />
            </Svg>
          </Animated.View>
        ) : null}

        {/* Core — the singer's colour, and the surface that takes the press. */}
        <Animated.View
          style={{
            position: 'absolute',
            width: CORE_RADIUS * 2,
            height: CORE_RADIUS * 2,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: coreDepth }],
          }}
        >
          <Svg width={CORE_RADIUS * 2} height={CORE_RADIUS * 2} style={StyleSheet.absoluteFill}>
            {/* Defs must live in the same <Svg> that references them —
                react-native-svg treats each root as its own document, so a
                gradient declared in the collar's Svg above would resolve to
                nothing here. */}
            <Defs>
              <RadialGradient id={gradientId} cx="36%" cy="30%" r="72%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
                <Stop offset="0.36" stopColor={singerColor} stopOpacity={1} />
                <Stop offset="1" stopColor={singerColor} stopOpacity={0.6} />
              </RadialGradient>
            </Defs>
            <Path
              d={polygonPath(6, CORE_RADIUS - 2, CORE_RADIUS, CORE_RADIUS, Math.PI / 6)}
              fill={`url(#${gradientId})`}
              stroke="#FFFFFF"
              strokeOpacity={0.75}
              strokeWidth={2}
            />
          </Svg>
          {isPlaying ? (
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <View style={pauseBar} />
              <View style={pauseBar} />
            </View>
          ) : (
            <View style={playGlyph} />
          )}
        </Animated.View>

        {/* Throttle legend. */}
        <Text
          style={{
            position: 'absolute',
            bottom: 6,
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: 2.4,
            color: isPlaying ? ICE : TEXT_FAINT,
          }}
        >
          {isPlaying ? 'DRIVE ONLINE' : 'DRIVE HOLD'}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

const playGlyph = {
  width: 0,
  height: 0,
  borderTopWidth: 21,
  borderBottomWidth: 21,
  borderLeftWidth: 34,
  borderTopColor: 'transparent' as const,
  borderBottomColor: 'transparent' as const,
  borderLeftColor: VOID,
  marginLeft: 12,
}

const pauseBar = {
  width: 11,
  height: 42,
  backgroundColor: VOID,
}
