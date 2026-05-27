import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'

// Retrowave list-item floater — items "boot in" CRT-style: scale from 0.92
// with a horizontal squash (scaleX 0.6 → 1.0) plus a soft fade, evoking the
// way a VCR signal locks onto a tube. One-shot per mount, gated so filter
// changes don't restart the animation on every visible card.
export const ItemFloater = React.memo(ItemFloaterImpl)

function ItemFloaterImpl({
  children,
  delay = 0,
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}): React.ReactElement {
  const enter = useRef(new Animated.Value(0)).current
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) return
    animatedRef.current = true
    const t = setTimeout(() => {
      Animated.timing(enter, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter])

  const opacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const scaleX = enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 1.04, 1] })
  const scaleY = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.94, 1.02, 1] })

  return (
    <Animated.View style={[style, { opacity, transform: [{ scaleX }, { scaleY }] }]}>
      {children}
    </Animated.View>
  )
}
