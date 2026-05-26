import React from 'react'
import type { ViewStyle } from 'react-native'

// Sketch doesn't animate list entry — the per-item rotation and hand-drawn
// borders already give a "placed-by-hand" feel. Render children verbatim;
// `style` and `delay` are accepted to match the ThemeUIModule contract.
export function ItemFloater({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delay,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  return <>{children}</>
}
