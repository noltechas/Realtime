import React, { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

// Comic-Book item entry — panels "POP!" onto the page with a springy scale +
// fade, staggered by `delay`, like frames snapping into a comic strip. (Replaces
// the neo-brutal no-op floater so lists feel hand-laid, not static.)
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
      damping: 11,
      stiffness: 190,
      mass: 0.8,
    })
    anim.start()
    return () => anim.stop()
  }, [v, delay])

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] })

  return (
    <Animated.View style={[style, { opacity: v, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  )
}
