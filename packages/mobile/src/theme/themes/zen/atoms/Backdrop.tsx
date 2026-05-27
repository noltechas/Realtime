import React, { useEffect, useRef } from 'react'
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  type ViewStyle,
} from 'react-native'
import Svg, {
  Defs,
  RadialGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'

const SCREEN = Dimensions.get('window')

// Zen page backdrop — intentionally spare. Two layers only:
//   1. A breathing sumi-ink wash (warm gold radial bloom near the upper-left,
//      vermillion bloom near the lower-right) that slowly drifts.
//   2. A continuous, gentle shower of falling 5-petal sakura petals — the
//      only ambient motion. Petals fall with sine-modulated horizontal drift
//      so they read as wind-blown rather than mechanical.
// All static decorations (moon, kintsugi seam, sakura branch, Mt. Fuji
// silhouette) have been removed so the foreground content reads cleanly.
export function Backdrop() {
  return (
    <View pointerEvents="none" style={fillStyle}>
      <InkWash />
      <PetalShower />
    </View>
  )
}

const fillStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  backgroundColor: '#1a1814',
}

function InkWash() {
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 28000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [drift])

  const translateX = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 18, 0],
  })
  const translateY = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -14, 0],
  })

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="lantern" cx="20%" cy="18%" r="80%">
            <Stop offset="0" stopColor="#D4B85A" stopOpacity="0.10" />
            <Stop offset="0.6" stopColor="#D4B85A" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#D4B85A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="vermilionBloom" cx="80%" cy="92%" r="70%">
            <Stop offset="0" stopColor="#D4442A" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#D4442A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lantern)" />
        <Rect width="100%" height="100%" fill="url(#vermilionBloom)" />
      </Svg>
    </Animated.View>
  )
}

function PetalShower() {
  const petals = Array.from({ length: 18 }, (_, i) => i)
  return (
    <>
      {petals.map((i) => (
        <FallingPetal key={i} index={i} />
      ))}
    </>
  )
}

function FallingPetal({ index }: { index: number }) {
  const drift = useRef(new Animated.Value(0)).current
  const seed = (index * 9973) % 1000
  const startLeftPct = ((index * 47 + 17) % 100) / 100
  const duration = 18000 + (seed % 8000)
  const delay = (seed % 5500)
  const driftAmp = 30 + (seed % 50)
  const baseRotate = (seed % 360)
  const rotateRange = 360 + (seed % 360)
  const size = 10 + (seed % 10)
  const hueIdx = seed % 4
  const fill =
    hueIdx === 0
      ? '#F4B6C2'
      : hueIdx === 1
        ? '#F8DDE2'
        : hueIdx === 2
          ? '#E8A0BF'
          : '#F0E6D3'

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [drift, duration, delay])

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, SCREEN.height + 60],
  })
  const translateX = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, driftAmp, -driftAmp * 0.4, driftAmp * 0.8, -driftAmp * 0.3],
  })
  const rotate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [`${baseRotate}deg`, `${baseRotate + rotateRange}deg`],
  })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${startLeftPct * 100}%`,
        width: size,
        height: size,
        opacity: 0.75,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path
          d="M 10 18 C 4 16 2 10 4 6 C 6 3 9 4 10 7 C 11 4 14 3 16 6 C 18 10 16 16 10 18 Z"
          fill={fill}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  )
}
