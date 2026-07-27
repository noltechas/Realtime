import React from 'react'
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  AQUA,
  LAGOON,
  Cloud,
  DistantIsle,
  Frond,
  SunGlow,
  Twinkle,
  WaveBand,
  alpha,
  useLoop,
} from './_tropical'

// Tropical backdrop — the island itself, drawn: a morning sky melting into warm
// sand, a hazy sun (pure light — no cartoon rays) breathing top-right, lush
// green palm fronds arcing in from the top corners, a couple of slow clouds,
// and a living lagoon across the bottom. The far-off isle sits IN the water
// (the swells overlap its base), and the shoreline is a white foam lip riding a
// deep band that runs to the very bottom edge of the screen — the tab bar's
// bamboo pier stands in the water, not above it.
//
// Motion budget: three sawtooth wave drifts, two frond sways, one sun breath,
// two cloud drifts, four twinkles — all native-driver transforms/opacity.

const WATER_H = 212

export function Backdrop(): React.ReactElement {
  const { width, height } = useWindowDimensions()

  // Prime-ish periods so crests never re-align into a visible repeat.
  const driftBack = useLoop(31000, 0, false)
  const driftMid = useLoop(22000, 0, false)
  const driftShore = useLoop(15000, 0, false)
  const breathe = useLoop(5600)
  const swayL = useLoop(6800)
  const swayR = useLoop(7900, 700)
  const cloudA = useLoop(46000, 0, false)
  const cloudB = useLoop(64000, 0, false)

  const shift = (v: Animated.Value, distance: number) => ({
    transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, distance] }) }],
  })

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6E3', overflow: 'hidden' }]}>
      {/* sky → warm sand */}
      <LinearGradient
        colors={['#9FE0EF', '#C8EEEC', '#FFF3DC', '#FFF6E3']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* the sun — haze and light, breathing */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -70,
          right: -80,
          transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
        }}
      >
        <SunGlow size={300} />
      </Animated.View>

      {/* clouds crossing the whole sky, then wrapping */}
      <Animated.View style={[{ position: 'absolute', top: 84, left: -110 }, shift(cloudA, width + 220)]}>
        <Cloud width={104} opacity={0.55} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 150, left: -80 }, shift(cloudB, width + 170)]}>
        <Cloud width={64} opacity={0.4} />
      </Animated.View>

      {/* lush fronds arcing in from the top corners — kept up in the canopy so
          they never crowd the screen title */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -66,
          left: -92,
          transform: [{ rotate: swayL.interpolate({ inputRange: [0, 1], outputRange: ['22deg', '26deg'] }) }],
        }}
      >
        <Frond length={210} opacity={0.9} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: -88,
          left: -66,
          transform: [{ rotate: swayL.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '42deg'] }) }],
        }}
      >
        <Frond length={162} deep="#0C5A3C" color="#1E8E58" opacity={0.82} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: -56,
          right: -86,
          transform: [
            { scaleX: -1 },
            { rotate: swayR.interpolate({ inputRange: [0, 1], outputRange: ['26deg', '22.5deg'] }) },
          ],
        }}
      >
        <Frond length={196} opacity={0.55} />
      </Animated.View>

      {/* ── the lagoon ─────────────────────────────────────────────────────── */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: WATER_H, overflow: 'hidden' }}>
        {/* body of water, fading up into the haze at the horizon */}
        <LinearGradient
          colors={['rgba(111,224,216,0)', alpha(AQUA, 0.42), alpha(LAGOON, 0.5)]}
          locations={[0, 0.34, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* far-off isle, anchored IN the water — the swells overlap its base */}
        <View style={{ position: 'absolute', left: 18, bottom: 112, opacity: 0.5 }}>
          <DistantIsle width={128} />
        </View>

        {/* back swell */}
        <Animated.View style={[{ position: 'absolute', left: 0, bottom: 104 }, shift(driftBack, -width)]}>
          <WaveBand width={width} height={92} color={alpha(AQUA, 0.55)} crest={12} />
        </Animated.View>

        {/* mid swell, travelling the other way */}
        <Animated.View style={[{ position: 'absolute', left: -width, bottom: 54 }, shift(driftMid, width)]}>
          <WaveBand width={width} height={78} color={alpha(LAGOON, 0.44)} crest={10} />
        </Animated.View>

        {/* shoreline: a white foam lip riding the deep front band. The two move
            as ONE group, so the lip always hugs the same crest, and the deep
            fill runs to the very bottom of the screen. */}
        <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0, height: 60 }, shift(driftShore, -width)]}>
          <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
            <WaveBand width={width} height={60} color="rgba(255,255,255,0.9)" crest={8} />
          </View>
          <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
            <WaveBand width={width} height={53} color={alpha('#0B9C96', 0.82)} crest={8} />
          </View>
        </Animated.View>

        {/* sun catching the water */}
        <View style={{ position: 'absolute', right: width * 0.16, bottom: 122 }}>
          <Twinkle size={11} delay={0} />
        </View>
        <View style={{ position: 'absolute', right: width * 0.36, bottom: 82 }}>
          <Twinkle size={8} delay={700} />
        </View>
        <View style={{ position: 'absolute', left: width * 0.22, bottom: 94 }}>
          <Twinkle size={9} delay={1300} />
        </View>
        <View style={{ position: 'absolute', left: width * 0.46, bottom: 42 }}>
          <Twinkle size={7} delay={2000} />
        </View>
      </View>

      {/* a whisper of warm vignette so content pops at the center */}
      <LinearGradient
        colors={['rgba(255,246,227,0.16)', 'rgba(255,246,227,0)', 'rgba(255,246,227,0)']}
        locations={[0, 0.28, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: height * 0.16, height: height * 0.4 }}
      />
    </View>
  )
}
