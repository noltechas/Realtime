import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_glass'

// Liquid Glass item entry: each pane rises into place with a liquid overshoot.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, transform } = useEnter(delay)
  return <Animated.View style={[style, { opacity, transform }]}>{children}</Animated.View>
}
