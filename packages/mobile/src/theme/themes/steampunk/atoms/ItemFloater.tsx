import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'

// Steampunk list-item floater — items are pressed into place by the machine:
// a short rise with a small mechanical overshoot, then stillness. No idle
// motion; the backdrop provides the theme's ambient movement budget.
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
  // Gate so the press-in only ever fires once per mount. Without this,
  // filtering the song list (which changes each card's `index` → `delay`)
  // would re-fire the animation on every visible card and stall the UI thread.
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) return
    animatedRef.current = true
    const t = setTimeout(() => {
      Animated.timing(enter, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(t)
    // Intentionally only depend on `enter`. `delay` is captured at first
    // mount and never re-applied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter])

  const opacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
  const scale = enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.97, 1.015, 1] })

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  )
}
