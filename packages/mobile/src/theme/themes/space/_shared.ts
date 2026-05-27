import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

// Shared animation hooks for the space theme.
//
// Cosmic motion is constant but slow — stars twinkle on irregular cycles,
// nebula clouds drift over tens of seconds, planets orbit on linear loops.
// These hooks expose those primitives so every atom can hook in without
// re-implementing its own loop machinery.

// 0 → 1 → 0 sinusoidal oscillation. Used for twinkle opacity, breath scales,
// pulsar pulses, aurora wash.
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

// 0 → 1 monotonic loop. Use for orbital rotation, satellites tracing rings,
// shooting-star trajectories, scan-line travel.
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

// One-shot 0 → 1 (no loop) used by the shooting-star spawner — it sets up
// its own re-scheduling cadence so each comet has its own gap between bursts.
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
        easing: Easing.out(Easing.cubic),
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
