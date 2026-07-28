import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'

// Space list-item entrance — panels "come up on the bus".
//
// A hard, fast ramp rather than a bounce: opacity and a 2% vertical squash
// resolve in ~260ms with an easeOut, so a row reads as a display element being
// powered on, not an object being thrown onto the screen. Nothing loops
// afterwards — the theme's continuous motion is the station outside the window
// and the nav pod, and adding per-row idle animation on top of a live 3D scene
// would be both noisy and wasteful.
//
// This also covers `MachinedPanel`'s one-frame measurement gap: the panel
// silhouette lands while the row is still transparent.
export function ItemFloater({
  children,
  delay = 0,
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}): React.ReactElement {
  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const handle = setTimeout(() => {
      Animated.timing(enter, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(handle)
  }, [delay, enter])

  const opacity = enter
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })
  const scaleY = enter.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] })

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scaleY }] }]}>
      {children}
    </Animated.View>
  )
}
