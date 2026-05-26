import React from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { PlayButtonProps } from '../../../types'

// Neo-brutal Stage play/pause button. Lifted from the default branch of
// StageScreen's playBtnStyle()/playBtnPressedStyle() — circular slab with a
// 3px black border and a large 6px offset shadow. Background flips to vivid
// yellow while playing (to "pause"), or to the current singer's color while
// waiting (to "play").
const t = NEO_BRUTAL_MOBILE

const baseBtn: ViewStyle = {
  width: 120,
  height: 120,
  borderRadius: 60,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
}

const pressedStyle: ViewStyle = {
  transform: [{ translateX: 4 }, { translateY: 4 }],
  shadowOpacity: 0,
  elevation: 0,
}

const pauseBarStyle: ViewStyle = {
  width: 14,
  height: 44,
  backgroundColor: t.black,
  borderRadius: 2,
}

const playTriStyle: ViewStyle = {
  width: 0,
  height: 0,
  borderTopWidth: 24,
  borderBottomWidth: 24,
  borderLeftWidth: 40,
  borderTopColor: 'transparent',
  borderBottomColor: 'transparent',
  borderLeftColor: t.black,
  marginLeft: 8,
}

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        baseBtn,
        { backgroundColor: isPlaying ? t.vividYellow : singerColor },
        pressed ? pressedStyle : null,
      ]}
    >
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={pauseBarStyle} />
          <View style={pauseBarStyle} />
        </View>
      ) : (
        <View style={playTriStyle} />
      )}
    </Pressable>
  )
}
