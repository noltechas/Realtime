import React from 'react'
import { View, type ViewStyle } from 'react-native'

// Urban has no entry animation for list items — the structural skew + drop
// shadow IS the visual character. Renders children inside a plain `View` so
// any layout props passed via `style` (flex, maxWidth, etc.) still take
// effect; `delay` is ignored.
export function ItemFloater({
  children,
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}): React.ReactElement {
  if (!style) return <>{children}</>
  return <View style={style}>{children}</View>
}
