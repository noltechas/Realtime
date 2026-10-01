import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_gothic'

// Gothic item entry: things rise out of the floor mist: a slow fade up from a
// little below, no overshoot. Stone doesn't bounce.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, translateY } = useEnter(delay, 14)
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
}
