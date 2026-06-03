import React, { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

// Tropical item entry — list items drift up and settle like a buoy bobbing into
// place: a soft fade + rise + gentle overshoot, staggered by `delay`. Replaces
// the neo-brutal no-op floater so lists feel like they wash ashore.
export function ItemFloater({
  delay = 0,
  style,
  children,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  const v = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.spring(v, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      damping: 13,
      stiffness: 140,
      mass: 0.9,
    })
    anim.start()
    return () => anim.stop()
  }, [v, delay])

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] })

  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  )
}
