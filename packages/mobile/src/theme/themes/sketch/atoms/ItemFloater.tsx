import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_pencil'

// Sketch item entry: each item is laid down on the sheet, a short drop and
// settle.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, translateY } = useEnter(delay, 10)
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
}
