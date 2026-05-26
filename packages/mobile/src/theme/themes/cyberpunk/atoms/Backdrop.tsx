import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, type ViewStyle } from 'react-native'

// Cyberpunk page backdrop — a faint neon dot grid layered behind drifting
// horizontal scanlines. Sits absolutely positioned behind a screen's content;
// insert as the first child of a SafeAreaView so the screen body stacks on
// top.
export function Backdrop() {
  return (
    <View pointerEvents="none" style={fillStyle}>
      <DotGrid />
      <Scanlines />
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

function DotGrid() {
  const cell = 28
  const cols = 16
  const rows = 36
  const dots: React.ReactElement[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`d-${r}-${c}`}
          style={{
            position: 'absolute',
            top: r * cell,
            left: c * cell,
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'rgba(0,255,136,0.12)',
          }}
        />,
      )
    }
  }
  return <View pointerEvents="none" style={fillStyle}>{dots}</View>
}

function Scanlines() {
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [drift])
  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -200],
  })

  const lines: React.ReactElement[] = []
  const total = 240
  for (let i = 0; i < total; i++) {
    lines.push(
      <View
        key={`s-${i}`}
        style={{
          position: 'absolute',
          top: i * 4,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(0,255,136,0.025)',
        }}
      />,
    )
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[fillStyle, { transform: [{ translateY }] }]}
    >
      {lines}
    </Animated.View>
  )
}
