import React from 'react'
import { View, type ViewStyle } from 'react-native'

// Cyberpunk has no per-item entrance animation — the dot grid + scanline
// backdrop carries the atmosphere on its own, and adding a translateY drift
// to every list cell would muddy the hard-edged HUD aesthetic. Passthrough.
export function ItemFloater({
  children,
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  if (style) {
    return <View style={style}>{children}</View>
  }
  return <>{children}</>
}
