import React, { useEffect, useRef } from 'react'
import { View, Image, Animated, Easing, StyleSheet, type ViewStyle } from 'react-native'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const waterGif = require('../../../../../assets/water.gif')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bubbleImg = require('../../../../../assets/bubble.png')

// Deep-sea page backdrop — animated caustics (a looping water gif at low
// opacity over a deep-navy fill) layered behind 24 bioluminescent bubbles
// drifting upward in staggered loops. Sits absolutely positioned behind a
// screen's content; insert as the first child of a SafeAreaView so the
// screen body stacks on top.
export function Backdrop() {
  return (
    <View pointerEvents="none" style={fillStyle}>
      <Caustics />
      <Bubbles />
    </View>
  )
}

const fillStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
}

function Caustics() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#040918' }]}>
      <Image
        source={waterGif}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.06 }}
        resizeMode="cover"
      />
    </View>
  )
}

function Bubbles() {
  const bubbles: React.ReactElement[] = []
  for (let i = 0; i < 24; i++) {
    bubbles.push(<Bubble key={`b-${i}`} index={i} />)
  }
  return <>{bubbles}</>
}

function Bubble({ index }: { index: number }) {
  const size = 12 + (index % 6) * 10
  const left = `${(index * 19) % 95}%` as any
  const duration = 12000 + (index % 8) * 4000
  const delay = (index % 12) * 2000

  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [drift, duration, delay])

  // Move from bottom (just off-screen) to top (just off-screen)
  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [100, -1200],
  })

  // Gentle horizontal wobble
  const translateX = drift.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 20, 0, -20, 0],
  })

  // Fade in at bottom, fade out at top
  const opacity = drift.interpolate({
    inputRange: [0, 0.05, 0.8, 1],
    outputRange: [0, 0.6, 0.6, 0],
  })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left,
        width: size,
        height: size,
        transform: [{ translateY }, { translateX }],
        opacity,
      }}
    >
      <Image
        source={bubbleImg}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </Animated.View>
  )
}
