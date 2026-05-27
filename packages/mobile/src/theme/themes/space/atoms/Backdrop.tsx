import React, { useEffect, useMemo, useRef } from 'react'
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native'
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Line,
} from 'react-native-svg'
import { useOscillator, useDelayedBursts } from '../_shared'

// Space backdrop — three composited layers:
//   1. Deep-void base + a quartet of huge, drifting nebula radial blooms
//      (magenta / cyan / starlight blue) that gently translate and scale on
//      independent oscillators. They live well outside the visible bounds so
//      the user never sees a hard edge.
//   2. A dense field of static star points (SVG circles) painted in two
//      sublayers, plus a third twinkling sublayer of brighter stars whose
//      opacity oscillates on staggered periods. Sizes mix 0.6→2.2 px.
//   3. Two shooting-star comets that re-burst on independent intervals,
//      diagonally streaking with a tapered trail. Each schedules its own
//      next burst so they don't fire in lockstep.
//
// No translateY of foreground content — everything that *moves* here is
// background atmosphere. The look matches the desktop `[data-theme="space"]
// .main::before` nebula drift + `::after` twinkle keyframes.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface StarSpec {
  cx: number
  cy: number
  r: number
  opacity: number
  color: string
}

interface TwinkleStarSpec extends StarSpec {
  period: number
  delay: number
}

// Deterministic pseudo-random — keeps the field stable across rerenders.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function buildStaticField(seed: number, count: number): StarSpec[] {
  const r = rng(seed)
  const out: StarSpec[] = []
  for (let i = 0; i < count; i++) {
    const sizeRoll = r()
    const colorRoll = r()
    const color =
      colorRoll > 0.92
        ? '#E040FB'
        : colorRoll > 0.85
          ? '#40E0D0'
          : colorRoll > 0.78
            ? '#A8C2FF'
            : '#E8E6F0'
    out.push({
      cx: r() * SCREEN_W,
      cy: r() * SCREEN_H,
      r: 0.6 + sizeRoll * 1.2,
      opacity: 0.25 + r() * 0.55,
      color,
    })
  }
  return out
}

function buildTwinkleField(seed: number, count: number): TwinkleStarSpec[] {
  const r = rng(seed)
  const out: TwinkleStarSpec[] = []
  for (let i = 0; i < count; i++) {
    const colorRoll = r()
    const color =
      colorRoll > 0.55
        ? '#E8E6F0'
        : colorRoll > 0.3
          ? '#A8C2FF'
          : '#40E0D0'
    out.push({
      cx: r() * SCREEN_W,
      cy: r() * SCREEN_H,
      r: 1.0 + r() * 1.4,
      opacity: 0.5 + r() * 0.4,
      color,
      period: 2200 + r() * 4500,
      delay: r() * 3000,
    })
  }
  return out
}

export function Backdrop(): React.ReactElement {
  const staticStars = useMemo(() => buildStaticField(7331, 90), [])
  const twinkleStars = useMemo(() => buildTwinkleField(8821, 28), [])

  // Nebula drift — slow X/Y wash for the cloud overlay.
  const nebulaX = useOscillator(36000)
  const nebulaY = useOscillator(28000)
  const nebulaScale = useOscillator(48000)

  const xT = nebulaX.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] })
  const yT = nebulaY.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] })
  const sT = nebulaScale.interpolate({
    inputRange: [0, 1],
    outputRange: [1.05, 1.18],
  })

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: '#08080F', overflow: 'hidden' },
      ]}
    >
      {/* Static star field — never moves. */}
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {staticStars.map((s, i) => (
          <Circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={s.color}
            opacity={s.opacity}
          />
        ))}
      </Svg>

      {/* Twinkling stars — each on its own opacity oscillator. */}
      {twinkleStars.map((s, i) => (
        <TwinkleStar key={i} spec={s} />
      ))}

      {/* Nebula gas clouds — large drifting radial blooms. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX: xT }, { translateY: yT }, { scale: sT }],
            opacity: 0.55,
          },
        ]}
      >
        <Svg width={SCREEN_W} height={SCREEN_H}>
          <Defs>
            <RadialGradient id="nebMag" cx="22%" cy="28%" r="60%">
              <Stop offset="0" stopColor="#E040FB" stopOpacity="0.32" />
              <Stop offset="0.5" stopColor="#9532D6" stopOpacity="0.10" />
              <Stop offset="1" stopColor="#E040FB" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebCyan" cx="80%" cy="48%" r="55%">
              <Stop offset="0" stopColor="#40E0D0" stopOpacity="0.26" />
              <Stop offset="1" stopColor="#40E0D0" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebViolet" cx="48%" cy="78%" r="60%">
              <Stop offset="0" stopColor="#643CC8" stopOpacity="0.28" />
              <Stop offset="1" stopColor="#643CC8" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="nebBlue" cx="14%" cy="86%" r="50%">
              <Stop offset="0" stopColor="#A8C2FF" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#A8C2FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#nebMag)" />
          <Rect width="100%" height="100%" fill="url(#nebCyan)" />
          <Rect width="100%" height="100%" fill="url(#nebViolet)" />
          <Rect width="100%" height="100%" fill="url(#nebBlue)" />
        </Svg>
      </Animated.View>

      {/* Shooting stars — two comets on different cadences. */}
      <ShootingStar
        startX={SCREEN_W * 0.05}
        startY={SCREEN_H * 0.12}
        dx={SCREEN_W * 0.6}
        dy={SCREEN_H * 0.25}
        duration={1400}
        interval={9200}
        delay={3200}
        color="#E8E6F0"
      />
      <ShootingStar
        startX={SCREEN_W * 0.62}
        startY={SCREEN_H * 0.05}
        dx={SCREEN_W * 0.32}
        dy={SCREEN_H * 0.4}
        duration={1100}
        interval={12700}
        delay={6800}
        color="#40E0D0"
      />
    </View>
  )
}

function TwinkleStar({ spec }: { spec: TwinkleStarSpec }) {
  const tw = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const half = spec.period / 2
    let stopped = false
    const handle = setTimeout(() => {
      if (stopped) return
      Animated.loop(
        Animated.sequence([
          Animated.timing(tw, {
            toValue: 1,
            duration: half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(tw, {
            toValue: 0,
            duration: half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }, spec.delay)
    return () => {
      stopped = true
      clearTimeout(handle)
    }
  }, [tw, spec.period, spec.delay])

  const opacity = tw.interpolate({
    inputRange: [0, 1],
    outputRange: [spec.opacity * 0.15, spec.opacity],
  })
  const scale = tw.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.4],
  })
  const d = spec.r * 2 * 1.6 // box big enough for the 1.4× scale
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: spec.cx - d / 2,
        top: spec.cy - d / 2,
        width: d,
        height: d,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Svg width={d} height={d}>
        <Circle cx={d / 2} cy={d / 2} r={spec.r} fill={spec.color} />
        <Circle
          cx={d / 2}
          cy={d / 2}
          r={spec.r * 2}
          fill={spec.color}
          opacity={0.2}
        />
      </Svg>
    </Animated.View>
  )
}

function ShootingStar({
  startX,
  startY,
  dx,
  dy,
  duration,
  interval,
  delay,
  color,
}: {
  startX: number
  startY: number
  dx: number
  dy: number
  duration: number
  interval: number
  delay: number
  color: string
}) {
  const burst = useDelayedBursts(interval, duration, delay)

  const translateX = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dx],
  })
  const translateY = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dy],
  })
  const opacity = burst.interpolate({
    inputRange: [0, 0.05, 0.6, 1],
    outputRange: [0, 1, 0.6, 0],
  })

  // Trail angle aligns with the comet's velocity direction.
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        opacity,
        transform: [
          { translateX },
          { translateY },
          { rotate: `${angleDeg}deg` },
        ],
      }}
    >
      <Svg width={120} height={6} viewBox="0 0 120 6">
        <Defs>
          <RadialGradient id={`tail-${startX}`} cx="100%" cy="50%" r="100%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={2} width={120} height={2} fill={`url(#tail-${startX})`} />
        <Circle cx={118} cy={3} r={3} fill={color} />
        <Circle cx={118} cy={3} r={6} fill={color} opacity={0.3} />
      </Svg>
    </Animated.View>
  )
}
