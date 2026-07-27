import React from 'react'
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { alpha, LAGOON, useLoop } from './_tropical'

// Tropical art overlay — the now-playing album art viewed through water: a slow
// diagonal band of light sweeps across it (like sun on a pool surface) over a
// faint lagoon tint at the base. Deliberately barely-there; the art is still the
// subject, it just isn't sitting in dry air.

export function ArtOverlay() {
  const { width } = useWindowDimensions()
  const sweep = useLoop(6400)

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', alpha(LAGOON, 0.16)]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: -width,
          bottom: -width,
          width: width * 0.55,
          transform: [
            { rotate: '22deg' },
            { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.7, width * 0.9] }) },
          ],
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  )
}
