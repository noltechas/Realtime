import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native'
import { IMG, NIGHT } from './_glass'

// Liquid Glass scene: the wallpaper every pane floats over, mounted ONCE
// behind the whole navigator. A deep night field with soft glows and two
// glossy ribbons (scripts/generate-liquid-glass-assets.py), so wherever a
// pane sits there are edges for it to refract. It drifts very slowly, the
// way a lock screen's wallpaper shifts, so the glass is always bending
// something. Sized explicitly (cover-fit misplaces on iOS).
const PW = 1080
const PH = 2340

export function SceneLayer(): React.ReactElement {
  const { width, height } = useWindowDimensions()
  const s = Math.max(width / PW, height / PH) * 1.12
  const w = PW * s
  const h = PH * s
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [drift])
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT, overflow: 'hidden' }]}>
      <Animated.Image
        source={IMG.wallpaper}
        style={{
          position: 'absolute',
          left: (width - w) / 2,
          top: (height - h) / 2,
          width: w,
          height: h,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.03, w * 0.03] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [h * 0.015, -h * 0.015] }) },
          ],
        }}
      />
    </View>
  )
}
