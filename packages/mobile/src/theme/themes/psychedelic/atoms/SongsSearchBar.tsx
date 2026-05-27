import React from 'react'
import { View, TextInput, Animated, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop } from '../_shared'
import type { SongsSearchBarProps } from '../../../types'

// Psychedelic search bar — round-cornered translucent pink well. The 3-turn
// archimedean spiral on the left replaces the standard magnifying glass and
// rotates continuously (18s loop). When the input is non-empty the field
// gains a faint chromatic-aberration outline (magenta + cyan offset twins)
// echoing the lyric-highlight motif on the desktop stage.
export function PsychedelicSongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()
  const spinDriver = useLinearLoop(18000)
  const rotate = spinDriver.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const hasText = value.length > 0

  return (
    <View style={{ position: 'relative' }}>
      {/* Chromatic outline twins — only when there's text in the field. */}
      {hasText && (
        <>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#ff1493',
                opacity: 0.45,
                transform: [{ translateX: -1 }],
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#00d4d4',
                opacity: 0.4,
                transform: [{ translateX: 1 }],
              },
            ]}
          />
        </>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,45,149,0.06)',
          borderWidth: 1,
          borderColor: tokens.accentA,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
        }}
      >
        <Animated.View style={{ transform: [{ rotate }], marginRight: 12 }}>
          <SpiralGlyph color={tokens.accentC} />
        </Animated.View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search the groove…"
          placeholderTextColor={tokens.muted}
          style={{
            flex: 1,
            fontFamily: tokens.fontBody,
            fontSize: 16,
            color: tokens.black,
            padding: 0,
          }}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  )
}

// 3-turn archimedean spiral. Hand-tuned bezier path approximation — react-
// native-svg doesn't draw parametric curves, so we approximate the spiral
// with a single Path: starts at center, sweeps outward over 3 revolutions.
function SpiralGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 10 Q10.8 9.2 11.6 10 Q11.6 11.6 10 11.6 Q7.6 11.6 7.6 9.2 Q7.6 5.6 11.6 5.6 Q16 5.6 16 9.6 Q16 14.4 11.2 14.4 Q5.6 14.4 5.6 8.8 Q5.6 3.2 11.2 3.2 Q18 3.2 18 9.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
