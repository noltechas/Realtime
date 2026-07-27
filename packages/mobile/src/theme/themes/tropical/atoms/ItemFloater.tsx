import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_tropical'

// Tropical item entry — content washes ashore: it fades up, rises and settles
// with a hair of overshoot on the shared entrance spring, staggered by `delay`.
// Same curve as every other arrival in the theme (see useEnter), so a list, a
// hero and a card all move like they belong to one system.
export function ItemFloater({
  delay = 0,
  style,
  children,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  const { opacity, translateY, scale } = useEnter(delay, 18)

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  )
}
