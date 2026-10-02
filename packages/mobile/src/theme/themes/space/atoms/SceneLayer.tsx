import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native'
import { GOLD_HI, SKY_IMAGE, STAR, STAR_BLUE, STAR_RED, Twinkle, VOID, Voyager, useLoop } from './_record'

// Deep space behind every screen, mounted ONCE under the navigator (screens
// are transparent so it shows through). One pre-rendered deep field (the
// Milky Way, a nebula, stars in their true colours) drifting very slowly, a
// handful of bright stars breathing over it, and Voyager, far off, crossing
// the top of the sky once every few minutes. All of it is transforms on the
// native driver: nothing here costs the JS thread a frame.

const HEROES: Array<{ x: number; y: number; size: number; color: string; delay: number }> = [
  { x: 0.13, y: 0.075, size: 30, color: STAR_BLUE, delay: 0 },
  { x: 0.86, y: 0.16, size: 22, color: STAR, delay: 1300 },
  { x: 0.72, y: 0.43, size: 17, color: GOLD_HI, delay: 2600 },
  { x: 0.07, y: 0.56, size: 15, color: STAR, delay: 800 },
  { x: 0.93, y: 0.71, size: 21, color: STAR_RED, delay: 3400 },
  { x: 0.33, y: 0.87, size: 14, color: STAR_BLUE, delay: 2000 },
]

export function SceneLayer() {
  const { width: W, height: H } = useWindowDimensions()
  const drift = useLoop(180000)
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: VOID, overflow: 'hidden' }]}>
      <Animated.Image
        source={SKY_IMAGE}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: -W * 0.06,
          top: -H * 0.04,
          width: W * 1.12,
          height: H * 1.08,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.04, W * 0.04] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [H * 0.012, -H * 0.012] }) },
          ],
        }}
      />
      {HEROES.map((h, i) => (
        <Twinkle key={i} size={h.size} color={h.color} delay={h.delay} period={5200 + i * 700} style={{ position: 'absolute', left: h.x * W - h.size / 2, top: h.y * H - h.size / 2 }} />
      ))}
      <Probe W={W} H={H} />
    </View>
  )
}

/** Voyager crossing the top of the sky, slowly enough to never draw the eye. */
function Probe({ W, H }: { W: number; H: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 260000, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(40000),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v])
  const size = 66
  const y = useMemo(() => H * 0.115, [H])
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: y,
        opacity: 0.55,
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [W + 20, -size - 20] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.035] }) },
          { rotate: '-10deg' },
        ],
      }}
    >
      <Voyager size={size} />
    </Animated.View>
  )
}
