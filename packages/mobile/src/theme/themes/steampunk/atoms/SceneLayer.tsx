import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GearTrain, HOUSE, IMG, SteamPuffs, meshTrain } from './_engine'

// The engine house behind every screen, mounted ONCE under the navigator
// (screens are transparent so it shows through): the out-of-focus hall with
// its tall arched window, airships drifting past outside it, a train of gears
// turning along the foot of the screen (blurred a little: they're behind the
// glass of the panel you're holding), and steam drifting up. All transforms
// on the native driver.

// The window in foundry-tall.jpg, in image pixels (generator: centred, 440
// wide, from 300 down to 1150, semicircular head).
const IMG_W = 900
const IMG_H = 1950
const WIN = { cx: 450, w: 440, top: 300, bottom: 1150 }

export function SceneLayer() {
  const { width: W, height: H } = useWindowDimensions()
  const s = Math.max(W / IMG_W, H / IMG_H)
  const ox = (W - IMG_W * s) / 2
  const oy = (H - IMG_H * s) / 2
  const win = { left: ox + (WIN.cx - WIN.w / 2) * s, top: oy + WIN.top * s, width: WIN.w * s, height: (WIN.bottom - WIN.top) * s }
  const gears = useMemo(
    () =>
      meshTrain(
        { teeth: 44, x: W * 0.02, y: H - 52, phase: 4 },
        [
          { teeth: 24, deg: -34 },
          { teeth: 18, deg: 22 },
          { teeth: 32, deg: -22 },
        ],
        0.4,
      ),
    [W, H],
  )
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: HOUSE, overflow: 'hidden' }]}>
      <Image source={IMG.foundry} style={{ position: 'absolute', left: ox, top: oy, width: IMG_W * s, height: IMG_H * s }} />
      {/* airships past the window, only within its arch */}
      <View style={{ position: 'absolute', ...win, borderTopLeftRadius: win.width / 2, borderTopRightRadius: win.width / 2, overflow: 'hidden' }}>
        <Ship y={win.height * 0.16} w={win.width * 0.62} period={140000} delay={0} />
        <Ship y={win.height * 0.42} w={win.width * 0.3} period={200000} delay={90000} />
      </View>
      <LinearGradient colors={['rgba(12,9,7,0.38)', 'rgba(12,9,7,0.58)', 'rgba(12,9,7,0.86)']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <GearTrain gears={gears} shadow={4} blur={1} opacity={0.62} />
      <SteamPuffs x={W * 0.88} y={H * 0.8} size={90} period={8000} rise={170} />
      <SteamPuffs x={W * 0.3} y={H * 0.86} size={70} period={9500} delay={3000} rise={140} />
    </View>
  )
}

/** An airship crossing the window, small and hazed by distance. */
function Ship({ y, w, period, delay }: { y: number; w: number; period: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    v.setValue(0)
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: true }))
    const t = setTimeout(() => loop.start(), delay % 4000)
    return () => {
      clearTimeout(t)
      loop.stop()
    }
  }, [v, period, delay])
  return (
    <Animated.Image
      source={IMG.airship}
      blurRadius={1.5}
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        width: w,
        height: w * (300 / 640),
        opacity: 0.45,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w * 1.1, w * 3.2] }) }],
      }}
    />
  )
}
