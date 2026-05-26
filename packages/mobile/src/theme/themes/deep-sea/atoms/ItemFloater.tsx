import React, { useEffect, useRef, useState } from 'react'
import { Animated, type ViewStyle } from 'react-native'

// Deep-sea's bubble-float entrance animation. Wraps a child and applies a
// gentle continuous loop that translates ±4px and rotates ±1deg so list
// items appear to bob in an underwater current. Unlike the legacy
// DeepSeaFloater this atom never branches on theme — the registry only
// picks it for the deep-sea module, so by definition it always runs.
//
// `delay` staggers the first animation start so a list of items doesn't
// breathe in unison.
export function ItemFloater({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: ViewStyle
}) {
  const floatAnim = useRef(new Animated.Value(0)).current
  // Per-instance random offset so two atoms with the same caller-supplied
  // delay still desynchronize over time (each picks a slightly different
  // half-cycle duration).
  const [randomOffset] = useState(() => Math.random() * 1000)

  useEffect(() => {
    const duration = 2500 + randomOffset
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    )

    // Defer first start by `delay` ms so a row of items staggers in.
    const timeout = setTimeout(() => {
      animation.start()
    }, delay)

    return () => {
      clearTimeout(timeout)
      animation.stop()
    }
  }, [floatAnim, delay, randomOffset])

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  })

  const rotate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-1deg', '1deg', '-1deg'],
  })

  return (
    <Animated.View style={[style, { transform: [{ translateY }, { rotate }] }]}>
      {children}
    </Animated.View>
  )
}
