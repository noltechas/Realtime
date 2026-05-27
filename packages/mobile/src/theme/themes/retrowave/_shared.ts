import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

// Shared animation hooks for the retrowave theme.
//
// Retrowave motion has two distinct flavors:
//   • LINEAR DRIFT — the perspective grid scrolls forward toward the
//     viewer at a constant rate, palm tree silhouettes drift, scanlines
//     creep down a CRT. Use useLinearLoop for those.
//   • PULSE — the sun-disc breathes, neon outlines flicker, chromatic
//     aberration jitters. Use useOscillator for those.

export function useLinearLoop(durationMs = 8000): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [value, durationMs])
  return value
}

export function useOscillator(durationMs = 3200): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [value, durationMs])
  return value
}

// One-shot 0→1 with self-rescheduled bursts — used by the rare "neon flicker"
// dropouts (a tube briefly going dim then back to full) and by per-card press
// ripples that fire and then re-arm.
export function useDelayedBursts(
  intervalMs: number,
  durationMs: number,
  delayMs = 0,
): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      value.setValue(0)
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return
        setTimeout(tick, intervalMs)
      })
    }
    const handle = setTimeout(tick, delayMs)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [value, intervalMs, durationMs, delayMs])
  return value
}
