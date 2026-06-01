import React from 'react'
import { Pressable, View, Image } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// The same bubble PNG the deep-sea backdrop + tab bar use — a glossy 3D
// highlight with a transparent center, so a glyph layered on top stays visible.
const bubbleImg = require('../../../../../assets/bubble.png')

// Deep-sea stage play/pause button — an underwater air bubble. A translucent
// disc tinted by the singer colour (idle) / vivid yellow (playing) sits under
// the shared bubble PNG for a glassy 3D highlight, with the play/pause glyph
// floating inside. Press makes the bubble "squish" slightly.
export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const SIZE = 132
  const glyph = tokens.appBg // deep navy — reads on the bright bubble fill

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
        pressed ? { transform: [{ scale: 0.94 }], opacity: 0.92 } : null,
      ]}
    >
      {/* Watery fill + cyan rim + bioluminescent glow */}
      <View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: isPlaying ? tokens.vividYellow : singerColor,
          borderWidth: 1.5,
          borderColor: 'rgba(0,255,200,0.6)',
          shadowColor: '#00ffc8',
          shadowOpacity: 0.5,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      {/* Bubble PNG overlay — the glossy 3D highlight */}
      <Image
        source={bubbleImg}
        resizeMode="contain"
        style={{ position: 'absolute', width: SIZE, height: SIZE, opacity: 0.9 }}
      />
      {/* Play / pause glyph, floating on top of the bubble */}
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 15, height: 46, backgroundColor: glyph, borderRadius: 3 }} />
          <View style={{ width: 15, height: 46, backgroundColor: glyph, borderRadius: 3 }} />
        </View>
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: 26,
            borderBottomWidth: 26,
            borderLeftWidth: 42,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: glyph,
            marginLeft: 10,
          }}
        />
      )}
    </Pressable>
  )
}
