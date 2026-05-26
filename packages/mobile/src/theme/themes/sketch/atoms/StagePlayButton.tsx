import React from 'react'
import { View, Pressable, type ViewStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Sketch play button — a blob with slightly-uneven corner radii so the circle
// reads as drawn by hand, tilted a few degrees, soft drop shadow. The
// triangle/bars stay upright (no inverse rotation needed because the parent
// already settles to the rotated frame).
export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        playBtnStyle,
        { backgroundColor: isPlaying ? tokens.vividYellow : singerColor },
        pressed
          ? { transform: [{ rotate: '3deg' }, { translateX: 4 }, { translateY: 4 }] as any, shadowOpacity: 0 }
          : null,
      ]}
    >
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={pauseBarStyle(tokens.black)} />
          <View style={pauseBarStyle(tokens.black)} />
        </View>
      ) : (
        <View style={playTriStyle(tokens.black)} />
      )}
    </Pressable>
  )
}

const playBtnStyle: ViewStyle = {
  width: 120,
  height: 120,
  borderTopLeftRadius: 56,
  borderTopRightRadius: 63,
  borderBottomRightRadius: 58,
  borderBottomLeftRadius: 62,
  borderWidth: 3,
  borderColor: 'rgba(0,0,0,0.7)',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 3, height: 5 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5,
  transform: [{ rotate: '3deg' }] as any,
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
