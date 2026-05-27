import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

// Shared animation hooks for the steampunk theme.
//
// Steampunk motion is mechanical: linear cog rotations, sinusoidal pendulum
// swings, hissing steam plumes that rise and dissipate. These primitives
// power every atom's clockwork without each re-implementing loop machinery.

// Monotonic linear 0→1 loop — used by rotating gears, pressure-gauge needle
// idle drift, conveyor belts. Period varies per atom so the contraption never
// feels in lockstep.
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

// 0→1→0 sinusoidal oscillation — used by gas-lamp filament glow, pendulum
// swing arc, pressure-gauge breathing, rivet halo pulse.
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

// One-shot 0→1 with self-rescheduled bursts. Drives the puffing steam plumes
// — each plume schedules its next puff on its own cadence so the backdrop
// always has multiple plumes at different phases.
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

// Pendulum oscillator — symmetric -1→0→+1→0→-1 swing. The full period of a
// 60-bpm pendulum is ~2s for full there-and-back. Atoms scale the output to
// their needed angle via .interpolate.
export function usePendulum(durationMs = 2400): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs / 4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs / 4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: -1,
          duration: durationMs / 4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs / 4,
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
