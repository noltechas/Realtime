import React from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Deep-sea stage play/pause button — a rounded 120px disc with a translucent
// navy fill, faint cyan border (heavier on the bottom edge), and a singer-
// color wash when idle. Press dims (dark theme).
export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1,
          borderColor: 'rgba(0,255,200,0.5)',
          borderBottomWidth: 4,
          backgroundColor: isPlaying ? tokens.vividYellow : singerColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              width: 14,
              height: 44,
              backgroundColor: tokens.appBg,
              borderRadius: 2,
            }}
          />
          <View
            style={{
              width: 14,
              height: 44,
              backgroundColor: tokens.appBg,
              borderRadius: 2,
            }}
          />
        </View>
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: 24,
            borderBottomWidth: 24,
            borderLeftWidth: 40,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: tokens.appBg,
            marginLeft: 8,
          }}
        />
      )}
    </Pressable>
  )
}
