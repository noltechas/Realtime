import React, { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

// Space list-item floater — items warp in from 32px below with a soft spring
// + opacity fade, then sit still. The continuous "alive" motion in this theme
// lives in per-atom drivers (twinkle, aurora sweep, orbit rotations), so we
// don't re-run idle bobs per list item on top.
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
    const t = setTimeout(() => {
      Animated.spring(enter, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(t)
  }, [delay, enter])

  const opacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [32, 0] })
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] })

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      {children}
    </Animated.View>
  )
}
