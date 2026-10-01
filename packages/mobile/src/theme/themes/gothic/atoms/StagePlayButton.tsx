import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg'
import type { PlayButtonProps } from '../../../types'
import { WaxSeal, mix, useFlicker, useLoop, useUid } from './_gothic'

// Gothic transport: a SEAL pressed in crimson wax. Tap it and it is stamped:
// the seal squashes into the wax and comes back with the other glyph embossed.
// It sits in a ring of the singer's own glass. While the song runs, a candle's
// worth of the singer's light breathes behind it; at rest the wax just waits.

const SIZE = 132

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const press = useRef(new Animated.Value(0)).current
  const breathe = useLoop(3400)
  const flicker = useFlicker()
  const id = useUid('gply')

  const stamp = () => {
    press.setValue(0)
    Animated.sequence([
      Animated.timing(press, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(press, { toValue: 0, stiffness: 260, damping: 11, mass: 0.7, useNativeDriver: true }),
    ]).start()
    onPress()
  }

  useEffect(() => () => press.stopAnimation(), [press])

  const ring = SIZE + 30
  return (
    <View style={{ width: ring + 30, height: ring + 30, alignItems: 'center', justifyContent: 'center' }}>
      {/* the singer's light behind the seal */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: ring + 30,
          height: ring + 30,
          opacity: isPlaying ? Animated.multiply(flicker, breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })) : 0.25,
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`${id}l`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0.45" stopColor={singerColor} stopOpacity={0.4} />
              <Stop offset="1" stopColor={singerColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill={`url(#${id}l)`} />
        </Svg>
      </Animated.View>

      {/* The seal sits in a forged iron setting: a ring of slim lancet lights
          glazed in the singer's glass, lit from behind while the song runs. */}
      <View pointerEvents="none" style={{ position: 'absolute' }}>
        <Setting size={ring} color={singerColor} lit={isPlaying} />
      </View>

      <Pressable onPress={stamp} accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={6}>
        <Animated.View
          style={{
            transform: [
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
              { scaleX: press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
            ],
          }}
        >
          <WaxSeal size={SIZE} sigil="none">
            {/* the glyph EMBOSSED: a dark cut with a lit lower lip */}
            <View>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color="rgba(255,170,180,0.35)" style={{ position: 'absolute', left: isPlaying ? 0 : 4, top: 1.6 }} />
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color={mix('#4A0812', '#000000', 0.2)} style={{ marginLeft: isPlaying ? 0 : 4 }} />
            </View>
          </WaxSeal>
        </Animated.View>
      </Pressable>
    </View>
  )
}

/** Iron ring with N slim pointed lights between two bands. */
function Setting({ size, color, lit }: { size: number; color: string; lit: boolean }) {
  const id = useUid('gset')
  const c = size / 2
  const rOut = c - 2
  const rIn = c - 15
  const n = 18
  const lights = Array.from({ length: n }, (_, i) => {
    const am = (i / n) * Math.PI * 2 - Math.PI / 2
    const half = (Math.PI / n) * 0.52
    const p = (r: number, a: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`
    // a slim light: straight sides, pointed outer end
    return `M ${p(rIn + 1.5, am - half)} L ${p(rOut - 4, am - half)} L ${p(rOut - 1.5, am)} L ${p(rOut - 4, am + half)} L ${p(rIn + 1.5, am + half)} Z`
  })
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`${id}g`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0.8" stopColor={lit ? mix(color, '#FFFFFF', 0.25) : mix(color, '#000000', 0.55)} />
          <Stop offset="1" stopColor={lit ? color : mix(color, '#000000', 0.7)} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={rOut + 1} fill="#0B0A0E" stroke="#4C4755" strokeWidth={1.2} />
      <G>
        {lights.map((d, i) => (
          <Path key={i} d={d} fill={`url(#${id}g)`} stroke="#060508" strokeWidth={1} />
        ))}
      </G>
      <Circle cx={c} cy={c} r={rIn} fill="#0B0A0E" stroke="#2A2630" strokeWidth={2} />
      <Circle cx={c} cy={c} r={rOut + 0.4} fill="none" stroke="#8A8494" strokeOpacity={0.35} strokeWidth={0.8} />
    </Svg>
  )
}
