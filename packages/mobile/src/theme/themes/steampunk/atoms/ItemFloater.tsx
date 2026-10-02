import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_engine'

// Steampunk item entry: each part rises into place with a small mechanical
// settle, the way a plate seats onto its mounting.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, translateY } = useEnter(delay, 14)
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
}
