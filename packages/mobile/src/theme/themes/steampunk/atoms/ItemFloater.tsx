import React, { useEffect, useRef } from 'react'
import { Animated, Easing, type ViewStyle } from 'react-native'

// Steampunk list-item floater — items enter with a mechanical "stamping
// press" feel: they slide up from below with a slight overshoot scale (1.04)
// then settle, as if a brass plate were pressed into position by a clockwork
// arm. No idle motion — the per-atom gears + steam already provide the
// continuous animation budget.
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
  // Gate so the stamping animation only ever fires once per mount. Without
  // this, filtering the song list (which changes each card's `index` → each
  // card's `delay`) would re-fire the spring on every visible card and stall
  // the UI thread.
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) return
    animatedRef.current = true
    const t = setTimeout(() => {
      Animated.timing(enter, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(t)
    // Intentionally only depend on `enter`. `delay` is captured by the
    // closure at first-mount and never re-applied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter])

  const opacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
  const scale = enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.94, 1.03, 1] })

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  )
}
