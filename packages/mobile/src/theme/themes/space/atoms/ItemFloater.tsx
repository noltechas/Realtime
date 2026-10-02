import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_record'

// Space item entry: things fade up out of the dark, slow and unbouncy, the way
// stars come out as your eyes adjust.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, translateY } = useEnter(delay, 10)
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
}
