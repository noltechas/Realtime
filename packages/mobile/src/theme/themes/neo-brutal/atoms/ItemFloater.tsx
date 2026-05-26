import React from 'react'
import { View, type ViewStyle } from 'react-native'

// Neo-brutal has no per-item entry animation. The deep-sea theme uses an
// ItemFloater that drifts each card up-and-down with a per-key delay; here we
// just render the children in a regular View so the screen-level prop shape
// stays uniform across themes.
export function ItemFloater({
  style,
  children,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  return <View style={style}>{children}</View>
}
