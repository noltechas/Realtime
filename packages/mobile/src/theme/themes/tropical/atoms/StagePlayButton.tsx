import React from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { PlayButtonProps } from '../../../types'
import { PANEL, LAGOON, LAGOON_DK, SUNSET, HIBISCUS, softShadow, press } from './_tropical'

// Tropical Stage play/pause — a big sun-lit lagoon orb with a glossy highlight,
// a thin white "shoreline" keyline, and a crisp transport glyph. PLAY is the
// lagoon turquoise gradient with a white triangle; PLAYING flips to a
// sunset→hibiscus gradient with white pause bars. Soft sun-shadow; gentle sink
// on press.
const SIZE = 152
const RING_INSET = 11

export function StagePlayButton({ isPlaying, onPress }: PlayButtonProps) {
  const colors: [string, string] = isPlaying ? [SUNSET, HIBISCUS] : [LAGOON, LAGOON_DK]

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [circleStyle, pressed ? press() : null]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fillStyle}>
        {/* glossy top highlight */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 10, left: 22, right: 22, height: SIZE * 0.34, borderRadius: SIZE / 2, backgroundColor: 'rgba(255,255,255,0.26)' }} />
        {/* shoreline keyline */}
        <View style={ringStyle} pointerEvents="none" />

        {isPlaying ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 14, height: 46, borderRadius: 5, backgroundColor: PANEL }} />
            <View style={{ width: 14, height: 46, borderRadius: 5, backgroundColor: PANEL }} />
          </View>
        ) : (
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: 27,
              borderBottomWidth: 27,
              borderLeftWidth: 44,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: PANEL,
              marginLeft: 12,
            }}
          />
        )}
      </LinearGradient>
    </Pressable>
  )
}

const circleStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
  ...softShadow(10),
}

const fillStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const ringStyle: ViewStyle = {
  position: 'absolute',
  top: RING_INSET,
  left: RING_INSET,
  right: RING_INSET,
  bottom: RING_INSET,
  borderRadius: (SIZE - RING_INSET * 2) / 2,
  borderWidth: 3,
  borderColor: 'rgba(255,255,255,0.7)',
}
