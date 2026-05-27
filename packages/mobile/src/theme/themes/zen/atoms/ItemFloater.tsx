import React from 'react'
import { View, type ViewStyle } from 'react-native'

// Zen's ItemFloater is intentionally a pass-through. Other themes use this
// wrapper to add a breathing/floating animation to lists of items, but in zen
// the song cards and queue rows should hold a steady, grid-aligned position
// — wabi-sabi stillness rather than motion. Keeping the same component
// signature so the screens that wrap items in `ui.ItemFloater` don't need a
// special case for this theme.
export function ItemFloater({
  children,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: ViewStyle
}) {
  return <View style={style}>{children}</View>
}
