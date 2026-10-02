import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import type { PlayButtonProps } from '../../../types'
import { PEACH, PINK, RASPBERRY, SUN, SUN_HI, TwinkleShape, WHITE, catchTheLight, useLoop, useUid } from './_barbie'

// Barbie transport: THE SUN. A glossy sun-yellow disc in a scalloped ray ring,
// rimmed in the singer's own colour. While the song plays its rays turn and
// its halo breathes; paused, it holds still. Tapping it squishes the disc like
// a jelly button, the light catches everything on screen at once, and a few
// twinkles fly off it.

const SIZE = 128

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const press = useRef(new Animated.Value(0)).current
  const burst = useRef(new Animated.Value(0)).current
  const breathe = useLoop(3000)
  const spin = useRef(new Animated.Value(0)).current
  const id = useUid('bply')

  useEffect(() => {
    if (!isPlaying) {
      spin.stopAnimation()
      return
    }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 26000, easing: Easing.linear, useNativeDriver: true }))
    spin.setValue(0)
    loop.start()
    return () => loop.stop()
  }, [isPlaying, spin])

  const tap = () => {
    press.setValue(0)
    burst.setValue(0)
    Animated.parallel([
      Animated.sequence([
        Animated.spring(press, { toValue: 1, stiffness: 600, damping: 20, mass: 0.5, useNativeDriver: true }),
        Animated.spring(press, { toValue: 0, stiffness: 260, damping: 6, mass: 0.7, useNativeDriver: true }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
    catchTheLight()
    onPress()
  }

  const ring = SIZE + 56
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2
    return { x: Math.cos(a) * 80, y: Math.sin(a) * 80, i }
  })
  return (
    <View style={{ width: ring + 20, height: ring + 20, alignItems: 'center', justifyContent: 'center' }}>
      {/* halo: it breathes while the song runs */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: ring + 20,
          height: ring + 20,
          opacity: isPlaying ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) : 0.5,
          transform: [{ scale: isPlaying ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) : 1 }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="-100 -100 200 200">
          <Defs>
            <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.45" stopColor={SUN_HI} stopOpacity={0.9} />
              <Stop offset="1" stopColor={SUN_HI} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle r={100} fill={`url(#${id}h)`} />
        </Svg>
      </Animated.View>

      {/* the scalloped ray ring, turning */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: ring, height: ring, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
      >
        <Svg width={ring} height={ring} viewBox="-100 -100 200 200">
          {rays.map((r) => (
            <Path
              key={r.i}
              d={`M ${(r.x * 0.82).toFixed(1)} ${(r.y * 0.82).toFixed(1)} L ${(Math.cos((r.i / 18) * Math.PI * 2 - 0.09) * 70).toFixed(1)} ${(Math.sin((r.i / 18) * Math.PI * 2 - 0.09) * 70).toFixed(1)} L ${(r.x * 1.22).toFixed(1)} ${(r.y * 1.22).toFixed(1)} L ${(Math.cos((r.i / 18) * Math.PI * 2 + 0.09) * 70).toFixed(1)} ${(Math.sin((r.i / 18) * Math.PI * 2 + 0.09) * 70).toFixed(1)} Z`}
              fill={r.i % 2 ? PEACH : SUN}
            />
          ))}
          {rays.map((r) => (
            <Circle key={`c${r.i}`} cx={r.x * 0.86} cy={r.y * 0.86} r={10.5} fill={r.i % 2 ? SUN : '#FFC640'} />
          ))}
        </Svg>
      </Animated.View>

      {/* twinkles thrown off on a tap */}
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2
        return (
          <Animated.View
            key={k}
            pointerEvents="none"
            style={{
              position: 'absolute',
              opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * (ring * 0.62)] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * (ring * 0.62)] }) },
                { scale: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.1, 0.4] }) },
              ],
            }}
          >
            <TwinkleShape size={22} color={k % 2 ? WHITE : SUN_HI} />
          </Animated.View>
        )
      })}

      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={8}>
        <Animated.View
          style={{
            width: SIZE,
            height: SIZE,
            transform: [
              { scaleX: press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
              { scaleY: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) },
            ],
          }}
        >
          <Svg width={SIZE} height={SIZE} viewBox="-100 -100 200 200" style={{ position: 'absolute' }}>
            <Defs>
              <RadialGradient id={`${id}d`} cx="40%" cy="34%" r="72%">
                <Stop offset="0" stopColor="#FFFBE6" />
                <Stop offset="0.4" stopColor={SUN_HI} />
                <Stop offset="0.8" stopColor={SUN} />
                <Stop offset="1" stopColor="#F2A61E" />
              </RadialGradient>
            </Defs>
            {/* the singer's colour as the rim */}
            <Circle r={98} fill={singerColor} />
            <Circle r={88} fill={WHITE} />
            <Circle r={81} fill={`url(#${id}d)`} />
            {/* the specular: one hard-edged crescent of window light */}
            <Path d="M -58 -24 A 64 64 0 0 1 -12 -64 A 76 76 0 0 0 -46 -12 Z" fill={WHITE} opacity={0.75} />
            <Circle r={81} fill="none" stroke="rgba(176,17,94,0.18)" strokeWidth={3} />
          </Svg>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft: isPlaying ? 0 : 7 }}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={56} color={PINK} style={{ textShadowColor: RASPBERRY, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 }} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  )
}
