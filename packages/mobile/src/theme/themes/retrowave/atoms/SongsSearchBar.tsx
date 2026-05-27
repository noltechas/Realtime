import React from 'react'
import { View, TextInput, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Path, Line } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop, useOscillator } from '../_shared'
import { ScanlineOverlay } from '../primitives'
import type { SongsSearchBarProps } from '../../../types'

// Retrowave search bar — an arcade-monitor input panel:
//   • Deep indigo background, hot-pink rim with strong glow.
//   • A cyan crosshair-magnifier glyph on the left whose ring pulses
//     amplitude on a slow oscillator (TV-tuning feel).
//   • A continuous magenta scan line travels left→right across the bar.
//   • Faint scanlines drift down the input body.
//   • Top/bottom edges have thin chrome highlight strips.
export const RetrowaveSongsSearchBar = React.memo(RetrowaveSongsSearchBarImpl)

function RetrowaveSongsSearchBarImpl({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()

  const scan = useLinearLoop(5800)
  const scanX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-50%', '160%'],
  })

  const pulse = useOscillator(1900)
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.12] })
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#0E0526',
          borderWidth: 1.5,
          borderColor: '#FF2D95',
          paddingHorizontal: 16,
          paddingVertical: 12,
          overflow: 'hidden',
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 10,
        }}
      >
        {/* Top chrome strip */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
        >
          <LinearGradient
            colors={['rgba(255,181,222,0.9)', 'rgba(255,45,149,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        {/* Inner indigo→pink wash */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(255,45,149,0.10)',
            'rgba(0,240,255,0.05)',
            'rgba(255,45,149,0.10)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Scanlines */}
        <ScanlineOverlay rowGap={3} opacity={0.15} color="#000000" />

        {/* Travelling neon scan band */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '30%',
            transform: [{ translateX: scanX }],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(255,45,149,0)',
              'rgba(0,240,255,0.4)',
              'rgba(255,45,149,0.6)',
              'rgba(0,240,255,0.4)',
              'rgba(255,45,149,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        {/* Crosshair magnifier glyph */}
        <View style={{ marginRight: 12, width: 24, height: 24 }}>
          <CrosshairGlyph />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 24,
              height: 24,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={9} fill="none" stroke="#00F0FF" strokeWidth={0.8} opacity={0.7} />
            </Svg>
          </Animated.View>
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search the grid…"
          placeholderTextColor="#7A5FA8"
          style={{
            flex: 1,
            fontFamily: tokens.fontBody,
            fontSize: 15,
            color: '#F4E8FF',
            padding: 0,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
          autoCorrect={false}
          autoCapitalize="characters"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {/* Bottom chrome strip */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 }}
        >
          <LinearGradient
            colors={['rgba(0,240,255,0.5)', 'rgba(0,240,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      </View>
    </View>
  )
}

function CrosshairGlyph() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#00F0FF" strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={2.5} fill="#FF2D95" />
      <Line x1={12} y1={1} x2={12} y2={5} stroke="#00F0FF" strokeWidth={1.2} />
      <Line x1={12} y1={19} x2={12} y2={23} stroke="#00F0FF" strokeWidth={1.2} />
      <Line x1={1} y1={12} x2={5} y2={12} stroke="#00F0FF" strokeWidth={1.2} />
      <Line x1={19} y1={12} x2={23} y2={12} stroke="#00F0FF" strokeWidth={1.2} />
    </Svg>
  )
}
