import React from 'react'
import { Animated, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg'
import type { PlayButtonProps } from '../../../types'
import {
  CORAL,
  GUAVA,
  LAGOON,
  MANGO,
  Press,
  RopeSeg,
  TEAK,
  TEAK_LIT,
  TIMBER_EDGE,
  WALNUT_DK,
  alpha,
  glow,
  lift,
  shade,
  tint,
  useLoop,
  useUid,
} from './_tropical'

// Tropical transport — a ship's porthole from the tiki bar wall: a carved,
// beveled teak ring (rope-lashed at its quarters) holding a pane of glossy
// lagoon water. Tap it and the water flips to the sunset ramp with pause bars;
// while the song runs, rings of the singer's own color ripple out across the
// lagoon, staggered so one is always mid-flight. At rest the pane breathes —
// the app is waiting on you, not asleep.

const SIZE = 168
const RING = 19 // timber ring thickness

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const breath = useLoop(2800)

  return (
    <View style={{ width: SIZE + 36, height: SIZE + 36, alignItems: 'center', justifyContent: 'center' }}>
      {isPlaying ? (
        <>
          <Ripple color={singerColor} delay={0} />
          <Ripple color={singerColor} delay={950} />
          <Ripple color={singerColor} delay={1900} />
        </>
      ) : (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: alpha(LAGOON, 0.24),
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0.08] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.24] }) }],
          }}
        />
      )}

      <Press
        onPress={onPress}
        scaleTo={0.95}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }, isPlaying ? glow(CORAL, 4) : lift(4)]}
      >
        <Porthole isPlaying={isPlaying} />
      </Press>
    </View>
  )
}

function Porthole({ isPlaying }: { isPlaying: boolean }) {
  const id = useUid('port')
  const paneR = 50 - (RING / SIZE) * 100 // pane radius in viewBox units

  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
      <Defs>
        {/* timber ring: lit upper-left, shaded lower-right */}
        <SvgGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tint(TEAK_LIT, 0.28)} />
          <Stop offset="0.5" stopColor={TEAK} />
          <Stop offset="1" stopColor={WALNUT_DK} />
        </SvgGradient>
        {/* both water panes — the visible one is picked by id below */}
        <RadialGradient id={`${id}sunset`} cx="36%" cy="28%" r="85%">
          <Stop offset="0" stopColor={tint(MANGO, 0.45)} />
          <Stop offset="0.45" stopColor={CORAL} />
          <Stop offset="1" stopColor={shade(GUAVA, 0.2)} />
        </RadialGradient>
        <RadialGradient id={`${id}lagoon`} cx="36%" cy="28%" r="85%">
          <Stop offset="0" stopColor={tint(LAGOON, 0.5)} />
          <Stop offset="0.45" stopColor={LAGOON} />
          <Stop offset="1" stopColor={shade(LAGOON, 0.42)} />
        </RadialGradient>
        <RadialGradient id={`${id}spec`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* ring */}
      <Circle cx={50} cy={50} r={50 - 1} fill={`url(#${id}ring)`} stroke={TIMBER_EDGE} strokeWidth={1.6} />
      {/* ring grain: concentric turning marks */}
      {[44.5, 46.5, 48.2].map((r, i) => (
        <Circle key={i} cx={50} cy={50} r={r} fill="none" stroke="rgba(43,22,6,0.28)" strokeWidth={0.8} />
      ))}
      {/* carved seam where the pane is set in — cut + lit lip */}
      <Circle cx={50} cy={50} r={paneR + 1.6} fill="none" stroke="rgba(30,14,2,0.55)" strokeWidth={1.8} />
      <Circle cx={50} cy={51.2} r={paneR + 1.6} fill="none" stroke="rgba(255,232,185,0.3)" strokeWidth={0.9} />
      {/* ring bevel highlights */}
      <Path d={`M17 24 A 42 42 0 0 1 76 15`} stroke="rgba(255,236,195,0.5)" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d={`M84 74 A 42 42 0 0 1 28 86`} stroke="rgba(20,9,1,0.35)" strokeWidth={2.2} strokeLinecap="round" fill="none" />

      {/* rope lashings at the quarters */}
      <G>
        <RopeSeg x1={44} y1={2.4} x2={56} y2={2.4} width={2.6} />
        <RopeSeg x1={44} y1={97.6} x2={56} y2={97.6} width={2.6} />
        <RopeSeg x1={2.4} y1={44} x2={2.4} y2={56} width={2.6} />
        <RopeSeg x1={97.6} y1={44} x2={97.6} y2={56} width={2.6} />
      </G>

      {/* the water */}
      <Circle cx={50} cy={50} r={paneR} fill={`url(#${id}${isPlaying ? 'sunset' : 'lagoon'})`} />
      {/* glyph */}
      {isPlaying ? (
        <G>
          <Rect x={40.5} y={38} width={7} height={24} rx={3.2} fill="#FFFFFF" />
          <Rect x={52.5} y={38} width={7} height={24} rx={3.2} fill="#FFFFFF" />
        </G>
      ) : (
        <Path d="M43 36.5 65 50 43 63.5Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" />
      )}
      {/* pane specular + waterline */}
      <Ellipse cx={40} cy={36} rx={14} ry={8.5} fill={`url(#${id}spec)`} transform="rotate(-26 40 36)" />
      <Path d={`M${50 - paneR + 4} 58 q 6 -3.5 13 0 t 13 0 t 13 0`} stroke="rgba(255,255,255,0.35)" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  )
}

/** One expanding ring of water leaving the porthole. */
function Ripple({ color, delay }: { color: string; delay: number }) {
  const v = useLoop(2700, delay, false)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 3,
        borderColor: alpha(color, 0.75),
        opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.6, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.55] }) }],
      }}
    />
  )
}
