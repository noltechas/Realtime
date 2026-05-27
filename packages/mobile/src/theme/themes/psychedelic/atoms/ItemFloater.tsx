import React, { useEffect, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

// Psychedelic list-item floater — items rise from 24px below + opacity 0 with
// a soft spring on entrance, then sit still. The continuous "alive" motion in
// this theme lives in the per-atom oscillators (SongCard shape morph, QueueRow
// aurora sweep, GenreTabs breath, etc.) — re-running an idle bob *per list
// item* on top of those was eating frame budget on long lists, so it's gone.
export function ItemFloater({
  children,
  delay = 0,
  style,
}: {
  delay?: number
  style?: ViewStyle
  children: React.ReactNode
}): React.ReactElement {
  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(enter, {
        toValue: 1,
        tension: 55,
        friction: 10,
        useNativeDriver: true,
      }).start()
    }, delay)
    return () => clearTimeout(t)
  }, [delay, enter])

  const opacity = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  )
}
