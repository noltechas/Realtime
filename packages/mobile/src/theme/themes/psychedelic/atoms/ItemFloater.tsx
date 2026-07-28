import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'

// Psychedelic list-item entrance — a short, calm fade and rise.
//
// The background is in constant motion, so rows arrive quietly: 220ms, easeOut, a
// 10px rise, no overshoot. An earlier pass sprang them in from 88% scale, which
// against moving footage read as restless.
//
// This also covers the frame before a glass panel's blur is ready.
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
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(handle)
  }, [delay, enter])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })

  return (
    <Animated.View style={[style, { opacity: enter, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  )
}
