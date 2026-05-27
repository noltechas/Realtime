import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

// Reusable Animated.Value hooks for the psychedelic theme.
//
// All animations driven here are "always-on" — they start on mount and never
// stop. Loops are cheap on the native driver, and the constant motion is the
// signature of the theme: nothing on a psychedelic screen ever sits perfectly
// still. The hooks each accept a duration so callers can stagger periods to
// avoid lockstep across multiple atoms.

// 0 → 1 → 0 triangular oscillation. Use for breathe scale, opacity pulses,
// gradient sweeps that should advance-and-retreat (not loop linearly).
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

// 0 → 1 monotonic loop. Use for rotation, gradient flow that should run
// continuously in one direction (no advance-retreat). For driving rotation
// strings, interpolate value→'0deg'..'360deg'.
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

// Two-axis oscillator. Useful for figure-8-ish drift — the X and Y phases run
// independently so the path never closes into a tight circle.
export function useBobXY(durationXMs = 4200, durationYMs = 3100): {
  x: Animated.Value
  y: Animated.Value
} {
  const x = useOscillator(durationXMs)
  const y = useOscillator(durationYMs)
  return { x, y }
}
