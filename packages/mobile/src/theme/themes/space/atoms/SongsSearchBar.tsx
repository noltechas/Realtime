import React from 'react'
import { View, TextInput, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop, useOscillator } from '../_shared'
import type { SongsSearchBarProps } from '../../../types'

// Space search bar — a holographic HUD console:
//   • Translucent void background with a cyan-magenta gradient rim.
//   • Four HUD corner brackets (cyan on the left side, magenta on the right).
//   • A continuous plasma scan line slides across the input (top→bottom, very
//     subtle alpha) so the field always looks like an active hologram.
//   • The leading glyph is a radar dish — a hand-drawn telescope silhouette
//     made of a small circle (lens) and two stroke arcs (dish ribs) with a
//     pulsing red blip at the dish center.
export function SpaceSongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()

  // Scan-line travels top→bottom across the input on an 8s linear loop.
  const scan = useLinearLoop(7800)
  const scanY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 56],
  })
  const scanOpacity = scan.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.7, 0.7, 0],
  })

  // Radar blip — pulsing red dot at the dish center, drawing attention without
  // being noisy. Acid yellow when focused, otherwise plasma cyan.
  const blip = useOscillator(1400)
  const blipOpacity = blip.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  })

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(8,8,15,0.85)',
          borderWidth: 1,
          borderColor: 'rgba(64,224,208,0.45)',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          overflow: 'hidden',
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
        }}
      >
        {/* Inner magenta tint gradient — softens the void background. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(224,64,251,0.06)',
            'rgba(64,224,208,0.04)',
            'rgba(224,64,251,0.06)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Plasma scan line — animated horizontal sweep that runs top→bottom. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 1.5,
            transform: [{ translateY: scanY }],
            opacity: scanOpacity,
          }}
        >
          <LinearGradient
            colors={[
              'rgba(64,224,208,0)',
              'rgba(64,224,208,0.85)',
              'rgba(224,64,251,0.7)',
              'rgba(64,224,208,0.85)',
              'rgba(64,224,208,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        {/* HUD corner brackets */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 2, left: 2, width: 10, height: 10 }}
        >
          <View style={{ width: 10, height: 1.5, backgroundColor: '#40E0D0' }} />
          <View style={{ width: 1.5, height: 8, backgroundColor: '#40E0D0' }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            alignItems: 'flex-end',
          }}
        >
          <View style={{ width: 10, height: 1.5, backgroundColor: '#E040FB' }} />
          <View style={{ width: 1.5, height: 8, backgroundColor: '#E040FB' }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 2,
            left: 2,
            width: 10,
            height: 10,
            justifyContent: 'flex-end',
          }}
        >
          <View style={{ width: 1.5, height: 8, backgroundColor: '#40E0D0' }} />
          <View style={{ width: 10, height: 1.5, backgroundColor: '#40E0D0' }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 10,
            height: 10,
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}
        >
          <View style={{ width: 1.5, height: 8, backgroundColor: '#E040FB' }} />
          <View style={{ width: 10, height: 1.5, backgroundColor: '#E040FB' }} />
        </View>

        <View style={{ marginRight: 10, width: 22, height: 22 }}>
          <RadarGlyph />
          <Animated.View
            style={{
              position: 'absolute',
              top: 9,
              left: 9,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#FF4060',
              opacity: blipOpacity,
              shadowColor: '#FF4060',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.95,
              shadowRadius: 4,
            }}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Scan the cosmos…"
          placeholderTextColor={tokens.muted}
          style={{
            flex: 1,
            fontFamily: tokens.fontBody,
            fontSize: 15,
            color: tokens.black,
            padding: 0,
            letterSpacing: 0.5,
          }}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  )
}

function RadarGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      {/* Outer dish */}
      <Circle
        cx={11}
        cy={11}
        r={9}
        stroke="#40E0D0"
        strokeWidth={1.2}
        fill="none"
      />
      <Circle
        cx={11}
        cy={11}
        r={5}
        stroke="#40E0D0"
        strokeWidth={0.8}
        fill="none"
        opacity={0.6}
      />
      {/* Cross hair */}
      <Line x1={11} y1={2} x2={11} y2={20} stroke="#40E0D0" strokeWidth={0.6} opacity={0.45} />
      <Line x1={2} y1={11} x2={20} y2={11} stroke="#40E0D0" strokeWidth={0.6} opacity={0.45} />
      {/* Sweep wedge */}
      <Path
        d="M 11 11 L 20 11 A 9 9 0 0 0 17 4 Z"
        fill="#E040FB"
        opacity={0.32}
      />
    </Svg>
  )
}
