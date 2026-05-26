import React from 'react'
import { View, Pressable, type ViewStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Cyberpunk play / pause button — no skew, rounded circle, accent ring with a
// neon glow shadow. Press dims (dark themes never slide into an offset
// shadow). When playing, the button fills with `vividYellow`; idle it fills
// with the singer's chosen color so the user's identity reads at a glance.
export function CyberpunkStagePlayButton({
  isPlaying,
  singerColor,
  onPress,
}: PlayButtonProps) {
  const { tokens } = useTheme()

  const fill = isPlaying ? tokens.vividYellow : singerColor
  const glyphColor = tokens.appBg

  const boxStyle: ViewStyle = {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: tokens.accentA,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: fill,
    shadowColor: tokens.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [boxStyle, pressed ? { opacity: 0.85 } : null]}
    >
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={pauseBarStyle(glyphColor)} />
          <View style={pauseBarStyle(glyphColor)} />
        </View>
      ) : (
        <View style={playTriStyle(glyphColor)} />
      )}
    </Pressable>
  )
}

function pauseBarStyle(color: string): ViewStyle {
  return {
    width: 14,
    height: 44,
    backgroundColor: color,
    borderRadius: 2,
  }
}

function playTriStyle(color: string): ViewStyle {
  return {
    width: 0,
    height: 0,
    borderTopWidth: 24,
    borderBottomWidth: 24,
    borderLeftWidth: 40,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color,
    marginLeft: 8,
  }
}
