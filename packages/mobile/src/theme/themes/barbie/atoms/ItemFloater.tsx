import React from 'react'
import { Animated, type ViewStyle } from 'react-native'
import { useEnter } from './_barbie'

// Barbie item entry: everything pops in with a little bounce, pleased to see you.
export function ItemFloater({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: React.ReactNode }) {
  const { opacity, translateY, scale } = useEnter(delay)
  return <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>{children}</Animated.View>
}
